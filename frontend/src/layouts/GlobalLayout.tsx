import { Outlet } from 'react-router-dom';

const GlobalLayout: React.FC = () => {
    return (
        <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4'>
            <Outlet />
        </div>
    );
};

export default GlobalLayout;
