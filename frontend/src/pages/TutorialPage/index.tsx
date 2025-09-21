import { Link, useNavigate } from 'react-router-dom';
import Tutorial from './Tutorial';
import { useState } from 'react';
import { Button } from '@/components';

export default function TutorialPage() {
    const [completed, setCompleted] = useState(false);

    const navigate = useNavigate();

    return (
        <div>
            <div className="w-full text-center mb-4 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-semibold mb-1 text-tx-primary">Learn how to Raddle</h2>
                <Button variant="primary" onClick={() => navigate('/')}>
                    Skip Tutorial
                </Button>
            </div>

            <Tutorial
                setCompleted={setCompleted}
            />

            {completed && (
                <div className="mt-8 text-center">
                    <Link
                        to='/'
                        className='inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition duration-200'
                    >
                        Ready to Play with Teams! →
                    </Link>
                </div>
            )}
        </div>
    );
}
