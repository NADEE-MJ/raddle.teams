import { Player } from "@/types";

interface PlayersListProps {
  players: Player[];
  currentPlayer: Player;
}

export default function PlayersList({ players, currentPlayer }: PlayersListProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Players ({players.length})
      </h2>
      {players.length === 0 ? (
        <p className="text-gray-500">No players in lobby yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {players.map((playerItem) => (
            <div
              key={playerItem.id}
              className={`flex justify-between items-center p-3 rounded-lg ${
                playerItem.id === currentPlayer.id
                  ? "bg-blue-100 border-2 border-blue-300"
                  : "bg-white border border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {playerItem.name}
                  {playerItem.id === currentPlayer.id && " (You)"}
                </span>
              </div>
              <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {playerItem.team_id
                  ? `Team ${playerItem.team_id}`
                  : "No team"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
