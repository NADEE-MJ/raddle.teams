import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { apiService } from "../services/api";

export default function HomePage() {
  const [name, setName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingExistingSession, setCheckingExistingSession] = useState(true);
  const { player, sessionId, setPlayer } = usePlayer();
  const navigate = useNavigate();

  // Check if user is already logged in when component mounts
  useEffect(() => {
    const checkExistingSession = async () => {
      if (player && player.lobby_id) {
        try {
          // Try to get the active lobby for this player
          const lobby = await apiService.getActiveLobbyForPlayer(sessionId);
          if (lobby) {
            // Player has an active lobby, redirect them there
            navigate("/lobby");
            return;
          }
        } catch {
          // If fetching lobby fails, clear the stored player
          console.log("No active lobby found for player, clearing stored data");
          setPlayer(null);
        }
      } else if (player) {
        // Player exists but no lobby_id, try to get their active lobby anyway
        try {
          const lobby = await apiService.getActiveLobbyForPlayer(sessionId);
          if (lobby) {
            // Update player with the lobby info and redirect
            const updatedPlayer = { ...player, lobby_id: lobby.id };
            setPlayer(updatedPlayer);
            navigate("/lobby");
            return;
          }
        } catch {
          // No active lobby found, clear the stored player
          console.log("No active lobby found, clearing stored player data");
          setPlayer(null);
        }
      }
      setCheckingExistingSession(false);
    };

    checkExistingSession();
  }, [player, sessionId, setPlayer, navigate]);

  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!lobbyCode.trim()) {
      setError("Please enter a lobby code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const player = await apiService.joinLobby(lobbyCode.trim().toUpperCase(), name.trim(), sessionId);
      setPlayer(player);
      navigate("/lobby");
    } catch (err) {
      setError("Failed to join lobby. Please check the lobby code and try again.");
      console.error("Error joining lobby:", err);
    } finally {
      setLoading(false);
    }
  };

  const goToAdminPage = () => {
    navigate("/admin");
  };

  // Show loading spinner while checking for existing session
  if (checkingExistingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Raddle Teams
            </h1>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking for existing session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Raddle Teams
          </h1>
          <p className="text-gray-600">Join the word chain challenge!</p>
        </div>

        <form onSubmit={handleJoinLobby} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your name"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="lobbyCode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Lobby Code
            </label>
            <input
              type="text"
              id="lobbyCode"
              value={lobbyCode}
              onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 uppercase"
              placeholder="ABCDEF"
              maxLength={6}
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
            {loading ? "Joining..." : "Join Lobby"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={goToAdminPage}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
}
