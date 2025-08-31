from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

from sqlmodel import Session, select

from backend.database import get_engine
from backend.database.models import Game, Guess, Player, PuzzleWord, Team
from backend.services.puzzle_service import puzzle_service


class GameService:
    def __init__(self):
        self._websocket_service = None
    
    @property
    def websocket_service(self):
        """Lazy load websocket service to avoid circular imports."""
        if self._websocket_service is None:
            from backend.services.websocket_service import websocket_broadcast_service
            self._websocket_service = websocket_broadcast_service
        return self._websocket_service

    async def submit_guess_with_locking(
        self,
        game_id: int,
        player: Player,
        word_index: int,
        direction: str,
        guess: str
    ) -> Tuple[bool, Dict]:
        """
        Submit a guess with optimistic locking to prevent race conditions.
        
        Returns:
            Tuple of (success, result_data)
        """
        with Session(get_engine()) as session:
            # Start transaction
            try:
                # Lock the team row for update to prevent concurrent modifications
                team = session.exec(
                    select(Team)
                    .where(Team.id == player.team_id)
                    .with_for_update()
                ).first()
                
                if not team:
                    return False, {"error": "Team not found"}
                
                if team.game_id != game_id:
                    return False, {"error": "Team not in this game"}
                
                # Check if team has already completed the puzzle
                if team.completed_at:
                    return False, {"error": "Team has already completed the puzzle"}
                
                # Verify game is still active
                game = session.get(Game, game_id)
                if not game or game.state != "active":
                    return False, {"error": "Game is not active"}
                
                # Get the correct word for this index
                correct_word = puzzle_service.get_word_at_index(game.puzzle_name, word_index)
                if not correct_word:
                    return False, {"error": "Invalid word index"}
                
                # Check if this word was already solved by this team
                existing_correct_guess = session.exec(
                    select(Guess)
                    .where(Guess.team_id == team.id)
                    .where(Guess.word_index == word_index)
                    .where(Guess.is_correct == True)
                ).first()
                
                if existing_correct_guess:
                    return False, {"error": "Word already solved by your team"}
                
                # Normalize and check if guess is correct
                normalized_guess = guess.upper().strip()
                is_correct = normalized_guess == correct_word.word.upper().strip()
                
                # Create guess record
                guess_record = Guess(
                    team_id=team.id,
                    player_id=player.id,
                    word_index=word_index,
                    direction=direction,
                    guess=normalized_guess,
                    is_correct=is_correct,
                )
                session.add(guess_record)
                
                # If guess is correct, update team progress
                progress_updated = False
                completed = False
                
                if is_correct:
                    # Update team progress based on direction and current position
                    old_index = team.current_word_index
                    
                    # Simple linear progression logic
                    if direction == "forward" and word_index == team.current_word_index + 1:
                        team.current_word_index = word_index
                        progress_updated = True
                    elif direction == "backward" and word_index == team.current_word_index - 1:
                        team.current_word_index = word_index
                        progress_updated = True
                    elif word_index > team.current_word_index:
                        # Allow jumps forward if solving words out of order
                        team.current_word_index = word_index
                        progress_updated = True
                    
                    # Check if team completed the puzzle
                    puzzle_length = puzzle_service.get_puzzle_length(game.puzzle_name)
                    if team.current_word_index >= puzzle_length - 1:
                        team.completed_at = datetime.now(timezone.utc)
                        completed = True
                    
                    if progress_updated:
                        session.add(team)
                
                # Commit the transaction
                session.commit()
                session.refresh(guess_record)
                
                # Broadcast events asynchronously
                try:
                    # Always broadcast the guess submission
                    await self.websocket_service.broadcast_guess_submitted(
                        game_id=game_id,
                        team_id=team.id,
                        player_id=player.id,
                        word_index=word_index,
                        direction=direction,
                        guess=normalized_guess,
                        is_correct=is_correct
                    )
                    
                    # If correct, broadcast additional events
                    if is_correct:
                        await self.websocket_service.broadcast_word_solved(
                            game_id=game_id,
                            team_id=team.id,
                            word_index=word_index,
                            word=correct_word.word,
                            solved_by_player_id=player.id
                        )
                        
                        if progress_updated:
                            await self.websocket_service.broadcast_team_progress_update(
                                game_id=game_id,
                                team_id=team.id
                            )
                        
                        if completed:
                            completion_rank = self.websocket_service.calculate_completion_rank(
                                team_id=team.id,
                                game_id=game_id
                            )
                            await self.websocket_service.broadcast_team_completed(
                                game_id=game_id,
                                team_id=team.id,
                                completion_rank=completion_rank
                            )
                        
                        # Always broadcast leaderboard update when word is solved
                        leaderboard = self.get_game_leaderboard(game_id)
                        await self.websocket_service.broadcast_leaderboard_update(
                            game_id=game_id,
                            leaderboard=leaderboard
                        )
                
                except Exception as e:
                    # Log websocket broadcast errors but don't fail the guess submission
                    print(f"WebSocket broadcast error: {e}")
                
                return True, {
                    "guess_id": guess_record.id,
                    "is_correct": is_correct,
                    "correct_word": correct_word.word if is_correct else None,
                    "progress_updated": progress_updated,
                    "team_progress": {
                        "current_word_index": team.current_word_index,
                        "completed_at": team.completed_at,
                        "is_completed": completed,
                    },
                    "puzzle_length": puzzle_service.get_puzzle_length(game.puzzle_name),
                }
                
            except Exception as e:
                # Rollback is automatic with session context manager
                return False, {"error": f"Database error: {str(e)}"}

    def get_team_progress(self, game_id: int, team_id: int) -> Optional[Dict]:
        """Get current team progress with recent guesses."""
        with Session(get_engine()) as session:
            team = session.get(Team, team_id)
            if not team or team.game_id != game_id:
                return None
            
            # Get recent guesses for the team
            recent_guesses = session.exec(
                select(Guess)
                .where(Guess.team_id == team_id)
                .order_by(Guess.submitted_at.desc())
                .limit(20)  # Get more guesses for better context
            ).all()
            
            guesses = []
            for guess in recent_guesses:
                # Get player name for the guess
                player = session.get(Player, guess.player_id)
                guesses.append({
                    "id": guess.id,
                    "player_id": guess.player_id,
                    "player_name": player.name if player else "Unknown",
                    "word_index": guess.word_index,
                    "direction": guess.direction,
                    "guess": guess.guess,
                    "is_correct": guess.is_correct,
                    "submitted_at": guess.submitted_at,
                })
            
            return {
                "team_id": team.id,
                "team_name": team.name,
                "current_word_index": team.current_word_index,
                "completed_at": team.completed_at,
                "is_completed": team.completed_at is not None,
                "recent_guesses": guesses,
            }

    def get_game_leaderboard(self, game_id: int) -> list:
        """Get current leaderboard for a game."""
        with Session(get_engine()) as session:
            # Get all teams in the game, ordered by completion status and progress
            teams = session.exec(
                select(Team)
                .where(Team.game_id == game_id)
                .order_by(
                    Team.completed_at.asc().nulls_last(),  # Completed teams first, ordered by completion time
                    Team.current_word_index.desc()         # Then by progress
                )
            ).all()
            
            leaderboard = []
            for rank, team in enumerate(teams, 1):
                # Count players in team
                player_count = len(session.exec(
                    select(Player).where(Player.team_id == team.id)
                ).all())
                
                leaderboard.append({
                    "rank": rank,
                    "team_id": team.id,
                    "team_name": team.name,
                    "current_word_index": team.current_word_index,
                    "completed_at": team.completed_at,
                    "player_count": player_count,
                    "is_completed": team.completed_at is not None,
                })
            
            return leaderboard

    def check_game_completion(self, game_id: int) -> bool:
        """Check if game should be marked as finished (all teams completed or other conditions)."""
        with Session(get_engine()) as session:
            # Get all teams in the game
            teams = session.exec(select(Team).where(Team.game_id == game_id)).all()
            
            if not teams:
                return False
            
            # Check if all teams have completed
            completed_teams = [team for team in teams if team.completed_at]
            
            # Game is complete if at least one team finished (for now)
            # Could be modified for different win conditions
            return len(completed_teams) > 0


game_service = GameService()