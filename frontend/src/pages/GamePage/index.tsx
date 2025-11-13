/**
 * GamePage - Team-based multiplayer word puzzle game
 *
 * Features:
 * - Real-time team collaboration
 * - Optimistic UI updates
 * - Guess history with player attribution
 * - Direction switching
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { useGameState } from '@/hooks/useGameState';
import type { Puzzle } from '@/types/game';
import type { Player, LobbyInfo, GameStartedEvent, GameWonEvent } from '@/types';
import { api } from '@/services/api';
import LadderStep from './LadderStep';
import Clues from './Clues';

interface GamePageProps {
    puzzle: Puzzle;
    player: Player;
    teamName: string;
    lobbyId: number;
    initialState: {
        revealed_steps: number[];
        is_completed: boolean;
        last_updated_at: string;
    };
}

export default function GamePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { sessionId } = useOutletContext<{ sessionId: string }>();

    const [gameData, setGameData] = useState<GamePageProps | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadGameData() {
            try {
                // Get data from navigation state
                const state = location.state as {
                    player?: Player;
                    lobbyInfo?: LobbyInfo;
                    gameStartedEvent?: GameStartedEvent;
                } | null;

                if (!sessionId) {
                    throw new Error('No session ID');
                }

                // Fetch puzzle data from API
                console.log('[GamePage] Fetching puzzle data from API...');
                const puzzleResponse = await api.player.game.getPuzzle(sessionId);

                // Fetch player info
                const player = await api.player.lobby.activeUser(sessionId);

                setGameData({
                    puzzle: puzzleResponse.puzzle,
                    player,
                    teamName: puzzleResponse.team_name,
                    lobbyId: puzzleResponse.lobby_id,
                    initialState: puzzleResponse.state,
                });
                setLoading(false);
            } catch (err) {
                console.error('[GamePage] Failed to load game data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load game');
                setLoading(false);
            }
        }

        loadGameData();
    }, [location.state, navigate, sessionId]);

    if (loading) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <div className='text-center'>
                    <h1 className='mb-4 text-2xl font-bold'>Loading game...</h1>
                    <p className='text-gray-600'>Connecting to game server...</p>
                </div>
            </div>
        );
    }

    if (error || !gameData) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <div className='text-center'>
                    <h1 className='mb-4 text-2xl font-bold text-red-600'>Error</h1>
                    <p className='mb-4 text-gray-600'>{error || 'Failed to load game'}</p>
                    <button
                        onClick={() => navigate('/lobby')}
                        className='rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700'
                    >
                        Return to Lobby
                    </button>
                </div>
            </div>
        );
    }

    return <Game {...gameData} sessionId={sessionId} />;
}

interface GameProps extends GamePageProps {
    sessionId: string;
}

function Game({ puzzle, player, teamName, lobbyId, sessionId, initialState }: GameProps) {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [showWinModal, setShowWinModal] = useState(false);
    const [winnerTeamName, setWinnerTeamName] = useState('');
    const [isOurTeamWinner, setIsOurTeamWinner] = useState(false);
    const [showFullLadder, setShowFullLadder] = useState(false);

    // WebSocket URL
    const wsUrl = `ws://${window.location.host}/ws/lobby/${lobbyId}/player/${sessionId}`;

    const {
        revealedSteps,
        isCompleted,
        direction,
        currentQuestion,
        currentAnswer,
        activeStepId,
        canSwitchDirection,
        isConnected,
        error,
        submitGuess,
        switchDirection,
    } = useGameState({
        puzzle,
        initialState,
        websocketUrl: wsUrl,
        onGameWon: handleGameWon,
        onTeamCompleted: handleTeamCompleted,
    });

    function handleGameWon(event: GameWonEvent) {
        setWinnerTeamName(event.winning_team_name);
        setIsOurTeamWinner(event.winning_team_id === player.team_id);
        setShowWinModal(true);
    }

    function handleTeamCompleted() {
        console.log('[GamePage] Team completed!');
        // Winner announcement will come via GAME_WON event
    }

    const focusInput = useCallback(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Focus input when revealed steps change
    useEffect(() => {
        focusInput();
    }, [revealedSteps, focusInput]);

    // Show full ladder on md and larger screens
    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 768px)');

        const handleResize = (e: MediaQueryListEvent) => {
            if (e.matches) {
                setShowFullLadder(true);
            } else {
                setShowFullLadder(false);
            }
            focusInput();
        };

        mediaQuery.addEventListener('change', handleResize);

        if (mediaQuery.matches) {
            setShowFullLadder(true);
        } else {
            setShowFullLadder(false);
        }

        return () => {
            mediaQuery.removeEventListener('change', handleResize);
        };
    }, [focusInput]);

    const handleGuessChange = useCallback(
        (guess: string) => {
            if (guess.length === puzzle.ladder[activeStepId].word.length) {
                submitGuess(guess);
            }
        },
        [submitGuess, puzzle, activeStepId]
    );

    const handleDirectionChange = useCallback(() => {
        switchDirection();
    }, [switchDirection]);

    const toggleFullLadder = useCallback(() => {
        setShowFullLadder(!showFullLadder);
        focusInput();
    }, [showFullLadder, focusInput]);

    const isStepRevealed = useCallback(
        (stepId: number) => {
            return revealedSteps.includes(stepId);
        },
        [revealedSteps]
    );

    const isCurrentQuestion = useCallback(
        (stepId: number) => {
            return stepId === currentQuestion;
        },
        [currentQuestion]
    );

    const isCurrentAnswer = useCallback(
        (stepId: number) => {
            return stepId === currentAnswer;
        },
        [currentAnswer]
    );

    const isActiveStep = useCallback(
        (stepId: number) => {
            return stepId === activeStepId;
        },
        [activeStepId]
    );

    const getVisibleStepsOnMobile = useCallback(() => {
        if (!puzzle?.ladder) return [];

        const totalSteps = puzzle.ladder.length;
        const windowSize = 3;
        const halfWindow = Math.floor(windowSize / 2);

        let startIndex = Math.max(0, activeStepId - halfWindow);
        let endIndex = Math.min(totalSteps - 1, activeStepId + halfWindow);

        if (endIndex - startIndex + 1 < windowSize && totalSteps >= windowSize) {
            if (startIndex === 0) {
                endIndex = Math.min(totalSteps - 1, startIndex + windowSize - 1);
            } else if (endIndex === totalSteps - 1) {
                startIndex = Math.max(0, endIndex - windowSize + 1);
            }
        }

        const visibleSteps = [];
        for (let i = startIndex; i <= endIndex; i++) {
            visibleSteps.push(i);
        }

        return visibleSteps;
    }, [puzzle?.ladder, activeStepId]);

    const mobileVisibleSteps = useMemo(() => getVisibleStepsOnMobile(), [revealedSteps, getVisibleStepsOnMobile]);

    return (
        <div>
            {/* Header with team info and connection status */}
            <div className='mb-4 flex items-center justify-between'>
                <div>
                    <h1 className='text-tx-primary text-2xl font-semibold md:text-3xl'>{puzzle.title}</h1>
                    <p className='text-tx-secondary text-sm'>Team: {teamName}</p>
                </div>
                <div className='text-right'>
                    <div
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                    >
                        {isConnected ? '● Connected' : '● Disconnected'}
                    </div>
                    <div className='text-tx-secondary mt-1 text-xs'>
                        Progress: {revealedSteps.length} / {puzzle.ladder.length}
                    </div>
                </div>
            </div>

            {/* Main game area with ladder and clues */}
            <div className='mx-auto max-w-6xl'>
                <div id='game-area' className='md:grid md:grid-cols-[2fr_3fr] md:gap-8'>
                    <div className={`${!showFullLadder ? 'sticky top-0 z-50' : ''} bg-primary py-3`}>
                        <div className='divide-border border-border divide-y-2 border-x-5'>
                            <div>
                                <div className='hidden p-4 sm:hidden md:block'></div>
                                {!isCompleted ? (
                                    <button
                                        type='button'
                                        onClick={toggleFullLadder}
                                        className='text-tx-muted hover:bg-elevated mb-1 w-full p-1 text-xs italic md:hidden'
                                    >
                                        {showFullLadder ? 'Collapse full ladder' : 'Show full ladder'}
                                    </button>
                                ) : (
                                    <div className='p-4 sm:block md:hidden'></div>
                                )}
                            </div>

                            {puzzle.ladder.map((ladderStep, stepId) => {
                                const shouldRenderStepOnMobile = mobileVisibleSteps.includes(stepId);

                                if (!showFullLadder && !shouldRenderStepOnMobile) {
                                    return null;
                                }
                                return (
                                    <LadderStep
                                        key={`ladder-step-${stepId}`}
                                        onGuessChange={handleGuessChange}
                                        inputRef={inputRef}
                                        word={ladderStep.word}
                                        transform={ladderStep.transform}
                                        isCurrentQuestion={isCurrentQuestion(stepId)}
                                        isCurrentAnswer={isCurrentAnswer(stepId)}
                                        isStepRevealed={isStepRevealed(stepId)}
                                        isActive={isActiveStep(stepId)}
                                        shouldShowTransform={isStepRevealed(stepId) && isStepRevealed(stepId + 1)}
                                        shouldRenderTransform={
                                            (stepId !== mobileVisibleSteps[mobileVisibleSteps.length - 1] &&
                                                !showFullLadder) ||
                                            showFullLadder
                                        }
                                    />
                                );
                            })}

                            {!isCompleted && canSwitchDirection ? (
                                <button
                                    type='button'
                                    onClick={handleDirectionChange}
                                    className='text-tx-muted hover:bg-elevated w-full p-1 text-xs italic'
                                    data-testid='switch-direction-button'
                                >
                                    Switch to solving {direction === 'down' ? '↑ upward' : '↓ downward'}
                                </button>
                            ) : (
                                <div className='p-4' />
                            )}
                        </div>
                    </div>

                    <Clues
                        puzzle={puzzle}
                        direction={direction}
                        currentQuestion={currentQuestion}
                        currentAnswer={currentAnswer}
                        revealedSteps={new Set(revealedSteps)}
                    />
                </div>
            </div>

            {/* Completion message */}
            {isCompleted && (
                <div className='mt-6 rounded-lg border-l-4 border-green-500 bg-green-50 p-6'>
                    <h2 className='mb-2 text-xl font-bold text-green-800'>Puzzle Complete! 🎉</h2>
                    <p className='text-green-700'>
                        Your team has completed the word ladder. Waiting for other teams...
                    </p>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className='mt-4 rounded-lg border border-red-200 bg-red-50 p-4'>
                    <p className='text-sm text-red-700'>{error}</p>
                </div>
            )}

            {/* Win Modal */}
            {showWinModal && (
                <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4'>
                    <div className='w-full max-w-md rounded-lg bg-white p-8'>
                        <div className='text-center'>
                            <div className='mb-4 text-6xl'>{isOurTeamWinner ? '🎉' : '🏁'}</div>
                            <h2 className='mb-4 text-3xl font-bold'>{isOurTeamWinner ? 'You Won!' : 'Game Over'}</h2>
                            <p className='mb-6 text-lg'>
                                {isOurTeamWinner
                                    ? 'Congratulations! Your team won the game!'
                                    : `${winnerTeamName} won the game!`}
                            </p>
                            <button
                                onClick={() => navigate('/lobby')}
                                className='rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700'
                            >
                                Return to Lobby
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
