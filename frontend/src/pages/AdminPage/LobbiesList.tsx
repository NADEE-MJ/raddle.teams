import { Lobby } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import CreateLobbyForm from './CreateLobbyForm';

interface LobbiesListProps {
    onViewDetails: (lobbyId: number) => void;
    refreshKey: number;
}

export default function LobbiesList({ onViewDetails, refreshKey }: LobbiesListProps) {
    const { adminApiToken } = useGlobalOutletContext();

    const [lobbies, setLobbies] = useState<Lobby[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const refreshLobbies = useCallback(async () => {
        if (!adminApiToken) {
            setError('Admin API token is required to fetch lobbies');
            console.error('Admin API token is missing');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const fetchedLobbies = await api.admin.lobby.getAll(adminApiToken);
            setLobbies(fetchedLobbies);
        } catch (err) {
            setError('Failed to load lobbies');
            console.error('Error loading lobbies:', err);
        } finally {
            setLoading(false);
        }
    }, [adminApiToken]);

    useEffect(() => {
        refreshLobbies();
    }, [refreshKey, refreshLobbies]);

    const createLobby = async (name: string) => {
        if (!adminApiToken) {
            setError('Admin API token is required to create lobby');
            console.error('Admin API token is missing');
            return;
        }

        try {
            setError('');
            await api.admin.lobby.create(name, adminApiToken);
            await refreshLobbies();
        } catch (err) {
            setError('Failed to create lobby');
            console.error('Error creating lobby:', err);
        }
    };

    const handleCopyCode = async (code: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering the lobby click
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    return (
        <div>
            <div className='mb-4'>
                <CreateLobbyForm onCreateLobby={createLobby} />
            </div>

            {error && (
                <div className='mb-6 rounded-lg border border-red bg-red/20 px-4 py-3 text-red' data-testid='lobbies-error-message'>
                    {error}
                </div>
            )}

            <div className='mb-3 flex items-center justify-between'>
                <div className="text-tx-secondary text-sm uppercase tracking-wide" data-testid="all-lobbies-heading">All Lobbies</div>
                <button
                    onClick={refreshLobbies}
                    disabled={loading}
                    className='px-3 py-1 bg-secondary border border-border hover:bg-elevated text-tx-primary rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                    data-testid='refresh-lobbies-button'
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : lobbies.length === 0 ? (
                <div className="pt-8 pb-8 rounded-md border border-border bg-tertiary text-center text-tx-muted">
                    No lobbies created yet
                </div>
            ) : (
                <div className='max-h-96 overflow-y-auto pr-2'>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {lobbies.map(lobby => (
                            <div
                                key={lobby.id}
                                onClick={() => onViewDetails(lobby.id)}
                                className="rounded-md border-2 border-border bg-tertiary px-4 py-3 cursor-pointer hover:bg-tertiary transition-colors duration-200 hover:border-accent hover:shadow-md"
                                data-testid={`lobby-item-${lobby.id}`}
                            >
                                <div className='flex flex-col gap-2'>
                                    <div className='flex flex-row justify-between items-start'>
                                        <h3 className='font-semibold text-tx-primary'>{lobby.name}</h3>
                                        <div className='text-tx-muted text-xs opacity-75 whitespace-nowrap ml-2'>
                                            Click to view →
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-2 text-sm text-gray-600 dark:text-tx-secondary'>
                                        <span className="flex items-center gap-2">
                                            Code:
                                            <button
                                                onClick={(e) => handleCopyCode(lobby.code, e)}
                                                className='relative font-bold bg-green/20 text-green py-1 px-2 rounded hover:bg-green/30 transition-colors duration-200'
                                                title="Click to copy code"
                                            >
                                                {lobby.code}
                                                {copiedCode === lobby.code && (
                                                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                        Copied!
                                                    </span>
                                                )}
                                            </button>
                                        </span>
                                        <span>Created: {new Date(lobby.created_at).toLocaleDateString()}</span>
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
