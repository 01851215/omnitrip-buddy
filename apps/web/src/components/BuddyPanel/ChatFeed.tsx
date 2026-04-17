import { useState } from "react";
import type { ChatMessage } from "../../stores/buddyPanelStore";
import { LeafletMap } from "../map/LeafletMap";
import type { MapMarker } from "../map/LeafletMap";

type Mode = "foot" | "bike" | "car";
const modeEmoji: Record<Mode, string> = { foot: "\ud83d\udeb6", bike: "\ud83d\udeb2", car: "\ud83d\ude97" };

function RouteMap({ route }: { route: NonNullable<ChatMessage["route"]> }) {
  const { waypoints, geometry, summary, mode, allSummaries, recommendedMode } = route;
  const [activeMode, setActiveMode] = useState<Mode>(mode ?? recommendedMode ?? "foot");

  const activeSummary = allSummaries?.[activeMode] ?? summary;

  const markers: MapMarker[] = [
    { id: "start", lat: waypoints[0].lat, lng: waypoints[0].lng, name: waypoints[0].label, label: "A" },
    {
      id: "end",
      lat: waypoints[waypoints.length - 1].lat,
      lng: waypoints[waypoints.length - 1].lng,
      name: waypoints[waypoints.length - 1].label,
      label: "B",
    },
  ];

  const polyline: [number, number][] = geometry ?? waypoints.map((wp) => [wp.lat, wp.lng]);
  const center: [number, number] = [waypoints[0].lat, waypoints[0].lng];
  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-cream-dark">
      <LeafletMap
        center={center}
        markers={markers}
        polyline={polyline}
        fitBounds
        zoomControl
        height="200px"
        className="rounded-xl"
      />
      <div className="flex flex-col gap-1.5 px-3 py-2 bg-cream-dark/50">
        {/* Transport mode tabs */}
        {allSummaries && (
          <div className="flex gap-1">
            {(["foot", "bike", "car"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMode(m)}
                className={`flex-1 text-[10px] py-1 rounded-lg font-medium transition-colors ${
                  activeMode === m
                    ? "bg-primary text-white"
                    : "bg-cream text-text-secondary hover:bg-cream-dark"
                }${m === recommendedMode ? "" : ""}`}
              >
                {modeEmoji[m]} {allSummaries[m].split("\u00b7")[1]?.trim() ?? m}
              </button>
            ))}
          </div>
        )}
        {/* Route info */}
        <div className="flex items-center justify-between">
          {activeSummary ? (
            <span className="text-[11px] font-semibold text-primary">{activeSummary}</span>
          ) : (
            <span className="text-[10px] text-text-muted italic">Loading route\u2026</span>
          )}
          <a
            href={`https://www.google.com/maps/dir/${start.lat},${start.lng}/${end.lat},${end.lng}/@${start.lat},${start.lng},14z/data=!3m1!4b1!4m2!4m1!3e${activeMode === "car" ? "0" : activeMode === "bike" ? "1" : "2"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary font-medium hover:underline flex-shrink-0"
          >
            Open in Maps \u2197
          </a>
        </div>
        {/* Recommended badge */}
        {recommendedMode && activeMode !== recommendedMode && allSummaries && (
          <p className="text-[9px] text-text-muted">
            \u2728 {modeEmoji[recommendedMode]} Recommended: {allSummaries[recommendedMode]}
          </p>
        )}
      </div>
    </div>
  );
}

export function ChatFeed({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-sm text-text-muted text-center">
          Ask me anything about your trip, nearby spots, or budget!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" role="log" aria-live="polite">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-white rounded-br-md"
                : "bg-cream-dark text-text rounded-bl-md"
            }`}
          >
            {msg.text}
            {msg.route && <RouteMap route={msg.route} />}
          </div>
        </div>
      ))}
    </div>
  );
}
