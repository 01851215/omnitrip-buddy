import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "../components/BottomNav/BottomNav";
import { BuddyContainer } from "../components/Buddy/BuddyContainer";
import { BuddyPanel } from "../components/BuddyPanel/BuddyPanel";
import { ProactiveAlert } from "../components/BuddyOverlay/ProactiveAlert";
import { HandsFreeToggle } from "../components/HandsFreeMode/HandsFreeToggle";
import { startAlertEngine, stopAlertEngine } from "../services/proactiveAlerts";
import { initLocationPermission } from "../services/location";
import { useUserHistory } from "../hooks/useUserHistory";
import { useSettingsStore } from "../stores/settingsStore";

export function AppLayout() {
  const { history } = useUserHistory();
  const theme = useSettingsStore((s) => s.theme);

  // Apply theme to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", isDark ? "dark" : "light");
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) =>
        root.setAttribute("data-theme", e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    initLocationPermission();
    startAlertEngine();
    return () => stopAlertEngine();
  }, []);

  return (
    <div className="min-h-screen bg-cream max-w-[430px] mx-auto relative">
      <main className="pb-24">
        <Outlet />
      </main>
      <BuddyContainer />
      <BuddyPanel history={history} />
      <ProactiveAlert />
      <HandsFreeToggle history={history} />
      <BottomNav />
    </div>
  );
}
