import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "../components/BottomNav/BottomNav";
import { BuddyContainer } from "../components/Buddy/BuddyContainer";
import { BuddyPanel } from "../components/BuddyPanel/BuddyPanel";
import { ProactiveAlert } from "../components/BuddyOverlay/ProactiveAlert";
import { HandsFreeToggle } from "../components/HandsFreeMode/HandsFreeToggle";
import { startAlertEngine, stopAlertEngine } from "../services/proactiveAlerts";
import { requestLocation } from "../services/location";

export function AppLayout() {
  useEffect(() => {
    requestLocation();
    startAlertEngine();
    return () => stopAlertEngine();
  }, []);

  return (
    <div className="min-h-screen bg-cream max-w-[430px] mx-auto relative">
      <main className="pb-24">
        <Outlet />
      </main>
      <BuddyContainer />
      <BuddyPanel />
      <ProactiveAlert />
      <HandsFreeToggle />
      <BottomNav />
    </div>
  );
}
