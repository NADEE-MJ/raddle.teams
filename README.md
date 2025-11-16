# Raddle Teams 🎯

A team-based multiplayer word chain puzzle game inspired by raddle.quest. Players work together in teams to solve word puzzles by connecting words through clever clues.

## 🎮 What It Does

### For Players
- Join lobbies using 6-character codes
- Work with your team to solve word chain puzzles in real-time
- Compete against other teams to finish first
- See live updates as teammates submit guesses

### For Admins
- Create and manage game lobbies
- Assign players to teams
- Start games and monitor team progress
- View real-time analytics

### Game Mechanics
Players receive a start word and end word, then find intermediate words using clues:

```
DOWN → SOUTH → MOUTH → TONGUE → SHOE → SOLE → SOUL → HEART → EARTH
```

Teams can work forwards or backwards, and all members see progress in real-time.

## 🚀 Quick Setup

### Prerequisites
- **Python 3.12+**
- **Node.js 18+**
- **uv** (install from [astral.sh/uv](https://astral.sh/uv))

### First-Time Setup

```bash
# Clone the repository
git clone https://github.com/NADEE-MJ/raddle.teams.git
cd raddle.teams

# Run the setup command
./rt setup
```

The setup wizard will guide you through:
1. Creating your `.env` file with required variables
2. Installing all dependencies
3. Preparing the application for first run

### Running the Application

```bash
# Start the server (builds frontend and starts backend)
./rt server

# Or with auto-rebuild on file changes
./rt server --watch
```

Then open http://localhost:8000

## 🔧 Development

For all available commands, run:
```bash
./rt --help
```

Common commands:
- `./rt build` - Build the frontend
- `./rt test` - Run tests
- `./rt format` - Format code
- `./rt vitest` - Run frontend unit tests

## 🌐 API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔮 Future Enhancements

### Planned Features
- **Hint System**: Strategic hints with time penalties
- **Elimination Mechanics**: Remove slowest teams per puzzle
- **Spectator Mode**: Watch other teams compete after finishing
- **Multi-word Answers**: Support phrases like "NEW YORK"
- **Enhanced Analytics**: Detailed team performance metrics
- **Game Templates**: Pre-configured game setups
- **Custom Puzzles**: In-game puzzle creation tools

### Technical Improvements
- **Multiple Concurrent Games**: Support many lobbies simultaneously
- **Enhanced Reconnection**: Seamless player reconnection handling
- **Advanced Analytics**: Live team performance graphs
- **Puzzle Variety**: Different chain lengths and difficulty levels

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Inspired by [raddle.quest](https://raddle.quest) and built with modern web technologies for real-time multiplayer collaboration.

## 📸 Screenshots

**Player Lobby Interface**
![Player Lobby](https://github.com/user-attachments/assets/03568107-ed00-4bea-8cb5-a3de0c6412d9)

**Admin Control Panel**
![Admin Panel](https://github.com/user-attachments/assets/1fd191fe-3120-421d-a767-ca086e025348)

**Player in Lobby (Connected)**
![Player Connected](https://github.com/user-attachments/assets/97708782-fb23-44ee-9169-fea8da424357)
