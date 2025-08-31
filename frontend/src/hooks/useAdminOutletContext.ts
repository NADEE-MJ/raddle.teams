import { useOutletContext } from "react-router-dom";
import { Lobby } from "@/types";

export type AdminOutletContext = {
  isAdmin: boolean;
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
  lobbies: Lobby[];
  refreshLobbies: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

export function useAdminOutletContext() {
  return useOutletContext<AdminOutletContext>();
}
