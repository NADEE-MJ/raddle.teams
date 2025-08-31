import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminOutletContext } from '../hooks/useAdminOutletContext';

const AdminLayout: React.FC = () => {
    const context: AdminOutletContext = { isAdmin: true };

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Admin</h2>
            <Outlet context={context} />
        </div>
    );
};

export default AdminLayout;
