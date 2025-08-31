import { useOutletContext } from "react-router-dom";
import { Player, Lobby, LobbyInfo } from "@/types";

export type LobbyOutletContext = {
  lobbyCode: string;
  player: Player | null;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  lobby: Lobby | null;
  lobbyInfo: LobbyInfo | null;
  refreshLobbyInfo: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

export function useLobbyOutletContext() {
  return useOutletContext<LobbyOutletContext>();
}
