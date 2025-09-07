import { useState, useEffect, useCallback, use } from 'react';
import LobbiesList from './LobbiesList';
import LobbyDetails from './LobbyDetails';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
    const { adminApiToken, adminSessionId } = useGlobalOutletContext();
    const navigate = useNavigate();
    const [selectedLobbyId, setSelectedLobbyId] = useState<number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!adminApiToken || !adminSessionId) {
            navigate('/admin/login');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleViewDetails = useCallback((lobbyId: number) => {
        setSelectedLobbyId(lobbyId);
    }, [setSelectedLobbyId]);

    const handleCloseLobbyDetails = useCallback(() => {
        setSelectedLobbyId(null);
    }, [setSelectedLobbyId]);

    const handleLobbyDeleted = useCallback(() => {
        setRefreshKey(prev => prev + 1); // Trigger refresh in LobbiesList
        setSelectedLobbyId(null); // Close the details modal
    }, [setRefreshKey, setSelectedLobbyId]);


    return (
        <div>
            <div className='text-left mb-6'>
                <h1 className='text-2xl md:text-3xl font-semibold mb-1 text-tx-primary'>Admin Dashboard</h1>
                <p className="text-tx-secondary">Manage lobbies and monitor team games</p>
            </div>

            <LobbiesList onViewDetails={handleViewDetails} refreshKey={refreshKey} />

            {selectedLobbyId && (
                <LobbyDetails
                    lobbyId={selectedLobbyId}
                    onClose={handleCloseLobbyDetails}
                    onLobbyDeleted={handleLobbyDeleted}
                />
            )}
        </div>
    );
}
