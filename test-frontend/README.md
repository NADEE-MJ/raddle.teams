# Test Frontend for Raddle Teams

This is a simple vanilla JavaScript frontend to test the lobby API and websocket functionality.

## Features

### Admin Panel
- Admin login with password authentication
- View all active lobbies
- Create new lobbies with custom names
- Real-time lobby updates via WebSocket

### Player Interface
- Join lobbies using lobby code
- Enter player name
- Real-time lobby updates via WebSocket
- View other players in the lobby
- Connection status monitoring

## Usage

1. Start the backend server with the test frontend enabled:
   ```bash
   npm run server
   ```

2. Open your browser to http://localhost:8000

3. **Admin Access**:
   - Click "Admin Panel"
   - Enter admin password: `your_admin_password` (default)
   - Create lobbies and monitor activity

4. **Player Access**:
   - Enter your name and a lobby code
   - Join the lobby and see real-time updates

## WebSocket Connections

- **Admin WebSocket**: `/ws/admin/{web_session_id}`
  - Receives lobby updates
  - Auto-reconnects on disconnect

- **Player WebSocket**: `/ws/{lobby_id}/{player_session_id}`
  - Receives lobby and player updates
  - Auto-reconnects on disconnect

## Session Management

- Admin session ID is stored in localStorage as `admin_session_id`
- Player session ID is stored in localStorage as `player_session_id`
- Admin authentication is cached in localStorage

## API Endpoints Used

- `POST /api/lobby` - Create lobby (admin only)
- `GET /api/lobby` - Get all lobbies (admin only)
- `POST /api/lobby/{lobby_code}/join` - Join lobby as player
- `GET /api/lobby/{lobby_id}` - Get lobby info

## Note

This is a test frontend only. To restore the main React application, uncomment the static files mounting in `main.py` and comment out the test frontend mounting.
