import React from 'react';
import { Outlet } from 'react-router-dom';

const GlobalLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gray-800 text-white p-4">Raddle Teams</header>
            <main className="flex-1"><Outlet /></main>
            <footer className="bg-gray-100 text-sm p-2 text-center">© Raddle Teams</footer>
        </div>
    );
};

export default GlobalLayout;
