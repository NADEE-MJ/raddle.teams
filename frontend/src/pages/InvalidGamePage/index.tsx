const InvalidGamePage: React.FC = () => {
    return (
        <main className="bg-slate-100 pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6'>Invalid Game Access</h1>
                    <p className='mb-6 text-gray-600 text-lg'>Please use a valid game link or join from the home page.</p>
                    <a
                        href='/'
                        className='rounded-lg bg-blue-600 px-6 py-3 text-white transition duration-200 hover:bg-blue-700 font-medium'
                        data-testid='invalid-game-back-to-home-link'
                    >
                        Back to Home
                    </a>
                </div>
            </div>
        </main>
    );
};

export default InvalidGamePage;
