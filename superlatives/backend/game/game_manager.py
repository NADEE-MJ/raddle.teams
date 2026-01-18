"""Game manager with automatic state transitions and timers."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Optional

from sqlmodel import Session, select

from backend.database import get_session_context
from backend.database.models import Player, Question, Room, Vote
from backend.websocket.events import (
    GameStartedEvent,
    QuestionSubmissionStartedEvent,
    QuestionSubmittedEvent,
    ResultsReadyEvent,
    RoomStateUpdatedEvent,
    VoteSubmittedEvent,
    VotingStartedEvent,
)
from backend.websocket.managers import room_websocket_manager

logger = logging.getLogger("superlatives.game_manager")


class GameManager:
    """Manages game state and automatic transitions."""

    def __init__(self):
        self.active_rooms: Dict[int, asyncio.Task] = {}
        self.running = False

    async def start(self):
        """Start the game manager."""
        self.running = True
        logger.info("Game manager started")

    async def stop(self):
        """Stop the game manager and cancel all active games."""
        self.running = False
        for task in self.active_rooms.values():
            task.cancel()
        self.active_rooms.clear()
        logger.info("Game manager stopped")

    async def start_game(self, room_id: int):
        """Start a game for a room."""
        if room_id in self.active_rooms:
            logger.warning(f"Game already running for room {room_id}")
            return

        # Cancel any existing task for this room
        if room_id in self.active_rooms:
            self.active_rooms[room_id].cancel()

        # Start game loop
        task = asyncio.create_task(self._run_game(room_id))
        self.active_rooms[room_id] = task

    async def _run_game(self, room_id: int):
        """Run the game loop for a room."""
        try:
            async with get_session_context() as db:
                room = db.get(Room, room_id)
                if not room:
                    return

                # Start round 1
                room.current_round = 1
                room.status = "question_submission"
                db.commit()

                # Broadcast game started
                event = GameStartedEvent(room_id=room_id, round_number=1)
                await room_websocket_manager.broadcast_to_room(room_id, event)

                # Broadcast question submission started
                event = QuestionSubmissionStartedEvent(room_id=room_id, round_number=1)
                await room_websocket_manager.broadcast_to_room(room_id, event)

            # Run 3 rounds
            for round_num in range(1, 4):
                await self._run_round(room_id, round_num)

            # Game complete
            async with get_session_context() as db:
                room = db.get(Room, room_id)
                if room:
                    room.status = "completed"
                    db.commit()

        except asyncio.CancelledError:
            logger.info(f"Game cancelled for room {room_id}")
        except Exception as e:
            logger.exception(f"Error in game loop for room {room_id}: {e}")
        finally:
            if room_id in self.active_rooms:
                del self.active_rooms[room_id]

    async def _run_round(self, room_id: int, round_num: int):
        """Run a single round."""
        # Wait for question submission (60 seconds)
        await self._question_submission_phase(room_id, round_num)

        # Get all questions for this round
        async with get_session_context() as db:
            questions = db.exec(
                select(Question).where(Question.room_id == room_id, Question.round_number == round_num)
            ).all()

        # Vote on each question
        for question in questions:
            await self._voting_phase(room_id, question.id)
            await self._results_phase(room_id, question.id)

        # Round complete
        async with get_session_context() as db:
            room = db.get(Room, room_id)
            if room and round_num < 3:
                room.current_round = round_num + 1
                room.status = "question_submission"
                db.commit()

                event = QuestionSubmissionStartedEvent(room_id=room_id, round_number=round_num + 1)
                await room_websocket_manager.broadcast_to_room(room_id, event)

    async def _question_submission_phase(self, room_id: int, round_num: int):
        """Handle question submission phase with 60 second timer."""
        logger.info(f"Room {room_id}: Starting question submission for round {round_num}")

        # Wait 60 seconds
        await asyncio.sleep(60)

        # Check if all questions submitted
        async with get_session_context() as db:
            players = db.exec(select(Player).where(Player.room_id == room_id)).all()
            questions = db.exec(
                select(Question).where(Question.room_id == room_id, Question.round_number == round_num)
            ).all()

            if len(questions) < len(players):
                logger.warning(
                    f"Room {room_id}: Not all questions submitted ({len(questions)}/{len(players)}), continuing anyway"
                )

            room = db.get(Room, room_id)
            if room:
                room.status = "voting"
                db.commit()

    async def _voting_phase(self, room_id: int, question_id: int):
        """Handle voting phase with 15 second timer."""
        async with get_session_context() as db:
            question = db.get(Question, question_id)
            if not question:
                return

            room = db.get(Room, room_id)
            if not room:
                return

            # Set current question
            room.current_question_id = question_id
            room.voting_started_at = datetime.now(timezone.utc)
            room.voting_duration_seconds = 15
            db.commit()

            # Broadcast voting started
            event = VotingStartedEvent(
                room_id=room_id,
                question_id=question_id,
                question_text=question.question_text,
                duration_seconds=15,
                started_at=datetime.now(timezone.utc).isoformat(),
            )
            await room_websocket_manager.broadcast_to_room(room_id, event)

        logger.info(f"Room {room_id}: Voting on question {question_id}")

        # Wait 15 seconds
        await asyncio.sleep(15)

        # Mark voting as complete
        async with get_session_context() as db:
            question = db.get(Question, question_id)
            if question:
                question.voting_completed = True
                db.commit()

    async def _results_phase(self, room_id: int, question_id: int):
        """Handle results phase with dramatic reveal."""
        logger.info(f"Room {room_id}: Showing results for question {question_id}")

        async with get_session_context() as db:
            question = db.get(Question, question_id)
            if not question:
                return

            room = db.get(Room, room_id)
            if room:
                room.status = "results"
                db.commit()

            # Get all votes
            votes = db.exec(select(Vote).where(Vote.question_id == question_id)).all()

            # Count votes
            vote_counts: Dict[str, int] = {}
            for vote in votes:
                vote_counts[vote.voted_for_name] = vote_counts.get(vote.voted_for_name, 0) + 1

            # Find winner
            if vote_counts:
                max_votes = max(vote_counts.values())
                winners = [name for name, count in vote_counts.items() if count == max_votes]
                winner = winners[0] if len(winners) == 1 else None
                is_tie = len(winners) > 1
            else:
                winner = None
                is_tie = False

            # Dramatic reveal - send votes one at a time
            revealed_votes: Dict[str, int] = {name: 0 for name in vote_counts.keys()}

            for vote in votes:
                revealed_votes[vote.voted_for_name] += 1

                # Send partial results
                event = ResultsReadyEvent(
                    room_id=room_id,
                    question_id=question_id,
                    question_text=question.question_text,
                    votes_by_person=dict(revealed_votes),
                    winner=None,  # Don't reveal winner until all votes shown
                    is_tie=False,
                    tied_people=[],
                )
                await room_websocket_manager.broadcast_to_room(room_id, event)

                # Pause for drama (0.5 seconds per vote)
                await asyncio.sleep(0.5)

            # Final results with winner
            event = ResultsReadyEvent(
                room_id=room_id,
                question_id=question_id,
                question_text=question.question_text,
                votes_by_person=vote_counts,
                winner=winner,
                is_tie=is_tie,
                tied_people=winners if is_tie else [],
            )
            await room_websocket_manager.broadcast_to_room(room_id, event)

            # Mark results as shown
            question.results_shown = True
            db.commit()

        # Pause before next question (3 seconds to view results)
        await asyncio.sleep(3)


# Global instance
game_manager = GameManager()
