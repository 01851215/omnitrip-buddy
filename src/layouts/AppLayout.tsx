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

export function AppLayout() {
  const { history } = useUserHistory();

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
