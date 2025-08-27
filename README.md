# raddle.teams
A team-based version of raddle.quest

## Phase 1 Implementation Complete! 🎉

This repository contains the initial Phase 1 implementation of Raddle Teams, featuring the core mechanics for team-based word puzzle gaming.

### Features Implemented

**✅ Core Mechanics (Phase 1)**
- **Basic Lobby System**: Players can join games with their chosen names
- **Team Assignment**: Admin can create games and assign players to teams
- **WebSocket Real-time Updates**: Live communication between players and admin
- **Admin Controls**: Complete admin interface for game management
- **Database Integration**: SQLite database for persistent game state

### Technology Stack

**Backend:**
- FastAPI with Python 3.11+
- SQLite database with SQLAlchemy ORM
- WebSocket support for real-time communication
- Poetry for dependency management

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Modern CSS for styling
- WebSocket client for real-time updates

### Getting Started

#### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- Poetry (for Python dependency management)

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NADEE-MJ/raddle.teams.git
   cd raddle.teams
   ```

2. **Install backend dependencies**
   ```bash
   pip install poetry
   poetry install --no-root
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

#### Running the Application

1. **Start the backend server**
   ```bash
   poetry run python run_server.py
   ```

2. **Access the application**
   - **Player Interface**: http://localhost:8000
   - **Admin Interface**: http://localhost:8000/admin

### Screenshots

**Player Lobby Interface**
![Player Lobby](https://github.com/user-attachments/assets/03568107-ed00-4bea-8cb5-a3de0c6412d9)

**Admin Control Panel**
![Admin Panel](https://github.com/user-attachments/assets/1fd191fe-3120-421d-a767-ca086e025348)

**Player in Lobby (Connected)**
![Player Connected](https://github.com/user-attachments/assets/97708782-fb23-44ee-9169-fea8da424357)

### API Endpoints

**Player Endpoints:**
- `POST /api/join` - Join the game lobby
- `WS /ws/{player_id}` - WebSocket connection for real-time updates

**Admin Endpoints:**
- `GET /api/admin/status` - Get current game status
- `POST /api/admin/start-game` - Start a new game
- `POST /api/admin/assign-teams` - Assign players to teams

**Health Check:**
- `GET /api/health` - Server health status

### Development

**Backend Development:**
```bash
poetry run python run_server.py
```

**Frontend Development:**
```bash
cd frontend
npm run dev
```

### What's Next - Phase 2

The next phase will include:
- Multiple puzzle solving mechanics
- Progress tracking and scoring
- Enhanced team management
- Win conditions
- Puzzle integration with the game flow

### Project Structure

```
raddle.teams/
├── backend/              # FastAPI backend
│   ├── main.py          # Main application
│   ├── database.py      # Database models and setup
│   ├── models.py        # Pydantic models
│   └── websocket_manager.py  # WebSocket handling
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   └── types/       # TypeScript types
│   └── dist/           # Built frontend assets
├── puzzles/            # Game puzzle definitions
└── pyproject.toml     # Python dependencies
```

### License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.
