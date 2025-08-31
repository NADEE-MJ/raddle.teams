import { Lobby } from "@/types";

interface LobbiesListProps {
  lobbies: Lobby[];
  onRefresh: () => void;
  onViewDetails: (lobbyId: number) => void;
  onDeleteLobby: (lobbyId: number) => void;
  loading: boolean;
  contextLoading: boolean;
}

export default function LobbiesList({ 
  lobbies, 
  onRefresh, 
  onViewDetails, 
  onDeleteLobby, 
  loading, 
  contextLoading 
}: LobbiesListProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          All Lobbies
        </h2>
        <button
          onClick={onRefresh}
          disabled={loading || contextLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          Refresh
        </button>
      </div>

      {lobbies.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No lobbies created yet
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lobbies.map((lobby) => (
            <div
              key={lobby.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-1">{lobby.name}</h3>
              <p className="text-gray-600 mb-1">
                Code:{" "}
                <span className="font-mono font-bold">{lobby.code}</span>
              </p>
              <p className="text-gray-500 text-sm mb-3">
                Created: {new Date(lobby.created_at).toLocaleString()}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onViewDetails(lobby.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 text-sm"
                >
                  View Details
                </button>
                <button
                  onClick={() => onDeleteLobby(lobby.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
