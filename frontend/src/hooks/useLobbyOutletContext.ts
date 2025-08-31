import { useOutletContext } from "react-router-dom";

export type LobbyOutletContext = {
  lobbyCode?: string;
};

export function useLobbyOutlet() {
  return useOutletContext<LobbyOutletContext>();
}
