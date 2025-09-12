export interface LadderStep {
    word: string;
    clue: string | null;
    transform: string | null;
}

export interface Puzzle {
    title: string;
    ladder: LadderStep[];
}

export interface GameStateStep {
    id: number;
    active: boolean;
    status: 'revealed' | 'unrevealed' | 'question' | 'answer';
    isRevealed: boolean;
    isClueShown: boolean;
    reveals: number;
}

export type GameState = GameStateStep[];
