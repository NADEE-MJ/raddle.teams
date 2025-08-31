import { useNavigate } from 'react-router-dom';

export default function ErrorState() {
    const navigate = useNavigate();

    return (
        <div className='flex min-h-screen items-center justify-center bg-gray-50'>
            <div className='text-center'>
                <p className='mb-4 text-red-600'>Failed to load lobby information</p>
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
