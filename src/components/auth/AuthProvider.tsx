import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  // Handle Supabase password-recovery redirect: URL contains #access_token=...&type=recovery
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token") ?? "";

    if (!accessToken) return;

    // Set the session so updateUser() works on the reset screen
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
      // Clear the hash from the URL before navigating
      window.history.replaceState(null, "", window.location.pathname);
      navigate("/reset-password", { replace: true });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
