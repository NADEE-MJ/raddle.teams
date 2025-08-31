import React from 'react';
import { Outlet } from 'react-router-dom';

const GlobalLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-100">
            <Outlet />
        </div>
    );
};

export default GlobalLayout;
