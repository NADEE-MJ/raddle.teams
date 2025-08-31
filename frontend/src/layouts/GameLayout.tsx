import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { GameOutletContext } from '@/hooks/useGameOutletContext';
import { GameProvider, useGameContext } from '@/context/GameContext';
import { useGameWebSocket } from '@/hooks/useGameWebSocket';
import { Player } from '@/types';
import { api } from '@/services/api';

const GameLayoutContent: React.FC<{ gameId: string }> = ({ gameId }) => {
    const navigate = useNavigate();
    const [sessionId, setSessionIdState] = useState<string | null>(null);
    const [player, setPlayer] = useState<Player | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const {
        currentGame,
        puzzle,
        teamProgress,
        leaderboard,
        isLoading: gameLoading,
        error: gameError,
        refreshAll,
    } = useGameContext();

    const setSessionId = useCallback((id: string | null) => {
        if (id) {
            localStorage.setItem('raddle_session_id', id);
        } else {
            localStorage.removeItem('raddle_session_id');
        }
        setSessionIdState(id);
    }, []);

    // Set up WebSocket connection for game events
    useGameWebSocket({
        lobbyId: currentGame?.lobby_id,
        sessionId,
        enabled: !!currentGame && !!sessionId,
    });

    // Load player data
    useEffect(() => {
        const loadPlayerData = async () => {
            const storedSessionId = localStorage.getItem('raddle_session_id');
            if (!storedSessionId) {
                navigate('/');
                return;
            }

            setSessionIdState(storedSessionId);

            try {
                setIsLoading(true);
                const playerData = await api.player.lobby.activeUser(storedSessionId);
                setPlayer(playerData);
            } catch (err) {
                console.error('Failed to load player data:', err);
                setError('Failed to load player data');
                // Redirect to home if session is invalid
                localStorage.removeItem('raddle_session_id');
                navigate('/');
            } finally {
                setIsLoading(false);
            }
        };

        loadPlayerData();
    }, [navigate]);

    // Redirect if no game or wrong game
    useEffect(() => {
        if (!isLoading && !gameLoading && currentGame) {
            if (currentGame.id.toString() !== gameId) {
                // Player is in different game, redirect to correct game
                navigate(`/game/${currentGame.id}`, { replace: true });
            }
        } else if (!isLoading && !gameLoading && !currentGame) {
            // No active game, redirect to lobby
            navigate('/', { replace: true });
        }
    }, [gameId, currentGame, isLoading, gameLoading, navigate]);

    const refreshGameData = useCallback(async () => {
        await refreshAll();
    }, [refreshAll]);

    const context: GameOutletContext = {
        gameId,
        player,
        sessionId,
        setSessionId,
        game: currentGame,
        puzzle,
        teamProgress,
        leaderboard,
        isLoading: isLoading || gameLoading,
        error: error || gameError,
        refreshGameData,
    };

    return <Outlet context={context} />;
};

const GameLayout: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [player] = useState<Player | null>(null);

    useEffect(() => {
        const storedSessionId = localStorage.getItem('raddle_session_id');
        setSessionId(storedSessionId);
    }, []);

    return (
        <GameProvider player={player} sessionId={sessionId}>
            <GameLayoutContent gameId={gameId || ''} />
        </GameProvider>
    );
};

export default GameLayout;
