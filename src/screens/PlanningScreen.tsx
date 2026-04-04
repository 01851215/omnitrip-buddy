import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Buddy } from "../components/Buddy";
import { useBuddyStore } from "../stores/buddyStore";
import { usePlanningStore } from "../stores/planningStore";
import { useAuthContext } from "../components/auth/AuthProvider";
import { supabase } from "../services/supabase";
import { templates } from "../data/templates";
import {
  generateTripSuggestions,
  generateSuggestedPrompts,
  type RouteSuggestion,
  type PlanningConstraints,
} from "../services/tripAI";
import { LeafletMap, type MapMarker } from "../components/map/LeafletMap";
import { useUserHistory, historyToPromptContext } from "../hooks/useUserHistory";
import { searchDeals } from "../services/searchApi";
import { DealsPanel } from "../components/booking/DealsPanel";
import { useBookings } from "../hooks/useBookings";
import { useWallet } from "../hooks/useWallet";
import { WalletCard } from "../components/booking/WalletCard";
import { TripBudgetTracker } from "../components/booking/TripBudgetTracker";
import { useT } from "../i18n/useT";
import { useLocationStore } from "../stores/locationStore";
import { requestLocation } from "../services/location";

const DEFAULT_PROMPTS = [
  "A quiet weekend in the Swiss Alps",
  "High-speed train route across Japan",
  "Coastal drive through Portugal",
  "3 days in Lisbon",
  "A week in Iceland",
];

const BUDGET_PRESETS = [
  { label: "Budget", value: "budget", amount: 50 },
  { label: "Moderate", value: "moderate", amount: 150 },
  { label: "Luxury", value: "luxury", amount: 300 },
] as const;

const INTENSITY_OPTIONS = [
  { label: "Relaxed", value: "relaxed" as const, sub: "2-3 per day" },
  { label: "Balanced", value: "balanced" as const, sub: "3-4 per day" },
  { label: "Packed", value: "packed" as const, sub: "5-6 per day" },
] as const;

const REFINEMENT_CHIPS = [
  "Avoid crowds", "Family-friendly", "Foodie focus",
  "Hidden gems", "Luxury only", "Off the beaten path",
  "No theme parks", "Outdoor & nature", "Art & culture",
];

export function PlanningScreen() {
  const {
    query, setQuery,
    result, setResult,
    createdTrips, setCreatedTrips,
    tripStartDates, setTripStartDates,
    routeDeals, setRouteDeals,
    routeDealsLive, setRouteDealsLive,
    dealsLoading, setDealsLoading,
    budgetStyle, setBudgetStyle,
    customBudget, setCustomBudget,
    startDate, setStartDate,
    endDate, setEndDate,
    intensity, setIntensity,
    showConstraints, setShowConstraints,
    originCity, setOriginCity,
    resetPlanning,
  } = usePlanningStore();

  const { locationName, permission: locationPermission } = useLocationStore();

  // Auto-fill origin from GPS on first load
  useEffect(() => {
    if (originCity) return; // already set by user
    if (locationName) {
      setOriginCity(locationName);
    } else if (locationPermission !== "denied") {
      requestLocation().then(() => {
        const name = useLocationStore.getState().locationName;
        if (name) setOriginCity(name);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [loading, setLoading] = useState(false);
  const [addingTrip, setAddingTrip] = useState<string | null>(null);
  const [showAdjustSheet, setShowAdjustSheet] = useState(false);
  const [refinements, setRefinements] = useState("");
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(DEFAULT_PROMPTS);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const { setMood } = useBuddyStore();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { history } = useUserHistory();

  // Generate AI-personalised prompts when history + origin are ready
  useEffect(() => {
    setPromptsLoading(true);
    const ctx = history ? historyToPromptContext(history) : "";
    generateSuggestedPrompts(originCity, ctx)
      .then((prompts) => setSuggestedPrompts(prompts))
      .finally(() => setPromptsLoading(false));
  // Re-run when origin city resolves from GPS
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!history, originCity]);

  const constraintsRef = useRef<PlanningConstraints>({});
  const activeTripId = Object.values(createdTrips)[0];
  const { bookings, refresh: refreshBookings } = useBookings(activeTripId);
  const { wallet } = useWallet(user?.id);
  const t = useT();

  const buildConstraints = (): PlanningConstraints => {
    const c: PlanningConstraints = {};
    const parsedCustom = parseFloat(customBudget);
    if (!isNaN(parsedCustom) && parsedCustom > 0) {
      c.budget = parsedCustom;
    } else if (budgetStyle) {
      const preset = BUDGET_PRESETS.find((p) => p.value === budgetStyle);
      if (preset) c.budget = preset.amount;
    }
    if (startDate) c.startDate = startDate;
    if (endDate) c.endDate = endDate;
    if (intensity) c.intensity = intensity;
    if (history) c.userHistoryContext = historyToPromptContext(history);
    return c;
  };

  const handleSubmit = async (text?: string) => {
    const baseQ = (text ?? query).trim();
    if (!baseQ) return;
    if (text) setQuery(text);

    const q = refinements.trim()
      ? `${baseQ}. Preferences: ${refinements.trim()}`
      : baseQ;

    const constraints = buildConstraints();
    constraintsRef.current = constraints;

    setLoading(true);
    setResult(null);
    setMood("thinking");

    try {
      const suggestions = await generateTripSuggestions(q, templates, constraints);
      setResult(suggestions);
      setMood("excited");
    } catch {
      setResult({
        routes: templates.slice(0, 3).map((t, i) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          duration: `${t.duration} Days`,
          image: t.coverImage,
          recommended: i === 0,
          budget: `$${t.totalBudget.toLocaleString()}`,
          templateId: t.id,
        })),
        insight: {
          text: "Here are some popular routes to get you started. Tell me more about what you're looking for and I'll narrow it down.",
          reasons: [
            "Curated from top-rated destinations",
            "Range of budgets and durations",
            "Diverse travel styles covered",
          ],
        },
      });
      setMood("excited");
    } finally {
      setLoading(false);
      setTimeout(() => setMood("idle"), 3000);
    }
  };

  const handleAddToTrip = async (route: RouteSuggestion) => {
    if (!user) return;

    const tpl = templates.find((t) => t.id === route.templateId);
    const generated = route.generatedData;

    if (!tpl && !generated) return;

    setAddingTrip(route.id);

    try {
      const tripTitle = route.title;
      const tripDescription = route.description;
      const tripCoverImage = route.image;
      const tripDuration = generated?.duration ?? tpl!.duration;

      const destinations = generated
        ? generated.destinations.map((d) => ({
            name: d.name,
            country: d.country,
            days: d.days,
            lat: d.lat,
            lng: d.lng,
            timezone: d.timezone,
            coverImage: d.coverImage,
            activities: d.activities.map((a) => ({
              title: a.title,
              type: a.type,
              estimatedCost: a.estimatedCost,
            })),
          }))
        : tpl!.destinations.map((d) => ({
            name: d.name,
            country: d.country,
            days: d.days,
            lat: d.lat,
            lng: d.lng,
            timezone: d.timezone,
            coverImage: d.coverImage,
            activities: d.activities.map((a) => ({
              title: a.title,
              type: a.type,
              estimatedCost: a.estimatedCost,
            })),
          }));

      // Use constraint dates if provided, otherwise start from today
      const c = constraintsRef.current;
      const tripStart = c.startDate ? new Date(c.startDate) : new Date();
      const tripEnd = new Date(tripStart);
      tripEnd.setDate(tripEnd.getDate() + tripDuration);

      // 1. Create trip (active immediately so it shows on Home)
      const { data: trip } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: tripTitle,
          status: "active" as const,
          start_date: tripStart.toISOString().split("T")[0],
          end_date: tripEnd.toISOString().split("T")[0],
          cover_image: tripCoverImage,
          description: tripDescription,
        })
        .select("id")
        .single();

      if (!trip) throw new Error("Failed to create trip");
      const tripId = trip.id;

      // 2. Create destinations
      let dayOffset = 0;
      let firstDestinationId: string | null = null;

      for (const dest of destinations) {
        const arrival = new Date(tripStart);
        arrival.setDate(arrival.getDate() + dayOffset);
        const departure = new Date(arrival);
        departure.setDate(departure.getDate() + dest.days);

        const { data: destRow } = await supabase
          .from("destinations")
          .insert({
            trip_id: tripId,
            name: dest.name,
            country: dest.country,
            lat: dest.lat,
            lng: dest.lng,
            arrival_date: arrival.toISOString().split("T")[0],
            departure_date: departure.toISOString().split("T")[0],
            timezone: dest.timezone,
            cover_image: dest.coverImage,
          })
          .select("id")
          .single();

        if (!destRow) continue;
        if (!firstDestinationId) firstDestinationId = destRow.id;
        const destId = destRow.id;

        // 3. Create trip_days for this destination
        const dayRows = [];
        for (let d = 0; d < dest.days; d++) {
          const dayDate = new Date(arrival);
          dayDate.setDate(dayDate.getDate() + d);
          dayRows.push({
            trip_id: tripId,
            date: dayDate.toISOString().split("T")[0],
            buddy_notes: [
              d === 0
                ? `Arrive in ${dest.name}. Settle in and explore.`
                : `Day ${d + 1} in ${dest.name}.`,
            ],
            energy_level: d === 0 ? "low" : d === dest.days - 1 ? "low" : "medium",
          });
        }

        const { data: insertedDays } = await supabase
          .from("trip_days")
          .insert(dayRows)
          .select("id, date");

        if (!insertedDays) continue;

        // 4. Create sample activities spread across days
        const dayMap = Object.fromEntries(
          insertedDays.map((d) => [d.date, d.id]),
        );
        const sortedDates = insertedDays
          .map((d) => d.date)
          .sort();

        const activityRows = dest.activities.map((act, idx) => {
          const dateForAct = sortedDates[idx % sortedDates.length];
          const hour = 8 + (idx % 4) * 3; // spread across 8am, 11am, 2pm, 5pm
          const startTime = `${dateForAct}T${String(hour).padStart(2, "0")}:00`;
          const endTime = `${dateForAct}T${String(hour + 2).padStart(2, "0")}:00`;

          return {
            trip_day_id: dayMap[dateForAct],
            trip_id: tripId,
            destination_id: destId,
            title: act.title,
            type: act.type,
            start_time: startTime,
            end_time: endTime,
            location_name: dest.name,
            status: "planned" as const,
            sort_order: idx,
            estimated_cost_amount: act.estimatedCost > 0 ? act.estimatedCost : null,
            buddy_suggested: idx === 0,
          };
        });

        if (activityRows.length > 0) {
          const { error: actErr } = await supabase.from("activities").insert(activityRows);
          if (actErr) console.error("Failed to insert activities:", actErr);

          // Sync activities to calendar_events so they appear on CalendarScreen
          const calendarRows = activityRows.map((a) => ({
            user_id: user.id,
            trip_id: tripId,
            source: "omnitrip" as const,
            title: a.title,
            description: `${a.type} in ${dest.name}`,
            start_time: a.start_time,
            end_time: a.end_time,
            type: "travel" as const,
            conflicts_with: [],
          }));
          const { error: calErr } = await supabase.from("calendar_events").insert(calendarRows);
          if (calErr) console.error("Failed to insert calendar events:", calErr);
        }

        dayOffset += dest.days;
      }

      // Store created trip ID + start date, and generate deals instead of navigating away
      setCreatedTrips((prev) => ({ ...prev, [route.id]: tripId }));
      setTripStartDates((prev) => ({ ...prev, [route.id]: tripStart.toISOString().split("T")[0] }));

      // Fetch live deals from Edge Function (falls back to static)
      const destInputs = destinations.map((dest, i) => {
        const arrival = new Date(tripStart);
        arrival.setDate(arrival.getDate() + destinations.slice(0, i).reduce((s, d) => s + d.days, 0));
        const departure = new Date(arrival);
        departure.setDate(departure.getDate() + dest.days);
        return {
          name: dest.name,
          country: dest.country,
          arrivalDate: arrival.toISOString().split("T")[0],
          departureDate: departure.toISOString().split("T")[0],
          lat: dest.lat,
          lng: dest.lng,
        };
      });

      const budget = customBudget && !isNaN(parseFloat(customBudget))
        ? parseFloat(customBudget)
        : budgetStyle
          ? BUDGET_PRESETS.find((p) => p.value === budgetStyle)?.amount
          : undefined;
      setDealsLoading((prev) => ({ ...prev, [route.id]: true }));
      searchDeals(destInputs, originCity || "My Location", budget).then(({ deals, isLive }) => {
        setRouteDeals((prev) => ({ ...prev, [route.id]: deals }));
        setRouteDealsLive((prev) => ({ ...prev, [route.id]: isLive }));
        setDealsLoading((prev) => ({ ...prev, [route.id]: false }));
      });
    } catch (err) {
      console.error("Failed to create trip:", err);
    } finally {
      setAddingTrip(null);
    }
  };

  // Build map data from the recommended route only (numbered markers + polyline)
  const { mapMarkers, mapPolyline, mapCenter, routeBreadcrumb, gmapsUrl } = useMemo(() => {
    if (!result || result.routes.length === 0) {
      return { mapMarkers: [], mapPolyline: undefined, mapCenter: null, routeBreadcrumb: "", gmapsUrl: null };
    }
    const recommended = result.routes.find((r) => r.recommended) ?? result.routes[0];
    const dests = recommended.generatedData?.destinations
      ?? templates.find((t) => t.id === recommended.templateId)?.destinations
      ?? [];

    const markers: MapMarker[] = dests.map((d, i) => {
      const activities = ("activities" in d && Array.isArray(d.activities)) ? d.activities : [];
      const topActs = activities.slice(0, 4).map((a: { title: string }) => `• ${a.title}`).join("<br/>");
      const daysLabel = ("days" in d && d.days) ? ` · ${d.days}d` : "";
      return {
        id: `map-${d.name}`,
        lat: d.lat,
        lng: d.lng,
        name: d.name,
        label: String(i + 1),
        popup: `<strong>${d.name}</strong>${daysLabel}${topActs ? `<br/><span style="color:#6B7280;font-size:11px;line-height:1.6">${topActs}</span>` : ""}`,
      };
    });

    const polyline: [number, number][] = dests.map((d) => [d.lat, d.lng]);
    const center: [number, number] | null = dests.length > 0 ? [dests[0].lat, dests[0].lng] : null;
    const breadcrumb = dests.map((d) => d.name).join(" → ");

    // Google Maps multi-city directions URL
    const cityNames = dests.map((d) => encodeURIComponent(d.name));
    const gmaps = cityNames.length >= 2
      ? `https://www.google.com/maps/dir/?api=1&origin=${originCity ? encodeURIComponent(originCity) : cityNames[0]}&destination=${cityNames[cityNames.length - 1]}&waypoints=${cityNames.slice(0, -1).join("|")}`
      : cityNames.length === 1
        ? `https://www.google.com/maps/search/?api=1&query=${cityNames[0]}`
        : null;

    return { mapMarkers: markers, mapPolyline: polyline, mapCenter: center, routeBreadcrumb: breadcrumb, gmapsUrl: gmaps };
  }, [result, originCity]);

  const showResults = result !== null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="px-5 pt-6">
        <h1 className="text-3xl font-bold font-serif">{t.planning.title}</h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {t.planning.subtitle}
        </p>
      </div>

      {/* Chat Input */}
      <div className="px-5">
        <Card className="!p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={t.planning.searchPlaceholder}
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </Card>
      </div>

      {/* Constraints */}
      <div className="px-5">
        <button
          type="button"
          onClick={() => setShowConstraints(!showConstraints)}
          className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-2"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${showConstraints ? "rotate-90" : ""}`}
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
          {t.planning.refineTrip}
        </button>

        {showConstraints && (
          <Card className="space-y-4 !py-4">
            {/* Budget */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                {t.planning.dailyBudget}
              </p>
              <div className="flex gap-2 flex-wrap">
                {BUDGET_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setBudgetStyle(budgetStyle === p.value ? null : p.value);
                      setCustomBudget("");
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      budgetStyle === p.value
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-surface border-cream-dark text-text-muted"
                    }`}
                  >
                    {t.budget[p.value]}
                    <span className="text-[10px] opacity-70 ml-1">
                      ~${p.amount}/day
                    </span>
                  </button>
                ))}
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                    $
                  </span>
                  <input
                    type="number"
                    value={customBudget}
                    onChange={(e) => {
                      setCustomBudget(e.target.value);
                      setBudgetStyle(null);
                    }}
                    placeholder={t.planning.custom}
                    className="w-24 pl-6 pr-2 py-1.5 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40"
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                {t.planning.travelDates}
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40"
                />
                <span className="text-text-muted text-xs self-center">{t.planning.to}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40"
                />
              </div>
            </div>

            {/* Activities Per Day */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                {t.planning.activitiesPerDay}
              </p>
              <div className="flex gap-2">
                {INTENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setIntensity(intensity === opt.value ? null : opt.value)
                    }
                    className={`flex-1 px-3 py-2 rounded-lg border text-center transition-colors ${
                      intensity === opt.value
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-surface border-cream-dark text-text-muted"
                    }`}
                  >
                    <p className="text-xs font-medium">
                      {opt.value === "relaxed" ? t.planning.relaxed : opt.value === "balanced" ? t.planning.balanced : t.planning.packed}
                    </p>
                    <p className="text-[10px] opacity-70">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Flying from */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                Flying from
              </p>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm">✈️</span>
                <input
                  type="text"
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  placeholder={locationPermission === "denied" ? "Enter your city" : "Detecting your location…"}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40"
                />
                {locationPermission !== "denied" && !originCity && (
                  <button
                    type="button"
                    onClick={() => requestLocation().then(() => {
                      const name = useLocationStore.getState().locationName;
                      if (name) setOriginCity(name);
                    })}
                    className="absolute right-2 text-[10px] text-primary font-medium"
                  >
                    Use GPS
                  </button>
                )}
              </div>
            </div>

            {/* Refinements */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                Special requests
              </p>
              <textarea
                value={refinements}
                onChange={(e) => setRefinements(e.target.value)}
                placeholder="e.g. avoid tourist traps, focus on local food, no beach…"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40 resize-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {REFINEMENT_CHIPS.map((chip) => {
                  const active = refinements.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setRefinements((prev) =>
                          active
                            ? prev.replace(chip, "").replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "").trim()
                            : prev ? `${prev}, ${chip}` : chip
                        )
                      }
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-medium transition-colors ${
                        active
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-surface border-cream-dark text-text-muted"
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Update Plan button — only when a plan already exists */}
            {result && (
              <Button
                variant="primary"
                className="w-full !text-xs"
                onClick={() => handleSubmit()}
              >
                ↻ Update Plan
              </Button>
            )}

            {/* Personalization badge */}
            {history && history.pastTrips.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-primary text-sm">&#9733;</span>
                <p className="text-[11px] text-primary/80">
                  {t.planning.personalizedFrom(history.pastTrips.length)}
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="px-5 py-12 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden">
            <Buddy state="thinking" size="mini" mode="video" />
          </div>
          <p className="text-sm text-text-secondary animate-pulse">
            {t.planning.thinking}
          </p>
        </div>
      )}

      {/* Suggested Prompts */}
      {!showResults && !loading && (
        <>
          <div className="px-5 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
              {t.planning.suggested}
            </p>
            {promptsLoading
              ? [1,2,3].map((i) => (
                  <div key={i} className="w-full h-11 rounded-xl bg-cream animate-pulse" />
                ))
              : suggestedPrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSubmit(p)}
                className="w-full text-left px-4 py-3 rounded-xl bg-surface border border-cream-dark text-sm text-text-secondary hover:bg-cream-dark transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Popular Destinations */}
          <div className="px-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-serif">
                {t.planning.popularDestinations}
              </h2>
              <span className="text-[10px] text-text-muted">{t.planning.curated}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((tpl) => (
                <Card
                  key={tpl.id}
                  className="!p-0 overflow-hidden"
                  onClick={() => handleSubmit(tpl.title)}
                >
                  <div className="relative h-28">
                    <img
                      src={tpl.coverImage}
                      alt={tpl.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-xs font-semibold text-white leading-tight">
                        {tpl.title}
                      </p>
                      <p className="text-[10px] text-white/70 mt-0.5">
                        {tpl.duration} days &middot; ${tpl.totalBudget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {tpl.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] bg-cream-dark text-text-muted px-1.5 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Results */}
      {showResults && !loading && (
        <>
          {/* Back to browse */}
          <div className="px-5">
            <button
              type="button"
              onClick={() => resetPlanning()}
              className="text-xs text-primary font-medium"
            >
              ← {t.planning.backToDestinations}
            </button>
          </div>

          {/* Route cards */}
          <div className="px-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-serif">
                {t.planning.topRouteMatches}
              </h2>
              <span className="text-[10px] text-text-muted">
                {t.planning.bestFit}
              </span>
            </div>
            <div className="space-y-4">
              {result.routes.map((route) => {
                const tpl = templates.find((t) => t.id === route.templateId);
                const dests =
                  route.generatedData?.destinations ?? tpl?.destinations;
                return (
                  <Card key={route.id} className="!p-0 overflow-hidden">
                    <div className="relative h-44">
                      <img
                        src={route.image}
                        alt={route.title}
                        className="w-full h-full object-cover"
                      />
                      {route.recommended && (
                        <span className="absolute top-3 left-3 bg-primary text-white text-[9px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full">
                          {t.planning.recommended}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg font-serif">
                        {route.title}
                      </h3>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {route.description}
                      </p>
                      {dests && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {dests.map((d) => (
                            <span
                              key={d.name}
                              className="text-[10px] bg-cream-dark text-text-muted px-2 py-0.5 rounded-full"
                            >
                              {d.name} &middot; {d.days}d
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <span className="text-xs text-text-muted">
                            {route.duration}
                          </span>
                          <span className="text-xs text-text-muted ml-2">
                            {(() => {
                              const dailyBudget = customBudget && !isNaN(parseFloat(customBudget))
                                ? parseFloat(customBudget)
                                : budgetStyle
                                  ? BUDGET_PRESETS.find((p) => p.value === budgetStyle)?.amount ?? null
                                  : null;
                              if (dailyBudget) {
                                const days = parseInt(route.duration) || 7;
                                return `~$${(dailyBudget * days).toLocaleString()} total`;
                              }
                              return route.budget;
                            })()}
                          </span>
                        </div>
                        {createdTrips[route.id] ? (
                          <Button
                            className="!text-xs !px-4 !py-2 !bg-success"
                            onClick={() => navigate("/calendar", { state: { focusDate: tripStartDates[route.id] } })}
                          >
                            📅 {t.planning.goToCalendar}
                          </Button>
                        ) : (
                          <Button
                            className="!text-xs !px-4 !py-2"
                            disabled={addingTrip === route.id}
                            onClick={() => handleAddToTrip(route)}
                          >
                            {addingTrip === route.id
                              ? t.planning.creating
                              : t.planning.addToTrip}
                          </Button>
                        )}
                      </div>
                      {/* Deals panel — shown after trip is added */}
                      {(routeDeals[route.id] || dealsLoading[route.id]) && (
                        <DealsPanel
                          deals={routeDeals[route.id] ?? { flights: [], hotels: [], trains: [], activities: [], dining: [] }}
                          destinationNames={(dests ?? []).map((d) => d.name)}
                          isLive={routeDealsLive[route.id]}
                          loading={dealsLoading[route.id]}
                          tripId={createdTrips[route.id]}
                          userId={user?.id}
                          bookings={bookings}
                          dailyBudget={
                            customBudget && !isNaN(parseFloat(customBudget))
                              ? parseFloat(customBudget)
                              : budgetStyle
                                ? BUDGET_PRESETS.find((p) => p.value === budgetStyle)?.amount ?? null
                                : null
                          }
                          intensity={intensity}
                          wallet={wallet}
                          onBookingConfirmed={refreshBookings}
                        />
                      )}

                      {/* Budget tracker — shows confirmed bookings vs budget */}
                      {createdTrips[route.id] && (
                        <TripBudgetTracker
                          tripId={createdTrips[route.id]}
                          dailyBudget={
                            customBudget && !isNaN(parseFloat(customBudget))
                              ? parseFloat(customBudget)
                              : budgetStyle
                                ? BUDGET_PRESETS.find((p) => p.value === budgetStyle)?.amount ?? null
                                : undefined
                          }
                          tripDays={undefined}
                        />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* OmniTrip Wallet */}
          {user && (
            <WalletCard userId={user.id} />
          )}

          {/* Destination Map */}
          {mapCenter && mapMarkers.length > 0 && (
            <div className="px-5">
              <h2 className="text-lg font-bold font-serif mb-1">
                {t.planning.destinationsOverview}
              </h2>
              {routeBreadcrumb && (
                <p className="text-xs text-text-secondary mb-3 flex items-center gap-1 flex-wrap">
                  {routeBreadcrumb.split(" → ").map((city, i, arr) => (
                    <span key={city} className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold">{i + 1}</span>
                      <span>{city}</span>
                      {i < arr.length - 1 && <span className="text-primary font-bold">→</span>}
                    </span>
                  ))}
                </p>
              )}
              <div className="rounded-xl overflow-hidden">
                <LeafletMap
                  center={mapCenter}
                  zoom={4}
                  markers={mapMarkers}
                  polyline={mapPolyline}
                  fitBounds
                  height="220px"
                />
              </div>
              {gmapsUrl && (
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors"
                >
                  <span>🗺</span> Open route in Google Maps
                </a>
              )}
            </div>
          )}

          {/* OmniBuddy Insights */}
          <div className="px-5 pb-4">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <Buddy state="happy" size="mini" mode="video" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary">
                    {t.planning.omniBuddyInsights}
                  </p>
                  <p className="text-[9px] text-text-muted">
                    {t.planning.aiPowered}
                  </p>
                </div>
              </div>
              <p className="text-xs text-text-secondary italic leading-relaxed mb-3">
                &ldquo;{result.insight.text}&rdquo;
              </p>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                {t.planning.whyThisWorks}
              </p>
              <ul className="space-y-1.5">
                {result.insight.reasons.map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-2 text-xs text-text-secondary"
                  >
                    <span className="text-success mt-0.5">{"\u2713"}</span>
                    {r}
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                className="w-full mt-4 !text-xs"
                onClick={() => setShowAdjustSheet(true)}
              >
                {t.planning.adjustPreferences}
              </Button>
            </Card>
          </div>
        </>
      )}

      {/* Adjust Preferences bottom sheet */}
      {showAdjustSheet && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowAdjustSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl p-5 pb-8 space-y-5 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">
                {t.planning.adjustPreferences}
              </p>
              <button
                type="button"
                onClick={() => setShowAdjustSheet(false)}
                className="text-text-muted text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Budget */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                {t.planning.dailyBudget}
              </p>
              <div className="flex gap-2 flex-wrap">
                {BUDGET_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setBudgetStyle(budgetStyle === p.value ? null : p.value);
                      setCustomBudget("");
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      budgetStyle === p.value
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-surface border-cream-dark text-text-muted"
                    }`}
                  >
                    {t.budget[p.value]}
                    <span className="text-[10px] opacity-70 ml-1">~${p.amount}/day</span>
                  </button>
                ))}
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                  <input
                    type="number"
                    value={customBudget}
                    onChange={(e) => {
                      setCustomBudget(e.target.value);
                      setBudgetStyle(null);
                    }}
                    placeholder={t.planning.custom}
                    className="w-24 pl-6 pr-2 py-1.5 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40"
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                {t.planning.travelDates}
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40"
                />
                <span className="text-text-muted text-xs self-center">{t.planning.to}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40"
                />
              </div>
            </div>

            {/* Intensity */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                {t.planning.activitiesPerDay}
              </p>
              <div className="flex gap-2">
                {INTENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntensity(intensity === opt.value ? null : opt.value)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-center transition-colors ${
                      intensity === opt.value
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-surface border-cream-dark text-text-muted"
                    }`}
                  >
                    <p className="text-xs font-medium">
                      {opt.value === "relaxed" ? t.planning.relaxed : opt.value === "balanced" ? t.planning.balanced : t.planning.packed}
                    </p>
                    <p className="text-[10px] opacity-70">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Flying from */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                Flying from
              </p>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm">✈️</span>
                <input
                  type="text"
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  placeholder={locationPermission === "denied" ? "Enter your city" : "Detecting your location…"}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40"
                />
                {locationPermission !== "denied" && !originCity && (
                  <button
                    type="button"
                    onClick={() => requestLocation().then(() => {
                      const name = useLocationStore.getState().locationName;
                      if (name) setOriginCity(name);
                    })}
                    className="absolute right-2 text-[10px] text-primary font-medium"
                  >
                    Use GPS
                  </button>
                )}
              </div>
            </div>

            {/* Special requests */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">
                Special requests
              </p>
              <textarea
                value={refinements}
                onChange={(e) => setRefinements(e.target.value)}
                placeholder="e.g. avoid tourist traps, focus on local food…"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-cream-dark bg-surface text-xs focus:outline-none focus:border-primary/40 resize-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {REFINEMENT_CHIPS.map((chip) => {
                  const active = refinements.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setRefinements((prev) =>
                          active
                            ? prev.replace(chip, "").replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "").trim()
                            : prev ? `${prev}, ${chip}` : chip
                        )
                      }
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-medium transition-colors ${
                        active
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-surface border-cream-dark text-text-muted"
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regenerate */}
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                setShowAdjustSheet(false);
                handleSubmit();
              }}
            >
              Regenerate Plan
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
