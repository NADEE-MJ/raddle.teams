import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { apiService } from "../services/api";
import { LobbyInfo } from "../types";

export default function LobbyPage() {
  const [lobbyInfo, setLobbyInfo] = useState<LobbyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { player } = usePlayer();
  const navigate = useNavigate();

  const loadLobbyData = useCallback(async () => {
    if (!player) return;

    try {
      setLoading(true);
      setError("");

      // Get lobby info for the player's lobby
      const lobbyData = await apiService.getLobbyInfo(player.lobby_id);
      setLobbyInfo(lobbyData);
    } catch (err) {
      setError("Failed to load lobby data");
      console.error("Error loading lobby data:", err);
    } finally {
      setLoading(false);
    }
  }, [player]);

  useEffect(() => {
    if (!player) {
      navigate("/");
      return;
    }

    loadLobbyData();
    
    // Set up polling to refresh lobby data every 3 seconds
    const interval = setInterval(loadLobbyData, 3000);
    return () => clearInterval(interval);
  }, [player, navigate, loadLobbyData]);

  const handleLeave = () => {
    navigate("/");
  };

  if (loading && !lobbyInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lobby...</p>
        </div>
      </div>
    );
  }

  if (!lobbyInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load lobby information</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{lobbyInfo.lobby.name}</h1>
              <p className="text-gray-600">
                Lobby Code: <span className="font-mono text-lg font-bold">{lobbyInfo.lobby.code}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome, {player?.name}!</p>
              <button
                onClick={handleLeave}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition duration-200"
              >
                Leave Lobby
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Players Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Players ({lobbyInfo.players.length})
              </h2>
              {lobbyInfo.players.length === 0 ? (
                <p className="text-gray-500">No players in lobby yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lobbyInfo.players.map((playerItem) => (
                    <div
                      key={playerItem.id}
                      className={`flex justify-between items-center p-3 rounded-md ${
                        playerItem.id === player?.id
                          ? "bg-blue-100 border-2 border-blue-300"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${playerItem.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="font-medium">
                          {playerItem.name}
                          {playerItem.id === player?.id && " (You)"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {playerItem.team_id ? `Team ${playerItem.team_id}` : 'No team'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teams Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Teams {lobbyInfo.teams ? `(${lobbyInfo.teams.length})` : '(0)'}
              </h2>
              {!lobbyInfo.teams || lobbyInfo.teams.length === 0 ? (
                <p className="text-gray-500">No teams created yet. Waiting for admin to set up teams...</p>
              ) : (
                <div className="space-y-3">
                  {lobbyInfo.teams.map((team) => (
                    <div key={team.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-2">{team.name}</h3>
                      <div className="text-sm text-gray-600 mb-2">
                        Progress: Word {team.current_word_index + 1}
                      </div>
                      {lobbyInfo.players_by_team && lobbyInfo.players_by_team[team.id] && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Members:</p>
                          <div className="flex flex-wrap gap-1">
                            {lobbyInfo.players_by_team[team.id].map((teamPlayer) => (
                              <span
                                key={teamPlayer.id}
                                className={`inline-block px-2 py-1 text-xs rounded-md ${
                                  teamPlayer.id === player?.id
                                    ? "bg-blue-200 text-blue-800 font-semibold"
                                    : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {teamPlayer.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Game Status */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Game Status</h3>
            {!lobbyInfo.game ? (
              <p className="text-blue-700">Waiting for admin to start the game...</p>
            ) : (
              <div className="text-blue-700">
                <p>Game Status: <span className="capitalize font-semibold">{lobbyInfo.game}</span></p>
                {player?.team_id ? (
                  <p className="mt-2">You are assigned to Team {player.team_id}</p>
                ) : (
                  <p className="mt-2">You are not assigned to a team yet</p>
                )}
              </div>
            )}
          </div>

          {/* Auto-refresh indicator */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {loading && lobbyInfo ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  Refreshing...
                </span>
              ) : (
                "Auto-refreshing every 3 seconds"
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
