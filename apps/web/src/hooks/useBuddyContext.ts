import { useLocation } from "react-router-dom";
import type { BuddySize } from "../components/Buddy";

interface BuddyContext {
  size: BuddySize;
  showOverlay: boolean;
  renderMode: "video" | "spline";
}

const heroRoutes = new Set(["/", "/home"]);
const splineRoutes = new Set(["/home", "/plan"]);

export function useBuddyContext(): BuddyContext {
  const { pathname } = useLocation();

  return {
    size: heroRoutes.has(pathname) ? "hero" : "mini",
    showOverlay: pathname !== "/",
    renderMode: splineRoutes.has(pathname) ? "spline" : "video",
  };
}
