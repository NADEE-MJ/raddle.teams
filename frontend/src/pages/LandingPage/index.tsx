import { useState } from 'react';
import { Link, } from 'react-router-dom';
import JoinForm from './JoinForm';
import { BookOpenIcon } from "@heroicons/react/24/outline";

export default function LandingPage() {
    const [loading, setLoading] = useState(false);

    return (
        <div className='w-full max-w-md'>
            <div className='rounded-lg bg-white p-8 shadow-xl'>
                <div className='mb-8 text-center'>
                    <h1 className='mb-2 text-3xl font-bold text-gray-900'>Raddle Teams</h1>
                    <p className='text-gray-600'>Join the word chain challenge!</p>
                </div>

                <JoinForm loading={loading} setLoading={setLoading} />

                <div className='mt-6 flex justify-center border-t border-gray-200 pt-6'>
                    <Link
                        to='/admin'
                        className='mr-3 rounded-lg bg-gray-600 px-4 py-2 font-medium text-white transition duration-200 hover:bg-gray-700'
                        data-testid='admin-panel-link'
                    >
                        Admin Panel
                    </Link>

                    <Link
                        to='/tutorial'
                        className='inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-white transition duration-200 hover:bg-green-700'
                        data-testid='tutorial-link'
                    >
                        <BookOpenIcon className='mr-2 h-4 w-4' />
                        How to Play
                    </Link>
                </div>
            </div>
        </div>
    );
}
