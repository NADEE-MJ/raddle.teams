import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { Player, Lobby } from "@/types";

interface LobbyHeaderProps {
  lobby: Lobby;
  player: Player;
  sessionId: string;
  setSessionId: (sessionId: string | null) => void;
}

export default function LobbyHeader({
  lobby,
  player,
  sessionId,
  setSessionId,
}: LobbyHeaderProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLeave = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      await api.player.lobby.leave(sessionId);
    } catch (err) {
      console.error("Failed to leave lobby on server:", err);
    }

    setSessionId(null);
    navigate("/");
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{lobby.name}</h1>
        <p className="text-gray-600 mt-1">
          Lobby Code:{" "}
          <span className="font-mono text-lg font-bold">{lobby.code}</span>
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-600 mb-2">Welcome, {player.name}!</p>
        <button
          onClick={handleLeave}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          {loading ? "Leaving..." : "Leave Lobby"}
        </button>
      </div>
    </div>
  );
}
