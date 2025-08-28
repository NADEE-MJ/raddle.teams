import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";
import { Game, Team, Player } from "../types";

export default function AdminPage() {
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Try to get current game
      try {
        const currentGame = await apiService.getCurrentGame();
        setGame(currentGame);
      } catch (error) {
        console.log("No active game found:", error);
      }

      // Load teams and players
      const [teamsData, playersData] = await Promise.all([
        apiService.getTeams(),
        apiService.getPlayers(),
      ]);

      setTeams(teamsData);
      setPlayers(playersData);
    } catch (err) {
      setError("Failed to load data");
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const createGame = async () => {
    try {
      setLoading(true);
      const newGame = await apiService.createGame();
      setGame(newGame);
      await loadData();
    } catch (err) {
      setError("Failed to create game");
      console.error("Error creating game:", err);
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (!game) return;

    try {
      setLoading(true);
      await apiService.startGame(game.id);
      await loadData();
    } catch (err) {
      setError("Failed to start game");
      console.error("Error starting game:", err);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      setLoading(true);
      await apiService.createTeam(newTeamName.trim());
      setNewTeamName("");
      await loadData();
    } catch (err) {
      setError("Failed to create team");
      console.error("Error creating team:", err);
    } finally {
      setLoading(false);
    }
  };

  const assignPlayerToTeam = async (playerId: number, teamId: number) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    try {
      await apiService.joinTeam(teamId, player.session_id);
      await loadData();
    } catch (err) {
      setError("Failed to assign player to team");
      console.error("Error assigning player:", err);
    }
  };

  const getTeamPlayers = (teamId: number) => {
    return players.filter((p) => p.team_id === teamId);
  };

  const getUnassignedPlayers = () => {
    return players.filter((p) => !p.team_id);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <button
              onClick={() => navigate("/")}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Game
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Game Status */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Game Status
            </h2>
            {game ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Game #{game.id}</p>
                    <p className="text-sm text-gray-600">
                      Status: <span className="capitalize">{game.state}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Puzzle: {game.puzzle_name}
                    </p>
                  </div>
                  {game.state === "lobby" && (
                    <button
                      onClick={startGame}
                      disabled={loading || teams.length === 0}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Game
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">No active game</p>
                <button
                  onClick={createGame}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Create New Game
                </button>
              </div>
            )}
          </div>

          {game && (
            <>
              {/* Team Management */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Teams
                </h2>

                {/* Create Team Form */}
                <form onSubmit={createTeam} className="mb-6">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter team name..."
                      disabled={loading}
                      maxLength={50}
                    />
                    <button
                      type="submit"
                      disabled={loading || !newTeamName.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Team
                    </button>
                  </div>
                </form>

                {/* Teams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {teams.map((team) => (
                    <div key={team.id} className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">
                        {team.name}
                      </h3>
                      <div className="space-y-1">
                        {getTeamPlayers(team.id).map((player) => (
                          <div
                            key={player.id}
                            className="text-sm text-gray-600 flex items-center"
                          >
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                player.connected
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            ></div>
                            {player.name}
                          </div>
                        ))}
                        {getTeamPlayers(team.id).length === 0 && (
                          <div className="text-sm text-gray-400 italic">
                            No players assigned
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unassigned Players */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Unassigned Players ({getUnassignedPlayers().length})
                </h2>
                <div className="space-y-2">
                  {getUnassignedPlayers().map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            player.connected ? "bg-green-500" : "bg-gray-400"
                          }`}
                        ></div>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <div className="flex space-x-2">
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() =>
                              assignPlayerToTeam(player.id, team.id)
                            }
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                          >
                            → {team.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {getUnassignedPlayers().length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      All players are assigned to teams
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
