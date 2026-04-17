import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { seedSupabaseData } from "../../services/seedSupabase";
import { supabase } from "../../services/supabase";

async function sendWelcomeEmail(email: string, displayName: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.functions.invoke("send-welcome-email", {
      body: { email, displayName },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });
  } catch {
    // Non-critical — don't surface welcome email failures to the user
  }
}

type AuthMode = "login" | "signup" | "reset";

interface AuthSheetProps {
  initialMode: "login" | "signup";
  onClose: () => void;
}

export function AuthSheet({ initialMode, onClose }: AuthSheetProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "reset") {
        if (!email.trim()) {
          setError("Please enter your email");
          setLoading(false);
          return;
        }
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/home",
        });
        if (resetErr) throw resetErr;
        setSuccess("Password reset link sent! Check your email.");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        if (!displayName.trim()) { setError("Please enter your name"); setLoading(false); return; }
        if (password !== confirmPassword) { setError("Passwords don't match"); setLoading(false); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
        const data = await signUp(email, password, displayName);
        if (data.user) {
          await seedSupabaseData(data.user.id, displayName);
        }
        // After signup, sign in to get a session
        await signIn(email, password);
        // Send welcome email via Edge Function (non-blocking — don't await)
        sendWelcomeEmail(email, displayName);
      } else {
        await signIn(email, password);
      }
      navigate("/home");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className="relative bg-surface rounded-t-3xl w-full max-w-[430px] p-5 pb-8 space-y-3 animate-slide-up max-h-[85vh] overflow-y-auto"
      >
        {/* Mode Toggle */}
        {mode !== "reset" ? (
          <div className="flex gap-1 bg-cream rounded-xl p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
                mode === "login" ? "bg-surface text-text shadow-sm" : "text-text-muted"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
                mode === "signup" ? "bg-surface text-text shadow-sm" : "text-text-muted"
              }`}
            >
              Sign Up
            </button>
          </div>
        ) : (
          <div className="text-center py-1">
            <h2 className="text-lg font-bold font-serif">Reset Password</h2>
            <p className="text-xs text-text-secondary mt-1">
              Enter your email and we'll send you a reset link
            </p>
          </div>
        )}

        {/* Name (signup only) */}
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-label="Full name"
            autoComplete="name"
            className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
          />
        )}

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
          autoComplete="email"
          spellCheck={false}
          className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
          autoFocus
        />

        {/* Password (not for reset) */}
        {mode !== "reset" && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleSubmit()}
            aria-label="Password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
          />
        )}

        {/* Confirm Password (signup only) */}
        {mode === "signup" && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            aria-label="Confirm password"
            autoComplete="new-password"
            className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
          />
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-conflict text-center">{error}</p>
        )}

        {/* Success */}
        {success && (
          <p className="text-sm text-success text-center">{success}</p>
        )}

        {/* Submit */}
        <Button onClick={handleSubmit} className="w-full" disabled={loading}>
          {loading
            ? "Please wait..."
            : mode === "login"
            ? "Login"
            : mode === "signup"
            ? "Create Account"
            : "Send Reset Link"}
        </Button>

        {/* Forgot password link (login mode) */}
        {mode === "login" && (
          <button
            type="button"
            onClick={() => switchMode("reset")}
            className="w-full text-center text-xs text-primary font-medium py-1"
          >
            Forgot password?
          </button>
        )}

        {/* Back to login (reset mode) */}
        {mode === "reset" && (
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="w-full text-center text-xs text-primary font-medium py-1"
          >
            Back to login
          </button>
        )}

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-xs text-text-muted py-2"
          aria-label="Close"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
