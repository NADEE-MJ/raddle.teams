import { Lobby } from '@/types';

interface LobbiesListProps {
    lobbies: Lobby[];
    onRefresh: () => void;
    onViewDetails: (lobbyId: number) => void;
    onDeleteLobby: (lobbyId: number) => void;
    loading: boolean;
    contextLoading: boolean;
}

export default function LobbiesList({
    lobbies,
    onRefresh,
    onViewDetails,
    onDeleteLobby,
    loading,
    contextLoading,
}: LobbiesListProps) {
    return (
        <div className='mb-8'>
            <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-semibold text-gray-900'>All Lobbies</h2>
                <button
                    onClick={onRefresh}
                    disabled={loading || contextLoading}
                    className='rounded-lg bg-green-600 px-4 py-2 text-white transition duration-200 hover:bg-green-700 disabled:bg-green-400'
                >
                    Refresh
                </button>
            </div>

            {lobbies.length === 0 ? (
                <p className='py-8 text-center text-gray-500'>No lobbies created yet</p>
            ) : (
                <div className='max-h-96 overflow-y-auto'>
                    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                        {lobbies.map(lobby => (
                            <div
                                key={lobby.id}
                                className='rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md'
                            >
                                <h3 className='mb-1 text-lg font-semibold'>{lobby.name}</h3>
                                <p className='mb-1 text-gray-600'>
                                    Code: <span className='font-mono font-bold'>{lobby.code}</span>
                                </p>
                                <p className='mb-3 text-sm text-gray-500'>
                                    Created: {new Date(lobby.created_at).toLocaleString()}
                                </p>
                                <div className='flex flex-col gap-2'>
                                    <button
                                        onClick={() => onViewDetails(lobby.id)}
                                        className='rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition duration-200 hover:bg-blue-700'
                                    >
                                        View Details
                                    </button>
                                    <button
                                        onClick={() => onDeleteLobby(lobby.id)}
                                        className='rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition duration-200 hover:bg-red-700'
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
