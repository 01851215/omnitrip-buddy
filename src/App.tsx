import { useState } from "react";
import {
  Buddy,
  BUDDY_STATES,
  type BuddyState,
} from "./components/Buddy";

export function App() {
  const [state, setState] = useState<BuddyState>("idle");

  return (
    <main
      style={{
        padding: "2rem",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        alignItems: "flex-start",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
        Buddy (MVP demo)
      </h1>
      <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
        Current state:{" "}
        <code style={{ color: "#e2e8f0" }}>{state}</code>
      </p>
      <Buddy state={state} />
      <div
        role="group"
        aria-label="Buddy state"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
      >
        {BUDDY_STATES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={s === state}
            onClick={() => setState(s)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              border: s === state ? "2px solid #38bdf8" : "1px solid #444",
              background: s === state ? "#1e293b" : "#0f172a",
              color: "#e2e8f0",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </main>
  );
}
