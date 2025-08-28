import React, { createContext, useContext, useState, useEffect } from "react";
import { Player } from "../types";

interface PlayerContextType {
  player: Player | null;
  setPlayer: (player: Player | null) => void;
  sessionId: string;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [sessionId] = useState(() => {
    // Generate or retrieve session ID
    const stored = localStorage.getItem("raddle_session_id");
    if (stored) return stored;

    const newId =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("raddle_session_id", newId);
    return newId;
  });

  useEffect(() => {
    // Try to restore player from localStorage
    const storedPlayer = localStorage.getItem("raddle_player");
    if (storedPlayer) {
      try {
        setPlayer(JSON.parse(storedPlayer));
      } catch (error) {
        console.error("Failed to parse stored player:", error);
        localStorage.removeItem("raddle_player");
      }
    }
  }, []);

  useEffect(() => {
    // Save player to localStorage when it changes
    if (player) {
      localStorage.setItem("raddle_player", JSON.stringify(player));
    } else {
      localStorage.removeItem("raddle_player");
    }
  }, [player]);

  return (
    <PlayerContext.Provider value={{ player, setPlayer, sessionId }}>
      {children}
    </PlayerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
