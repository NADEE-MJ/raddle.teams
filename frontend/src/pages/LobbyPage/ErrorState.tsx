import { useNavigate } from 'react-router-dom';

export default function ErrorState() {
    const navigate = useNavigate();

    return (
        <main className="bg-slate-100 pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6'>Error</h1>
                    <p className='mb-6 text-red-600 text-lg'>Failed to load lobby information</p>
                    <button
                        onClick={() => navigate('/')}
                        className='rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 font-medium transition duration-200'
                        data-testid='lobby-error-back-to-home-button'
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </main>
    );
}
