import React, { createContext, useContext, useState } from "react";
import { LobbyInfo } from "../types";

interface GameContextType {
  currentLobby: LobbyInfo | null;
  setCurrentLobby: (lobby: LobbyInfo | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [currentLobby, setCurrentLobby] = useState<LobbyInfo | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <GameContext.Provider
      value={{
        currentLobby,
        setCurrentLobby,
        loading,
        setLoading,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
