# raddle.teams/backend/ — FastAPI + WebSocket Server

Python/FastAPI backend for team-based word puzzle game.

## Structure

- `main.py` — FastAPI app entry
- `settings.py` — Pydantic Settings
- `schemas.py` — Pydantic models
- `dependencies.py` — FastAPI deps
- `api/lobby.py` — player lobby management
- `api/game.py` — game logic + puzzle endpoints
- `api/leaderboard.py` — scores/leaderboard
- `api/stats.py` — game statistics
- `api/admin/auth.py` — admin authentication
- `api/admin/lobby/` — admin lobby, team management, timer
- `database/models.py` — SQLModel: Player, Team, Lobby, Guess, etc.
- `game/state_machine.py` — game state machine
- `game/puzzles.py` — puzzle generation/management
- `websocket/api.py` — WebSocket endpoint
- `websocket/events.py` — event handling
- `websocket/managers.py` — connection management
- `utils/awards.py` — award/achievement logic
- `utils/name_generator.py` — random team names
- `custom_logging.py` — logging config
- `puzzles_sync.py` — puzzle data sync
- `tests/` — model, name_generator, puzzles, state_machine tests
