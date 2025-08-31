import { useOutletContext } from "react-router-dom";

export type GameOutletContext = {
  gameId?: string;
};

export function useGameOutlet() {
  return useOutletContext<GameOutletContext>();
}
