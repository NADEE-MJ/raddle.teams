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
            <div className="text-gray-500 dark:text-tx-secondary text-sm uppercase tracking-wide mb-3" data-testid="create-lobby-heading">Create New Lobby</div>

            <div className=" mb-4 py-3 rounded-md border border-gray-300 dark:border-border bg-white dark:bg-tertiary px-4 py-3">
                <form onSubmit={handleSubmit} className='flex flex-col md:flex-row gap-3' data-testid='create-lobby-form'>
                    <input
                        type='text'
                        value={newLobbyName}
                        onChange={e => setNewLobbyName(e.target.value)}
                        placeholder='Enter lobby name...'
                        className='flex-1 px-3 py-2 border border-gray-300 dark:border-border-light bg-white dark:bg-secondary text-gray-900 dark:text-tx-primary rounded-md text-sm focus:outline-none focus:border-blue-500 dark:focus:border-accent focus:ring-1 focus:ring-blue-500 dark:focus:ring-accent'
                        disabled={loading || contextLoading}
                        data-testid='lobby-name-input'
                    />
                    <button
                        type='submit'
                        disabled={loading || contextLoading || !newLobbyName.trim()}
                        className='px-4 py-2 bg-blue-50 dark:bg-secondary border border-blue-300 dark:border-border hover:bg-blue-200 dark:hover:bg-elevated text-blue-800 dark:text-accent rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                        data-testid='create-lobby-submit'
                    >
                        {loading || contextLoading ? 'Creating...' : 'Create Lobby'}
                    </button>
                </form>
            </div>
        </div>
    );
}
