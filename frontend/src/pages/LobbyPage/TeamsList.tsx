import { Team, Player } from "@/types";

interface TeamsListProps {
  teams: Team[] | null;
  playersByTeam: Record<number, Player[]> | null;
  currentPlayer: Player;
}

export default function TeamsList({
  teams,
  playersByTeam,
  currentPlayer,
}: TeamsListProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Teams {teams ? `(${teams.length})` : "(0)"}
      </h2>
      {!teams || teams.length === 0 ? (
        <p className="text-gray-500">
          No teams created yet. Waiting for admin to set up teams...
        </p>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <h3 className="font-semibold text-lg mb-2">{team.name}</h3>
              <div className="text-sm text-gray-600 mb-2">
                Progress: Word {team.current_word_index + 1}
              </div>
              {playersByTeam && playersByTeam[team.id] && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Members:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {playersByTeam[team.id].map((teamPlayer) => (
                      <span
                        key={teamPlayer.id}
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          teamPlayer.id === currentPlayer.id
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
  );
}
