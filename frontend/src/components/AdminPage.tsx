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
    return <div style={{ padding: '20px' }}>Loading admin panel...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Raddle Teams - Admin Panel</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>Game Status</h3>
        {status.game ? (
          <div>
            <p><strong>Game ID:</strong> {status.game.id}</p>
            <p><strong>State:</strong> {status.game.state}</p>
            <p><strong>Teams:</strong> {status.game.numTeams}</p>
          </div>
        ) : (
          <p>No active game</p>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <h3>Connected Players ({status.players.length})</h3>
        {status.players.length === 0 ? (
          <p>No players connected</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '5px' }}>
            {status.players.map((playerId, index) => (
              <div key={playerId} style={{ padding: '5px', backgroundColor: 'white', borderRadius: '3px' }}>
                Player {index + 1}
              </div>
            ))}
          </div>
        )}
      </div>

      {status.teams.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
          <h3>Teams</h3>
          {status.teams.map((team) => (
            <div key={team.id} style={{ margin: '10px 0', padding: '10px', backgroundColor: 'white', borderRadius: '3px' }}>
              <strong>{team.name}</strong> - {team.players.length} players
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Admin Controls</h3>
        
        {!status.game && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ marginRight: '10px' }}>
              Number of teams:
              <input
                type="number"
                min="2"
                max="8"
                value={numTeams}
                onChange={(e) => setNumTeams(parseInt(e.target.value))}
                style={{ marginLeft: '5px', padding: '5px', width: '60px' }}
              />
            </label>
            <button
              onClick={startGame}
              disabled={loading || status.players.length === 0}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
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
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Assigning...' : 'Assign Teams'}
          </button>
        )}
      </div>
    </div>
  );
};