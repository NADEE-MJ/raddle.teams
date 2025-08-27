import React, { useState, useEffect } from 'react';
import { AdminStatus } from '../types';

export const AdminPage: React.FC = () => {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [numTeams, setNumTeams] = useState(2);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching admin status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const startGame = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/start-game?num_teams=${numTeams}`, {
        method: 'POST'
      });
      if (response.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error('Error starting game:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/assign-teams', {
        method: 'POST'
      });
      if (response.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error('Error assigning teams:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>Loading admin panel...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Raddle Teams - Admin Panel</h1>
      
      <div style={{ marginBottom: '20px', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>Game Status</h3>
        {status.game ? (
          <div>
            <p style={{ marginBottom: '0.25rem' }}><strong>Game ID:</strong> {status.game.id}</p>
            <p style={{ marginBottom: '0.25rem' }}><strong>State:</strong> {status.game.state}</p>
            <p><strong>Teams:</strong> {status.game.numTeams}</p>
          </div>
        ) : (
          <p>No active game</p>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '4px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>Connected Players ({status.players.length})</h3>
        {status.players.length === 0 ? (
          <p>No players connected</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
            {status.players.map((playerId, index) => (
              <div key={playerId} style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px', fontSize: '0.875rem' }}>
                Player {index + 1}
              </div>
            ))}
          </div>
        )}
      </div>

      {status.teams.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '4px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>Teams</h3>
          {status.teams.map((team) => (
            <div key={team.id} style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'white', borderRadius: '4px' }}>
              <strong>{team.name}</strong> - {team.players.length} players
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Admin Controls</h3>
        
        {!status.game && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Number of teams:
              <input
                type="number"
                min="2"
                max="8"
                value={numTeams}
                onChange={(e) => setNumTeams(parseInt(e.target.value))}
                style={{ 
                  padding: '0.5rem', 
                  width: '4rem', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px',
                  outline: 'none'
                }}
              />
            </label>
            <button
              onClick={startGame}
              disabled={loading || status.players.length === 0}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: (loading || status.players.length === 0) ? 0.6 : 1
              }}
            >
              {loading ? 'Starting...' : 'Start Game'}
            </button>
          </div>
        )}

        {status.game && status.game.state === 'lobby' && (
          <button
            onClick={assignTeams}
            disabled={loading || status.players.length < 2}
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: (loading || status.players.length < 2) ? 0.6 : 1
            }}
          >
            {loading ? 'Assigning...' : 'Assign Teams'}
          </button>
        )}
      </div>
    </div>
  );
};