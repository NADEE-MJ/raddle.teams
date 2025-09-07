import { useState } from 'react';
import { TextInput, Button, Card } from '@/components';

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
            <div className='text-tx-secondary mb-3 text-sm tracking-wide uppercase' data-testid='create-lobby-heading'>
                Create New Lobby
            </div>

            <Card>
                <form
                    onSubmit={handleSubmit}
                    className='flex flex-col gap-3 md:flex-row'
                    data-testid='create-lobby-form'
                >
                    <TextInput
                        value={newLobbyName}
                        onChange={setNewLobbyName}
                        placeholder='Enter lobby name...'
                        className='flex-1 text-sm'
                        disabled={loading}
                        data-testid='lobby-name-input'
                    />
                    <Button
                        type='submit'
                        variant='secondary'
                        size='md'
                        disabled={loading || !newLobbyName.trim()}
                        loading={loading}
                        className='text-accent'
                        data-testid='create-lobby-submit'
                    >
                        {loading ? 'Creating' : 'Create Lobby'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
