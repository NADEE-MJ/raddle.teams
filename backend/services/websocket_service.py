from typing import Union

from sqlmodel import Session, select

from backend.database import get_engine
from backend.database.models import Game, Player, Team
from backend.websocket.events import (
    GameCreatedEvent,
    GameEvent,
    GameFinishedEvent,
    GameStartedEvent,
    GuessSubmittedEvent,
    LeaderboardUpdateEvent,
    TeamCompletedEvent,
    TeamProgressUpdateEvent,
    WordSolvedEvent,
)
from backend.websocket.managers import lobby_websocket_manager


class WebSocketBroadcastService:
    def __init__(self):
        pass

    async def broadcast_game_event(
        self, 
        lobby_id: int, 
        event: Union[GameEvent, dict]
    ):
        """Broadcast a game event to all players in the lobby."""
        await lobby_websocket_manager.broadcast_to_lobby(lobby_id, event)

    async def broadcast_game_created(self, game_id: int, puzzle_name: str, state: str):
        """Broadcast when a new game is created."""
        with Session(get_engine()) as session:
            game = session.get(Game, game_id)
            if not game:
                return

            event = GameCreatedEvent(
                game_id=game_id,
                lobby_id=game.lobby_id,
                puzzle_name=puzzle_name,
                state=state
            )
            await self.broadcast_game_event(game.lobby_id, event)

    async def broadcast_game_started(self, game_id: int):
        """Broadcast when a game starts."""
        with Session(get_engine()) as session:
            game = session.get(Game, game_id)
            if not game:
                return

            event = GameStartedEvent(
                game_id=game_id,
                lobby_id=game.lobby_id
            )
            await self.broadcast_game_event(game.lobby_id, event)

    async def broadcast_game_finished(self, game_id: int, winning_team_id: int = None):
        """Broadcast when a game finishes."""
        with Session(get_engine()) as session:
            game = session.get(Game, game_id)
            if not game:
                return

            winning_team_name = None
            if winning_team_id:
                team = session.get(Team, winning_team_id)
                winning_team_name = team.name if team else None

            event = GameFinishedEvent(
                game_id=game_id,
                lobby_id=game.lobby_id,
                winning_team_id=winning_team_id,
                winning_team_name=winning_team_name
            )
            await self.broadcast_game_event(game.lobby_id, event)

    async def broadcast_guess_submitted(
        self,
        game_id: int,
        team_id: int,
        player_id: int,
        word_index: int,
        direction: str,
        guess: str,
        is_correct: bool
    ):
        """Broadcast when a player submits a guess."""
        with Session(get_engine()) as session:
            game = session.get(Game, game_id)
            player = session.get(Player, player_id)
            
            if not game or not player:
                return

            event = GuessSubmittedEvent(
                game_id=game_id,
                lobby_id=game.lobby_id,
                team_id=team_id,
                player_id=player_id,
                player_name=player.name,
                word_index=word_index,
                direction=direction,
                guess=guess,
                is_correct=is_correct
            )
            await self.broadcast_game_event(game.lobby_id, event)

    async def broadcast_word_solved(
        self,
        game_id: int,
        team_id: int,
        word_index: int,
        word: str,
        solved_by_player_id: int
    ):
        """Broadcast when a team solves a word."""
        with Session(get_engine()) as session:
            game = session.get(Game, game_id)
            team = session.get(Team, team_id)
            player = session.get(Player, solved_by_player_id)
            
            if not game or not team or not player:
                return

            event = WordSolvedEvent(
                game_id=game_id,
                lobby_id=game.lobby_id,
                team_id=team_id,
                team_name=team.name,
                word_index=word_index,
                word=word,
                solved_by_player_id=solved_by_player_id,
                solved_by_player_name=player.name
            )
            await self.broadcast_game_event(game.lobby_id, event)

    async def broadcast_team_progress_update(self, game_id: int, team_id: int):
        """Broadcast team progress update."""
        with Session(get_engine()) as session:
            game = session.get(Game, game_id)
            team = session.get(Team, team_id)
            
            if not game or not team:
                return

            event = TeamProgressUpdateEvent(
                game_id=game_id,
                lobby_id=game.lobby_id,
                team_id=team_id,
                team_name=team.name,
                current_word_index=team.current_word_index,
                completed_at=team.completed_at.isoformat() if team.completed_at else None
            )
            await self.broadcast_game_event(game.lobby_id, event)

    async def broadcast_team_completed(
        self, 
        game_id: int, 
        team_id: int, 
        completion_rank: int
    ):
        """Broadcast when a team completes the puzzle."""
        with Session(get_engine()) as session:
            game = session.get(Game, game_id)
            team = session.get(Team, team_id)
            
            if not game or not team or not team.completed_at:
                return

            event = TeamCompletedEvent(
                game_id=game_id,
                lobby_id=game.lobby_id,
                team_id=team_id,
                team_name=team.name,
                completed_at=team.completed_at.isoformat(),
                completion_rank=completion_rank
            )
            await self.broadcast_game_event(game.lobby_id, event)

    async def broadcast_leaderboard_update(self, game_id: int, leaderboard: list):
        """Broadcast updated leaderboard."""
        with Session(get_engine()) as session:
            game = session.get(Game, game_id)
            
            if not game:
                return

            event = LeaderboardUpdateEvent(
                game_id=game_id,
                lobby_id=game.lobby_id,
                leaderboard=leaderboard
            )
            await self.broadcast_game_event(game.lobby_id, event)

    def calculate_completion_rank(self, team_id: int, game_id: int) -> int:
        """Calculate the completion rank for a team."""
        with Session(get_engine()) as session:
            # Count teams that completed before this team
            completed_teams = session.exec(
                select(Team)
                .where(Team.game_id == game_id)
                .where(Team.completed_at.is_not(None))
                .order_by(Team.completed_at)
            ).all()
            
            for rank, team in enumerate(completed_teams, 1):
                if team.id == team_id:
                    return rank
            
            return len(completed_teams)


websocket_broadcast_service = WebSocketBroadcastService()