import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { mapDestination } from "../utils/mapRow";
import { useTripDays, useActivities } from "../hooks/useItinerary";
import { DaySection } from "../components/itinerary/DaySection";
import { AddActivitySheet } from "../components/itinerary/AddActivitySheet";
import { LeafletMap, type MapMarker } from "../components/map/LeafletMap";

export function DestinationDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [destination, setDestination] = useState<any>(null);
  const [addSheet, setAddSheet] = useState<{ dayId: string; date: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("destinations").select("*").eq("id", id).single()
      .then(({ data }) => setDestination(data ? mapDestination(data) : null));
  }, [id]);

  const tripId = destination?.tripId;
  const days = useTripDays(tripId);
  const { activities, toggleStatus, addActivity } = useActivities(tripId, id);

  // Filter days that fall within this destination's date range
  const destDays = days.filter((d) => {
    if (!destination) return false;
    return d.date >= destination.arrivalDate && d.date <= destination.departureDate;
  });

  const today = new Date().toISOString().split("T")[0];

  if (!destination) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    );
  }

  const dateRange = `${fmt(destination.arrivalDate)} — ${fmt(destination.departureDate)}`;
  const totalPlanned = activities.filter((a) => a.status === "planned").length;
  const totalCompleted = activities.filter((a) => a.status === "completed").length;

  return (
    <div>
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        {destination.coverImage ? (
          <img
            src={destination.coverImage}
            alt={destination.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-cream-dark" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="text-2xl font-bold font-serif text-white">{destination.name}</h1>
          <p className="text-xs text-white/80 mt-0.5">{destination.country} · {dateRange}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 flex gap-6">
        <Stat label="Activities" value={String(activities.length)} />
        <Stat label="Completed" value={String(totalCompleted)} />
        <Stat label="Planned" value={String(totalPlanned)} />
        <Stat label="Days" value={String(destDays.length)} />
      </div>

      {/* Map */}
      {destination.coordinates && (
        <div className="px-5 pb-4">
          <LeafletMap
            center={[destination.coordinates.lat, destination.coordinates.lng]}
            zoom={13}
            markers={activities
              .filter((a: any) => a.locationCoords)
              .map((a: any): MapMarker => ({
                id: a.id,
                lat: a.locationCoords.lat,
                lng: a.locationCoords.lng,
                name: a.title,
                category: a.type,
              }))}
            height="200px"
          />
        </div>
      )}

      {/* Itinerary */}
      <div className="px-5 pb-6">
        <h2 className="text-sm font-semibold mb-3">Day-by-Day Itinerary</h2>

        {destDays.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No days found for this destination.</p>
        ) : (
          destDays.map((day) => (
            <DaySection
              key={day.id}
              day={day}
              activities={activities.filter((a) => a.tripDayId === day.id)}
              onToggle={toggleStatus}
              onAddClick={(dayId, date) => setAddSheet({ dayId, date })}
              isToday={day.date === today}
            />
          ))
        )}
      </div>

      {/* Add Activity Sheet */}
      {addSheet && (
        <AddActivitySheet
          date={addSheet.date}
          onSave={(data) => {
            addActivity({
              tripDayId: addSheet.dayId,
              tripId: tripId!,
              destinationId: id!,
              ...data,
            });
          }}
          onClose={() => setAddSheet(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
    </div>
  );
}

function fmt(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });
}
