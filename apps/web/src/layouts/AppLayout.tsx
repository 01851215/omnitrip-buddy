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
    const applyTheme = (isDark: boolean) => {
      const resolved = isDark ? "dark" : "light";
      root.setAttribute("data-theme", resolved);
      root.style.colorScheme = resolved;
      const themeColor = isDark ? "#1A1F1E" : "#F5F1EB";
      document.querySelector('meta[name="theme-color"][media*="light"]')?.setAttribute("content", isDark ? "#1A1F1E" : "#F5F1EB");
      document.querySelector('meta[name="theme-color"][media*="dark"]')?.setAttribute("content", themeColor);
    };
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme]);

  useEffect(() => {
    initLocationPermission();
    startAlertEngine();
    return () => stopAlertEngine();
  }, []);

  return (
    <div className="min-h-screen bg-cream max-w-[430px] mx-auto relative">
      <main id="main-content" className="pb-24">
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
