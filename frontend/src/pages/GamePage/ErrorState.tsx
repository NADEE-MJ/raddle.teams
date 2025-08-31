import { useNavigate } from 'react-router-dom';

interface ErrorStateProps {
    message: string;
}

export default function ErrorState({ message }: ErrorStateProps) {
    const navigate = useNavigate();

    return (
        <div className='flex min-h-screen items-center justify-center bg-gray-50'>
            <div className='text-center'>
                <p className='mb-4 text-red-600'>{message}</p>
                <button
                    onClick={() => navigate('/')}
                    className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
}
