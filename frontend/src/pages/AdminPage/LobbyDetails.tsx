import { LobbyInfo } from "@/types";

interface LobbyDetailsProps {
  selectedLobby: LobbyInfo;
  onClose: () => void;
}

export default function LobbyDetails({ selectedLobby, onClose }: LobbyDetailsProps) {
  return (
    <div className="bg-white rounded-lg shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Lobby Details: {selectedLobby.lobby.name}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Lobby Info</h3>
          <div className="space-y-2">
            <p>
              <strong>Code:</strong>{" "}
              <span className="font-mono">
                {selectedLobby.lobby.code}
              </span>
            </p>
            <p>
              <strong>Name:</strong> {selectedLobby.lobby.name}
            </p>
            <p>
              <strong>Created:</strong>{" "}
              {new Date(selectedLobby.lobby.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">
            Players ({selectedLobby.players.length})
          </h3>
          {selectedLobby.players.length === 0 ? (
            <p className="text-gray-500">No players in this lobby yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedLobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex justify-between items-center p-2 bg-white rounded border"
                >
                  <span className="font-medium">{player.name}</span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {player.team_id
                      ? `Team ${player.team_id}`
                      : "No team"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLobby.teams && selectedLobby.teams.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">
            Teams ({selectedLobby.teams.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {selectedLobby.teams.map((team) => (
              <div
                key={team.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <h4 className="font-semibold text-lg mb-2">
                  {team.name}
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Current word index: {team.current_word_index}
                </p>
                {selectedLobby.players_by_team &&
                  selectedLobby.players_by_team[team.id] && (
                    <div>
                      <p className="text-sm font-medium mb-2">Members:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedLobby.players_by_team[team.id].map(
                          (player) => (
                            <span
                              key={player.id}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {player.name}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
