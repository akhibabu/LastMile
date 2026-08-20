import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.removeItem("lastmile_token");
    async function boot() {
      try {
        setUser(await fetchCurrentUser());
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    void boot();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        const profile = (res.data.data?.user as User | undefined) ?? (await fetchCurrentUser());
        setUser(profile);
        return profile;
      },
      register: async (payload) => {
        const res = await api.post("/auth/register", payload);
        const profile = (res.data.data?.user as User | undefined) ?? (await fetchCurrentUser());
        setUser(profile);
        return profile;
      },
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {
          /* cookie is cleared server-side; drop local user either way */
        }
        localStorage.removeItem("lastmile_token");
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
