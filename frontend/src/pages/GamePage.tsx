import { useGameOutletContext } from "@/hooks/useGameOutletContext";
import { useNavigate } from "react-router-dom";

export default function GamePage() {
  const {
    gameId,
    player,
    sessionId,
    team,
    isLoading,
  } = useGameOutletContext();
  
  const navigate = useNavigate();

  if (!sessionId || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">No active session found</p>
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Game Page
        </h1>
        <p className="text-gray-600 mb-4">
          Game ID: {gameId}
        </p>
        <p className="text-gray-600 mb-4">
          Player: {player.name}
        </p>
        {team && (
          <p className="text-gray-600 mb-4">
            Team: {team.name}
          </p>
        )}
        <p className="text-gray-600 mb-4">
          The game functionality is not yet implemented.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          This is part of Phase 2 of the development plan.
        </p>
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