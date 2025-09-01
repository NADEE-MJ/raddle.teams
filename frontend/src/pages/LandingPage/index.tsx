import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import JoinForm from './JoinForm';
import AdminButton from './AdminButton';

export default function LandingPage() {
    const [loading, setLoading] = useState(false);

    return (
        <div className='w-full max-w-md'>
            <div className='rounded-lg bg-white p-8 shadow-xl'>
                <Header />
                
                {/* Tutorial Button */}
                <div className='mb-6 text-center'>
                    <Link
                        to='/tutorial'
                        className='inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-white transition duration-200 hover:bg-green-700'
                    >
                        <svg className='mr-2 h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' />
                        </svg>
                        How to Play
                    </Link>
                </div>
                
                <JoinForm loading={loading} setLoading={setLoading} />
                <AdminButton />
            </div>
        </div>
    );
}
