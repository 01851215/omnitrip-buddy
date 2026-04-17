import type { BuddyState } from "./types";

import idleWebm from "../../assets/buddy-idle.webm";
import excitedWebm from "../../assets/buddy-excited.webm";

/**
 * Transparent WebM videos per mood. VP9 with alpha channel.
 * "thinking" reuses idle for now (no dedicated thinking WebM yet).
 * "talking" reuses idle as well.
 */
export const buddyVideoSources: Record<BuddyState, string> = {
  idle: idleWebm,
  talking: idleWebm,
  happy: excitedWebm,
  thinking: idleWebm,
};
