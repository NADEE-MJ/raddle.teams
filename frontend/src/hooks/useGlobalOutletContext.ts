import { useOutletContext } from 'react-router-dom';

export type GlobalOutletContext = {
    sessionId: string | null;
    setSessionId: (id: string | null) => void;
    getSessionIdFromLocalStorage: () => string | null;
    adminApiToken: string | null;
    setAdminApiToken: (token: string | null) => void;
    getAdminApiTokenFromLocalStorage: () => string | null;
    adminSessionId: string | null;
    setAdminSessionId: (id: string | null) => void;
    getAdminSessionIdFromLocalStorage: () => string | null;
};

export function useGlobalOutletContext() {
    return useOutletContext<GlobalOutletContext>();
}
