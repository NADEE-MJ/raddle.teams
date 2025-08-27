import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { JoinLobby } from './components/JoinLobby';
import { Lobby } from './components/Lobby';
import { AdminPage } from './components/AdminPage';
import { useWebSocket } from './hooks/useWebSocket';
import { Team } from './types';

const App: React.FC = () => {
  const [playerId, setPlayerId] = useState<string | null>(
    localStorage.getItem('playerId')
  );
  const [playerName, setPlayerName] = useState<string>(
    localStorage.getItem('playerName') || ''
  );
  const [isJoining, setIsJoining] = useState(false);
  const [gameState, setGameState] = useState<string>('lobby');
  const [teams, setTeams] = useState<Team[]>([]);
  const [connectedPlayers] = useState<string[]>([]);

  const wsUrl = (import.meta as any).env.DEV ? 'ws://localhost:8000' : `ws://${window.location.host}`;
  const { connected, messages } = useWebSocket(wsUrl, playerId);

  // Handle WebSocket messages
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;

    console.log('Received WebSocket message:', latestMessage);

    switch (latestMessage.type) {
      case 'game_started':
        setGameState('lobby');
        break;
      case 'teams_assigned':
        setTeams(latestMessage.teams || []);
        setGameState('team_assignment');
        break;
      case 'game_state_changed':
        setGameState(latestMessage.state);
        break;
    }
  }, [messages]);

  const handleJoinLobby = async (name: string) => {
    setIsJoining(true);
    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `player_name=${encodeURIComponent(name)}`
      });

      if (response.ok) {
        const data = await response.json();
        setPlayerId(data.player_id);
        setPlayerName(name);
        
        // Store in localStorage for reconnection
        localStorage.setItem('playerId', data.player_id);
        localStorage.setItem('playerName', name);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to join game');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to connect to server');
    } finally {
      setIsJoining(false);
    }
  };

  if (!playerId) {
    return (
      <Router>
        <Routes>
          <Route 
            path="/admin" 
            element={<AdminPage />} 
          />
          <Route 
            path="/" 
            element={
              <JoinLobby 
                onJoin={handleJoinLobby} 
                isLoading={isJoining} 
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/admin" 
          element={<AdminPage />} 
        />
        <Route 
          path="/" 
          element={
            <Lobby
              playerName={playerName}
              playerId={playerId}
              connected={connected}
              gameState={gameState}
              teams={teams}
              connectedPlayers={connectedPlayers}
            />
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;