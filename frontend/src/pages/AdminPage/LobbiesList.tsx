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
        <div className='mb-6'>
            <div className='mb-3 flex items-center justify-between'>
                <div className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide" data-testid="all-lobbies-heading">All Lobbies</div>
                <button
                    onClick={onRefresh}
                    disabled={loading || contextLoading}
                    className='px-3 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                    data-testid='refresh-lobbies-button'
                >
                    Refresh
                </button>
            </div>

            {lobbies.length === 0 ? (
                <div className="mr-1 md:mr-0 pt-6 pb-6 md:pt-8 md:pb-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                    No lobbies created yet
                </div>
            ) : (
                <div className='max-h-96 overflow-y-auto'>
                    <div className='space-y-2'>
                        {lobbies.map(lobby => (
                            <div
                                key={lobby.id}
                                className="mr-1 md:mr-0 mb-2 pt-1 pb-0 md:pt-2 md:pb-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-4 py-3"
                            >
                                <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
                                    <div className='flex-1'>
                                        <h3 className='font-semibold text-gray-900 dark:text-white mb-1'>{lobby.name}</h3>
                                        <div className='flex flex-col md:flex-row gap-2 text-sm text-gray-600 dark:text-gray-300'>
                                            <span>Code: <span className='font-mono font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1 rounded'>{lobby.code}</span></span>
                                            <span className="hidden md:inline">•</span>
                                            <span>Created: {new Date(lobby.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className='flex gap-2'>
                                        <button
                                            onClick={() => onViewDetails(lobby.id)}
                                            disabled={loading || contextLoading}
                                            className='px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/30 text-blue-800 dark:text-blue-300 rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                                            data-testid={`view-lobby-${lobby.id}-button`}
                                        >
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => onDeleteLobby(lobby.id)}
                                            disabled={loading || contextLoading}
                                            className='px-3 py-1 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800/30 text-red-800 dark:text-red-300 rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                                            data-testid={`delete-lobby-${lobby.id}-button`}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
