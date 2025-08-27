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
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Raddle Teams - Lobby</h1>
        <p style={{ marginBottom: '0.5rem' }}><strong>Player:</strong> {playerName}</p>
        <p style={{ marginBottom: '0.5rem' }}><strong>Connection:</strong> {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
        <p><strong>Game State:</strong> {gameState}</p>
      </div>

      {gameState === 'lobby' && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>Waiting for game to start...</h3>
          <p style={{ marginBottom: '0.5rem' }}>Connected Players: {connectedPlayers.length}</p>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            The admin will start the game and assign teams.
          </div>
        </div>
      )}

      {gameState === 'team_assignment' && teams.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>Teams Assigned!</h3>
          {playerTeam ? (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#eff6ff', 
              border: '1px solid #3b82f6', 
              borderRadius: '4px',
              marginBottom: '1rem'
            }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: '500' }}>Your Team: {playerTeam.name}</h4>
              <p>Team Members: {playerTeam.players.length}</p>
            </div>
          ) : (
            <p>You haven't been assigned to a team yet.</p>
          )}
          
          <div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.75rem' }}>All Teams:</h4>
            {teams.map((team) => (
              <div 
                key={team.id} 
                style={{ 
                  padding: '0.75rem', 
                  marginTop: '0.5rem', 
                  backgroundColor: team.players.includes(playerId) ? '#eff6ff' : '#f9fafb',
                  border: team.players.includes(playerId) ? '1px solid #3b82f6' : '1px solid #d1d5db',
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
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>Game Starting Soon!</h3>
          {playerTeam && (
            <p>You're on <strong>{playerTeam.name}</strong></p>
          )}
        </div>
      )}
    </div>
  );
};