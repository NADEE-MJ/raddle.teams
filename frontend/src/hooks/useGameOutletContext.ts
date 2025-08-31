import { useOutletContext } from "react-router-dom";
import { Player, Game, Team } from "@/types";

export type GameOutletContext = {
  gameId: string;
  player: Player | null;
  sessionId: string | null;
  game: Game | null;
  team: Team | null;
  isLoading: boolean;
  error: string | null;
};

export function useGameOutletContext() {
  return useOutletContext<GameOutletContext>();
}
