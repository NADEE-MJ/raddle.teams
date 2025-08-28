# Raddle Teams 🎯

A team-based multiplayer word chain puzzle game inspired by raddle.quest. Players work together in teams to solve word puzzles by connecting words through clever clues.

## 🚀 Current Status: Phase 1 Implementation

The core multiplayer mechanics are implemented and functional. Players can join lobbies, form teams, and solve word chain puzzles together in real-time.

## ✨ Features

### Phase 1 (🟢 Complete)
- **🎮 Core Game Mechanics**: Word chain puzzles with forward/backward solving
- **👥 Team-based Multiplayer**: Real-time team collaboration with WebSocket communication
- **🎲 Lobby System**: Players join with custom names, automatic session management
- **👨‍💼 Admin Controls**: Game creation, team management, and game starting
- **🔒 Optimistic Locking**: Race condition prevention for simultaneous team guesses
- **📱 Responsive Design**: Mobile-first UI with Tailwind CSS v4
- **💾 Data Persistence**: SQLite database with proper session management

### Phase 2 (🔄 Planned)
- Multiple puzzles + progress tracking
- Enhanced admin dashboard with analytics
- Win conditions and leaderboards

### Phase 3 (🔮 Future)
- Hint system with time penalties
- Team elimination mechanics
- Reconnection handling
- Spectator mode for finished teams

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLModel** - Type-safe database models with SQLite
- **WebSockets** - Real-time bidirectional communication
- **Poetry** - Python dependency management
- **Uvicorn** - High-performance ASGI server

### Frontend
- **React 18** - Modern React with hooks and context
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS v4** - Utility-first CSS framework with latest features
- **Vite** - Lightning-fast build tool and dev server
- **React Router** - Client-side routing

### Key Technologies
- **Real-time Communication**: WebSocket-based team chat and game updates
- **Database**: SQLite with SQLAlchemy ORM for data persistence
- **Modern CSS**: CSS layers, registered properties, OKLCH colors
- **Type Safety**: Full TypeScript coverage across frontend and API

## 🏁 Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 20.19+** (for Vite compatibility)
- **Poetry** (install from [python-poetry.org](https://python-poetry.org/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NADEE-MJ/raddle.teams.git
   cd raddle.teams
   ```

2. **Install Python dependencies**
   ```bash
   poetry install
   ```

3. **Install JavaScript dependencies**
   ```bash
   npm install
   ```

4. **Build the frontend**
   ```bash
   npm run build
   ```

### Running the Application

#### Option 1: Full Application (Recommended)
```bash
# Starts the FastAPI server serving both backend API and frontend
poetry run python run.py
```
Then open http://localhost:8000

#### Option 2: Development Mode
```bash
# Terminal 1: Start backend
poetry run python run.py

# Terminal 2: Start frontend dev server (optional)
npm run dev
```
- Backend: http://localhost:8000
- Frontend dev: http://localhost:5173 (if running dev server)

## 🎮 How to Play

### For Players:
1. Go to http://localhost:8000
2. Enter your name and join the game
3. Wait in the lobby for the admin to create teams
4. Once assigned to a team, wait for the game to start
5. Solve word chain puzzles with your teammates in real-time!

### For Admins:
1. Go to http://localhost:8000/admin
2. Create a new game
3. Create teams and assign players
4. Start the game when ready
5. Monitor team progress and manage the game

## 📁 Project Structure

```
raddle.teams/
├── backend/              # FastAPI backend application
│   ├── __init__.py
│   ├── api.py           # REST API endpoints
│   ├── database.py      # Database models and configuration
│   ├── game_logic.py    # Game mechanics and puzzle logic
│   ├── schemas.py       # Pydantic request/response models
│   └── websocket.py     # WebSocket handlers for real-time features
├── frontend/            # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable React components
│   │   ├── context/     # React context providers
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Main application pages
│   │   ├── services/    # API service layer
│   │   ├── types/       # TypeScript type definitions
│   │   ├── App.tsx      # Main React application
│   │   ├── main.tsx     # React entry point
│   │   └── index.css    # Tailwind CSS imports
│   ├── index.html       # HTML template
│   └── public/          # Static assets
├── puzzles/             # Game puzzle definitions
│   └── tutorial.json    # Tutorial puzzle
├── static/              # Built frontend assets (generated)
├── main.py              # FastAPI application entry point
├── run.py               # Development server launcher
├── pyproject.toml       # Python dependencies
├── package.json         # JavaScript dependencies
├── vite.config.ts       # Vite build configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── README.md           # This file
```

## 🔧 Development

### Backend Development
```bash
# Run with auto-reload
poetry run python run.py

# Run tests (when available)
poetry run pytest

# Format code
poetry run ruff format .

# Lint code
poetry run ruff check .
```

### Frontend Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format
```

### API Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🎯 Game Mechanics

### Word Chain Puzzles
Players solve word chains by connecting a starting word to an ending word through intermediate words, using clues that describe the relationship between consecutive words.

**Example:**
```
DOWN → SOUTH → MOUTH → TONGUE → SHOE → SOLE → SOUL → HEART → EARTH
```

### Team Collaboration
- **Real-time guessing**: All team members can submit guesses simultaneously
- **Shared progress**: When one player solves a word, the entire team advances
- **Live updates**: See all teammate guesses and progress in real-time
- **Direction switching**: Teams can work forwards or backwards through the chain

### Optimistic Locking
- Prevents race conditions when multiple players guess simultaneously
- First correct answer wins and advances the team
- All other guesses for that word are invalidated

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [raddle.quest](https://raddle.quest)
- Built with modern web technologies
- Designed for real-time multiplayer collaboration

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
