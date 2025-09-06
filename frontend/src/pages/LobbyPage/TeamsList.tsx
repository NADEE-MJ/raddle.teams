import { Team, Player } from '@/types';

interface TeamsListProps {
    teams: Team[] | null;
    playersByTeam: Record<number, Player[]> | null;
    currentPlayer: Player;
}

export default function TeamsList({ teams, playersByTeam, currentPlayer }: TeamsListProps) {
    return (
        <div className='rounded-lg bg-tertiary border border-border-light p-4'>
            <h2 className='mb-4 text-xl font-semibold text-tx-primary' data-testid='player-teams-heading'>
                Teams ({teams && teams.length > 0 ? teams.length : 0})
            </h2>
            {teams && teams.length > 0 ? (
                <div className='space-y-3'>
                    {teams.map(team => (
                        <div key={team.id} className='rounded-lg border border-border-light bg-secondary p-4' data-testid={`team-section-${team.name}`}>
                            <h3 className='mb-2 text-lg font-semibold text-tx-primary'>{team.name}</h3>
                            <div className='mb-2 text-sm text-tx-secondary'>
                                Progress: Word {team.current_word_index + 1}
                            </div>
                            {playersByTeam && playersByTeam[team.id] && (
                                <div>
                                    <p className='mb-1 text-sm font-medium text-tx-secondary'>Members:</p>
                                    <div className='flex flex-wrap gap-1' data-testid={`team-members-${team.name}`}>
                                        {playersByTeam[team.id].map(teamPlayer => (
                                            <span
                                                key={teamPlayer.id}
                                                className={`inline-block rounded px-2 py-1 text-xs ${teamPlayer.id === currentPlayer.id
                                                    ? 'bg-accent/20 font-semibold text-accent'
                                                    : 'bg-elevated text-tx-secondary'
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
                <p className='text-tx-muted'>No teams created yet. Waiting for admin to set up teams...</p>
            )}
        </div>
    );
}