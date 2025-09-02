import { Link } from 'react-router-dom';
import Tutorial from './Tutorial';
import { useState } from 'react';

export default function TutorialPage() {
    const [completed, setCompleted] = useState(false);

    return (
        <div className="max-w-6xl mx-auto text-center">
            <div className="text-center md:text-left flex flex-col md:flex-row w-full md:px-2 lg:px-8 mb-2 md:mb-6">
                <div className="w-full text-center mb-4 md:mb-0">
                    <h2 className="text-2xl md:text-3xl font-semibold mb-1">Learn how to Raddle</h2>
                    <div className="text-sm flex align-middle justify-center items-center">
                        <Link 
                            to="/"
                            className="text-sm px-3 py-1 bg-blue-50 border border-blue-300 hover:bg-blue-200 text-blue-800 rounded-md cursor-pointer"
                        >
                            Skip tutorial
                        </Link>
                    </div>
                </div>
            </div>

            <div id="game-area" className="md:grid md:grid-cols-[2fr_3fr] md:gap-8">
                <Tutorial
                    completed={completed}
                    setCompleted={setCompleted}
                />
            </div>

            {completed && (
                <div className="mt-8 text-center">
                    <Link
                        to='/'
                        className='inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition duration-200'
                    >
                        Ready to Play with Teams! →
                    </Link>
                </div>
            )}
        </div>
    );
}