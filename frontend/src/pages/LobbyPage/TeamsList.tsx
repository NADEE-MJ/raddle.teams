import { Team, Player } from '@/types';

interface TeamsListProps {
    teams: Team[] | null;
    playersByTeam: Record<number, Player[]> | null;
    currentPlayer: Player;
}

export default function TeamsList({ teams, playersByTeam, currentPlayer }: TeamsListProps) {
    return (
        <div className='rounded-lg bg-gray-50 dark:bg-slate-700 p-4'>
            <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white' data-testid='player-teams-heading'>
                Teams ({teams && teams.length > 0 ? teams.length : 0})
            </h2>
            {teams && teams.length > 0 ? (
                <div className='space-y-3'>
                    {teams.map(team => (
                        <div key={team.id} className='rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-600 p-4' data-testid={`team-section-${team.name}`}>
                            <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-white'>{team.name}</h3>
                            <div className='mb-2 text-sm text-gray-600 dark:text-gray-300'>
                                Progress: Word {team.current_word_index + 1}
                            </div>
                            {playersByTeam && playersByTeam[team.id] && (
                                <div>
                                    <p className='mb-1 text-sm font-medium text-gray-700 dark:text-gray-300'>Members:</p>
                                    <div className='flex flex-wrap gap-1' data-testid={`team-members-${team.name}`}>
                                        {playersByTeam[team.id].map(teamPlayer => (
                                            <span
                                                key={teamPlayer.id}
                                                className={`inline-block rounded px-2 py-1 text-xs ${teamPlayer.id === currentPlayer.id
                                                        ? 'bg-blue-200 dark:bg-blue-800/30 font-semibold text-blue-800 dark:text-blue-300'
                                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                                    }`}
                                                data-testid={`team-member-${teamPlayer.name}`}
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
            ) : (
                <p className='text-gray-500 dark:text-gray-400'>No teams created yet. Waiting for admin to set up teams...</p>
            )}
        </div>
    );
}