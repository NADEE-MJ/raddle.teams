import React from 'react';
import { Team } from '../types';

interface LobbyProps {
  playerName: string;
  playerId: string;
  connected: boolean;
  gameState: string;
  teams: Team[];
  connectedPlayers: string[];
}

export const Lobby: React.FC<LobbyProps> = ({
  playerName,
  playerId,
  connected,
  gameState,
  teams,
  connectedPlayers
}) => {
  const getPlayerTeam = () => {
    return teams.find(team => team.players.includes(playerId));
  };

  const playerTeam = getPlayerTeam();

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1>Raddle Teams - Lobby</h1>
        <p><strong>Player:</strong> {playerName}</p>
        <p><strong>Connection:</strong> {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
        <p><strong>Game State:</strong> {gameState}</p>
      </div>

      {gameState === 'lobby' && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Waiting for game to start...</h3>
          <p>Connected Players: {connectedPlayers.length}</p>
          <div style={{ fontSize: '14px', color: '#666' }}>
            The admin will start the game and assign teams.
          </div>
        </div>
      )}

      {gameState === 'team_assignment' && teams.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Teams Assigned!</h3>
          {playerTeam ? (
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e7f3ff', 
              border: '1px solid #007bff', 
              borderRadius: '4px',
              marginBottom: '15px'
            }}>
              <h4>Your Team: {playerTeam.name}</h4>
              <p>Team Members: {playerTeam.players.length}</p>
            </div>
          ) : (
            <p>You haven't been assigned to a team yet.</p>
          )}
          
          <div>
            <h4>All Teams:</h4>
            {teams.map((team) => (
              <div 
                key={team.id} 
                style={{ 
                  padding: '10px', 
                  margin: '5px 0', 
                  backgroundColor: team.players.includes(playerId) ? '#e7f3ff' : '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <strong>{team.name}</strong> - {team.players.length} players
              </div>
            ))}
          </div>
        </div>
      )}

      {(gameState === 'team_naming' || gameState === 'in_progress') && (
        <div>
          <h3>Game Starting Soon!</h3>
          {playerTeam && (
            <p>You're on <strong>{playerTeam.name}</strong></p>
          )}
        </div>
      )}
    </div>
  );
};