import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "./AuthProvider";
import { Button } from "../ui/Button";
import { seedSupabaseData } from "../../services/seedSupabase";

type AuthMode = "login" | "signup";

interface AuthSheetProps {
  initialMode: AuthMode;
  onClose: () => void;
}

export function AuthSheet({ initialMode, onClose }: AuthSheetProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
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

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-t-3xl w-full max-w-[430px] p-5 pb-8 space-y-3 animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Mode Toggle */}
        <div className="flex gap-1 bg-cream rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mode === "login" ? "bg-surface text-text shadow-sm" : "text-text-muted"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-surface text-text shadow-sm" : "text-text-muted"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Name (signup only) */}
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
          />
        )}

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
          autoFocus
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleSubmit()}
          className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
        />

        {/* Confirm Password (signup only) */}
        {mode === "signup" && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus:border-primary"
          />
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-conflict text-center">{error}</p>
        )}

        {/* Submit */}
        <Button onClick={handleSubmit} className="w-full" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </Button>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-xs text-text-muted py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
