import { useNavigate } from 'react-router-dom';

export default function ErrorState() {
    const navigate = useNavigate();

    return (
        <main className="bg-slate-100 dark:bg-ayu-bg-primary pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-ayu-bg-secondary dark:border dark:border-ayu-border rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6 text-gray-900 dark:text-ayu-text-primary'>Error</h1>
                    <p className='mb-6 text-red-600 dark:text-ayu-red text-lg'>Failed to load lobby information</p>
                    <button
                        onClick={() => navigate('/')}
                        className='rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-ayu-accent dark:hover:bg-ayu-accent-hover dark:text-ayu-bg-primary px-6 py-3 text-white font-medium transition duration-200'
                        data-testid='lobby-error-back-to-home-button'
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </main>
    );
}
