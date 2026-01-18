"""Game state machine for Superlatives game logic."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from backend.custom_logging import api_logger
from backend.database.models import PersonInPool, Player, Question, Room, Score, Vote


class SuperlativesStateMachine:
    """Manages game state transitions and logic for Superlatives."""

    def __init__(self, session: Session):
        self.session = session

    def submit_question(self, room_id: int, player_id: int, question_text: str) -> Question:
        """
        Submit a question for the current round.

        Args:
            room_id: Room ID
            player_id: Player ID submitting the question
            question_text: Question text (max 200 chars)

        Returns:
            Created Question object
        """
        room = self.session.get(Room, room_id)
        if not room:
            raise ValueError(f"Room {room_id} not found")

        if room.status != "question_submission":
            raise ValueError(f"Room not in question submission phase (current: {room.status})")

        # Check if player already submitted a question for this round
        existing = self.session.exec(
            select(Question).where(
                Question.room_id == room_id, Question.player_id == player_id, Question.round_number == room.current_round
            )
        ).first()

        if existing:
            raise ValueError("Player already submitted a question for this round")

        # Create question
        question = Question(
            room_id=room_id,
            player_id=player_id,
            round_number=room.current_round,
            question_text=question_text,
        )
        self.session.add(question)
        self.session.commit()
        self.session.refresh(question)

        api_logger.info(f"Question submitted: room={room_id} player={player_id} round={room.current_round}")
        return question

    def submit_vote(
        self, room_id: int, player_id: int, question_id: int, voted_for_name: str, is_revote: bool = False
    ) -> Vote:
        """
        Submit a vote for a question.

        Args:
            room_id: Room ID
            player_id: Player ID voting
            question_id: Question ID being voted on
            voted_for_name: Name from people pool
            is_revote: Whether this is a revote (tie-breaking)

        Returns:
            Created Vote object
        """
        room = self.session.get(Room, room_id)
        if not room:
            raise ValueError(f"Room {room_id} not found")

        if room.status != "voting":
            raise ValueError(f"Room not in voting phase (current: {room.status})")

        question = self.session.get(Question, question_id)
        if not question or question.room_id != room_id:
            raise ValueError(f"Question {question_id} not found in room {room_id}")

        # Verify voted_for_name exists in people pool
        person = self.session.exec(
            select(PersonInPool).where(PersonInPool.room_id == room_id, PersonInPool.name == voted_for_name)
        ).first()

        if not person:
            raise ValueError(f"Person '{voted_for_name}' not in people pool for room {room_id}")

        # Check if player already voted for this question (non-revote)
        if not is_revote:
            existing = self.session.exec(
                select(Vote).where(Vote.question_id == question_id, Vote.voter_id == player_id, Vote.is_revote == False)
            ).first()

            if existing:
                raise ValueError("Player already voted for this question")

        # Create vote
        vote = Vote(
            question_id=question_id, voter_id=player_id, voted_for_name=voted_for_name, is_revote=is_revote
        )
        self.session.add(vote)
        self.session.commit()
        self.session.refresh(vote)

        api_logger.info(
            f"Vote submitted: room={room_id} player={player_id} question={question_id} voted_for={voted_for_name} is_revote={is_revote}"
        )
        return vote

    def calculate_results(self, question_id: int) -> dict:
        """
        Calculate voting results for a question.

        Returns:
            dict with:
                - votes_by_person: dict[str, int] mapping person name to vote count
                - total_votes: int
                - winner: str | None (None if tie)
                - is_tie: bool
                - tied_people: list[str]
                - fastest_voter: Player | None
        """
        question = self.session.get(Question, question_id)
        if not question:
            raise ValueError(f"Question {question_id} not found")

        # Get all non-revote votes for this question
        votes = self.session.exec(
            select(Vote).where(Vote.question_id == question_id, Vote.is_revote == False).order_by(Vote.timestamp)
        ).all()

        # Count votes by person
        votes_by_person: dict[str, int] = {}
        for vote in votes:
            votes_by_person[vote.voted_for_name] = votes_by_person.get(vote.voted_for_name, 0) + 1

        total_votes = len(votes)

        # Determine winner
        if not votes_by_person:
            return {
                "votes_by_person": {},
                "total_votes": 0,
                "winner": None,
                "is_tie": False,
                "tied_people": [],
                "fastest_voter": None,
            }

        max_votes = max(votes_by_person.values())
        top_people = [name for name, count in votes_by_person.items() if count == max_votes]

        is_tie = len(top_people) > 1
        winner = None if is_tie else top_people[0]

        # Get fastest voter (first vote)
        fastest_voter = None
        if votes:
            fastest_vote = votes[0]
            fastest_voter = self.session.get(Player, fastest_vote.voter_id)

        return {
            "votes_by_person": votes_by_person,
            "total_votes": total_votes,
            "winner": winner,
            "is_tie": is_tie,
            "tied_people": top_people if is_tie else [],
            "fastest_voter": fastest_voter,
        }

    def award_points(self, room_id: int, question_id: int) -> list[tuple[Player, int, str]]:
        """
        Award points for a question based on voting results.

        Returns:
            List of tuples: (Player, points_awarded, reason)
        """
        results = self.calculate_results(question_id)
        room = self.session.get(Room, room_id)
        if not room:
            raise ValueError(f"Room {room_id} not found")

        awarded = []

        # Award 100 points to the question submitter if their question got majority vote
        if results["winner"] and not results["is_tie"]:
            question = self.session.get(Question, question_id)
            if question:
                player = self.session.get(Player, question.player_id)
                if player:
                    score = self.session.exec(select(Score).where(Score.player_id == player.id)).first()
                    if not score:
                        score = Score(player_id=player.id, room_id=room_id)
                        self.session.add(score)

                    score.total_score += 100
                    if room.current_round == 1:
                        score.round_1_score += 100
                    elif room.current_round == 2:
                        score.round_2_score += 100
                    elif room.current_round == 3:
                        score.round_3_score += 100

                    awarded.append((player, 100, "majority_vote"))
                    api_logger.info(f"Awarded 100 points to player {player.id} for majority vote")

        # Award 20 points speed bonus to fastest voter
        if results["fastest_voter"]:
            fastest = results["fastest_voter"]
            score = self.session.exec(select(Score).where(Score.player_id == fastest.id)).first()
            if not score:
                score = Score(player_id=fastest.id, room_id=room_id)
                self.session.add(score)

            score.total_score += 20
            if room.current_round == 1:
                score.round_1_score += 20
            elif room.current_round == 2:
                score.round_2_score += 20
            elif room.current_round == 3:
                score.round_3_score += 20

            awarded.append((fastest, 20, "speed_bonus"))
            api_logger.info(f"Awarded 20 points to player {fastest.id} for speed bonus")

        self.session.commit()
        return awarded

    def start_next_question(self, room_id: int) -> Optional[Question]:
        """
        Get the next unvoted question for the current round.

        Returns:
            Question object or None if all questions have been voted on
        """
        room = self.session.get(Room, room_id)
        if not room:
            raise ValueError(f"Room {room_id} not found")

        # Find first question that hasn't been voted on
        questions = self.session.exec(
            select(Question)
            .where(Question.room_id == room_id, Question.round_number == room.current_round)
            .order_by(Question.created_at)
        ).all()

        for question in questions:
            if not question.voting_completed:
                return question

        return None

    def is_question_submission_complete(self, room_id: int) -> bool:
        """Check if all players have submitted questions for the current round."""
        room = self.session.get(Room, room_id)
        if not room:
            return False

        # Count players
        player_count = self.session.exec(select(Player).where(Player.room_id == room_id)).all()
        total_players = len(player_count)

        # Count questions submitted for current round
        questions = self.session.exec(
            select(Question).where(Question.room_id == room_id, Question.round_number == room.current_round)
        ).all()

        return len(questions) >= total_players

    def is_voting_complete(self, question_id: int) -> bool:
        """Check if all players have voted for a question."""
        question = self.session.get(Question, question_id)
        if not question:
            return False

        # Count players in room
        players = self.session.exec(select(Player).where(Player.room_id == question.room_id)).all()
        total_players = len(players)

        # Count votes for this question (non-revote)
        votes = self.session.exec(
            select(Vote).where(Vote.question_id == question_id, Vote.is_revote == False)
        ).all()

        return len(votes) >= total_players

    def is_round_complete(self, room_id: int) -> bool:
        """Check if all questions for the current round have been voted on."""
        room = self.session.get(Room, room_id)
        if not room:
            return False

        # Get all questions for current round
        questions = self.session.exec(
            select(Question).where(Question.room_id == room_id, Question.round_number == room.current_round)
        ).all()

        if not questions:
            return False

        # Check if all have been voted on
        for question in questions:
            if not question.voting_completed:
                return False

        return True

    def is_game_complete(self, room_id: int) -> bool:
        """Check if all 3 rounds have been completed."""
        room = self.session.get(Room, room_id)
        if not room:
            return False

        return room.current_round >= 3 and self.is_round_complete(room_id)

    def start_new_round(self, room_id: int) -> bool:
        """
        Start a new round.

        Returns:
            True if round was started, False if game is already complete
        """
        room = self.session.get(Room, room_id)
        if not room:
            raise ValueError(f"Room {room_id} not found")

        if room.current_round >= 3:
            api_logger.warning(f"Cannot start new round for room {room_id}: already at round 3")
            return False

        room.current_round += 1
        room.status = "question_submission"
        self.session.commit()

        api_logger.info(f"Started round {room.current_round} for room {room_id}")
        return True
