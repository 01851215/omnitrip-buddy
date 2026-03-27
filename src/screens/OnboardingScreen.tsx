import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Buddy } from "../components/Buddy";
import { AuthSheet } from "../components/auth/AuthSheet";
import { useAuthContext } from "../components/auth/AuthProvider";

export function OnboardingScreen() {
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const { user, loading } = useAuthContext();

  // If already logged in, redirect to home
  if (!loading && user) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-8 max-w-[430px] mx-auto">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </div>
        <span className="text-primary font-semibold text-lg tracking-tight">OmniTrip</span>
      </div>

      {/* Buddy — live video with transparency */}
      <div className="mb-6">
        <Buddy state="idle" size="hero" mode="video" />
      </div>

      {/* Tagline */}
      <h1 className="text-3xl font-bold text-center text-text mb-2">
        Your next chapter begins here.
      </h1>
      <p className="text-sm text-text-secondary text-center mb-10 max-w-[280px]">
        Step back into a world of curated journeys and thoughtful arrivals.
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-[280px]">
        <Button onClick={() => setAuthMode("login")} className="w-full">
          Login
        </Button>
        <Button variant="secondary" onClick={() => setAuthMode("signup")} className="w-full">
          Register
        </Button>
      </div>

      <p className="mt-12 text-[10px] tracking-[0.3em] text-text-muted uppercase">
        The World Awaits
      </p>

      {/* Auth Sheet */}
      {authMode && (
        <AuthSheet initialMode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </div>
  );
}
