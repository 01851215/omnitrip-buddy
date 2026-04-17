import type { BuddyState } from "./types";

import characterSrc from "./buddy.png";

/**
 * One image for all states + CSS motion in Buddy.module.css.
 * Later: import different files per state (GIF/WebM/Lottie URL) here.
 */
export const buddyAnimationSources: Record<BuddyState, string> = {
  idle: characterSrc,
  talking: characterSrc,
  happy: characterSrc,
  thinking: characterSrc,
};
