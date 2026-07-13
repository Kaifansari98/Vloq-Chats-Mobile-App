import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/storage";
import type { AuthenticatedUser } from "@/types/auth";

type AuthState = {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    async function load() {
      const [token, user] = await Promise.all([
        getToken(),
        getUser<AuthenticatedUser>(),
      ]);
      setState({ user, token, isAuthenticated: !!token, isLoading: false });
    }
    void load();
  }, []);

  return state;
}
