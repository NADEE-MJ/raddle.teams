import { useState } from 'react';

interface CreateLobbyFormProps {
    onCreateLobby: (name: string) => Promise<void>;
}

export default function CreateLobbyForm({ onCreateLobby }: CreateLobbyFormProps) {
    const [newLobbyName, setNewLobbyName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLobbyName.trim()) return;

        setLoading(true);
        await onCreateLobby(newLobbyName.trim());
        setNewLobbyName('');
        setLoading(false);
    };

    return (
        <div>
            <div className="text-tx-secondary text-sm uppercase tracking-wide mb-3" data-testid="create-lobby-heading">Create New Lobby</div>

            <div className="rounded-md border border-border bg-tertiary px-4 py-3">
                <form onSubmit={handleSubmit} className='flex flex-col md:flex-row gap-3' data-testid='create-lobby-form'>
                    <input
                        type='text'
                        value={newLobbyName}
                        onChange={e => setNewLobbyName(e.target.value)}
                        placeholder='Enter lobby name...'
                        className='flex-1 px-3 py-2 border border-border-light bg-secondary text-tx-primary rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent'
                        disabled={loading}
                        data-testid='lobby-name-input'
                    />
                    <button
                        type='submit'
                        disabled={loading || !newLobbyName.trim()}
                        className='px-4 py-2 bg-secondary border border-border hover:bg-elevated text-accent rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                        data-testid='create-lobby-submit'
                    >
                        {loading ? 'Creating...' : 'Create Lobby'}
                    </button>
                </form>
            </div>
        </div>
    );
}
