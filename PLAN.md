# Raddle Teams - Development Plan

## 🎯 Game Concept

Raddle Teams is a web-based multiplayer word chain puzzle game inspired by [Raddle.quest](https://raddle.quest). Teams collaborate to solve word chains by connecting two words using clues.

### How Word Chains Work

Players receive a **start word** and **end word**, then must find the intermediate words using clues:

```
DOWN -----> EARTH
```

**Available Clues** (out of order):
- Cardinal direction that's DOWN on a map, most of the time
- Change the first letter of DOWN to get a part of the body
- Kind of food or music that sounds like DOWN
- Move the first letter of DOWN to the end to get where we are
- Organ that sits inside the DOWN
- Piece of clothing that often has a DOWN
- Popular piano duet "________ & DOWN"
- Rubber layer on the bottom of a DOWN

### Solving Process

**Forward Direction (DOWN → EARTH):**
1. Next word after DOWN is **5 letters**
2. Answer: **SOUTH** (Cardinal direction that's DOWN on a map)
3. Next word after SOUTH is **5 letters**
4. Answer: **MOUTH** (Change first letter of SOUTH to get a body part)
5. Continue until reaching EARTH...

**Backward Direction (EARTH ← DOWN):**
Players can also work backwards from EARTH, with clues reversed:
- "Move the first letter of _______ to the end to get where we are → EARTH"
- Answer: **HEART**

### Game Rules

- **Exact matches only**: All words must be CAPITALIZED and exact
- **Bidirectional solving**: Teams can work forward, backward, or switch directions
- **First correct wins**: When any team member solves a word, it advances the whole team
- **No waiting**: Teams work independently at their own pace

---

## 👥 Team-Based Gameplay

### Lobby System (Jackbox Style)

1. **Player Join**: Everyone joins on their phone with chosen names
2. **Admin Control**: Admin sees all players and manages the game
3. **Team Formation**: Admin sets number of teams, players randomly assigned
4. **Team Names**: Players have limited time to choose team names
5. **Game Start**: Teams compete to solve puzzles fastest

### Real-Time Collaboration

**Team Features:**
- **Live submissions**: See every guess from teammates in real-time
- **Dual direction work**: Members can work forward/backward simultaneously
- **Shared progress**: When one member solves, everyone advances
- **Guess history**: Full backlog of attempts for current words
- **Optimistic locking**: First correct submission wins

**Winning Condition:**
- First team to complete all assigned puzzles wins
- Teams work independently (no waiting for others)

---

## 🏗️ Technical Architecture

### Backend (FastAPI + SQLite)

**Core Technologies:**
- **FastAPI**: Web server with REST API endpoints
- **WebSockets**: Real-time team communication
- **SQLite**: Player progress, teams, and game state
- **Poetry**: Python dependency management

**Database Design:**
- Player information and session management
- Team assignments and progress tracking
- Real-time game state synchronization
- Automatic reconnection support

**Optimistic Locking System:**
1. Lock team submissions for specific word
2. Process the correct answer
3. Broadcast to all team members
4. Release lock for next word

### Puzzle Data Structure

Puzzles stored as JSON files:

```json
{
  "title": "Tutorial Puzzle",
  "ladder": [
    {
      "word": "DOWN",
      "clue": "Cardinal direction that's <> on a map, most of the time",
      "transform": "MEANS"
    },
    {
      "word": "SOUTH",
      "clue": "Change the first letter of <> to get a part of the body",
      "transform": "S->M"
    },
    {
      "word": "MOUTH",
      "clue": "Organ that sits inside the <>",
      "transform": "CONTAINS THE"
    },
    etc...
    {
      "word": "EARTH",
      "clue": null,
      "transform": null
    }
  ]
}
```

### Frontend (React + TypeScript)

**Core Technologies:**
- **React 18**: Modern hooks and context
- **TypeScript**: Full type safety
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **WebSocket Client**: Real-time updates

**Design Philosophy:**
- Minimal, bare-bones interface
- Mobile-first responsive design
- Real-time collaboration focus

---

## 🔧 Admin Dashboard

### Game Management Features

- **Lobby Control**: Start/stop games, view player list
- **Team Management**: Create teams, assign/reassign players
- **Progress Monitoring**: See exactly where each team stands
- **Late Joiners**: Sort new players into existing teams
- **Game Flow**: Control hints, time penalties, elimination

### Admin Capabilities

- View detailed team progress (completion %, hints used)
- Override team assignments as needed
- Provide hints with time penalties
- Monitor real-time submissions and guesses

---

## 🚀 Development Phases

### ✅ Phase 1: Core Mechanics (COMPLETED)

- [x] **Lobby System**: Player join with 6-character codes
- [x] **Team Assignment**: Basic team creation and management
- [x] **WebSocket Infrastructure**: Real-time communication
- [x] **Admin Authentication**: Token-based admin access
- [x] **Database Layer**: SQLite with proper models

### 🔄 Phase 2: Game Implementation (CURRENT)

- [ ] **Puzzle Engine**: Load and serve word chain puzzles
- [ ] **Team Gameplay**: Real-time collaborative solving
- [ ] **Optimistic Locking**: Race condition prevention
- [ ] **Progress Tracking**: Team advancement through puzzles
- [ ] **Win Conditions**: First team to finish wins

### 🔮 Phase 3: Advanced Features (FUTURE)

- [ ] **Hint System**: Controlled hints with time penalties
- [ ] **Elimination Mechanics**: Remove slowest teams per puzzle
- [ ] **Enhanced Admin**: Detailed analytics and controls
- [ ] **Spectator Mode**: Early finishers watch other teams
- [ ] **Multi-word Answers**: Support spaces in answers (e.g., "NEW YORK")

---

## 💡 Future Enhancement Ideas

### Gameplay Features
- **Progressive Elimination**: Remove teams that fall too far behind
- **Spectator Mode**: Finished teams can watch others compete
- **Hint Penalties**: Strategic hint usage with time costs
- **Multi-word Support**: Answers with spaces ("NEW YORK", "ROYAL FLUSH")

### Technical Improvements
- **Multiple Concurrent Games**: Support multiple lobbies simultaneously
- **Enhanced Reconnection**: Seamless player reconnection handling
- **Advanced Analytics**: Detailed team performance metrics
- **Puzzle Variety**: Different chain lengths and difficulty levels

### Admin Dashboard Enhancements
- **Real-time Analytics**: Live team performance graphs
- **Game Templates**: Pre-configured game setups
- **Player Management**: Advanced player assignment tools
- **Custom Puzzles**: In-game puzzle creation and editing

---

## 📋 Technical Implementation Notes

### WebSocket Architecture
- **Team-based channels**: Messages broadcast by team ID
- **Session management**: Handle disconnections and reconnections
- **Message types**: Submissions, progress updates, team assignments

### Database Considerations
- **Concurrent access**: Handle multiple players per team
- **State consistency**: Ensure all team members see same state
- **Performance**: Optimize for real-time updates

### Security Requirements
- **Admin authentication**: Secure token-based access
- **Input validation**: Sanitize all player submissions
- **Rate limiting**: Prevent spam submissions
