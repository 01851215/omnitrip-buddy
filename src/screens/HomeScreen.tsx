import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useActiveTrip, useDreamTrips, useDestinations, updateTripStatus } from "../hooks/useTrips";
import { useExpenses, useBudget } from "../hooks/useExpenses";
import { useAllCalendarEvents } from "../hooks/useCalendarEvents";
import { useProfile } from "../hooks/useProfile";
import { useLocationStore } from "../stores/locationStore";
import { useBuddyStore } from "../stores/buddyStore";
import { useBuddyPanelStore } from "../stores/buddyPanelStore";
import { callChatGPT } from "../services/chatgpt";
import { speak } from "../services/tts";
import { Card } from "../components/ui/Card";
import { Buddy } from "../components/Buddy";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LeafletMap } from "../components/map/LeafletMap";

const DEFAULT_REFLECTION =
  "I've been looking at your spending patterns. Consider trying some local street food tonight — it's often the most memorable part of any trip, and easy on the budget!";

export function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trip, refresh: refreshTrip } = useActiveTrip();
  const [completing, setCompleting] = useState(false);

  // Refresh trip data whenever we navigate back to /home
  useEffect(() => { refreshTrip(); }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [reflectionDismissed, setReflectionDismissed] = useState(false);
  const [reflectionText, setReflectionText] = useState(DEFAULT_REFLECTION);
  const tripId = trip?.id;
  const expenses = useExpenses(tripId);
  const budget = useBudget(tripId);
  const { events } = useAllCalendarEvents();
  const dreams = useDreamTrips();
  const destinations = useDestinations(tripId);
  const { profile } = useProfile();
  const { lat, lng, nearbyPOIs } = useLocationStore();
  const setMood = useBuddyStore((s) => s.setMood);
  const { open: openPanel, addMessage } = useBuddyPanelStore();

  const totalSpent = expenses.reduce((s, e) => s + e.convertedAmount, 0);

  // Generate dynamic reflection from ChatGPT based on budget data
  useEffect(() => {
    if (!trip || reflectionDismissed) return;
    const budgetLabel = budget
      ? `$${totalSpent.toLocaleString()} spent of $${budget.totalPlanned.amount.toLocaleString()} planned`
      : null;
    if (!budgetLabel) return;

    callChatGPT(
      "You are OmniBuddy, a warm travel companion. Write a short (2-3 sentence) budget reflection for the traveller. Be specific, conversational, and gently suggest one actionable tip. Do not use their name.",
      `Trip: ${trip.title}. Budget status: ${budgetLabel}. Day ${Math.max(1, Math.ceil((Date.now() - new Date(trip.startDate).getTime()) / 86400000))} of trip. Top expense categories from their history.`,
      150,
    ).then((res) => {
      if (res) setReflectionText(res);
    });
  }, [trip?.id, budget?.tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcceptSuggestion = useCallback(() => {
    setReflectionDismissed(true);
    setMood("excited");
    speak("Great choice! I'll keep an eye out for the best local spots nearby.").catch(() => {});
    setTimeout(() => setMood("idle"), 3000);
  }, [setMood]);

  const handleTellMeMore = useCallback(() => {
    const msgId = Date.now().toString();
    addMessage({ id: msgId, role: "user", text: `Tell me more about: ${reflectionText}`, timestamp: Date.now() });
    openPanel();
  }, [reflectionText, addMessage, openPanel]);
  const todayEvents = events.filter((e) => {
    const d = new Date(e.startTime).toDateString();
    return d === new Date().toDateString();
  });

  const daysIn = trip
    ? Math.max(1, Math.ceil((Date.now() - new Date(trip.startDate).getTime()) / 86400000))
    : 0;
  const totalDays = trip
    ? Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <span className="text-primary font-semibold text-sm">OmniTrip</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold overflow-hidden">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (profile?.displayName?.[0] ?? "T").toUpperCase()
          )}
        </div>
      </div>

      {/* Ongoing Journey */}
      {trip ? (
        <div className="px-5 space-y-2">
          <div
            className="relative rounded-2xl overflow-hidden h-48 cursor-pointer"
            onClick={() => navigate("/budget")}
          >
            <img
              src={trip.coverImage}
              alt={trip.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                {trip.status === "planning" ? "Planned Journey" : "Ongoing Journey"}
              </span>
              <h2 className="text-xl font-bold text-white font-serif mt-0.5">
                {trip.title}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-xs text-white/80">
                <span>Journey Progress</span>
                <span>Day {daysIn} of {totalDays}</span>
              </div>
            </div>
          </div>
          {trip.status === "planning" ? (
            <Button
              className="w-full !text-xs"
              disabled={completing}
              onClick={async () => {
                setCompleting(true);
                await updateTripStatus(trip.id, "active");
                refreshTrip();
                setCompleting(false);
              }}
            >
              {completing ? "Starting..." : "Start Trip"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full !text-xs"
              disabled={completing}
              onClick={async () => {
                setCompleting(true);
                await updateTripStatus(trip.id, "completed");
                refreshTrip();
                setCompleting(false);
              }}
            >
              {completing ? "Completing..." : "Mark Journey Complete"}
            </Button>
          )}
        </div>
      ) : (
        <div className="px-5">
          <EmptyState
            icon="✈️"
            title="No active journey"
            description="Plan your next adventure and it will show up here."
            action={{ label: "Start Planning", onClick: () => navigate("/plan") }}
          />
        </div>
      )}

      {/* Destinations */}
      {destinations.length > 0 && (
        <div className="px-5">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Destinations</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
            {destinations.map((dest) => (
              <button
                key={dest.id}
                type="button"
                onClick={() => navigate(`/destination/${dest.id}`)}
                className="flex-shrink-0 w-36 rounded-2xl overflow-hidden bg-surface border border-cream-dark text-left"
              >
                {dest.coverImage && (
                  <img src={dest.coverImage} alt={dest.name} className="w-full h-20 object-cover" />
                )}
                <div className="p-2.5">
                  <p className="text-xs font-semibold">{dest.name}</p>
                  <p className="text-[10px] text-text-muted">{dest.country}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plan Next Move */}
      <div className="px-5">
        <Card className="flex items-start gap-3" onClick={() => navigate("/plan")}>
          <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center shrink-0 mt-0.5">
            <Buddy state="idle" size="mini" mode="video" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-text">Plan Next Move</h3>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              Let our concierge find the perfect hidden gem for your tonight's dinner.
            </p>
            <button className="text-xs text-primary font-medium mt-2 flex items-center gap-1">
              Explore Map <span aria-hidden>→</span>
            </button>
          </div>
        </Card>
      </div>

      {/* Calendar + Budget widgets */}
      <div className="px-5 space-y-3">
        <Card
          className="flex items-center gap-3 !py-3"
          onClick={() => navigate("/calendar")}
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-text">Calendar</p>
            <p className="text-xs text-text-secondary">{todayEvents.length} Events Today</p>
          </div>
        </Card>

        <Card
          className="flex items-center gap-3 !py-3"
          onClick={() => navigate("/budget")}
        >
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A87C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-text">Budget Tracker</p>
            <p className="text-xs text-text-secondary">
              {budget
                ? `$${totalSpent.toLocaleString()} of $${budget.totalPlanned.amount.toLocaleString()}`
                : "You're on track"}
            </p>
          </div>
        </Card>
      </div>

      {/* Nearby Map */}
      {lat && lng && (
        <div className="px-5">
          <Card className="!p-0 overflow-hidden">
            <LeafletMap
              center={[lat, lng]}
              zoom={15}
              userLocation={{ lat, lng }}
              markers={nearbyPOIs
                .filter((p) => p.lat && p.lng)
                .map((p) => ({
                  id: p.id,
                  lat: p.lat!,
                  lng: p.lng!,
                  name: p.name,
                  category: p.category,
                }))}
              height="180px"
            />
            <div className="px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Explore Nearby</p>
              <p className="text-xs text-text-secondary">{nearbyPOIs.length} places discovered near you</p>
            </div>
          </Card>
        </div>
      )}

      {/* Buddy Reflection */}
      {!reflectionDismissed && (
        <div className="px-5">
          <Card className="!p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <Buddy state="idle" size="mini" mode="video" />
              </div>
              <h3 className="font-semibold text-sm">Buddy Reflection</h3>
            </div>
            <p className="text-xs text-text-secondary italic leading-relaxed">
              "{reflectionText}"
            </p>
            <div className="flex gap-2 mt-4">
              <Button className="!text-xs !px-4 !py-2" onClick={handleAcceptSuggestion}>
                Accept Suggestion
              </Button>
              <Button variant="ghost" className="!text-xs !px-4 !py-2" onClick={handleTellMeMore}>
                Tell me more
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Upcoming Dreams */}
      <div className="px-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold font-serif">Upcoming Dreams</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              The journeys that live in your heart
            </p>
          </div>
          <div className="flex gap-1">
            <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">Bucket</span>
            <span className="text-xs font-medium text-text-muted px-3 py-1">List</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide">
        {dreams.map((dream) => (
          <div key={dream.id} className="min-w-[260px] rounded-2xl overflow-hidden bg-surface shadow-sm border border-cream-dark">
            {dream.coverImage && (
              <img src={dream.coverImage} alt={dream.title} className="w-full h-36 object-cover" />
            )}
            <div className="p-4">
              <h3 className="font-semibold text-sm">{dream.title}</h3>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">{dream.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
