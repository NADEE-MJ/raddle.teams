import { useNavigate } from 'react-router-dom';
import Tutorial from './Tutorial';
import { useMemo, useState } from 'react';
import { Puzzle } from '@/types/game';
import { Button } from '@/components';



export default function TutorialPage() {
    const [completed, setCompleted] = useState(false);
    const puzzle = useMemo<Puzzle>(() => {
        return {
            title: 'From DOWN to EARTH',
            ladder: [
                {
                    word: 'DOWN',
                    clue: "Cardinal direction that's <> on a map, most of the time",
                    transform: 'MEANS',
                },
                {
                    word: 'SOUTH',
                    clue: 'Change the first letter of <> to get a part of the body',
                    transform: 'S->M',
                },
                {
                    word: 'MOUTH',
                    clue: 'Organ that sits inside the <>',
                    transform: 'CONTAINS THE',
                },
                {
                    word: 'TONGUE',
                    clue: 'Piece of clothing that often has a <>',
                    transform: 'IS ON A',
                },
                {
                    word: 'SHOE',
                    clue: 'Rubber layer on the bottom of a <>',
                    transform: 'CONTAINS A',
                },
                {
                    word: 'SOLE',
                    clue: 'Kind of food or music that sounds like <>',
                    transform: 'SOUNDS LIKE',
                },
                {
                    word: 'SOUL',
                    clue: 'Popular piano duet "{} and <>"',
                    transform: 'IS',
                },
                {
                    word: 'HEART',
                    clue: 'Move the first letter of <> to the end to get where we are',
                    transform: 'H -> END',
                },
                {
                    word: 'EARTH',
                    clue: null,
                    transform: null,
                },
            ],
        };
    }, []);

    const navigate = useNavigate();

    return (
        <div>
            <div className="w-full text-center mb-4 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-semibold mb-5 text-tx-primary">Learn how to Raddle</h2>
            </div>

            <Tutorial
                setCompleted={setCompleted}
                puzzle={puzzle}
            />

            {completed && (
                <div className="mt-8 text-center">
                    <Button
                        onClick={() => navigate('/')}
                        variant="hint"
                        size="lg"
                        className='inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition duration-200'
                    >
                        Ready to Play with Teams!
                    </Button>
                </div>
            )}
        </div>
    );
}
