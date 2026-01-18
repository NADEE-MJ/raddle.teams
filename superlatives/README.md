# Superlatives Game

A Jackbox-style multiplayer party game where players submit and vote on superlatives questions!

## Features

- **Multi-screen Experience**: Separate views for TV display, player controllers, and host controls
- **Real-time Gameplay**: WebSocket-powered live updates
- **People Pool System**: Vote on players and custom non-present people
- **3 Round Structure**: Question submission → Voting → Results
- **Scoring System**: Majority vote points (100) + Speed bonus (20)
- **Host Controls**: Full game flow management from desktop browser
- **Admin Dashboard**: Monitoring and emergency controls

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- UV (Python package manager)

### Installation

```bash
# Navigate to the project
cd superlatives

# Install dependencies
./ss install

# Create .env file
cp .env.example .env
# Edit .env and set ADMIN_PASSWORD
```

### Development

```bash
# Start the development server (builds frontend + starts backend)
./ss server

# Or run with auto-reload
./ss server -r

# Or run with frontend watch mode
./ss server --watch
```

The application will be available at:
- **Backend**: http://localhost:8100
- **API Docs**: http://localhost:8100/docs
- **Frontend Dev Server** (if using --frontend-server): http://localhost:8101

### Build for Production

```bash
# Build the frontend
./ss build

# Run the server (serves built frontend)
./ss server
```

## Game Flow

### 1. Lobby Phase
- Host creates a room and gets a 6-character room code
- Players join using the room code
- Host manages the "people pool" (players + up to 20 non-present people)
- Host starts the game when ready

### 2. Question Submission Phase
- Each player submits one superlatives question (200 char max)
- Examples: "Most likely to become famous", "Best cook"

### 3. Voting Phase
- For each question, all players vote from the people pool
- 30-second timer per question
- Votes are secret until results

### 4. Results Phase
- Pie charts show vote distribution
- Question submitter gets 100 points if their question has a majority winner
- Fastest voter gets 20-point speed bonus
- Ties trigger revotes

### 5. Repeat
- 3 rounds total
- Final scores and winner declared

## Client Types

### Display View (`/display/:roomCode`)
- **Purpose**: Main TV/projector screen
- **Features**: Read-only, shows room code, game state, results
- **Optimized for**: Large screens, presentations

### Player View (`/play/:roomCode`)
- **Purpose**: Phone controller for players
- **Features**: Submit questions, vote, view personal score
- **Optimized for**: Mobile devices

### Host View (`/host/:roomCode`)
- **Purpose**: Desktop browser game management
- **Features**: Full control of game flow, people pool management, player management
- **Optimized for**: Desktop browsers

### Admin View (`/admin`)
- **Purpose**: Monitoring and emergency actions
- **Features**: View all rooms, delete rooms, kick players
- **Requires**: Admin token authentication

## Architecture

### Backend (FastAPI + SQLite)

```
backend/
├── main.py              # FastAPI application
├── database/
│   ├── models.py        # SQLModel database models
│   └── __init__.py      # Database session management
├── api/
│   ├── room.py          # Player room operations
│   ├── game.py          # Gameplay endpoints
│   ├── host.py          # Host control endpoints
│   └── admin/           # Admin monitoring
├── websocket/
│   ├── managers.py      # WebSocket connection managers
│   ├── events.py        # Event type definitions
│   └── api.py           # WebSocket endpoints
├── game/
│   └── state_machine.py # Game logic
└── utils/
    └── name_generator.py # Room name/code generation
```

### Frontend (React + TypeScript + Vite)

```
frontend/src/
├── main.tsx            # Entry point
├── App.tsx             # Root component
├── router.tsx          # React Router configuration
├── types/              # TypeScript types
├── services/           # API client
├── hooks/              # Custom React hooks
├── pages/              # Page components
│   ├── LandingPage/
│   ├── DisplayView/
│   ├── PlayerView/
│   ├── HostView/
│   ├── AdminPage/
│   └── AdminLoginPage/
└── components/         # Reusable components
```

## Development Commands

All commands are accessed through the `./ss` CLI tool:

```bash
./ss build              # Build frontend
./ss build --watch      # Build with watch mode
./ss server             # Start server (builds frontend first)
./ss server -r          # Start with auto-reload
./ss server --watch     # Start with frontend watch mode
./ss server --no-build  # Skip frontend build
./ss test               # Run Python e2e tests
./ss vitest             # Run frontend unit tests
./ss format             # Format code (Prettier + Ruff)
./ss format --check     # Check formatting + type check
./ss install            # Install dependencies
./ss setup              # First-time setup wizard
./ss --help             # See all commands
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8100/docs
- **ReDoc**: http://localhost:8100/redoc

## WebSocket Events

### Room Events
- `connection_confirmed` - Initial connection established
- `player_joined` - New player joined
- `player_left` - Player left
- `room_state_updated` - Room status changed
- `game_started` - Game has started
- `round_started` - New round started
- `round_ended` - Round completed

### Game Events
- `question_submission_started` - Round begins
- `question_submitted` - Player submitted question
- `voting_started` - Voting begins for a question
- `vote_submitted` - Player cast a vote
- `voting_complete` - All votes are in
- `results_ready` - Results available
- `points_awarded` - Points given to players

## Database Schema

- **Room**: Game room with code, status, current round
- **Player**: Player in a room with session authentication
- **PersonInPool**: Voteable people (players + non-present)
- **Question**: Superlatives questions submitted by players
- **Vote**: Votes cast for questions
- **Score**: Player scores across rounds
- **GameSession**: Session statistics

## Environment Variables

```bash
SUPERLATIVES_ENV=development  # development, testing, or production
ADMIN_PASSWORD=your_secret_token  # Admin authentication token
```

## Testing

```bash
# Run Python e2e tests
./ss test

# Run with recording
./ss test --record

# Run specific test
./ss test tests/test_game_flow.py

# Run frontend tests
./ss vitest
```

## Deployment

1. Set `SUPERLATIVES_ENV=production` in `.env`
2. Set a secure `ADMIN_PASSWORD`
3. Build the frontend: `./ss build`
4. Run the server: `./ss server`

## Troubleshooting

### Frontend not building
```bash
# Check Node.js version
node --version  # Should be 18+

# Reinstall dependencies
rm -rf node_modules package-lock.json
./ss install
```

### Backend errors
```bash
# Check Python version
python --version  # Should be 3.12+

# Reinstall Python dependencies
uv sync --reinstall
```

### Database issues
```bash
# In testing mode, reset database via API
curl -X DELETE http://localhost:8100/api/reset-db
```

## Contributing

1. Format code: `./ss format`
2. Run tests: `./ss test`
3. Check types: `./ss format --check`

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
