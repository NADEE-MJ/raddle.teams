# Raddle Teams Testing Platform 🎭

## Overview

A clean, focused Playwright-based testing platform for Raddle Teams Phase 1 functionality. All tests run in headless mode with full video recording for CI compatibility.

## ✨ Features

- **Phase 1 Focus**: Tests only currently implemented functionality
- **Screenshot Capture**: Every test captures screenshots at key moments
- **Headless CI-Ready**: All tests run in headless mode for automation
- **Clean Structure**: Organized by test type, ready for future phases
- **No External Dependencies**: Uses system browser, no Playwright browser installation needed

## 🚀 Quick Start

### Prerequisites
- Poetry (Python dependency management)
- System Chromium browser (`pacman -S chromium` on Arch)
- Node.js and npm (for frontend build)

### Setup
```bash
# Build frontend (required for server)
npm run build

# Run tests
python run_tests.py app       # Basic app functionality
python run_tests.py api       # API endpoints
python run_tests.py workflow  # Multi-browser workflows
python run_tests.py all       # All Phase 1 tests
```

## 🎯 Test Categories

### 1. Basic App Functionality (`test_app_basic.py`)
- Home page loading and React initialization
- Admin page loading and login form
- Admin authentication with correct password
- Navigation between pages
- **Duration**: ~30 seconds

### 2. API Endpoints (`test_api_endpoints.py`)
- API root endpoint validation
- Admin authentication endpoints
- Lobby creation and management
- Player joining functionality
- Frontend-backend integration
- **Duration**: ~45 seconds

### 3. User Workflows (`test_user_workflows.py`)
- Multi-browser coordination (admin + players)
- Player reconnection scenarios
- Concurrent player actions
- End-to-end user journeys
- **Duration**: ~60 seconds

## 📁 Recording Output

All tests generate recordings in `tests/recordings/`:

```text
tests/recordings/
├── screenshots/      # .png screenshots at key moments
└── traces/           # .zip trace files (when enabled)
```

### Viewing Recordings

**Screenshots**: Standard PNG files for quick review
```bash
ls tests/recordings/screenshots/
```

## 🛠️ Configuration

### Browser Settings
- **Browser**: System Chromium (`/usr/bin/chromium`)
- **Mode**: Headless (CI-friendly)
- **Video**: 1280x720 resolution, all tests recorded
- **Viewport**: 1280x720 for consistent testing

### Admin Authentication
- **Password**: `test` (configured in `.env` file)
- **Token**: Uses Bearer token authentication

## 🎪 Running Tests

### Individual Test Categories
```bash
# Test basic app functionality
python run_tests.py app

# Test API endpoints
python run_tests.py api

# Test multi-browser workflows
python run_tests.py workflow
```

### All Tests
```bash
# Run all Phase 1 tests
python run_tests.py all

# Verbose output
python run_tests.py all --verbose
```

### Advanced Options
```bash
# Run with headed browsers (for debugging)
python run_tests.py app --headed

# Run specific test file directly
poetry run pytest tests/test_app_basic.py -v
```

## 🔧 Test Structure

### Phase 1 Tests (Current)
```
tests/
├── test_app_basic.py      # Basic application functionality
├── test_api_endpoints.py  # Backend API testing
├── test_user_workflows.py # Multi-browser scenarios
├── conftest.py           # Pytest configuration
├── fixtures/             # Test fixtures (server, browser)
└── recordings/           # Video and screenshot output
```

### Future Phases (Prepared Structure)
```
tests/
├── phase2/               # Team mechanics, puzzle solving
└── phase3/               # Performance, polish, analytics
```

## 🎯 What Gets Tested

### ✅ Currently Tested (Phase 1)
- Home page React loading
- Admin authentication and login
- Basic page navigation
- API endpoint responses
- Admin lobby creation
- Player joining lobbies
- Multi-browser coordination
- Player reconnection flows

### 📅 Future Testing (Phase 2+)
- Team assignment mechanics
- Puzzle solving workflows
- Real-time game state synchronization
- Performance under load
- Cross-browser compatibility
- Mobile responsiveness

## 🐛 Troubleshooting

### Server Issues
```bash
# Kill any existing servers
pkill -f "python run.py"

# Check if port 8000 is in use
lsof -i :8000
```

### Browser Launch Issues
```bash
# Verify Chromium installation
which chromium
chromium --version
```

### Missing Videos
- Check `tests/recordings/videos/` directory
- Ensure sufficient disk space
- Verify browser context configuration

## 🚀 Development Workflow

1. **Build Frontend**: `npm run build`
2. **Run Tests**: `python run_tests.py all`
3. **Check Videos**: Review recordings in `tests/recordings/videos/`
4. **Fix Issues**: Debug using screenshots and videos
5. **Repeat**: Iterate until all tests pass

## ⚡ Next Steps

- [ ] Complete Phase 1 functionality
- [ ] Add team assignment features (Phase 2)
- [ ] Implement puzzle solving (Phase 2)
- [ ] Add performance testing (Phase 3)
- [ ] Enhance mobile support (Phase 3)


# Raddle Teams Testing Platform 🎭

## Overview

A comprehensive Playwright-based testing platform for Raddle Teams that enables multi-browser automation with full recording capabilities. Perfect for testing real-time multiplayer functionality with admin monitoring.

## ✨ Features

- **Multi-Browser Orchestration**: Simultaneously run admin dashboard + multiple player browsers
- **Full Recording**: Videos, traces, screenshots, and WebSocket messages captured
- **System Browser Integration**: Uses your installed Chromium instead of bundled browsers
- **Real-time Testing**: Test WebSocket connections and live updates
- **Visual Debugging**: See exactly what happened in each browser session

## 🚀 Quick Start

### Prerequisites
- Poetry (Python dependency management)
- System Chromium browser (`pacman -S chromium` on Arch)
- Node.js and npm (for frontend build)

### Setup
```bash
# Install testing dependencies
poetry install

# Build frontend (required for server)
npm run build

# Run tests
python run_tests.py simple    # Basic browser test
python run_tests.py app       # Full application test
python run_tests.py multi     # Multi-browser demo
python run_tests.py all       # All tests
```

## 🎯 Test Scenarios

### 1. Simple Browser Test (`test_system_browser.py`)
- Verifies Playwright + system Chromium works
- Basic navigation and screenshot capture
- **Duration**: ~5 seconds

### 2. Application Test (`test_raddle_teams_app.py`)
- Starts Raddle Teams server
- Tests home page and admin page loading
- Attempts admin login with default password
- **Duration**: ~30 seconds

### 3. Multi-Browser Demo (`test_multi_browser_demo.py`)
- **THE MAIN EVENT** 🎪
- Admin creates lobby while multiple players join
- Full recording of all browser sessions
- Demonstrates real-time multiplayer testing
- **Duration**: ~60 seconds

### 4. Advanced Scenarios (`tests/scenarios/`)
- `test_basic_connectivity.py`: Server and page loading
- `test_multi_player.py`: Complex multi-browser workflows
- Player reconnection testing
- WebSocket connection validation

## 📁 Recording Output

All test runs generate recordings in `tests/recordings/`:

```
tests/recordings/
├── videos/           # .webm video files of each browser
├── traces/           # .zip trace files for interactive replay
├── screenshots/      # .png screenshots at key moments
└── [timestamp]/      # Organized by test run
```

### Viewing Recordings

**Videos**: Open `.webm` files in any video player
```bash
vlc tests/recordings/videos/admin_demo.webm
```

**Interactive Traces**: Use Playwright's trace viewer
```bash
poetry run playwright show-trace tests/recordings/traces/admin_demo_trace.zip
```

**Screenshots**: Regular PNG files for quick review

## 🎬 Multi-Browser Demo Workflow

The ultimate test demonstrates:

1. **Admin Session** (1200x800):
   - Logs into admin dashboard
   - Creates a new lobby
   - Monitors player activity

2. **Player Sessions** (800x600 each):
   - Alice, Bob, Charlie join simultaneously
   - Each player fills name and lobby code
   - Attempts to join the lobby

3. **Recording Everything**:
   - 4 video files (admin + 3 players)
   - 4 trace files with full interaction history
   - Screenshots of final states
   - WebSocket message logs

## 🛠️ Configuration

### Browser Settings (`tests/conftest.py`)
```python
# Uses system Chromium with optimized flags
executable_path="/usr/bin/chromium"
args=[
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security"
]
```

### Recording Settings (`tests/fixtures/browsers.py`)
```python
# Admin: High resolution for monitoring
viewport={"width": 1920, "height": 1080}

# Players: Smaller windows for multiple instances
viewport={"width": 1280, "height": 720}
```

### Server Settings (`tests/fixtures/server.py`)
```python
# Automatic server lifecycle management
# Kills existing servers on port 8000
# Waits for health check before proceeding
```

## 🎪 Running the Ultimate Demo

For the best experience, run the multi-browser demo:

```bash
# With visible browsers (recommended first time)
python run_tests.py multi --verbose

# Check the recordings
ls -la tests/recordings/
```

This will:
- Start your Raddle Teams server
- Open 4 browser windows (1 admin + 3 players)
- Record everything for 60+ seconds
- Save videos, traces, and screenshots
- Clean up automatically

## 🔧 Customization

### Adding New Test Scenarios
1. Create test file in `tests/scenarios/`
2. Use `MultiBrowserManager` for coordinated browsers
3. Follow the pattern: setup → action → verify → record

### Modifying Recording Settings
- **Video quality**: Adjust `record_video_size` in browser contexts
- **Trace detail**: Configure tracing options (screenshots, snapshots, sources)
- **Duration**: Modify sleep/wait times in test scenarios

### Testing Different Browsers
- Firefox: Install and update `executable_path` to `/usr/bin/firefox`
- Multiple browsers: Test cross-browser compatibility

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill existing processes
pkill -f "python run.py"
```

### Browser Launch Issues
```bash
# Verify Chromium installation
which chromium

# Test manual launch
chromium --version
```

### Missing Recordings
- Check `tests/recordings/` permissions
- Ensure sufficient disk space
- Verify tracing started successfully

## 🎯 Development Phases

This testing platform is designed to support the full development lifecycle of Raddle Teams:

### 📋 Phase 1: Core Mechanics Testing

**Status**: 🚧 In Progress
**Focus**: Foundation infrastructure and basic lobby functionality

**Testing Priorities**:

- **API Endpoint Validation**: Verify all `/api/lobby/*` and `/api/admin/lobby/*` routes respond correctly
- **Admin Authentication**: Test bearer token authentication with multiple token formats
- **Lobby Creation & Joining**: End-to-end player join workflow with session management
- **Database Operations**: Player creation, lobby persistence, session tracking
- **WebSocket Connections**: Basic admin and player WebSocket establishment
- **Route Conflict Resolution**: Ensure API routes don't conflict with static file serving

**Current Implementation**:

- ✅ Complete testing infrastructure (Playwright, multi-browser, recording)
- ✅ Server lifecycle management and browser automation
- ❌ API routing issues (404 responses despite route definitions)
- ❌ Admin authentication failures across all tokens
- ❌ Multi-browser demo blocked by server issues

**Phase 1 Test Suite**:

```bash
# Debug current issues
python debug_auth.py

# Run basic API tests
python test_api_quick.py

# Phase 1 integration test (when server fixed)
python run_tests.py --scenario phase1
```

### 🎮 Phase 2: Competition Features Testing

**Status**: 📅 Planned
**Focus**: Team mechanics and puzzle solving

**Testing Priorities**:

- **Team Assignment**: Multi-player team creation and management
- **Puzzle Loading**: JSON puzzle validation and game state initialization
- **Real-time Updates**: WebSocket synchronization across team members
- **Optimistic Locking**: Simultaneous guess handling and conflict resolution
- **Game Flow**: Start → team setup → active gameplay → completion
- **Progress Tracking**: Team advancement through word chains

**Phase 2 Test Scenarios**:

- **Team Coordination**: 6 players split into 2 teams of 3
- **Simultaneous Guessing**: Multiple players guessing at same time
- **Game State Sync**: Real-time progress updates across browsers
- **Admin Monitoring**: Live dashboard showing all team progress
- **Puzzle Progression**: Complete word chain solving validation

**New Testing Components**:

```python
# tests/scenarios/test_team_mechanics.py
# tests/fixtures/puzzle_loader.py
# tests/utilities/GameActions.py
# tests/utilities/TeamActions.py
```

### ✨ Phase 3: Polish & Performance Testing

**Status**: 📅 Future
**Focus**: Scale, reliability, and user experience

**Testing Priorities**:

- **Performance Testing**: 20+ concurrent players across multiple lobbies
- **Reconnection Handling**: Network interruption and browser crash recovery
- **Cross-browser Compatibility**: Chrome, Firefox, Safari coordination
- **Mobile Responsiveness**: Touch interface testing
- **Hint System**: Progressive clue revelation mechanics
- **Elimination Features**: Player removal and team rebalancing
- **Admin Analytics**: Dashboard metrics and game statistics

**Phase 3 Test Scenarios**:

- **Load Testing**: High-concurrency multi-lobby simulation
- **Stress Testing**: Memory usage and connection limits
- **Recovery Testing**: Network failures and graceful degradation
- **UI/UX Testing**: Visual regression and accessibility validation
- **Analytics Testing**: Dashboard data accuracy and real-time updates

**Advanced Testing Tools**:

```python
# tests/performance/load_testing.py
# tests/utilities/NetworkSimulator.py
# tests/utilities/MobileEmulator.py
# tests/regression/visual_testing.py
```

## 🛠️ Implementation Roadmap

### Phase 1 Completion Checklist

- [ ] Fix API routing conflicts (static files vs API endpoints)
- [ ] Resolve admin authentication token handling
- [ ] Validate basic lobby creation and player joining
- [ ] Test WebSocket connection establishment
- [ ] Implement proper error handling and logging
- [ ] Create comprehensive Phase 1 test suite

### Phase 2 Setup Requirements

- [ ] Implement team assignment backend logic
- [ ] Add puzzle loading and game state management
- [ ] Create WebSocket event handlers for real-time updates
- [ ] Build team coordination frontend components
- [ ] Design optimistic locking for concurrent operations

### Phase 3 Enhancement Goals

- [ ] Performance optimization and caching strategies
- [ ] Comprehensive error recovery mechanisms
- [ ] Advanced admin dashboard with analytics
- [ ] Mobile-responsive design implementation
- [ ] Accessibility compliance (WCAG guidelines)

## 🎯 Next Steps

**Immediate Actions** (Phase 1):

1. **Debug API Routing**: Fix 404 responses from `/api/*` endpoints
2. **Fix Authentication**: Resolve admin token validation issues
3. **Test Basic Flow**: Admin creates lobby → Players join → Basic functionality works
4. **Enable Multi-browser Demo**: Get the full test suite running successfully

**Development Progression**:

1. **Phase 1 Complete**: All basic infrastructure working reliably
2. **Phase 2 Begin**: Team mechanics and puzzle solving implementation
3. **Phase 3 Polish**: Performance, reliability, and user experience refinement

The testing platform foundation is complete and ready to support all development phases. Focus now shifts to debugging and fixing the Phase 1 functionality to unlock the full testing capabilities! 🚀


docker run --network=host --rm --init -it --workdir /home/pwuser --user pwuser mcr.microsoft.com/playwright:v1.55.0-noble /bin/sh -c "npx -y playwright@1.55.0 run-server --port 3000 --host 0.0.0.0"