# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Command Line Tool

**All development commands are accessed through the `./ss` command runner:**
- The `ss` script is a Python CLI tool built with Rich and Typer
- Run `./ss --help` to see all available commands and options

## Development Commands

**Core Commands (using ./ss):**
- `./ss build` or `./ss b` - 🏗️ Build the React frontend for production/testing
- `./ss build --watch` or `./ss b -w` - 👀 Build with file watching enabled for continuous rebuilding
- `./ss server` or `./ss s` - 🚀 Start development server (Python FastAPI, frontend is built before starting)
- `./ss server -r` or `./ss s -r` - 🚀 Start development server with auto-reload
- `./ss server --watch` - 🚀👀 Start server with frontend watch mode
- `./ss server --no-build` - ⚡ Start server without building frontend first
- `./ss server --frontend-server` - 🌐 Start only the frontend dev server on port 8101
- `./ss test` or `./ss t` - 🧪 Run Python e2e test suite with Playwright
- `./ss vitest` or `./ss vi` - 🧪 Run frontend unit tests with Vitest
- `./ss install` or `./ss i` - 📦 Install Python and Node.js dependencies
- `./ss format` or `./ss f` - 🎨 Format code using Prettier (frontend) and Ruff (backend)
- `./ss format --check` - 🔍 Check formatting without changing files + TypeScript type checking
- `./ss trace <file>` or `./ss tr <file>` - 🔍 Open Playwright trace viewer for test recordings
- `./ss precommit-install` or `./ss pc-install` - 🪝 Install pre-commit hooks
- `./ss precommit` or `./ss pc` - 🪝 Run pre-commit hooks manually
- `./ss setup` or `./ss init` - 🎬 First-time setup wizard
- `./ss --version` or `./ss -v` - 📖 Show version information

**Advanced Testing Options:**
- `./ss test --filter <pattern>` or `./ss t -f <pattern>` - 🎯 Run specific tests matching pattern
- `./ss test --verbose` or `./ss t -v` - 🔍 Run tests with verbose output
- `./ss test --record` or `./ss t -r` - 📹 Run tests with video/trace recording enabled
- `./ss test --slow-mo` or `./ss t -sm` - 🐌 Run tests in slow motion mode
- `./ss test --debug` or `./ss t -d` - 🐛 Run tests in Playwright debug mode

**Server Options:**
- `./ss server --port 8100` or `./ss s -p 8100` - 🔌 Run server on custom port (default: 8100)
- `./ss server --host 0.0.0.0` or `./ss s -H 0.0.0.0` - 🏠 Bind server to all interfaces
- `./ss server --reload` or `./ss s -r` - 🔄 Enable auto-reload on code changes
- `./ss server --log-level debug` or `./ss s -l debug` - 📝 Set custom logging level

## Project Architecture

This is a Jackbox-style multiplayer superlatives party game with real-time WebSocket communication and multi-screen support.

### Backend Structure (FastAPI + SQLite)

- **`backend/main.py`** - FastAPI application entry point with route mounting
- **`backend/api/`** - REST API endpoints organized by feature:
  - `room.py` - Player room operations (join, leave)
  - `game.py` - Gameplay endpoints (submit question, vote, get results)
  - `host.py` - Host control endpoints (create room, manage people pool, game flow control)
  - `admin/auth.py` - Admin authentication
  - `admin/room.py` - Admin monitoring and emergency actions
- **`backend/database/`** - SQLModel database layer with models
- **`backend/websocket/`** - WebSocket handlers for real-time updates:
  - `api.py` - WebSocket API endpoints
  - `events.py` - WebSocket event type definitions
  - `managers.py` - WebSocket connection managers (supports display/player/host/admin client types)
- **`backend/game/`** - Game logic:
  - `state_machine.py` - Game state machine with question submission, voting, and scoring logic
- **`backend/utils/`** - Utility functions:
  - `name_generator.py` - Room name and code generation
- **`backend/schemas.py`** - Pydantic request/response models
- **`backend/dependencies.py`** - FastAPI dependency injection (auth helpers)
- **`backend/settings.py`** - Configuration management
- **`backend/custom_logging.py`** - Custom logging configuration

### Frontend Structure (React + TypeScript + Vite)

- **`frontend/src/main.tsx`** - React application entry point
- **`frontend/src/App.tsx`** - Root component with router
- **`frontend/src/router.tsx`** - React Router configuration with lazy loading
- **`frontend/src/pages/`** - Page components:
  - `LandingPage/` - Create/join room interface
  - `DisplayView/` - TV display (read-only presentation)
  - `PlayerView/` - Phone controller (submit questions/votes)
  - `HostView/` - Desktop host controls (game management)
  - `AdminPage/` - Admin monitoring dashboard
  - `AdminLoginPage/` - Admin authentication
- **`frontend/src/hooks/`** - Custom React hooks:
  - `useWebSocket.ts` - WebSocket connection with auto-reconnect
  - `useToast.tsx` - Toast notifications
- **`frontend/src/services/`** - API service layer (api.ts)
- **`frontend/src/types/`** - TypeScript type definitions

### Key Technical Details

**Database Models:**
- Room: code (6-character), name, host, status, current_round
- Player: name, session_id, room_id, is_host
- PersonInPool: name, is_player, player_id (voteable people)
- Question: question_text (200 char max), round_number, voting_completed
- Vote: question_id, voter_id, voted_for_name, is_revote
- Score: player_id, total_score, round_1/2/3_score
- GameSession: Statistics for completed games

**Real-time Architecture:**
- WebSocket connections per client with type awareness (display/player/host/admin)
- Client-type specific message broadcasting
- Display: read-only presentation updates
- Player: game actions and personal notifications
- Host: game control confirmations
- Admin: monitoring for all rooms

**Authentication:**
- Token-based admin authentication (ADMIN_PASSWORD env var)
- Player sessions with UUID tokens (stored in localStorage)
- Host privileges checked via `is_host` flag and `require_host_session` dependency

**Build System:**
- Vite for fast frontend development and building
- TypeScript path aliases (`@/*` maps to `frontend/src/*`)
- Tailwind CSS for styling
- ESLint + Prettier for code quality
- UV for Python dependency management

## Game Flow Architecture

1. **Lobby Phase**: Players join with 6-character room code, host manages people pool
2. **Question Submission**: Each player submits one superlatives question (200 char max)
3. **Voting Phase**: Players vote on each question from the people pool (30s timer)
4. **Results Phase**: Show vote distribution, award points (100 for majority, 20 for speed)
5. **Repeat**: 3 rounds total

## Key Development Notes

- Frontend builds to `static/` directory, served by FastAPI
- Use `./ss server --watch` for development with auto-rebuilding frontend
- Use `./ss server --no-build` to skip frontend building and serve existing static files
- Database auto-creates on startup, supports testing mode with reset endpoint
- WebSocket connections handle display/player/host/admin client types
- Uses modern React patterns: hooks, lazy loading, Suspense
- All development commands centralized in the `./ss` tool with rich UI feedback
- Default ports: Backend 8100, Frontend dev server 8101

## Testing Architecture

**Python Tests:**
- Uses pytest integrated into the `./ss test` command
- Test environment automatically set via `SUPERLATIVES_ENV=testing`
- E2E tests with Playwright support
- Automatic recording cleanup (screenshots, videos, traces) on test runs
- Logs go to `/logs/testing_*.log`

**Frontend Tests:**
- Vitest for unit testing
- Run with `./ss vitest` or `./ss vi`

**Code Quality & Formatting:**
- Use `./ss format` or `./ss f` for comprehensive code formatting
- Frontend: Prettier formatting + ESLint fixing + TypeScript type checking
- Backend: Ruff formatting
- Use `./ss format --check` to validate without changing files and do type checking

IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
