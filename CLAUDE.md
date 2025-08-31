# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Frontend:**
- `npm run build` - Build the React frontend for production
- `npm run build:watch` - Build with file watching enabled
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint (max 15 warnings allowed)
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format:check` - Check code formatting with Prettier
- `npm run check` - Run type-check, lint, and format-check in sequence

**Backend:**
- `npm run server` - Start development server (Python FastAPI with auto-reload)
- `npm run testing-server` - Start server in testing mode
- `npm run lint:python` - Lint Python code with ruff
- `npm run format:python` - Format Python code with ruff
- `npm run test` - Run Python test suite using bin/run_tests.py

**Alternative Python commands:**
- `poetry run python bin/run_server.py development` - Start development server directly
- `poetry run python bin/run_tests.py` - Run tests directly with pytest

## Project Architecture

This is a full-stack team-based multiplayer word puzzle game with real-time WebSocket communication.

### Backend Structure (FastAPI + SQLite)
- **`backend/main.py`** - FastAPI application entry point with route mounting
- **`backend/api/`** - REST API endpoints organized by feature:
  - `lobby/` - Player lobby management
  - `admin/` - Admin authentication and lobby control
- **`backend/database/`** - SQLModel database layer with models
- **`backend/websocket/`** - WebSocket handlers for real-time updates
- **`backend/schemas.py`** - Pydantic request/response models
- **`backend/dependencies.py`** - FastAPI dependency injection
- **`backend/settings.py`** - Configuration management

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
- Team: name, lobby_id
- Lobby: code (6-character), state management
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
- Poetry for Python dependency management

## Game Flow Architecture

1. **Lobby Phase**: Players join with 6-character codes, admin manages teams
2. **Game Phase**: Teams compete to solve word chain puzzles
3. **Real-time Collaboration**: All team members see guesses and progress instantly
4. **Optimistic Locking**: First correct answer wins, prevents race conditions

## Key Development Notes

- Frontend builds to `static/` directory, served by FastAPI in production
- Development uses separate Vite dev server (port 5173) + FastAPI backend (port 8000)
- All frontend requests proxy to backend in development
- Database auto-creates on startup, supports testing mode with reset endpoint
- WebSocket connections handle both player gameplay and admin monitoring
- Uses modern React patterns: hooks, context, lazy loading, Suspense