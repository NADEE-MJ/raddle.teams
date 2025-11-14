import { useState } from 'react';
import { TextInput, Button, Card } from '@/components';

interface CreateLobbyFormProps {
    onCreateLobby: (name: string) => Promise<void>;
    onGenerateLobbyName?: () => Promise<string>;
}

export default function CreateLobbyForm({ onCreateLobby, onGenerateLobbyName }: CreateLobbyFormProps) {
    const [newLobbyName, setNewLobbyName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isGeneratingName, setIsGeneratingName] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLobbyName.trim()) return;

        setLoading(true);
        try {
            await onCreateLobby(newLobbyName.trim());
            setNewLobbyName('');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateName = async () => {
        if (!onGenerateLobbyName || isGeneratingName) return;

        setIsGeneratingName(true);
        try {
            const generated = await onGenerateLobbyName();
            if (generated) {
                setNewLobbyName(generated);
            }
        } catch (err) {
            console.error('Failed to generate lobby name', err);
        } finally {
            setIsGeneratingName(false);
        }
    };

    return (
        <div>
            <div className='text-tx-secondary mb-3 text-sm tracking-wide uppercase' data-testid='create-lobby-heading'>
                Create New Lobby
            </div>

            <Card>
                <form
                    onSubmit={handleSubmit}
                    className='flex flex-col gap-3 md:flex-row md:items-center'
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
                    <div className='flex flex-col gap-2 md:w-auto md:flex-row'>
                        {onGenerateLobbyName && (
                            <Button
                                type='button'
                                variant='secondary'
                                size='md'
                                onClick={handleGenerateName}
                                loading={isGeneratingName}
                                disabled={loading}
                                data-testid='generate-lobby-name-button'
                            >
                                {isGeneratingName ? 'Surprising' : 'Surprise me'}
                            </Button>
                        )}
                        <Button
                            type='submit'
                            variant='primary'
                            size='md'
                            disabled={loading || !newLobbyName.trim()}
                            loading={loading}
                            data-testid='create-lobby-submit'
                        >
                            Create Lobby
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
