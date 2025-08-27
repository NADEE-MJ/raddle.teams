import React, { useState } from 'react';

interface JoinLobbyProps {
  onJoin: (playerName: string) => void;
  isLoading: boolean;
}

export const JoinLobby: React.FC<JoinLobbyProps> = ({ onJoin, isLoading }) => {
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onJoin(playerName.trim());
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Raddle Teams</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Join the lobby to start playing!</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            outline: 'none',
            opacity: isLoading ? 0.6 : 1
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !playerName.trim()}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: (isLoading || !playerName.trim()) ? 0.6 : 1
          }}
        >
          {isLoading ? 'Joining...' : 'Join Game'}
        </button>
      </form>
    </div>
  );
};