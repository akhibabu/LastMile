import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: Record<string, string>) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchCurrentUser(): Promise<User> {
  const res = await api.get("/auth/me");
  return res.data.data as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("lastmile_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function boot() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        setUser(await fetchCurrentUser());
      } catch {
        localStorage.removeItem("lastmile_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    void boot();
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login: async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        localStorage.setItem("lastmile_token", res.data.data.token);
        setToken(res.data.data.token);
        const profile = await fetchCurrentUser();
        setUser(profile);
        return profile;
      },
      register: async (payload) => {
        const res = await api.post("/auth/register", payload);
        localStorage.setItem("lastmile_token", res.data.data.token);
        setToken(res.data.data.token);
        const profile = await fetchCurrentUser();
        setUser(profile);
        return profile;
      },
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {
          /* token is discarded locally either way */
        }
        localStorage.removeItem("lastmile_token");
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
