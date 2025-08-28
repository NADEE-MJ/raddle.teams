import React, { createContext, useContext, useState } from 'react'
import { Game, Team, TeamProgress } from '../types'

interface GameContextType {
    game: Game | null
    setGame: (game: Game | null) => void
    teams: Team[]
    setTeams: (teams: Team[]) => void
    teamProgress: TeamProgress | null
    setTeamProgress: (progress: TeamProgress | null) => void
    loading: boolean
    setLoading: (loading: boolean) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: React.ReactNode }) {
    const [game, setGame] = useState<Game | null>(null)
    const [teams, setTeams] = useState<Team[]>([])
    const [teamProgress, setTeamProgress] = useState<TeamProgress | null>(null)
    const [loading, setLoading] = useState(false)

    return (
        <GameContext.Provider value={{
            game,
            setGame,
            teams,
            setTeams,
            teamProgress,
            setTeamProgress,
            loading,
            setLoading
        }}>
            {children}
        </GameContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
    const context = useContext(GameContext)
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider')
    }
    return context
}
