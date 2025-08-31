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

- Actual game mechanics (word chain puzzles)
- Team assignment and management
- Game state management
- Puzzle solving with optimistic locking

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
   poetry run python run.py
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
poetry run python run.py
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


# PLAN
# main game concept

This is a web-based multiplayer game. The way the game works is similar to the online game Raddle.quest. Players attempt to join two words together in a chain using clues along the way. You get the first and last words and a bank of clues. You can either start from the top down or bottom up and switch as you go along. All you know for each word you are currently on is the number of letters in the next word, here is an example:

DOWN -----> EARTH
clues in the forward direction (out of order): [
Cardinal direction that's DOWN on a map, most of the time
Change the first letter of DOWN to get a part of the body
Kind of food or music that sounds like DOWN
Move the first letter of DOWN to the end to get where we are
Organ that sits inside the DOWN
Piece of clothing that often has a DOWN
Popular piano duet “________ & DOWN”
Rubber layer on the bottom of a DOWN
]

next word after down is 5 letters

answer is SOUTH (hint was: Cardinal direction that's DOWN on a map, most of the time)

next word after south is 5 letters

answer is MOUTH (hint was: Change the first letter of SOUTH to get a part of the body)

Solving from the way up the clues are reversed so:
DOWN <--- EARTH

clues in the reverse direction: [
Kind of food or music that sounds like ________ → EARTH
Move the first letter of ________ to the end to get where we are → EARTH
Organ that sits inside the ________ → EARTH
Piece of clothing that often has a ________ → EARTH
Popular piano duet “EARTH & ________”
Rubber layer on the bottom of a ________ → EARTH
]

next word before earth is 5 letters

Answer is HEART (hint was: Move the first letter of **\_\_\_\_** to the end to get where we are → EARTH)

For each word there are two hints that can be used, the first hint for that direction will let the players know which clue to use for that direction, the next hint will fill in the answer (I think this is too powerful and should be limited in some way, if the players get stuck the admin can help them along) (hints costing a time penalty would be good but it has to be significant)

words are all always capitalized and must be exact matches to the answers

teams will complete all the puzzles assigned to then until they are done they do not wait until the next team is done

## team based setup

I want to have teams work together to solve these. Initially want it to be a jackbox style setup where everyone joins on their phone with a name of their choice in a lobby and there is an admin page where you control everything, you can see who joins and their names, then the admin selects the number of teams and can start the game, players are randomly assigned to a team, the admin can switch the teams if needed, the players have x amount of time to pick their team name and now they are off

Teams now have to compete to solve x number of puzzles in the fastest amount of time. The way people collaborate with each other is by discussing the clues and potential answers in real-time, using their phones to submit answers and see the progress of their team. You can see based on the current clue your team is trying to solve what answer have been submitted, each member can individually try to solve from the forwards or backwards direction. When one person on a team solves a word it solves it for everyone on the team. Teammates should be able to see every guess that every other teammate makes in real time as well as a backlog for the current words being worked on in both the forward and backwards directions. If any clue is solved for a team in the forwards or backwards direction it solves it for everyone on the team, even if they are working on the other direction. The team who finishes all their puzzles first wins.

Submissions are a free for all, whoever submits first gets the credit for solving that part of the puzzle. Need to have some logic for how to handle which requests get handled first for a team.

potentially want to do something where the slowest team per puzzle gets eliminated or maybe everyone solves every puzzle at different times

## backend

use poetry for dependency management

the backend will be written in fastapi and require both a normal webserver and a websocket server to handle real-time communication between clients. The games will be stored as json files, here is an example of the structure, (not sure if this makes sense right now but will stick with it):
{
"words": [
"DOWN",
"SOUTH",
"HEART",
"EARTH"
],
"clues": { # DOWN AND EARTH ARE NOT INCLUDED HERE
"SOUTH": {
"forward": "CARDINAL DIRECTION THAT'S \_**\_ ON A MAP, MOST OF THE TIME",
"backward": "CHANGE THE FIRST LETTER OF **\_\_\***\* TO GET A PART OF THE BODY -> MOUTH"
},
"HEART": {
"forward": "ORGAN THAT SITS INSIDE THE **\_\_\_\_**",
"backward": "CHANGE THE FIRST LETTER OF **\_\_\_\_\*\* TO GET A PART OF THE BODY -> EARTH"
},
etc...
}
}

there will be one of these json files per puzzle, including a tutorial puzzle

a sqlite database will be used to track player progress, team information, and game state.
When users join a game, their information will be stored in the database, and their progress will be updated in real-time as they solve puzzles or their teammates solve a puzzle, when a guess is submitted all players on the same team will be notified of the submission.

if players disconnect they can rejoin the team that they were previously on, might need to have the admin involved in this somehow or ideally have this happen automatically

websockets should be based on team name or team id, which will be generated at the start of the game. Only one game can be active at a time for now.

All guesses per team should use optimistic locking to prevent overlapping submissions and race conditions, the first person to solve a clue gets their name added next to the word. There should be some sort of lock for when the correct answer is submitted so that no other guesses are processed until the lock is released.

- Lock team submissions for that specific word
- Process the correct answer
- Broadcast to all team members
- Release lock for next word

## frontend

the frontend will be made with react and vite, it should be as bare bones as possible using very basic js and react setups, make sure you are using typescript and tailwind as well.

## admin page

There should be an admin page where you can control the flow of the game, including starting and stopping the game, viewing player progress, and managing teams. There is only one game going at a time, if people join late the admin will sort them into an existing team. Admins should be able to see exactly what a team has in terms of progress (how far they are, how many hints used, etc.)

## building strategy

Phase 1: Core Mechanics

Basic lobby + team assignment
Single puzzle solving with optimistic locking
WebSocket real-time updates

Phase 2: Competition Features

Multiple puzzles + progress tracking
Admin controls + team management
Win conditions

Phase 3: Polish

Hint system + elimination mechanics
Reconnection handling
Enhanced admin dashboard

## future ideas

- Introduce elimination mechanics for teams that fall too far behind.
- Enhance the admin dashboard with more detailed analytics and controls.
- allow early finishers to spectate other teams.
- Add more puzzles and variety in word chains.
- add support for multi word answers (answers with spaces i.e. "NEW YORK")
