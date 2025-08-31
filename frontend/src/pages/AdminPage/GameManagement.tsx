import { useState, useEffect } from 'react';
import { LobbyInfo } from '@/types';
import { api } from '@/services/api';
import { useAdminOutletContext } from '@/hooks/useAdminOutletContext';

interface GameManagementProps {
    selectedLobby: LobbyInfo;
    onRefresh: () => void;
}

export default function GameManagement({ selectedLobby, onRefresh }: GameManagementProps) {
    const { adminToken } = useAdminOutletContext();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [puzzles, setPuzzles] = useState<string[]>([]);
    const [selectedPuzzle, setSelectedPuzzle] = useState('');
    const [teamName, setTeamName] = useState('');
    const [teamCount, setTeamCount] = useState(2);
    const [autoAssignNames, setAutoAssignNames] = useState('Team 1,Team 2');

    const game = selectedLobby.game;
    const hasPlayers = selectedLobby.players.length > 0;
    const unassignedPlayers = selectedLobby.players.filter(p => !p.team_id);

    useEffect(() => {
        const loadPuzzles = async () => {
            if (!adminToken) return;
            try {
                const puzzleList = await api.admin.game.getPuzzles(adminToken);
                setPuzzles(puzzleList);
                if (puzzleList.length > 0) {
                    setSelectedPuzzle(puzzleList[0]);
                }
            } catch (err) {
                console.error('Failed to load puzzles:', err);
                setError('Failed to load available puzzles');
            }
        };

        loadPuzzles();
    }, [adminToken]);


    const createGame = async () => {
        if (!adminToken || !selectedPuzzle) return;

        setLoading(true);
        setError('');

        try {
            await api.admin.game.create(selectedLobby.lobby.id, selectedPuzzle, adminToken);
            onRefresh();
        } catch (err) {
            setError('Failed to create game');
            console.error('Error creating game:', err);
        } finally {
            setLoading(false);
        }
    };

    const startGame = async () => {
        if (!game || !adminToken) return;

        setLoading(true);
        setError('');

        try {
            await api.admin.game.start(game.id, adminToken);
            onRefresh();
        } catch (err) {
            setError('Failed to start game');
            console.error('Error starting game:', err);
        } finally {
            setLoading(false);
        }
    };

    const finishGame = async () => {
        if (!game || !adminToken) return;

        setLoading(true);
        setError('');

        try {
            await api.admin.game.finish(game.id, adminToken);
            onRefresh();
        } catch (err) {
            setError('Failed to finish game');
            console.error('Error finishing game:', err);
        } finally {
            setLoading(false);
        }
    };

    const createTeam = async () => {
        if (!game || !adminToken || !teamName.trim()) return;

        setLoading(true);
        setError('');

        try {
            await api.admin.teams.create(teamName.trim(), game.id, adminToken);
            setTeamName('');
            onRefresh();
        } catch (err) {
            setError('Failed to create team');
            console.error('Error creating team:', err);
        } finally {
            setLoading(false);
        }
    };

    const autoAssignTeams = async () => {
        if (!game || !adminToken) return;

        const teamNames = autoAssignNames.split(',').map(name => name.trim()).filter(name => name);
        if (teamNames.length === 0) return;

        setLoading(true);
        setError('');

        try {
            await api.admin.teams.autoAssign(game.id, teamCount, teamNames, adminToken);
            onRefresh();
        } catch (err) {
            setError('Failed to auto-assign teams');
            console.error('Error auto-assigning teams:', err);
        } finally {
            setLoading(false);
        }
    };

    const assignPlayerToTeam = async (playerId: number, teamId: number) => {
        if (!adminToken) return;

        setLoading(true);
        setError('');

        try {
            await api.admin.teams.assignPlayer(playerId, teamId, adminToken);
            onRefresh();
        } catch (err) {
            setError('Failed to assign player to team');
            console.error('Error assigning player:', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteTeam = async (teamId: number) => {
        if (!adminToken) return;

        setLoading(true);
        setError('');

        try {
            await api.admin.teams.delete(teamId, adminToken);
            onRefresh();
        } catch (err) {
            setError('Failed to delete team');
            console.error('Error deleting team:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!game) {
        return (
            <div className="mt-6 rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Game Management</h3>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Select Puzzle
                        </label>
                        <select
                            value={selectedPuzzle}
                            onChange={(e) => setSelectedPuzzle(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={loading}
                        >
                            {puzzles.map(puzzle => (
                                <option key={puzzle} value={puzzle}>
                                    {puzzle}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={createGame}
                            disabled={loading || !hasPlayers || !selectedPuzzle}
                            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Game'}
                        </button>
                    </div>

                    {!hasPlayers && (
                        <p className="text-sm text-gray-600">
                            Players must join the lobby before a game can be created.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Game Management</h3>
                <div className="text-sm text-gray-600">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        game.state === 'active' ? 'bg-green-100 text-green-800' :
                        game.state === 'team_setup' ? 'bg-yellow-100 text-yellow-800' :
                        game.state === 'finished' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                        {game.state.charAt(0).toUpperCase() + game.state.slice(1).replace('_', ' ')}
                    </span>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    {error}
                </div>
            )}

            <div className="space-y-6">
                <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-2 text-base font-semibold">Game Info</h4>
                    <div className="space-y-1">
                        <p><strong>Puzzle:</strong> {game.puzzle_name}</p>
                        <p><strong>Created:</strong> {new Date(game.created_at).toLocaleString()}</p>
                        {game.started_at && (
                            <p><strong>Started:</strong> {new Date(game.started_at).toLocaleString()}</p>
                        )}
                        {game.finished_at && (
                            <p><strong>Finished:</strong> {new Date(game.finished_at).toLocaleString()}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-base font-semibold">Game Actions</h4>
                    <div className="flex space-x-2">
                        {game.state === 'team_setup' && (
                            <button
                                onClick={startGame}
                                disabled={loading || !selectedLobby.teams || selectedLobby.teams.length === 0}
                                className="rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? 'Starting...' : 'Start Game'}
                            </button>
                        )}
                        
                        {game.state === 'active' && (
                            <button
                                onClick={finishGame}
                                disabled={loading}
                                className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? 'Finishing...' : 'Finish Game'}
                            </button>
                        )}
                    </div>

                    {game.state === 'team_setup' && !selectedLobby.teams?.length && (
                        <p className="text-sm text-gray-600">
                            Create teams and assign players before starting the game.
                        </p>
                    )}
                </div>

                {game.state === 'team_setup' && (
                    <div className="space-y-4">
                        <h4 className="text-base font-semibold">Team Management</h4>
                        
                        {/* Auto-assign teams */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <h5 className="mb-3 text-sm font-semibold">Auto-assign Teams</h5>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">
                                            Number of Teams
                                        </label>
                                        <input
                                            type="number"
                                            min="2"
                                            max="10"
                                            value={teamCount}
                                            onChange={(e) => setTeamCount(parseInt(e.target.value) || 2)}
                                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">
                                            Team Names (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={autoAssignNames}
                                            onChange={(e) => setAutoAssignNames(e.target.value)}
                                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={autoAssignTeams}
                                    disabled={loading || selectedLobby.players.length === 0}
                                    className="w-full rounded bg-purple-600 px-3 py-2 text-sm text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? 'Auto-assigning...' : 'Auto-assign Teams'}
                                </button>
                            </div>
                        </div>

                        {/* Manual team creation */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <h5 className="mb-3 text-sm font-semibold">Create New Team</h5>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="Team name"
                                    className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                                    disabled={loading}
                                />
                                <button
                                    onClick={createTeam}
                                    disabled={loading || !teamName.trim()}
                                    className="rounded bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Create Team'}
                                </button>
                            </div>
                        </div>

                        {/* Team assignment */}
                        {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                            <div className="space-y-3">
                                <h5 className="text-sm font-semibold">Teams & Players</h5>
                                
                                {selectedLobby.teams.map(team => (
                                    <div key={team.id} className="rounded-lg border border-gray-200 p-3">
                                        <div className="flex items-center justify-between">
                                            <h6 className="font-medium">{team.name}</h6>
                                            <button
                                                onClick={() => deleteTeam(team.id)}
                                                disabled={loading}
                                                className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                        
                                        {selectedLobby.players_by_team && selectedLobby.players_by_team[team.id] && (
                                            <div className="mt-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {selectedLobby.players_by_team[team.id].map(player => (
                                                        <span
                                                            key={player.id}
                                                            className="inline-block rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                                                        >
                                                            {player.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Unassigned players */}
                                {unassignedPlayers.length > 0 && (
                                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                                        <h6 className="mb-2 text-sm font-medium text-orange-800">
                                            Unassigned Players ({unassignedPlayers.length})
                                        </h6>
                                        <div className="space-y-2">
                                            {unassignedPlayers.map(player => (
                                                <div key={player.id} className="flex items-center justify-between">
                                                    <span className="text-sm">{player.name}</span>
                                                    <select
                                                        onChange={(e) => {
                                                            const teamId = parseInt(e.target.value);
                                                            if (teamId) {
                                                                assignPlayerToTeam(player.id, teamId);
                                                            }
                                                        }}
                                                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                                                        disabled={loading}
                                                        defaultValue=""
                                                    >
                                                        <option value="">Assign to team...</option>
                                                        {selectedLobby.teams?.map(team => (
                                                            <option key={team.id} value={team.id}>
                                                                {team.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}