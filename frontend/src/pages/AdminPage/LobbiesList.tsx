import { Lobby } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useDebounce } from '@/hooks/useDebounce';
import { LoadingSpinner, CopyableCode, Button, ErrorMessage, Card } from '@/components';
import CreateLobbyForm from './CreateLobbyForm';

interface LobbiesListProps {
    onViewDetails: (lobbyId: number) => void;
    refreshKey: number;
    onDebouncedRefresh?: (refreshFn: () => void) => void;
}

export default function LobbiesList({ onViewDetails, refreshKey, onDebouncedRefresh }: LobbiesListProps) {
    const { adminApiToken } = useGlobalOutletContext();

    const [lobbies, setLobbies] = useState<Lobby[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');

    const refreshLobbies = useCallback(async () => {
        if (!adminApiToken) {
            setError('Admin API token is required to fetch lobbies');
            console.error('Admin API token is missing');
            setIsInitialLoad(false);
            return;
        }

        try {
            setIsRefreshing(true);
            setError('');
            const fetchedLobbies = await api.admin.lobby.getAll(adminApiToken);
            setLobbies(fetchedLobbies);
        } catch (err) {
            setError('Failed to load lobbies');
            console.error('Error loading lobbies:', err);
        } finally {
            setIsInitialLoad(false);
            setIsRefreshing(false);
        }
    }, [adminApiToken]);

    const debouncedRefreshLobbies = useDebounce(refreshLobbies);

    useEffect(() => {
        refreshLobbies();
    }, [refreshKey, refreshLobbies]);

    useEffect(() => {
        if (onDebouncedRefresh) {
            onDebouncedRefresh(debouncedRefreshLobbies);
        }
    }, [onDebouncedRefresh, debouncedRefreshLobbies]);

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

    const generateLobbyName = useCallback(async () => {
        if (!adminApiToken) {
            setError('Admin API token is required to generate a lobby name');
            console.error('Admin API token is missing');
            return '';
        }

        try {
            const { name } = await api.admin.lobby.getRandomName(adminApiToken);
            return name;
        } catch (err) {
            setError('Failed to generate lobby name');
            console.error('Error generating lobby name:', err);
            return '';
        }
    }, [adminApiToken]);

    return (
        <div>
            <div className='mb-4'>
                <CreateLobbyForm onCreateLobby={createLobby} onGenerateLobbyName={generateLobbyName} />
            </div>

            <ErrorMessage message={error} data-testid='lobbies-error-message' />

            <div className='mb-3 flex items-center justify-between'>
                <div className='text-tx-secondary text-sm tracking-wide uppercase' data-testid='all-lobbies-heading'>
                    All Lobbies
                </div>
                <Button
                    onClick={debouncedRefreshLobbies}
                    disabled={isRefreshing}
                    loading={isRefreshing}
                    loadingIndicatorPlacement='left'
                    variant='secondary'
                    size='sm'
                    data-testid='refresh-lobbies-button'
                >
                    Refresh
                </Button>
            </div>

            {isInitialLoad ? (
                <LoadingSpinner />
            ) : lobbies.length === 0 ? (
                <div className='border-border bg-tertiary text-tx-muted rounded-md border pt-8 pb-8 text-center'>
                    No lobbies created yet
                </div>
            ) : (
                <div className='max-h-96 overflow-y-auto pr-2'>
                    <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
                        {lobbies.map(lobby => (
                            <Card
                                key={lobby.id}
                                variant='clickable'
                                onClick={() => onViewDetails(lobby.id)}
                                data-testid={`lobby-item-${lobby.id}`}
                            >
                                <div className='flex flex-col gap-2'>
                                    <div className='flex flex-row items-start justify-between'>
                                        <h3 className='text-tx-primary font-semibold'>{lobby.name}</h3>
                                        <div className='text-tx-muted ml-2 text-xs whitespace-nowrap opacity-75'>
                                            Click to view →
                                        </div>
                                    </div>
                                    <div className='dark:text-tx-secondary flex flex-col gap-2 text-sm text-gray-600'>
                                        <span className='flex items-center gap-2'>
                                            Code:
                                            <CopyableCode code={lobby.code} />
                                        </span>
                                        <span>Created: {new Date(lobby.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
