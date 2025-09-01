import { useNavigate } from 'react-router-dom';
import WordChainGame from './WordChainGame';

// Tutorial puzzle data
const TUTORIAL_PUZZLE = {
    "title": "Tutorial Puzzle",
    "ladder": [
        {
            "word": "DOWN",
            "clue": "Cardinal direction that's <> on a map, most of the time",
            "transform": "MEANS"
        },
        {
            "word": "SOUTH", 
            "clue": "Change the first letter of <> to get a part of the body",
            "transform": "S->M"
        },
        {
            "word": "MOUTH",
            "clue": "Organ that sits inside the <>",
            "transform": "CONTAINS THE"
        },
        {
            "word": "TONGUE",
            "clue": "Piece of clothing that often has a <>",
            "transform": "IS ON A"
        },
        {
            "word": "SHOE",
            "clue": "Rubber layer on the bottom of a <>",
            "transform": "CONTAINS A"
        },
        {
            "word": "SOLE",
            "clue": "Kind of food or music that sounds like <>",
            "transform": "SOUNDS LIKE"
        },
        {
            "word": "SOUL",
            "clue": "Popular piano duet \"{} and <>\"",
            "transform": "IS"
        },
        {
            "word": "HEART",
            "clue": "Move the first letter of <> to the end to get where we are",
            "transform": "H -> END"
        },
        {
            "word": "EARTH",
            "clue": null,
            "transform": null
        }
    ]
};

export default function TutorialPage() {
    const navigate = useNavigate();

    const handleComplete = () => {
        // Tutorial completion doesn't automatically redirect - let user play more
    };

    return (
        <div className='w-full max-w-6xl mx-auto'>
            <div className='rounded-lg bg-white p-8 shadow-xl'>
                <div className='mb-6 text-center'>
                    <h1 className='text-3xl font-bold text-gray-900 mb-4'>How to Play Raddle Teams</h1>
                    <button
                        onClick={() => navigate('/')}
                        className='rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50'
                    >
                        ← Back to Home
                    </button>
                </div>

                <div className='grid lg:grid-cols-3 gap-8'>
                    {/* Instructions Column */}
                    <div className='lg:col-span-1 space-y-6'>
                        <div className='bg-blue-50 p-6 rounded-lg border border-blue-200'>
                            <h2 className='text-lg font-semibold text-blue-900 mb-3'>🎯 Game Objective</h2>
                            <p className='text-blue-800 text-sm'>
                                Connect the first word (DOWN) to the last word (EARTH) by filling in the missing words in the ladder. 
                                Work with your team to solve it faster than other teams!
                            </p>
                        </div>

                        <div className='bg-green-50 p-6 rounded-lg border border-green-200'>
                            <h2 className='text-lg font-semibold text-green-900 mb-3'>🔄 How to Solve</h2>
                            <ol className='text-green-800 text-sm space-y-2 list-decimal list-inside'>
                                <li><strong>Choose direction:</strong> Forward (from DOWN) or backward (from EARTH)</li>
                                <li><strong>Read all hints:</strong> The &lt;&gt; symbol shows your current word</li>
                                <li><strong>Enter your guess:</strong> Type the word that matches a hint</li>
                                <li><strong>Watch hints move:</strong> Correct answers move to &ldquo;Used Hints&rdquo;</li>
                            </ol>
                        </div>

                        <div className='bg-yellow-50 p-6 rounded-lg border border-yellow-200'>
                            <h2 className='text-lg font-semibold text-yellow-900 mb-3'>💡 Tips</h2>
                            <ul className='text-yellow-800 text-sm space-y-2 list-disc list-inside'>
                                <li>Try both directions - some hints are easier backward</li>
                                <li>Look for hints with obvious answers first</li>
                                <li>In teams, everyone can guess simultaneously</li>
                                <li>First correct answer wins for your team</li>
                            </ul>
                        </div>

                        <div className='bg-purple-50 p-6 rounded-lg border border-purple-200'>
                            <h2 className='text-lg font-semibold text-purple-900 mb-3'>👥 Team Play</h2>
                            <p className='text-purple-800 text-sm'>
                                In the real game, all team members see the same puzzle and can submit guesses. 
                                The first correct guess advances everyone on your team. Communicate and work together!
                            </p>
                        </div>
                    </div>

                    {/* Game Column */}
                    <div className='lg:col-span-2'>
                        <div className='bg-gray-50 p-6 rounded-lg border border-gray-200'>
                            <h2 className='text-lg font-semibold text-gray-900 mb-4 text-center'>
                                🎮 Try it yourself!
                            </h2>
                            <WordChainGame
                                puzzle={TUTORIAL_PUZZLE}
                                onComplete={handleComplete}
                                completed={false}
                                targetWordCount={99} // Let them solve as much as they want
                            />
                        </div>

                        <div className='mt-6 text-center'>
                            <button
                                onClick={() => navigate('/')}
                                className='rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 text-lg font-semibold'
                            >
                                Ready to Play with Friends!
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}