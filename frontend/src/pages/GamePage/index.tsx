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
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameState } from '@/hooks/useGameState';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import type { Puzzle } from '@/types/game';
import type { Player, GameWonEvent } from '@/types';
import { api } from '@/services/api';
import { Modal, Button, ConnectionBadge } from '@/components';
import LadderStep from './LadderStep';
import Clues from './Clues';

interface GamePageProps {
    puzzle: Puzzle;
    player: Player;
    teamName: string;
    lobbyId: number;
    lobbyCode: string;
    sessionId: string;
    initialState: {
        revealed_steps: number[];
        is_completed: boolean;
        last_updated_at: string;
    };
}

export default function GamePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { sessionId, setSessionId, getSessionIdFromLocalStorage } = useGlobalOutletContext();

    const [gameData, setGameData] = useState<GamePageProps | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadGameData() {
            try {
                // Try to restore session ID from localStorage if not in context
                let currentSessionId = sessionId;
                if (!currentSessionId) {
                    currentSessionId = getSessionIdFromLocalStorage();
                    if (currentSessionId) {
                        setSessionId(currentSessionId);
                    }
                }

                if (!currentSessionId) {
                    throw new Error('No session ID found. Please log in again.');
                }

                // Fetch puzzle data from API
                console.log('[GamePage] Fetching puzzle data from API...');
                const puzzleResponse = await api.player.game.getPuzzle(currentSessionId);

                // Fetch player info
                const player = await api.player.lobby.activeUser(currentSessionId);
                const lobbyInfo = await api.player.lobby.getLobbyInfo(player.lobby_id, currentSessionId);

                setGameData({
                    puzzle: puzzleResponse.puzzle,
                    player,
                    teamName: puzzleResponse.team_name,
                    lobbyId: puzzleResponse.lobby_id,
                    lobbyCode: lobbyInfo.lobby.code,
                    sessionId: currentSessionId,
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
    }, [location.state, navigate, sessionId, getSessionIdFromLocalStorage, setSessionId]);

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
                        onClick={() => navigate('/')}
                        className='rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700'
                    >
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    return <Game {...gameData} />;
}

interface GameProps extends GamePageProps {}

// GameProps now includes sessionId from GamePageProps

function Game({ puzzle, player, teamName, lobbyId, lobbyCode, sessionId, initialState }: GameProps) {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [showWinModal, setShowWinModal] = useState(false);
    const [winnerTeamName, setWinnerTeamName] = useState('');
    const [isOurTeamWinner, setIsOurTeamWinner] = useState(false);
    const [showFullLadder, setShowFullLadder] = useState(false);

    // WebSocket URL
    const wsUrl = `/ws/lobby/${lobbyId}/player/${sessionId}`;

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

    const handleReturnToLobby = useCallback(() => {
        if (lobbyCode) {
            navigate(`/lobby/${lobbyCode}`);
        } else {
            navigate('/');
        }
    }, [navigate, lobbyCode]);

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

    const mobileVisibleSteps = useMemo(() => getVisibleStepsOnMobile(), [getVisibleStepsOnMobile]);

    return (
        <div>
            {/* Header with team info and connection status */}
            <div className='mb-4 flex flex-col items-center text-center'>
                <h1 className='text-tx-primary text-2xl font-semibold md:text-3xl'>{puzzle.title}</h1>
                <div className='mt-2 flex w-full justify-center'>
                    <ConnectionBadge
                        isConnected={isConnected}
                        connectedText='Connected to game'
                        disconnectedText='Reconnecting...'
                    />
                </div>
            </div>

            {/* Main game area with ladder and clues */}
            <div className='mx-auto max-w-6xl'>
                <div id='game-area' className='md:grid md:grid-cols-[2fr_3fr] md:gap-8'>
                    <div className={`${!showFullLadder ? 'sticky top-0 z-50' : ''} bg-primary py-3`}>
                        <div className='border-ladder-rungs border-x-5'>
                            <div className='border-ladder-rungs border-b'>
                                <div className='hidden p-3 sm:hidden md:block'></div>
                                {!isCompleted ? (
                                    <button
                                        type='button'
                                        onClick={toggleFullLadder}
                                        className='text-tx-muted hover:bg-elevated w-full p-1 text-sm italic md:hidden'
                                    >
                                        {showFullLadder ? 'Collapse full ladder' : 'Show full ladder'}
                                    </button>
                                ) : (
                                    <div className='p-3 sm:block md:hidden'></div>
                                )}
                            </div>

                            {puzzle.ladder.map((ladderStep, stepId) => {
                                const shouldRenderStepOnMobile = mobileVisibleSteps.includes(stepId);

                                if (!isCompleted && !showFullLadder && !shouldRenderStepOnMobile) {
                                    return null;
                                }
                                return (
                                    <div key={`ladder-step-wrapper-${stepId}`} className='border-ladder-rungs border-y'>
                                        <LadderStep
                                            onGuessChange={handleGuessChange}
                                            inputRef={inputRef}
                                            word={ladderStep.word}
                                            transform={ladderStep.transform}
                                            isCurrentQuestion={isCurrentQuestion(stepId)}
                                            isCurrentAnswer={isCurrentAnswer(stepId)}
                                            isStepRevealed={isStepRevealed(stepId)}
                                            isActive={isActiveStep(stepId)}
                                            isDisabled={isCompleted}
                                            shouldShowTransform={isStepRevealed(stepId) && isStepRevealed(stepId + 1)}
                                            shouldRenderTransform={
                                                isCompleted ||
                                                (stepId !== mobileVisibleSteps[mobileVisibleSteps.length - 1] &&
                                                    !showFullLadder) ||
                                                showFullLadder
                                            }
                                        />
                                    </div>
                                );
                            })}

                            {!isCompleted && canSwitchDirection ? (
                                <div className='border-ladder-rungs border-t'>
                                    <button
                                        type='button'
                                        onClick={handleDirectionChange}
                                        className='text-tx-muted hover:bg-elevated w-full p-1 text-sm italic'
                                        data-testid='switch-direction-button'
                                    >
                                        Switch to solving {direction === 'down' ? '↑ upwards' : '↓ downwards'}
                                    </button>
                                </div>
                            ) : (
                                <div className='border-ladder-rungs border-t p-4' />
                            )}
                        </div>
                    </div>

                    <Clues
                        puzzle={puzzle}
                        direction={direction}
                        currentQuestion={currentQuestion}
                        currentAnswer={currentAnswer}
                        revealedSteps={new Set(revealedSteps)}
                        isCompleted={isCompleted}
                    />
                </div>
            </div>

            {/* Completion message */}
            {isCompleted && (
                <div className='mt-8 flex justify-end'>
                    <Button onClick={handleReturnToLobby} variant='primary' size='md'>
                        Back to Lobby
                    </Button>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className='mt-4 rounded-lg border border-red-200 bg-red-50 p-4'>
                    <p className='text-sm text-red-700'>{error}</p>
                </div>
            )}

            {/* Win Modal */}
            <Modal isOpen={showWinModal} onClose={() => setShowWinModal(false)} maxWidth='max-w-lg'>
                <div className='animate-pop px-6 pt-2 pb-8 text-center'>
                    <div className='bg-accent/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl'>
                        {isOurTeamWinner ? '🏆' : '🚀'}
                    </div>
                    <h2 className='text-tx-primary mb-2 text-3xl font-extrabold'>
                        {isOurTeamWinner ? 'Champions!' : 'Game Over'}
                    </h2>
                    <p className='text-tx-secondary text-sm'>
                        {isOurTeamWinner
                            ? 'You crushed the puzzle. Take a breather while the admin spins up the next round.'
                            : `${winnerTeamName || 'Another team'} finished first. Ask the admin to drop you back into the next game.`}
                    </p>

                    <div className='mt-6 grid gap-3 text-left sm:grid-cols-2'>
                        <div className='border-border/60 bg-secondary/70 rounded-lg border p-4'>
                            <p className='text-tx-muted text-xs tracking-wide uppercase'>Winning Team</p>
                            <p className='text-tx-primary text-lg font-semibold'>{winnerTeamName || 'TBD'}</p>
                            {!isOurTeamWinner && (
                                <p className='text-tx-secondary mt-1 text-xs'>
                                    Give them a 👏 and get ready for the rematch.
                                </p>
                            )}
                        </div>
                        <div className='border-border/60 bg-secondary/70 rounded-lg border p-4'>
                            <p className='text-tx-muted text-xs tracking-wide uppercase'>Your Team</p>
                            <p className='text-tx-primary text-lg font-semibold'>{teamName}</p>
                            <p className='text-tx-secondary mt-1 text-xs'>
                                {isOurTeamWinner
                                    ? 'Enjoy the victory lap while we prep the next ladder.'
                                    : 'Stay ready—once the admin assigns teams again you will jump right in.'}
                            </p>
                        </div>
                    </div>

                    <div className='mt-8 flex flex-col gap-3'>
                        <Button onClick={() => setShowWinModal(false)} variant='primary' size='lg' className='w-full'>
                            Review Puzzle
                        </Button>
                        <Button onClick={handleReturnToLobby} variant='secondary' size='lg' className='w-full'>
                            Back to Lobby
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
