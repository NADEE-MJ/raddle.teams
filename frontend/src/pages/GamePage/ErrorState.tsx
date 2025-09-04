import { useNavigate } from 'react-router-dom';

interface ErrorStateProps {
    message: string;
}

export default function ErrorState({ message }: ErrorStateProps) {
    const navigate = useNavigate();

    return (
        <main className="bg-slate-100 dark:bg-slate-900 pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6 text-gray-900 dark:text-white'>Error</h1>
                    <p className='mb-6 text-red-600 dark:text-red-400 text-lg'>{message}</p>
                    <button
                        onClick={() => navigate('/')}
                        className='rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-6 py-3 text-white font-medium transition duration-200'
                        data-testid='game-error-back-to-home-button'
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </main>
    );
}
