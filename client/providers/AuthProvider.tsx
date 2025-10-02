import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  AuthResponse,
  AuthUser,
  ContinueWatchingResponse,
  WatchEntry,
} from "@shared/api";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
  getContinue: () => Promise<WatchEntry[]>;
  postProgress: (p: {
    animeId: number;
    episode: number;
    position: number;
    title?: string;
    image?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useStoredAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = localStorage.getItem("authToken");
    const u = localStorage.getItem("authUser");
    if (t) setToken(t);
    if (u) setUser(JSON.parse(u));
  }, []);
  useEffect(() => {
    if (token) localStorage.setItem("authToken", token);
    else localStorage.removeItem("authToken");
  }, [token]);
  useEffect(() => {
    if (user) localStorage.setItem("authUser", JSON.stringify(user));
    else localStorage.removeItem("authUser");
  }, [user]);
  return { user, setUser, token, setToken } as const;
}

async function api<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...init, headers });
  if (!res.ok)
    throw new Error(
      (await res.json().catch(() => ({})))?.error ||
        `Request failed: ${res.status}`,
    );
  return (await res.json()) as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, token, setToken } = useStoredAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!token) return;
        const me = await api<AuthUser>(
          "/api/auth/me",
          { method: "GET" },
          token,
        );
        setUser(me);
      } catch {
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user || null,
      token: token || null,
      loading,
      async login(username: string, password: string) {
        const res = await api<AuthResponse>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
        setUser(res.user);
        setToken(res.token);
      },
      async signup(username: string, password: string) {
        const res = await api<AuthResponse>("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
        setUser(res.user);
        setToken(res.token);
      },
      logout() {
        setUser(null);
        setToken(null);
      },
      async getContinue() {
        if (!token) return [];
        const res = await api<ContinueWatchingResponse>(
          "/api/user/continue",
          { method: "GET" },
          token,
        );
        return res.history;
      },
      async postProgress(p) {
        if (!token) return;
        await api(
          "/api/user/progress",
          { method: "POST", body: JSON.stringify(p) },
          token,
        );
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
