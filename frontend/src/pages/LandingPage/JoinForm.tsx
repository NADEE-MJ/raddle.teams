import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";

interface JoinFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export default function JoinForm({ loading, setLoading }: JoinFormProps) {
  const [name, setName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
      const player = await api.player.lobby.join(
        lobbyCode.trim().toUpperCase(),
        name.trim(),
      );
      localStorage.setItem("raddle_session_id", player.session_id);
      navigate(`/lobby/${lobbyCode.trim().toUpperCase()}`);
    } catch (err) {
      setError(
        "Failed to join lobby. Please check the lobby code and try again.",
      );
      console.error("Error joining lobby:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
          placeholder="ABCDEF"
          maxLength={6}
          disabled={loading}
        />
      </div>

      {error && <div className="text-red-600 text-sm text-center">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
      >
        {loading ? "Joining..." : "Join Lobby"}
      </button>
    </form>
  );
}
