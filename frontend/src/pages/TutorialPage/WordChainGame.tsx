import { useState, useEffect } from 'react';

interface LadderStep {
    word: string;
    clue: string | null;
    transform: string | null;
}

interface Puzzle {
    title: string;
    ladder: LadderStep[];
}

interface WordChainGameProps {
    puzzle: Puzzle;
    onComplete: () => void;
    completed: boolean;
    targetWordCount?: number;
}

export default function WordChainGame({ puzzle, onComplete, completed, targetWordCount = 2 }: WordChainGameProps) {
    const [solvedWords, setSolvedWords] = useState<Set<number>>(new Set([0, puzzle.ladder.length - 1]));
    const [usedHints, setUsedHints] = useState<Set<number>>(new Set());
    const [currentGuess, setCurrentGuess] = useState('');
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
    const [wordLength, setWordLength] = useState<number>(5);
    const [feedback, setFeedback] = useState<string>('');

    useEffect(() => {
        // Reset state when puzzle changes
        setSolvedWords(new Set([0, puzzle.ladder.length - 1]));
        setUsedHints(new Set());
        setCurrentGuess('');
        setDirection('forward');
        setWordLength(5);
        setFeedback('');
    }, [puzzle]);

    // Check if tutorial is complete
    useEffect(() => {
        if (solvedWords.size >= targetWordCount + 2 && !completed) {
            onComplete();
        }
    }, [solvedWords.size, targetWordCount, completed, onComplete]);

    const getCurrentWord = () => {
        if (direction === 'forward') {
            // Find the rightmost solved word to solve forward from
            const sortedSolved = Array.from(solvedWords).sort((a, b) => a - b);
            for (let i = 0; i < sortedSolved.length - 1; i++) {
                if (sortedSolved[i + 1] - sortedSolved[i] > 1) {
                    return { index: sortedSolved[i], word: puzzle.ladder[sortedSolved[i]].word };
                }
            }
        } else {
            // Find the leftmost solved word to solve backward from
            const sortedSolved = Array.from(solvedWords).sort((a, b) => b - a);
            for (let i = 0; i < sortedSolved.length - 1; i++) {
                if (sortedSolved[i] - sortedSolved[i + 1] > 1) {
                    return { index: sortedSolved[i], word: puzzle.ladder[sortedSolved[i]].word };
                }
            }
        }
        return null;
    };

    const getNextTargetIndex = () => {
        const current = getCurrentWord();
        if (!current) return null;
        
        if (direction === 'forward') {
            return current.index + 1;
        } else {
            return current.index - 1;
        }
    };

    const getAvailableHints = () => {
        const currentWord = getCurrentWord();
        if (!currentWord) return [];

        // Get all hints that haven't been used yet
        return puzzle.ladder
            .map((step, index) => ({ ...step, index }))
            .filter(step => step.clue && !usedHints.has(step.index))
            .map(step => {
                const processedClue = step.clue!.replace('<>', currentWord.word);
                return {
                    ...step,
                    processedClue
                };
            });
    };

    const getUsedHints = () => {
        return Array.from(usedHints)
            .map(index => {
                const step = puzzle.ladder[index];
                if (step.clue) {
                    // Replace <> with the actual solved word
                    const processedClue = step.clue.replace('<>', step.word);
                    return {
                        ...step,
                        processedClue
                    };
                }
                return null;
            })
            .filter((step): step is NonNullable<typeof step> => step !== null);
    };

    const checkAndSubmit = (guess: string) => {
        const trimmedGuess = guess.toUpperCase().trim();
        
        const targetIndex = getNextTargetIndex();
        if (targetIndex === null) {
            return;
        }

        const correctAnswer = puzzle.ladder[targetIndex].word;

        if (trimmedGuess === correctAnswer) {
            // Add to solved words
            setSolvedWords(prev => new Set([...prev, targetIndex]));
            
            // Move the corresponding hint to used hints (this is the hint that helped find this word)
            setUsedHints(prev => new Set([...prev, targetIndex]));
            
            setFeedback(`🎉 Correct! "${correctAnswer}" solved!`);
            setCurrentGuess('');
            
            // Auto-update word length for next word if possible  
            const nextTargetIndex = direction === 'forward' ? targetIndex + 1 : targetIndex - 1;
            if (nextTargetIndex >= 0 && nextTargetIndex < puzzle.ladder.length) {
                setWordLength(puzzle.ladder[nextTargetIndex].word.length);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase();
        setCurrentGuess(value);
        
        // Auto-submit if the word is complete and correct
        const targetIndex = getNextTargetIndex();
        if (targetIndex !== null) {
            const correctAnswer = puzzle.ladder[targetIndex].word;
            if (value.trim() === correctAnswer) {
                checkAndSubmit(value);
            }
        }
    };

    const handleDirectionChange = (newDirection: 'forward' | 'backward') => {
        setDirection(newDirection);
        setFeedback('');
        setCurrentGuess('');
        
        // Update word length for the new direction
        const targetIndex = newDirection === 'forward' 
            ? Math.min(...Array.from(solvedWords).filter(i => {
                const sorted = Array.from(solvedWords).sort((a, b) => a - b);
                const idx = sorted.indexOf(i);
                return idx < sorted.length - 1 && sorted[idx + 1] - i > 1;
            })) + 1
            : Math.max(...Array.from(solvedWords).filter(i => {
                const sorted = Array.from(solvedWords).sort((a, b) => a - b);
                const idx = sorted.indexOf(i);
                return idx > 0 && i - sorted[idx - 1] > 1;
            })) - 1;
            
        if (targetIndex >= 0 && targetIndex < puzzle.ladder.length) {
            setWordLength(puzzle.ladder[targetIndex].word.length);
        }
    };

    const renderLadder = () => {
        return (
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-center">{puzzle.title}</h3>
                <div className="flex flex-col items-center space-y-2">
                    {puzzle.ladder.map((step, index) => {
                        const isSolved = solvedWords.has(index);
                        const isTarget = index === getNextTargetIndex();
                        
                        return (
                            <div key={index} className="flex items-center">
                                <div className={`px-4 py-2 rounded border-2 font-mono text-lg font-bold min-w-[120px] text-center ${
                                    isSolved 
                                        ? 'bg-green-100 border-green-500 text-green-800'
                                        : isTarget
                                        ? 'bg-blue-100 border-blue-500 text-blue-800'
                                        : 'bg-gray-100 border-gray-300 text-gray-500'
                                }`}>
                                    {isSolved ? step.word : '?'.repeat(step.word.length)}
                                </div>
                                {index < puzzle.ladder.length - 1 && (
                                    <div className="text-gray-400 mx-2">↓</div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-4 text-center text-sm text-gray-600">
                    <div className="flex justify-center space-x-4">
                        <span className="flex items-center">
                            <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded mr-2"></div>
                            Solved
                        </span>
                        <span className="flex items-center">
                            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded mr-2"></div>
                            Solving next
                        </span>
                        <span className="flex items-center">
                            <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded mr-2"></div>
                            Locked
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const renderControls = () => {
        const currentWord = getCurrentWord();
        if (!currentWord) return null;

        return (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold mb-3">Solving Controls</h4>
                
                {/* Direction Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Direction:</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleDirectionChange('forward')}
                            className={`px-3 py-2 rounded border ${
                                direction === 'forward'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                            }`}
                        >
                            Forward (from {currentWord.word})
                        </button>
                        <button
                            onClick={() => handleDirectionChange('backward')}
                            className={`px-3 py-2 rounded border ${
                                direction === 'backward'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                            }`}
                        >
                            Backward (from {currentWord.word})
                        </button>
                    </div>
                </div>

                {/* Word Length */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                        Next word is {wordLength} letters long
                    </label>
                </div>

                {/* Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={currentGuess}
                        onChange={handleInputChange}
                        placeholder={`Type ${wordLength}-letter word (auto-submits when correct)`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none font-mono uppercase"
                        maxLength={wordLength}
                    />
                </div>
            </div>
        );
    };

    const renderHints = () => {
        const availableHints = getAvailableHints();
        const usedHintsList = getUsedHints();

        return (
            <div className="grid md:grid-cols-2 gap-6">
                {/* Available Hints */}
                <div>
                    <h4 className="font-semibold mb-3">Available Hints ({availableHints.length})</h4>
                    <div className="space-y-2">
                        {availableHints.map((hint) => (
                            <div key={hint.index} className="p-3 bg-white border border-gray-300 rounded">
                                <div className="text-sm italic text-gray-700">
                                    &ldquo;{hint.processedClue}&rdquo;
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Used Hints */}
                <div>
                    <h4 className="font-semibold mb-3">Used Hints ({usedHintsList.length})</h4>
                    <div className="space-y-2">
                        {usedHintsList.map((hint, index) => (
                            <div key={index} className="p-3 bg-gray-100 border border-gray-300 rounded opacity-60">
                                <div className="text-sm italic text-gray-600">
                                    &ldquo;{hint.processedClue}&rdquo;
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    if (completed) {
        return (
            <div className="text-center">
                {renderLadder()}
                <div className="bg-green-100 p-4 rounded-lg text-green-800">
                    <p className="font-semibold">✅ Tutorial section completed!</p>
                    <p>You&apos;ve learned how to solve word ladders using direction and hints!</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {renderLadder()}
            {renderControls()}
            
            {feedback && (
                <div className={`mb-4 p-3 rounded ${
                    feedback.includes('🎉') ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                    {feedback}
                </div>
            )}
            
            {renderHints()}
        </div>
    );
}