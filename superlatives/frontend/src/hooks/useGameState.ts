import { useState, useEffect } from 'react';
import { roomApi } from '@/services/api';
import type { Room, Player, PersonInPool, Question, Score } from '@/types';

export function useGameState(roomId?: number) {
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [peoplePool, setPeoplePool] = useState<PersonInPool[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadGameState = async () => {
        if (!roomId) return;

        setIsLoading(true);
        setError(null);

        try {
            const info = await roomApi.getCurrent();
            setRoom(info.room);
            setPlayers(info.players);
            setPeoplePool(info.people_pool);
            setQuestions(info.questions);
            setScores(info.scores);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load game state');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadGameState();
    }, [roomId]);

    return {
        room,
        players,
        peoplePool,
        questions,
        scores,
        isLoading,
        error,
        reload: loadGameState,
    };
}
