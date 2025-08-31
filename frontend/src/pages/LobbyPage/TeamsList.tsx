import { Team, Player } from '@/types';

interface TeamsListProps {
    teams: Team[] | null;
    playersByTeam: Record<number, Player[]> | null;
    currentPlayer: Player;
}

export default function TeamsList({ teams, playersByTeam, currentPlayer }: TeamsListProps) {
    return (
        <div className='rounded-lg bg-gray-50 p-4'>
            <h2 className='mb-4 text-xl font-semibold text-gray-900'>Teams {teams ? `(${teams.length})` : '(0)'}</h2>
            {!teams || teams.length === 0 ? (
                <p className='text-gray-500'>No teams created yet. Waiting for admin to set up teams...</p>
            ) : (
                <div className='space-y-3'>
                    {teams.map(team => (
                        <div key={team.id} className='rounded-lg border border-gray-200 bg-white p-4'>
                            <h3 className='mb-2 text-lg font-semibold'>{team.name}</h3>
                            <div className='mb-2 text-sm text-gray-600'>
                                Progress: Word {team.current_word_index + 1}
                            </div>
                            {playersByTeam && playersByTeam[team.id] && (
                                <div>
                                    <p className='mb-1 text-sm font-medium text-gray-700'>Members:</p>
                                    <div className='flex flex-wrap gap-1'>
                                        {playersByTeam[team.id].map(teamPlayer => (
                                            <span
                                                key={teamPlayer.id}
                                                className={`inline-block rounded px-2 py-1 text-xs ${
                                                    teamPlayer.id === currentPlayer.id
                                                        ? 'bg-blue-200 font-semibold text-blue-800'
                                                        : 'bg-gray-200 text-gray-700'
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
