import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminOutletContext } from "@/hooks/useAdminOutletContext";
import { api } from "@/services/api";
import { LobbyInfo } from "@/types";

export default function AdminPage() {
  const {
    isAdmin,
    adminToken,
    setAdminToken,
    lobbies,
    refreshLobbies,
    isLoading: contextLoading,
    error: contextError,
    sendWebSocketMessage,
  } = useAdminOutletContext();
  
  const [selectedLobby, setSelectedLobby] = useState<LobbyInfo | null>(null);
  const [newLobbyName, setNewLobbyName] = useState("");
  const [localAdminToken, setLocalAdminToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localAdminToken.trim()) {
      setError("Please enter admin token");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.admin.checkCredentials(localAdminToken.trim());
      setAdminToken(localAdminToken.trim());
    } catch (err) {
      setError("Invalid admin token");
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    setSelectedLobby(null);
  };

  const createLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLobbyName.trim() || !adminToken) return;

    try {
      setLoading(true);
      await api.admin.lobby.create(newLobbyName.trim(), adminToken);
      setNewLobbyName("");
      await refreshLobbies();
    } catch (err) {
      setError("Failed to create lobby");
      console.error("Error creating lobby:", err);
    } finally {
      setLoading(false);
    }
  };

  const viewLobbyDetails = async (lobbyId: number) => {
    if (!adminToken) return;
    
    try {
      setLoading(true);
      const lobbyInfo = await api.admin.lobby.getInfo(lobbyId, adminToken);
      setSelectedLobby(lobbyInfo);
      
      // Subscribe to lobby updates via WebSocket
      if (sendWebSocketMessage) {
        sendWebSocketMessage({
          action: "subscribe_lobby",
          lobby_id: lobbyId
        });
      }
    } catch (err) {
      setError("Failed to load lobby details");
      console.error("Error loading lobby details:", err);
    } finally {
      setLoading(false);
    }
  };

  const closeLobbyDetails = () => {
    if (selectedLobby && sendWebSocketMessage) {
      // Unsubscribe from lobby updates
      sendWebSocketMessage({
        action: "unsubscribe_lobby",
        lobby_id: selectedLobby.lobby.id
      });
    }
    setSelectedLobby(null);
  };

  const deleteLobby = async (lobbyId: number) => {
    if (!adminToken) return;
    
    try {
      setLoading(true);
      await api.admin.lobby.delete(lobbyId, adminToken);
      await refreshLobbies();
      if (selectedLobby?.lobby.id === lobbyId) {
        // Unsubscribe before closing
        if (sendWebSocketMessage) {
          sendWebSocketMessage({
            action: "unsubscribe_lobby",
            lobby_id: lobbyId
          });
        }
        setSelectedLobby(null);
      }
    } catch (err) {
      setError("Failed to delete lobby");
      console.error("Error deleting lobby:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup subscription on component unmount
  useEffect(() => {
    return () => {
      if (selectedLobby && sendWebSocketMessage) {
        sendWebSocketMessage({
          action: "unsubscribe_lobby",
          lobby_id: selectedLobby.lobby.id
        });
      }
    };
  }, [selectedLobby, sendWebSocketMessage]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Login
            </h1>
            <p className="text-gray-600">Enter your admin token to access the admin panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="adminToken"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Admin Token
              </label>
              <input
                type="password"
                id="adminToken"
                value={localAdminToken}
                onChange={(e) => setLocalAdminToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter admin token"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate("/")}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="space-x-4">
              <button
                onClick={() => navigate("/")}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition duration-200"
              >
                Home
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>

          {(error || contextError) && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
              {error || contextError}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Lobby</h2>
            <form onSubmit={createLobby} className="flex gap-4">
              <input
                type="text"
                value={newLobbyName}
                onChange={(e) => setNewLobbyName(e.target.value)}
                placeholder="Lobby name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading || contextLoading}
              />
              <button
                type="submit"
                disabled={loading || contextLoading || !newLobbyName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md transition duration-200"
              >
                Create Lobby
              </button>
            </form>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">All Lobbies</h2>
              <button
                onClick={refreshLobbies}
                disabled={loading || contextLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md transition duration-200"
              >
                Refresh
              </button>
            </div>

            {lobbies.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No lobbies created yet</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lobbies.map((lobby) => (
                  <div key={lobby.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-lg">{lobby.name}</h3>
                    <p className="text-gray-600">Code: <span className="font-mono font-bold">{lobby.code}</span></p>
                    <p className="text-gray-500 text-sm">
                      Created: {new Date(lobby.created_at).toLocaleString()}
                    </p>
                    <div className="mt-2 space-y-2">
                      <button
                        onClick={() => viewLobbyDetails(lobby.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200 w-full"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteLobby(lobby.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition duration-200 w-full"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedLobby && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Lobby Details: {selectedLobby.lobby.name}
              </h2>
              <button
                onClick={closeLobbyDetails}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Lobby Info</h3>
                <div className="space-y-2">
                  <p><strong>Code:</strong> <span className="font-mono">{selectedLobby.lobby.code}</span></p>
                  <p><strong>Name:</strong> {selectedLobby.lobby.name}</p>
                  <p><strong>Created:</strong> {new Date(selectedLobby.lobby.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Players ({selectedLobby.players.length})</h3>
                {selectedLobby.players.length === 0 ? (
                  <p className="text-gray-500">No players in this lobby yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedLobby.players.map((player) => (
                      <div key={player.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{player.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {player.team_id ? `Team ${player.team_id}` : 'No team'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedLobby.teams && selectedLobby.teams.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Teams ({selectedLobby.teams.length})</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedLobby.teams.map((team) => (
                    <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold">{team.name}</h4>
                      <p className="text-sm text-gray-600">Current word index: {team.current_word_index}</p>
                      {selectedLobby.players_by_team && selectedLobby.players_by_team[team.id] && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Players:</p>
                          <div className="text-sm text-gray-600">
                            {selectedLobby.players_by_team[team.id].map((player) => (
                              <span key={player.id} className="inline-block mr-2">
                                {player.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}