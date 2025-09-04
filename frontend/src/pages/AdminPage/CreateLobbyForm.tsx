import { useState } from 'react';

interface CreateLobbyFormProps {
    onCreateLobby: (name: string) => Promise<void>;
    loading: boolean;
    contextLoading: boolean;
}

export default function CreateLobbyForm({ onCreateLobby, loading, contextLoading }: CreateLobbyFormProps) {
    const [newLobbyName, setNewLobbyName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLobbyName.trim()) return;

        await onCreateLobby(newLobbyName.trim());
        setNewLobbyName('');
    };

    return (
        <div className='mb-6'>
            <div className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-3" data-testid="create-lobby-heading">Create New Lobby</div>
            
            <div className="mr-1 md:mr-0 mb-4 pt-2 pb-2 md:pt-3 md:pb-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-4 py-3">
                <form onSubmit={handleSubmit} className='flex flex-col md:flex-row gap-3' data-testid='create-lobby-form'>
                    <input
                        type='text'
                        value={newLobbyName}
                        onChange={e => setNewLobbyName(e.target.value)}
                        placeholder='Enter lobby name...'
                        className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-600 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                        disabled={loading || contextLoading}
                        data-testid='lobby-name-input'
                    />
                    <button
                        type='submit'
                        disabled={loading || contextLoading || !newLobbyName.trim()}
                        className='px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/30 text-blue-800 dark:text-blue-300 rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                        data-testid='create-lobby-submit'
                    >
                        {loading || contextLoading ? 'Creating...' : 'Create Lobby'}
                    </button>
                </form>
            </div>
        </div>
    );
}
