import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';

interface RoomListItem {
    id: number;
    code: string;
    name: string;
    status: string;
    current_round: number;
    created_at: string;
}

export default function AdminPage() {
    const [rooms, setRooms] = useState<RoomListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const { addToast } = useToast();

    const token = localStorage.getItem('admin_token') || '';

    useEffect(() => {
        if (!token) {
            navigate('/admin/login');
            return;
        }

        loadRooms();
    }, [token, navigate]);

    const loadRooms = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.listRooms(token);
            setRooms(data);
        } catch (error) {
            addToast('Failed to load rooms', 'error');
            navigate('/admin/login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRoom = async (roomId: number) => {
        if (!confirm('Are you sure you want to delete this room?')) {
            return;
        }

        try {
            await adminApi.deleteRoom(roomId, token);
            addToast('Room deleted', 'success');
            await loadRooms();
        } catch (error) {
            addToast('Failed to delete room', 'error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
    };

    if (isLoading) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <div className='text-white'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='min-h-screen p-6'>
            <div className='mx-auto max-w-6xl space-y-6'>
                {/* Header */}
                <div className='flex items-center justify-between rounded-lg bg-gray-800 p-6'>
                    <h1 className='text-3xl font-bold text-purple-400'>Admin Dashboard</h1>
                    <button
                        onClick={handleLogout}
                        className='rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700'
                    >
                        Logout
                    </button>
                </div>

                {/* Rooms List */}
                <div className='rounded-lg bg-gray-800 p-6'>
                    <div className='mb-4 flex items-center justify-between'>
                        <h2 className='text-xl font-bold text-white'>Active Rooms ({rooms.length})</h2>
                        <button onClick={loadRooms} className='text-blue-400 hover:text-blue-300'>
                            🔄 Refresh
                        </button>
                    </div>

                    {rooms.length === 0 ? (
                        <p className='text-gray-400'>No active rooms</p>
                    ) : (
                        <div className='space-y-2'>
                            {rooms.map(room => (
                                <div
                                    key={room.id}
                                    className='flex items-center justify-between rounded-lg bg-gray-700 p-4'
                                >
                                    <div className='flex-1'>
                                        <div className='font-mono text-lg text-white'>{room.code}</div>
                                        <div className='text-sm text-gray-300'>{room.name}</div>
                                        <div className='text-sm text-gray-400'>
                                            Status: {room.status} | Round: {room.current_round}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRoom(room.id)}
                                        className='rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700'
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
