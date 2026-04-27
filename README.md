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

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

This is a blatant rip off of [raddle.quest](https://raddle.quest) built with modern web technologies for real-time multiplayer collaboration
