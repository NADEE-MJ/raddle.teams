import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
    onLogout: () => void;
}

export default function DashboardHeader({ onLogout }: DashboardHeaderProps) {
    const navigate = useNavigate();

    return (
        <div className='mb-6 flex items-center justify-between'>
            <h1 className='text-3xl font-bold text-gray-900'>Admin Dashboard</h1>
            <div className='flex gap-3'>
                <button
                    onClick={() => navigate('/')}
                    className='rounded-lg bg-gray-600 px-4 py-2 text-white transition duration-200 hover:bg-gray-700'
                >
                    Home
                </button>
                <button
                    onClick={onLogout}
                    className='rounded-lg bg-red-600 px-4 py-2 text-white transition duration-200 hover:bg-red-700'
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
