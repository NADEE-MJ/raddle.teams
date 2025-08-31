import React from 'react';
import { Outlet } from 'react-router-dom';
import { LobbyOutletContext } from '@/hooks/useLobbyOutletContext';

const LobbyLayout: React.FC = () => {
    const context: LobbyOutletContext = {
        // default or derived lobby values
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Lobby</h2>
            <Outlet context={context} />
        </div>
    );
};

export default LobbyLayout;
