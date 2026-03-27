import { Buddy } from "./Buddy";
import { useBuddyStore } from "../../stores/buddyStore";
import { useBuddyPanelStore } from "../../stores/buddyPanelStore";
import { useBuddyContext } from "../../hooks/useBuddyContext";
import type { BuddyState } from "./types";

const moodToState: Record<string, BuddyState> = {
  idle: "idle",
  thinking: "thinking",
  excited: "happy",
};

export function BuddyContainer() {
  const { mood } = useBuddyStore();
  const { isOpen, open } = useBuddyPanelStore();
  const { renderMode } = useBuddyContext();
  const state = moodToState[mood] ?? "idle";

  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={open}
      className="fixed bottom-24 right-4 z-30 transition-all duration-300"
      aria-label="Open Buddy"
    >
      <div className="w-14 h-14 rounded-full bg-primary shadow-lg border-2 border-white overflow-hidden flex items-center justify-center">
        <Buddy state={state} size="mini" mode={renderMode} />
      </div>
    </button>
  );
}
