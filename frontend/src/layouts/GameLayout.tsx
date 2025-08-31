import React from 'react';
import { Outlet } from 'react-router-dom';
import { GameOutletContext } from '@/hooks/useGameOutletContext';

const GameLayout: React.FC = () => {
    const context: GameOutletContext = {};

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Game</h2>
            <Outlet context={context} />
        </div>
    );
};

export default GameLayout;
