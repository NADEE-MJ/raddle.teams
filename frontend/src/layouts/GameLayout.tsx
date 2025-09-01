import { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { GameOutletContext } from '@/hooks/useGameOutletContext';
import { Player, Game, Team } from '@/types';

const GameLayout: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [player] = useState<Player | null>(null);
    const [game] = useState<Game | null>(null);
    const [team] = useState<Team | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedSessionId = localStorage.getItem('raddle_session_id');
        if (storedSessionId) {
            setSessionId(storedSessionId);
        }
        setIsLoading(false);
    }, []);

    const context: GameOutletContext = {
        gameId: gameId || '',
        player,
        sessionId,
        game,
        team,
        isLoading,
        error: null,
    };

    return <Outlet context={context} />;
};

export default GameLayout;
