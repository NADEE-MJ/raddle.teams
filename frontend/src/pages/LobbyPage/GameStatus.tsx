import { Player } from '@/types';

interface GameStatusProps {
    player: Player;
}

export default function GameStatus({ player }: GameStatusProps) {
    return (
        <div className='mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4'>
            <h3 className='mb-2 text-lg font-semibold text-blue-900'>Game Status</h3>
            <p className='text-blue-700'>Waiting for admin to start the game...</p>
            {player.team_id ? (
                <p className='mt-2 text-blue-700'>You are assigned to Team {player.team_id}</p>
            ) : (
                <p className='mt-2 text-blue-700'>You are not assigned to a team yet</p>
            )}
        </div>
    );
}
