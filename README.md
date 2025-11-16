# Raddle Teams 🎯

A team-based multiplayer word chain puzzle game inspired by raddle.quest. Players work together in teams to solve word puzzles by connecting words through clever clues.

## 🚀 Current Status: Phase 1 Implementation Complete

The core lobby and team management system is implemented and functional. The backend has been completely reworked to support the new lobby-based architecture.

## ✨ Features

### Phase 1 (🟢 Complete)

**Admin Features:**
- **🔐 Token-based Authentication**: Secure admin access with token storage
- **🏢 Lobby Management**: Create and view all lobbies
- **� Lobby Inspection**: Peak into lobbies to see players and teams
- **🌐 Admin WebSocket Support**: Real-time admin dashboard updates

**Player Features:**
- **� Lobby Joining**: Join lobbies using 6-character codes
- **👤 Player Management**: Automatic player creation and session handling
- **� Reconnection Support**: Get active lobby for reconnecting players
- **📊 Lobby Information**: View real-time lobby details and player status

**Technical Features:**
- **� Token Storage**: Admin and user tokens stored in localStorage
- **🔗 API Integration**: RESTful endpoints matching new backend structure
- **📱 Responsive UI**: Mobile-first design with Tailwind CSS
- **⚡ Real-time Updates**: WebSocket connections for live updates

### Phase 2 (🔄 Next)

- **Team Assignment**: Admin functionality to assign players to teams
- **Game State Management**: Start games and manage game phases
- **Actual Game Mechanics**: Word chain puzzle implementation
- **Puzzle Solving**: Real-time collaborative puzzle solving with optimistic locking

### Phase 3 (🔮 Future)

- Multiple puzzles + progress tracking
- Hint system with time penalties
- Team elimination mechanics
- Enhanced admin dashboard with analytics

## 🛠️ Technology Stack

### Backend

- **FastAPI** - Modern Python web framework with new lobby-based architecture
- **SQLModel** - Type-safe database models with SQLite
- **WebSockets** - Real-time bidirectional communication for admin and players
- **Poetry** - Python dependency management
- **Bearer Token Auth** - Secure admin authentication

### Frontend

- **React 18** - Modern React with hooks and context
- **TypeScript** - Type-safe JavaScript with updated type definitions
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Lightning-fast build tool and dev server
- **React Router** - Client-side routing for lobby system

### Key Technologies

- **Real-time Communication**: WebSocket-based team chat and game updates
- **Database**: SQLite with SQLAlchemy ORM for data persistence
- **Modern CSS**: CSS layers, registered properties, OKLCH colors
- **Type Safety**: Full TypeScript coverage across frontend and API

## 🏁 Quick Start

### Prerequisites

- **Python 3.12+**
- **Node.js 18+** (compatible with latest Vite)
- **uv** (install from [astral.sh/uv](https://astral.sh/uv))

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/NADEE-MJ/raddle.teams.git
   cd raddle.teams
   ```

2. **Install dependencies**

   ```bash
   ./rt install
   ```

   This will install both Python and JavaScript dependencies using `uv sync` and `npm install`.

3. **Set up environment variables**

   Create a `.env` file in the root directory with the following variables:
   ```env
   RADDLE_ENV=development
   ADMIN_TOKEN=your_admin_token_here
   ```

### Running the Application

#### Option 1: Full Application (Recommended)

```bash
# Starts the FastAPI server serving both backend API and frontend
./rt server
```

Then open http://localhost:8000

#### Option 2: Development Mode with Auto-Rebuild

```bash
# Start server with frontend watch mode
./rt server --watch
```

This automatically rebuilds the frontend when files change.

#### Option 3: Frontend Development

```bash
# Terminal 1: Start backend server (without building frontend)
./rt server --no-build

# Terminal 2: Start frontend dev server
npm run dev
```

- Backend: http://localhost:8000
- Frontend dev: http://localhost:5173

## 🎮 How to Play

### For Players:

1. Go to http://localhost:8000
2. Enter your name and a 6-character lobby code to join
3. Wait in the lobby for other players and team assignments
4. **Coming in Phase 2**: Solve word chain puzzles with your teammates!

### For Admins:

1. Go to http://localhost:8000/admin
2. Authenticate with admin token
3. Create new lobbies and manage existing ones
4. View lobby details and player information
5. **Coming in Phase 2**: Assign players to teams and start games

## 📁 Project Structure

```
raddle.teams/
├── backend/              # FastAPI backend application
│   ├── api/             # REST API endpoints
│   │   ├── admin/       # Admin-specific endpoints
│   │   │   ├── auth.py  # Admin authentication
│   │   │   └── lobby/   # Admin lobby management
│   │   ├── game.py      # Game endpoints
│   │   └── lobby.py     # Player lobby endpoints
│   ├── database/        # Database models and configuration
│   ├── game/            # Game logic (state machine, puzzles)
│   ├── utils/           # Utility functions
│   ├── websocket/       # WebSocket handlers for real-time features
│   ├── main.py          # FastAPI application entry point
│   ├── schemas.py       # Pydantic request/response models
│   ├── dependencies.py  # FastAPI dependency injection
│   ├── settings.py      # Configuration management
│   └── custom_logging.py # Logging configuration
├── frontend/            # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── layouts/     # Layout components
│   │   ├── pages/       # Main application pages
│   │   ├── services/    # API service layer
│   │   ├── types/       # TypeScript type definitions
│   │   ├── App.tsx      # Main React application
│   │   ├── main.tsx     # React entry point
│   │   └── router.tsx   # React Router configuration
│   ├── index.html       # HTML template
│   └── public/          # Static assets
├── e2e/                 # End-to-end tests
├── puzzles_from_raddle/ # Game puzzle definitions
│   └── json_puzzles/    # Puzzle JSON files
├── static/              # Built frontend assets (generated)
├── rt                   # Command runner script
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
./rt server --reload

# Run tests
./rt test

# Run Python unit tests
pytest

# Format Python code
./rt format --backend-only

# Type check Python code
uvx ty check
```

### Frontend Development

```bash
# Start development server (Vite)
npm run dev

# Build for production
./rt build

# Build with file watching
./rt build --watch

# Run unit tests
./rt vitest

# Type check
npm run type-check

# Format
./rt format --frontend-only

# Check formatting
./rt format --check
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

## 🌐 API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Current API Endpoints

**Player Endpoints:**
- `POST /api/lobby/{lobby_code}` - Join a lobby with 6-character code
- `GET /api/lobby/active` - Get current player session info
- `GET /api/lobby` - Get current lobby information
- `DELETE /api/lobby` - Leave current lobby
- `GET /api/lobby/{lobby_id}` - Get detailed lobby information

**Admin Endpoints:**
- `POST /api/admin/auth` - Admin authentication
- `POST /api/admin/lobby` - Create new lobby
- `GET /api/admin/lobby` - List all lobbies
- `GET /api/admin/lobby/{lobby_id}` - Get specific lobby details

**WebSocket Endpoints:**
- `WS /ws/lobby/{player_session_id}` - Player WebSocket connection
- `WS /ws/admin/{admin_token}` - Admin WebSocket connection

**Utility:**
- `GET /api` - API information
- `DELETE /api/reset-db` - Reset database (testing mode only)

## 📸 Screenshots

**Player Lobby Interface**
![Player Lobby](https://github.com/user-attachments/assets/03568107-ed00-4bea-8cb5-a3de0c6412d9)

**Admin Control Panel**
![Admin Panel](https://github.com/user-attachments/assets/1fd191fe-3120-421d-a767-ca086e025348)

**Player in Lobby (Connected)**
![Player Connected](https://github.com/user-attachments/assets/97708782-fb23-44ee-9169-fea8da424357)
