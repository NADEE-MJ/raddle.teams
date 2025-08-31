import { useGameOutletContext } from "@/hooks/useGameOutletContext";
import { useNavigate } from "react-router-dom";

export default function GamePage() {
  const { gameId, player, sessionId, team, isLoading } = useGameOutletContext();

  const navigate = useNavigate();

  if (!sessionId || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">No active session found</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Game Page</h1>
          <p className="text-gray-600 mb-4">Game ID: {gameId}</p>
          <p className="text-gray-600 mb-4">Player: {player.name}</p>
          {team && <p className="text-gray-600 mb-4">Team: {team.name}</p>}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-gray-600 mb-2">
              The game functionality is not yet implemented.
            </p>
            <p className="text-sm text-gray-500">
              This is part of Phase 2 of the development plan.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
