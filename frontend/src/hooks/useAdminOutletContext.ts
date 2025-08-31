import { useOutletContext } from "react-router-dom";

export type AdminOutletContext = {
  isAdmin?: boolean;
};

export function useAdminOutletContext() {
  return useOutletContext<AdminOutletContext>();
}
