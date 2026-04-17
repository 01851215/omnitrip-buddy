/**
 * Shared auth context.
 *
 * Only exposes what shared hooks (useUserHistory, useBookings, etc.) actually need.
 * Apps provide their own signIn/signUp/signOut methods via their app-specific AuthProvider
 * and pass the user + loading state here.
 */

import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}
