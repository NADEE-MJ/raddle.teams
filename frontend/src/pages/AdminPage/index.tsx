import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { LobbyInfo, Lobby, Player, Team } from '@/types';

import CreateLobbyForm from './CreateLobbyForm';
import LobbiesList from './LobbiesList';
import LobbyDetails from './LobbyDetails';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminPage() {
    const {
        adminApiToken,
        adminSessionId,
    } = useGlobalOutletContext();

    const navigate = useNavigate();

    const [error, setError] = useState('');
    const [lobbies, setLobbies] = useState<Lobby[]>([]);
    const [selectedLobby, setSelectedLobby] = useState<LobbyInfo | null>(null);
    const [refreshLobbiesLoading, setRefreshLobbiesLoading] = useState(false);

    useEffect(() => {
        if (!adminApiToken || !adminSessionId) {
            navigate('/admin/login');
        }

        refreshLobbies();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshLobbies = async () => {
        if (!adminApiToken) throw new Error('No admin API token');

        try {
            setRefreshLobbiesLoading(true);
            const fetchedLobbies = await api.admin.lobby.getAll(adminApiToken);
            setLobbies(fetchedLobbies);
        } catch (err) {
            setError('Failed to load lobbies');
            console.error('Error loading lobbies:', err);
        } finally {
            setRefreshLobbiesLoading(false);
        }
    }

    const createLobby = async (name: string) => {
        if (!adminApiToken) throw new Error('No admin API token');

        try {
            await api.admin.lobby.create(name, adminApiToken);
            await refreshLobbies();
        } catch (err) {
            setError('Failed to create lobby');
            console.error('Error creating lobby:', err);
        }
    };

    const deleteLobby = async (lobbyId: number) => {
        if (!adminApiToken) throw new Error('No admin API token');

        try {
            await api.admin.lobby.delete(lobbyId, adminApiToken);
            await refreshLobbies();
            // TODO connect with WebSocket to unsubscribe if viewing details
            // if (selectedLobby?.lobby.id === lobbyId) {
            //     // Unsubscribe before closing
            //     if (sendWebSocketMessage) {
            //         sendWebSocketMessage({
            //             action: 'unsubscribe_lobby',
            //             lobby_id: lobbyId,
            //         });
            //     }
            //     setSelectedLobby(null);
            // }
        } catch (err) {
            setError('Failed to delete lobby');
            console.error('Error deleting lobby:', err);
        }
    };

    // const handleLobbyUpdate = useCallback(
    //     (lobbyId: number) => {
    //         // Use current state instead of closure to avoid dependency issues
    //         setSelectedLobby(current => {
    //             if (current && current.lobby.id === lobbyId && adminToken) {
    //                 // Refresh the selected lobby
    //                 api.admin.lobby
    //                     .getInfo(current.lobby.id, adminToken)
    //                     .then(lobbyInfo => {
    //                         setSelectedLobby(lobbyInfo);
    //                     })
    //                     .catch(err => {
    //                         console.error('Error refreshing selected lobby:', err);
    //                     });
    //             }
    //             return current;
    //         });
    //     },
    //     [adminToken]
    // );

    // const viewLobbyDetails = async (lobbyId: number) => {
    //     if (!adminToken) return;

    //     try {
    //         setLoading(true);
    //         const lobbyInfo = await api.admin.lobby.getInfo(lobbyId, adminToken);
    //         setSelectedLobby(lobbyInfo);

    //         // Subscribe to lobby updates via WebSocket
    //         if (sendWebSocketMessage) {
    //             sendWebSocketMessage({
    //                 action: 'subscribe_lobby',
    //                 lobby_id: lobbyId,
    //             });
    //         }
    //     } catch (err) {
    //         setError('Failed to load lobby details');
    //         console.error('Error loading lobby details:', err);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // const closeLobbyDetails = () => {
    //     if (selectedLobby && sendWebSocketMessage) {
    //         // Unsubscribe from lobby updates
    //         sendWebSocketMessage({
    //             action: 'unsubscribe_lobby',
    //             lobby_id: selectedLobby.lobby.id,
    //         });
    //     }
    //     setSelectedLobby(null);
    // };

    // const createTeams = async (lobbyId: number, numTeams: number) => {
    //     if (!adminToken) return;

    //     try {
    //         setLoading(true);
    //         await api.admin.lobby.team.create(lobbyId, numTeams, adminToken);
    //         // Refresh the selected lobby to show new teams
    //         const lobbyInfo = await api.admin.lobby.getInfo(lobbyId, adminToken);
    //         setSelectedLobby(lobbyInfo);
    //     } catch (err) {
    //         setError('Failed to create teams');
    //         console.error('Error creating teams:', err);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // const movePlayer = async (playerId: number, teamId: number) => {
    //     if (!adminToken || !selectedLobby) return;

    //     try {
    //         setLoading(true);
    //         await api.admin.lobby.team.move(playerId, teamId, adminToken);
    //         // Refresh the selected lobby to show updated teams
    //         const lobbyInfo = await api.admin.lobby.getInfo(selectedLobby.lobby.id, adminToken);
    //         setSelectedLobby(lobbyInfo);
    //     } catch (err) {
    //         setError('Failed to move player');
    //         console.error('Error moving player:', err);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // const kickPlayer = async (playerId: number) => {
    //     if (!adminToken || !selectedLobby) return;

    //     try {
    //         setLoading(true);
    //         await api.admin.lobby.player.kick(playerId, adminToken);
    //         // Refresh the selected lobby to show updated players
    //         const lobbyInfo = await api.admin.lobby.getInfo(selectedLobby.lobby.id, adminToken);
    //         setSelectedLobby(lobbyInfo);
    //     } catch (err) {
    //         setError('Failed to kick player');
    //         console.error('Error kicking player:', err);
    //     } finally {
    //         setLoading(false);
    //     }
    // };



    // // Register/unregister lobby update callback
    // useEffect(() => {
    //     if (onLobbyUpdate && offLobbyUpdate) {
    //         onLobbyUpdate(handleLobbyUpdate);
    //         return () => {
    //             offLobbyUpdate(handleLobbyUpdate);
    //         };
    //     }
    // }, [handleLobbyUpdate, onLobbyUpdate, offLobbyUpdate]);

    // // Cleanup subscription on component unmount
    // useEffect(() => {
    //     return () => {
    //         // Use ref to get current value at cleanup time
    //         if (selectedLobbyRef.current && sendWebSocketMessage) {
    //             sendWebSocketMessage({
    //                 action: 'unsubscribe_lobby',
    //                 lobby_id: selectedLobbyRef.current.lobby.id,
    //             });
    //         }
    //     };
    // }, [sendWebSocketMessage]);

    // if (!isAdmin) {
    //     return <AdminLogin onLogin={handleLogin} loading={loading} error={error} />;
    // }

    return (
        <div>
            <div className='text-left mb-6'>
                <h1 className='text-2xl md:text-3xl font-semibold mb-1 text-tx-primary'>Admin Dashboard</h1>
                <p className="text-tx-secondary">Manage lobbies and monitor team games</p>
            </div>

            {error && <div className='mb-6 rounded-lg border border-red bg-red/20 px-4 py-3 text-red' data-testid='admin-error-message'>
                {error}
            </div>}

            <div className='mb-4'>
                <CreateLobbyForm onCreateLobby={createLobby} />
            </div>

            {refreshLobbiesLoading ? <LoadingSpinner /> : (
                <LobbiesList
                    lobbies={lobbies}
                    onRefresh={refreshLobbies}
                    // onViewDetails={viewLobbyDetails}
                    onDeleteLobby={deleteLobby}
                    loading={refreshLobbiesLoading}
                />
            )}

            {/* {selectedLobby && (
                    <LobbyDetails
                        selectedLobby={selectedLobby}
                        onClose={closeLobbyDetails}
                        onCreateTeams={createTeams}
                        onMovePlayer={movePlayer}
                        onKickPlayer={kickPlayer}
                        loading={loading}
                    />
                )} */}
        </div>

    );
}
