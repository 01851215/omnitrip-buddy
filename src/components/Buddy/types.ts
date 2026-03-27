export type BuddyState = "idle" | "talking" | "happy" | "thinking";

export const BUDDY_STATES: readonly BuddyState[] = [
  "idle",
  "talking",
  "happy",
  "thinking",
] as const;
