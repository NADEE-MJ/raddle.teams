export interface LadderStep {
    word: string;
    clue: string | null;
    transform: string | null;
}

export interface Puzzle {
    title: string;
    ladder: LadderStep[];
}
