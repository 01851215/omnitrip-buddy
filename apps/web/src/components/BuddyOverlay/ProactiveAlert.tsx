import { useLocationStore } from "../../stores/locationStore";
import { Buddy } from "../Buddy";
import { Button } from "../ui/Button";
import { speak } from "../../services/tts";

export function ProactiveAlert() {
  const { pendingAlert, dismissAlert, handsFreeMode } = useLocationStore();

  if (!pendingAlert) return null;

  // In hands-free mode, alerts are audio-only (handled by proactiveAlerts.ts)
  if (handsFreeMode) return null;

  const handleShowMe = async () => {
    // Speak the narration as well
    speak(pendingAlert.buddyMessage).catch(() => {});
    // Could navigate to map here in the future
    dismissAlert(pendingAlert.id);
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-[390px] animate-slide-up">
      <div role="alert" className="bg-surface rounded-2xl shadow-xl border border-cream-dark p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
            <Buddy state="happy" size="mini" mode="video" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-primary font-medium mb-1">
              Nearby Discovery
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {pendingAlert.buddyMessage}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-text-muted">
                {pendingAlert.category} · {pendingAlert.distance}m away
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button className="flex-1 !text-xs !py-2" onClick={handleShowMe}>
            Show me
          </Button>
          <Button
            variant="ghost"
            className="flex-1 !text-xs !py-2"
            onClick={() => dismissAlert(pendingAlert.id)}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
