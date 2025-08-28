import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useGame } from "../context/GameContext";
import { apiService } from "../services/api";
import { Player } from "../types";

export default function LobbyPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { player } = usePlayer();
  const { game, setGame } = useGame();
  const navigate = useNavigate();

  const loadGameData = useCallback(async () => {
    try {
      setLoading(true);

      // Try to get current game
      try {
        const currentGame = await apiService.getCurrentGame();
        setGame(currentGame);

        if (currentGame.state === "active") {
          navigate("/game");
          return;
        }
      } catch (error) {
        // No game exists, that's okay
        console.log("No active game found:", error);
      }

      // Load players
      const playersData = await apiService.getPlayers();
      setPlayers(playersData);
    } catch (err) {
      setError("Failed to load game data");
      console.error("Error loading game data:", err);
    } finally {
      setLoading(false);
    }
  }, [setGame, navigate]);

  useEffect(() => {
    if (!player) {
      navigate("/");
      return;
    }

    loadGameData();
  }, [player, navigate, loadGameData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Game Lobby</h1>
            <div className="text-sm text-gray-600">
              Welcome, {player?.name}!
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {!game && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Waiting for admin to start the game...
              </p>
              <div className="animate-pulse">
                <div className="h-2 bg-gray-200 rounded w-1/3 mx-auto"></div>
              </div>
            </div>
          )}

          {game && game.state === "lobby" && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Game created! Waiting for teams to be set up...
              </p>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Players in Lobby ({players.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {players.map((p: Player) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-lg border ${
                    p.connected
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        p.connected ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">
                      {p.name}
                    </span>
                  </div>
                  {p.team_id && (
                    <div className="text-xs text-gray-500 mt-1">
                      Team: {p.team_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={loadGameData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
