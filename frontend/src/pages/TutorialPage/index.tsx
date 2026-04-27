import Tutorial from './Tutorial';
import { useMemo } from 'react';
import { Puzzle } from '@/types/game';

export default function TutorialPage() {
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

    return (
        <div className='transition-colors duration-150 ease-in-out [&_button]:transition-colors [&_button]:duration-150 [&_button]:ease-in-out'>
            <div className='mb-4 w-full text-center md:mb-0'>
                <h2 className='text-tx-primary mb-5 text-2xl font-semibold md:text-3xl'>Learn how to Raddle</h2>
            </div>

            <Tutorial puzzle={puzzle} />
        </div>
    );
}
