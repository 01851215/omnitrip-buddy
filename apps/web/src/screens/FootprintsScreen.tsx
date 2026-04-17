import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAllTrips, useActiveTrip, useAllDestinations, useCompletedTrips } from "../hooks/useTrips";
import { useJournalEntries, createJournalEntry } from "../hooks/useFootprints";
import { useUserHistory } from "../hooks/useUserHistory";
import { generateVibeAnalysis } from "../services/travelInsights";
import type { VibeAnalysis } from "../services/travelInsights";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Buddy } from "../components/Buddy";
import { LeafletMap } from "../components/map/LeafletMap";
import { VibeChart } from "../components/insights/VibeChart";
import { CategoryBreakdown } from "../components/insights/CategoryBreakdown";
import { useT } from "../i18n/useT";

export function FootprintsScreen() {
  const navigate = useNavigate();
  const { trip: activeTrip } = useActiveTrip();
  const { trips: allTrips } = useAllTrips();
  const { trips: completedTrips } = useCompletedTrips();
  const { entries: journalEntries, refresh: refreshJournal } = useJournalEntries();
  const { destinations: allDestinations } = useAllDestinations();
  const { history, loading: historyLoading } = useUserHistory();
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [vibeAnalysis, setVibeAnalysis] = useState<VibeAnalysis | null>(null);
  const [vibeLoading, setVibeLoading] = useState(false);
  const t = useT();

  // Generate vibe analysis when history is available
  useEffect(() => {
    if (!history || historyLoading || vibeAnalysis) return;
    setVibeLoading(true);
    generateVibeAnalysis(history)
      .then((result) => setVibeAnalysis(result))
      .catch(() => {})
      .finally(() => setVibeLoading(false));
  }, [history, historyLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const uniqueCountries = new Set(allDestinations.map((d) => d.country).filter(Boolean));
  const yearsActive = allTrips.length > 0
    ? Math.max(1, Math.ceil((Date.now() - Math.min(...allTrips.map((t) => t.createdAt))) / (365 * 86400000)))
    : 0;

  // Build polyline from destination coordinates in chronological order
  const polylineCoords: [number, number][] = allDestinations
    .filter((d) => d.lat != null && d.lng != null)
    .map((d) => [d.lat, d.lng]);
  const mapCenter: [number, number] = polylineCoords.length > 0
    ? polylineCoords[Math.floor(polylineCoords.length / 2)]
    : [0, 20];

  const mapMarkers = allDestinations
    .filter((d) => d.lat != null && d.lng != null)
    .map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, name: d.name, category: d.country }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative px-5 pt-6 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold font-serif">{t.footprints.title}</h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed max-w-[300px]">
            {t.footprints.subtitle}
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-5 flex gap-6">
        <div>
          <p className="text-2xl font-bold">{allTrips.length}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">{t.footprints.trips}</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{allDestinations.length}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">{t.footprints.places}</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{uniqueCountries.size || yearsActive + "y"}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            {uniqueCountries.size > 0 ? t.footprints.countries : t.footprints.exploring}
          </p>
        </div>
      </div>

      {/* Completed Journeys */}
      {completedTrips.length > 0 && (
        <div className="px-5">
          <h2 className="text-xl font-bold font-serif mb-3">{t.footprints.completedJourneys}</h2>
          <div className="space-y-3">
            {completedTrips.map((trip) => (
              <Card key={trip.id} className="!p-0 overflow-hidden">
                {trip.coverImage && (
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-28 object-cover" />
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm">{trip.title}</h3>
                  {trip.description && (
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{trip.description}</p>
                  )}
                  <p className="text-[10px] text-text-muted mt-1">
                    {trip.startDate} — {trip.endDate}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Connected Path — Journey Map */}
      <div className="px-5">
        <Card className="!p-0 overflow-hidden">
          {polylineCoords.length >= 2 ? (
            <>
              <LeafletMap
                center={mapCenter}
                zoom={3}
                markers={mapMarkers}
                polyline={polylineCoords}
                fitBounds
                height="200px"
              />
              <div className="px-4 py-2.5">
                <p className="text-sm font-medium">{t.footprints.connectedPath}</p>
                <p className="text-[10px] text-text-muted">
                  {t.footprints.connectedPathDesc(allDestinations.length, uniqueCountries.size, uniqueCountries.size === 1 ? t.footprints.country : t.footprints.countriesPlural)}
                </p>
              </div>
            </>
          ) : (
            <div className="h-48 bg-gradient-to-br from-primary/10 via-cream to-accent/10 flex items-center justify-center">
              <div className="text-center px-6">
                <p className="text-sm font-medium text-text-secondary">{t.footprints.connectedPath}</p>
                <p className="text-xs text-text-muted mt-1">{t.footprints.mapPlaceholder}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Travel Vibe Analysis */}
      {vibeAnalysis && (
        <div className="px-5 space-y-4">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-primary font-medium mb-1">{t.footprints.travelVibe}</p>
            <h2 className="text-2xl font-bold font-serif">{vibeAnalysis.vibeLabel}</h2>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed max-w-[320px] mx-auto italic">
              {vibeAnalysis.vibeDescription}
            </p>
          </div>

          {/* Spider Chart */}
          <Card>
            <h3 className="text-sm font-semibold mb-3 text-center">{t.footprints.travellerProfile}</h3>
            <VibeChart traits={vibeAnalysis.traits} />
          </Card>

          {/* Activity Breakdown */}
          <Card>
            <h3 className="text-sm font-semibold mb-3">{t.footprints.whatYouLove}</h3>
            <CategoryBreakdown categories={vibeAnalysis.topCategories} />
          </Card>

          {/* Evolution Narrative */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">{t.footprints.evolutionInYou}</p>
            <p className="text-sm text-text-secondary leading-relaxed">
              {vibeAnalysis.evolutionNarrative}
            </p>
          </div>
        </div>
      )}

      {vibeLoading && (
        <div className="px-5 text-center py-6">
          <div className="w-8 h-8 rounded-full overflow-hidden mx-auto mb-2">
            <Buddy state="thinking" size="mini" mode="video" />
          </div>
          <p className="text-xs text-text-muted">{t.footprints.analyzingPersonality}</p>
        </div>
      )}

      {/* Timeline of Being */}
      <div className="px-5">
        <h2 className="text-xl font-bold font-serif mb-4">{t.footprints.timelineOfBeing}</h2>
        {journalEntries.length === 0 ? (
          <EmptyState
            icon="📝"
            title={t.footprints.noJournalYet}
            description={t.footprints.noJournalYetDesc}
          />
        ) : (
          <div className="space-y-4">
            {journalEntries.map((entry) => (
              <Card key={entry.id} className="!p-0 overflow-hidden">
                {entry.photoUrl && (
                  <img src={entry.photoUrl} alt={entry.locationName} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-sm">{entry.locationName}</h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed italic">
                    {entry.text}
                  </p>
                  {entry.buddyBadge && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-4 h-4 rounded-full overflow-hidden">
                        <Buddy state="happy" size="mini" mode="video" />
                      </div>
                      <span className="text-[10px] text-primary font-medium">{entry.buddyBadge}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Next Chapter CTA */}
      <div className="px-5 pb-6">
        <Card className="text-center !py-8">
          <h3 className="text-lg font-bold font-serif">{t.footprints.nextChapter}</h3>
          <Button onClick={() => navigate("/plan")} className="mt-4">
            {t.footprints.planNewJourney}
          </Button>
        </Card>
      </div>

      {/* New Journal Entry FAB */}
      {activeTrip && (
        <button
          type="button"
          onClick={() => setShowNewEntry(true)}
          className="fixed bottom-28 right-20 z-30 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-2xl"
          aria-label="New journal entry"
        >
          +
        </button>
      )}

      {showNewEntry && activeTrip && (
        <NewJournalEntry
          tripId={activeTrip.id}
          onClose={() => setShowNewEntry(false)}
          onSaved={refreshJournal}
        />
      )}
    </div>
  );
}

function NewJournalEntry({
  tripId,
  onClose,
  onSaved,
}: {
  tripId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const t = useT();

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const ok = await createJournalEntry({
      tripId,
      text: text.trim(),
      locationName: location.trim() || "Unknown location",
    });
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className="relative bg-surface rounded-t-3xl w-full max-w-[430px] p-6 space-y-4"
      >
        <h3 className="font-semibold text-lg font-serif">{t.footprints.newJournalEntry}</h3>
        <input
          type="text"
          placeholder={t.footprints.location}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Location"
          className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
          autoFocus
        />
        <textarea
          placeholder={t.footprints.whatsOnYourMind}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Journal entry"
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary resize-none"
        />
        <div className="flex gap-3">
          <Button onClick={handleSave} className="flex-1" disabled={saving || !text.trim()}>
            {saving ? t.footprints.saving : t.footprints.save}
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {t.footprints.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
