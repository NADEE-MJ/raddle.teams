import { Link } from 'react-router-dom';
import Tutorial from './Tutorial';
import { useState } from 'react';



export default function TutorialPage() {
    const [completed, setCompleted] = useState(false);

    return (
        <div className='w-full max-w-6xl mx-auto'>
            <div className='rounded-lg bg-white p-8 shadow-xl'>
                <div className='mb-6 text-center'>
                    <h1 className='text-2xl md:text-3xl font-semibold mb-1'>Learn How to Raddle (TEAMS)</h1>
                </div>

                <div className='bg-gray-50 p-6 rounded-lg border border-gray-200'>
                    <Tutorial
                        completed={completed}
                        setCompleted={setCompleted}
                    />
                </div>
                <div className='mt-6 text-center'>
                    <Link
                        to='/'
                        className='rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 text-lg font-semibold'
                    >
                        Ready to Play with Friends!
                    </Link>
                </div>
            </div>
        </div>
    );
}