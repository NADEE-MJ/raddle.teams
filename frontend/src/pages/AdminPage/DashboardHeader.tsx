import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
    onLogout: () => void;
}

export default function DashboardHeader({ onLogout }: DashboardHeaderProps) {
    const navigate = useNavigate();

    return (
        <div className='mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div className="text-center md:text-left">
                <h1 className='text-2xl md:text-3xl font-semibold mb-1 text-gray-900'>Admin Dashboard</h1>
                <p className="text-gray-600">Manage lobbies and monitor team games</p>
            </div>
            <div className='flex gap-2 justify-center md:justify-end'>
            </div>
        </div>
    );
}
