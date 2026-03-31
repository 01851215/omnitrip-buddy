import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function OAuthCallbackScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Processing...");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setMessage(`Authorization denied: ${searchParams.get("error_description") ?? error}`);
    } else {
      setMessage("Calendar connected! Redirecting...");
    }
    setTimeout(() => navigate("/calendar", { replace: true }), 1500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="bg-surface rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-10 h-10 mx-auto border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </div>
  );
}
