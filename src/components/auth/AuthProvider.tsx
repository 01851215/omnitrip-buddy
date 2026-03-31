import { createContext, useContext, useEffect, type ReactNode } from "react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  // Handle Supabase password-recovery redirect: URL contains #access_token=...&type=recovery
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token") ?? "";

    if (!accessToken) return;

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
      window.history.replaceState(null, "", window.location.pathname);
      window.location.replace("/reset-password");
    });
  }, []);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
