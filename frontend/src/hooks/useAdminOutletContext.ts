import { useOutletContext } from 'react-router-dom';
import { Lobby } from '@/types';

export type AdminOutletContext = {
    isAdmin: boolean;
    adminToken: string | null;
    setAdminToken: (token: string | null) => void;
    lobbies: Lobby[];
    refreshLobbies: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
    sendWebSocketMessage?: (message: object) => void;
    onLobbyUpdate: (callback: (lobbyId: number) => void) => void;
    offLobbyUpdate: (callback: (lobbyId: number) => void) => void;
};

export function useAdminOutletContext() {
    return useOutletContext<AdminOutletContext>();
}
