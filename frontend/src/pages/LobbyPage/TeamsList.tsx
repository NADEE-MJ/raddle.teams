import { Team, Player } from '@/types';

interface TeamsListProps {
    teams: Team[] | null;
    playersByTeam: Record<number, Player[]> | null;
    currentPlayer: Player;
}

export default function TeamsList({ teams, playersByTeam, currentPlayer }: TeamsListProps) {
    return (
        <div className='rounded-lg bg-ayu-bg-tertiary border border-ayu-border-light p-4'>
            <h2 className='mb-4 text-xl font-semibold text-ayu-text-primary' data-testid='player-teams-heading'>
                Teams ({teams && teams.length > 0 ? teams.length : 0})
            </h2>
            {teams && teams.length > 0 ? (
                <div className='space-y-3'>
                    {teams.map(team => (
                        <div key={team.id} className='rounded-lg border border-ayu-border-light bg-ayu-bg-secondary p-4' data-testid={`team-section-${team.name}`}>
                            <h3 className='mb-2 text-lg font-semibold text-ayu-text-primary'>{team.name}</h3>
                            <div className='mb-2 text-sm text-ayu-text-secondary'>
                                Progress: Word {team.current_word_index + 1}
                            </div>
                            {playersByTeam && playersByTeam[team.id] && (
                                <div>
                                    <p className='mb-1 text-sm font-medium text-ayu-text-secondary'>Members:</p>
                                    <div className='flex flex-wrap gap-1' data-testid={`team-members-${team.name}`}>
                                        {playersByTeam[team.id].map(teamPlayer => (
                                            <span
                                                key={teamPlayer.id}
                                                className={`inline-block rounded px-2 py-1 text-xs ${teamPlayer.id === currentPlayer.id
                                                        ? 'bg-ayu-accent/20 font-semibold text-ayu-accent'
                                                        : 'bg-ayu-bg-elevated text-ayu-text-secondary'
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
                <p className='text-ayu-text-muted'>No teams created yet. Waiting for admin to set up teams...</p>
            )}
        </div>
    );
}