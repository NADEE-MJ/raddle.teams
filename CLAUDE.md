# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Command Line Tool

**All development commands are accessed through the `./rt` command runner:**
- The `rt` script is a Python CLI tool built with Rich and Typer
- Run `./rt --help` to see all available commands and options

## Development Commands

**Core Commands (using ./rt):**
- `./rt build` or `./rt b` - 🏗️ Build the React frontend for production/testing (need to run this after every frontend change)
- `./rt build --watch` or `./rt b -w` - 👀 Build with file watching enabled for continuous rebuilding
- `./rt server` or `./rt s` - 🚀 Start development server (Python FastAPI, frontend is built before starting the server)
- `./rt server -r` or `./rt s -r` - 🚀 Start development server (Python FastAPI with auto-reload)
- `./rt server --watch` - 🚀👀 Start server with frontend watch mode (builds and serves)
- `./rt server --no-build` - ⚡ Start server without building frontend first
- `./rt test` or `./rt t` - 🧪 Run Python e2e test suite with Playwright (auto runs frontend build and testing server)
- `./rt vitest` or `./rt vi` - 🧪 Run frontend unit tests with Vitest
- `./rt install` or `./rt i` - 📦 Install Python and Node.js dependencies
- `./rt format` or `./rt f` - 🎨 Format code using Prettier (frontend) and Ruff (backend)
- `./rt format --check` - 🔍 Check formatting without changing files
- `./rt trace <file>` or `./rt tr <file>` - 🔍 Open Playwright trace viewer for test recordings
- `./rt precommit-install` or `./rt pc-install` - 🪝 Install pre-commit hooks into git repository
- `./rt precommit` or `./rt pc` - 🪝 Run pre-commit hooks manually
- `./rt precommit-update` or `./rt pc-update` - 🔄 Update pre-commit hook versions to latest
- `./rt setup` or `./rt init` - 🎬 First-time setup wizard
- `./rt --version` or `./rt -v` - 📖 Show version information

**Advanced Testing Options:**

- `uvx ty check` - type checking for Python code
- `./rt test --filter <pattern>` or `./rt t -f <pattern>` - 🎯 Run specific tests matching pattern
- `./rt test --verbose` or `./rt t -v` - 🔍 Run tests with verbose output
- `./rt test --very-verbose` or `./rt t -vv` - 🔍🔍 Run tests with very verbose output
- `./rt test --record` or `./rt t -r` - 📹 Run tests with video/trace recording enabled
- `./rt test --slow-mo` or `./rt t -sm` - 🐌 Run tests in slow motion mode
- `./rt test --debug` or `./rt t -d` - 🐛 Run tests in Playwright debug mode
- `./rt test tests/e2e/path/to/test.py` - Run specific test file

**Advanced Vitest Testing Options:**

- `./rt vitest --verbose` or `./rt vi -v` - 👀 Run Vitest with verbose output
- `./rt vitest --filter <pattern>` or `./rt vi -f <pattern>` - 🎯 Run specific tests matching pattern

**Server Options:**
- `./rt server --port 9000` or `./rt s -p 9000` - 🔌 Run server on custom port
- `./rt server --host 0.0.0.0` or `./rt s -H 0.0.0.0` - 🏠 Bind server to all interfaces
- `./rt server --reload` or `./rt s -r` - 🔄 Enable auto-reload on code changes
- `./rt server --log-level debug` or `./rt s -l debug` - 📝 Set custom logging level

**Formatting Options:**
- `./rt format --frontend-only` - ✨ Format only frontend code (Prettier + ESLint)
- `./rt format --backend-only` - 🐍 Format only backend code (Ruff)
- `./rt format --check` - 🔍 Check formatting without making changes

**Installation Options:**
- `./rt install --sync` or `./rt i -s` - 🔄 Sync dependencies (remove unused packages)

## Project Architecture

This is a full-stack team-based multiplayer word puzzle game with real-time WebSocket communication.

### Backend Structure (FastAPI + SQLite)

- **`backend/main.py`** - FastAPI application entry point with route mounting
- **`backend/api/`** - REST API endpoints organized by feature:
  - `lobby.py` - Player lobby management
  - `game.py` - Game logic and puzzle endpoints
  - `admin/auth.py` - Admin authentication
  - `admin/lobby/index.py` - Admin lobby management
  - `admin/lobby/team.py` - Admin team management
- **`backend/database/`** - SQLModel database layer with models
- **`backend/websocket/`** - WebSocket handlers for real-time updates:
  - `api.py` - WebSocket API endpoints
  - `events.py` - WebSocket event handlers
  - `managers.py` - WebSocket connection managers
- **`backend/game/`** - Game logic:
  - `state_machine.py` - Game state machine
  - `puzzles.py` - Puzzle generation and management
- **`backend/utils/`** - Utility functions:
  - `name_generator.py` - Random name generation
- **`backend/schemas.py`** - Pydantic request/response models
- **`backend/dependencies.py`** - FastAPI dependency injection
- **`backend/settings.py`** - Configuration management
- **`backend/custom_logging.py`** - Custom logging configuration

### Frontend Structure (React + TypeScript + Vite)

- **`frontend/src/main.tsx`** - React application entry point
- **`frontend/src/App.tsx`** - Root component with router
- **`frontend/src/router.tsx`** - React Router configuration with lazy loading
- **`frontend/src/layouts/`** - Layout components (GlobalLayout, AdminLayout, etc.)
- **`frontend/src/pages/`** - Page components (LandingPage, LobbyPage, AdminPage, GamePage)
- **`frontend/src/components/`** - Reusable React components
- **`frontend/src/context/`** - React context providers for state management
- **`frontend/src/hooks/`** - Custom React hooks
- **`frontend/src/services/`** - API service layer
- **`frontend/src/types/`** - TypeScript type definitions

### Key Technical Details

**Database Models:**

- Player: name, session_id, lobby_id, team_id
- Team: name, lobby_id, current_word_index, completed_at
- Lobby: code (6-character), name, created_at
- Guess: team_id, player_id, word_index, direction, guess, is_correct
- Uses foreign key cascading deletes

**Real-time Architecture:**

- WebSocket connections per player for real-time updates
- Team-based message broadcasting
- Optimistic locking for simultaneous submissions
- Admin WebSocket for lobby monitoring

**Authentication:**

- Token-based admin authentication
- Player sessions with automatic reconnection support
- localStorage token persistence

**Build System:**

- Vite for fast frontend development and building
- TypeScript path aliases (`@/*` maps to `frontend/src/*`)
- Tailwind CSS for styling
- ESLint + Prettier for code quality
- UV for Python dependency management

## Game Flow Architecture

1. **Lobby Phase**: Players join with 6-character codes, admin manages teams
2. **Game Phase**: Teams compete to solve word chain puzzles
3. **Real-time Collaboration**: All team members see guesses and progress instantly

## Key Development Notes

- Frontend builds to `static/` directory, served by FastAPI in production
- Use `./rt server --watch` for development with auto-rebuilding frontend
- Use `./rt server --no-build` to skip frontend building and serve existing static files
- Database auto-creates on startup, supports testing mode with reset endpoint
- WebSocket connections handle both player gameplay and admin monitoring
- Uses modern React patterns: hooks, context, lazy loading, Suspense
- All development commands centralized in the `./rt` tool with rich UI feedback

## Testing Architecture

**Python Tests:**

- Uses pytest integrated into the `./rt test` command
- Test environment automatically set via `RADDLE_ENV=testing`
- E2E tests with Playwright support
- Tests organized in `backend/tests/` directory with subdirectories for different test types
- Automatic recording cleanup (screenshots, videos, traces) on test runs
- Logs go to `/logs/testing_*.log`

**Code Quality & Formatting:**

- Use `./rt format` or `./rt f` for comprehensive code formatting
- Frontend: Prettier formatting + ESLint fixing + TypeScript type checking
- Use `./rt format --check` to validate without changing files and do type checking in frontend
- All formatting integrated into the rt command for consistency
