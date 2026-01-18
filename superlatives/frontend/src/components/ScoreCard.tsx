import type { Score, Player } from '@/types';

interface ScoreCardProps {
    scores: Score[];
    players: Player[];
}

export default function ScoreCard({ scores, players }: ScoreCardProps) {
    const scoreData = scores
        .map(score => {
            const player = players.find(p => p.id === score.player_id);
            return {
                ...score,
                playerName: player?.name || 'Unknown',
            };
        })
        .sort((a, b) => b.total_score - a.total_score);

    return (
        <div className='space-y-2'>
            <h3 className='text-2xl font-bold text-white'>Scores</h3>
            <div className='space-y-2'>
                {scoreData.map((score, index) => (
                    <div
                        key={score.id}
                        className='flex items-center justify-between rounded-lg bg-gray-800 p-4'
                    >
                        <div className='flex items-center gap-3'>
                            <div className='text-2xl font-bold text-yellow-400'>#{index + 1}</div>
                            <div className='text-xl text-white'>{score.playerName}</div>
                        </div>
                        <div className='text-2xl font-bold text-green-400'>{score.total_score} pts</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
