import { useEffect, type ReactNode } from "react";
import { supabase } from "@omnitrip/shared/services/supabase";
import { AuthContext } from "@omnitrip/shared/auth/context";
import { useAuth } from "../../hooks/useAuth";

// Re-export useAuthContext from shared so web components that import it here still work
export { useAuthContext } from "@omnitrip/shared/auth/context";

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
