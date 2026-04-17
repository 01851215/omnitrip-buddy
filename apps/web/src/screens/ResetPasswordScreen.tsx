import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { Button } from "../components/ui/Button";
import { Buddy } from "../components/Buddy";

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      setDone(true);
      setTimeout(() => navigate("/home"), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-8 max-w-[430px] mx-auto">
      <div className="mb-6">
        <Buddy state={done ? "happy" : "idle"} size="hero" mode="video" />
      </div>

      {done ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold font-serif mb-2">Password updated!</h1>
          <p className="text-sm text-text-secondary">Taking you home…</p>
        </div>
      ) : (
        <div className="w-full max-w-[320px] space-y-3">
          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold font-serif">Set new password</h1>
            <p className="text-sm text-text-secondary mt-1">Choose a strong password for your account</p>
          </div>

          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="New password"
            autoComplete="new-password"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-label="Confirm password"
            autoComplete="new-password"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
          />

          {error && <p className="text-sm text-conflict text-center">{error}</p>}

          <Button onClick={handleSubmit} className="w-full" disabled={loading}>
            {loading ? "Updating…" : "Update Password"}
          </Button>
        </div>
      )}
    </div>
  );
}
