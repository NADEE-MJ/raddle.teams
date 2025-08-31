import React from 'react';

const InvalidGamePage: React.FC = () => {
    return (
        <div className='flex min-h-screen items-center justify-center bg-gray-50'>
            <div className='text-center'>
                <h1 className='mb-4 text-2xl font-bold text-gray-900'>Invalid Game Access</h1>
                <p className='mb-6 text-gray-600'>Please use a valid game link or join from the home page.</p>
                <a
                    href='/'
                    className='rounded-lg bg-blue-600 px-4 py-2 text-white transition duration-200 hover:bg-blue-700'
                >
                    Back to Home
                </a>
            </div>
        </div>
    );
};

export default InvalidGamePage;
