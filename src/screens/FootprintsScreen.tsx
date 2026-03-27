import { useNavigate } from "react-router-dom";
import { useCompletedTrips, useAllTrips } from "../hooks/useTrips";
import { useJournalEntries, useTripReflection } from "../hooks/useFootprints";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Buddy } from "../components/Buddy";

export function FootprintsScreen() {
  const navigate = useNavigate();
  const allTrips = useAllTrips();
  const completedTrips = useCompletedTrips();
  const journalEntries = useJournalEntries();
  const firstCompleted = completedTrips[0];
  const reflection = useTripReflection(firstCompleted?.id);

  const totalDestinations = allTrips.length * 4; // approximate
  const yearsActive = allTrips.length > 0
    ? Math.max(1, Math.ceil((Date.now() - Math.min(...allTrips.map((t) => t.createdAt))) / (365 * 86400000)))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with background */}
      <div className="relative px-5 pt-6 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold font-serif">Your Footprints</h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed max-w-[300px]">
            A collection of every path you've walked, the stories you've lived, and the ways the world is changing you.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-5 flex gap-6">
        <div>
          <p className="text-2xl font-bold">{allTrips.length}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Trips</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{totalDestinations.toLocaleString()}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Places</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{yearsActive}y</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Exploring</p>
        </div>
      </div>

      {/* Connected Path (placeholder map) */}
      <div className="px-5">
        <Card className="!p-0 overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-primary/10 via-cream to-accent/10 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-text-secondary">The Connected Path</p>
              <p className="text-xs text-text-muted mt-1">Eurasian Traverse</p>
              <p className="text-[10px] text-text-muted mt-2">Interactive map coming in Mapbox integration</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline of Being */}
      <div className="px-5">
        <h2 className="text-xl font-bold font-serif mb-4">Timeline of Being</h2>
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
      </div>

      {/* Behavioural Insights */}
      {reflection && (
        <div className="px-5 space-y-3">
          <Card>
            <h3 className="font-semibold text-sm mb-1">Slower Pace Preference</h3>
            <p className="text-xs text-text-secondary italic leading-relaxed">
              {reflection.buddyInsights[0]}
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-sm mb-1">Cultural Depth</h3>
            <p className="text-xs text-text-secondary italic leading-relaxed">
              {reflection.buddyInsights[1] ?? "You consistently gravitate toward authentic local experiences over tourist attractions."}
            </p>
          </Card>
        </div>
      )}

      {/* Evolution Narrative */}
      <div className="px-5">
        <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">The Evolution in You</p>
        <h2 className="text-2xl font-bold font-serif leading-tight">
          From fast-paced exploration to nature-led stillness.
        </h2>
        <p className="text-sm text-text-secondary mt-3 leading-relaxed">
          In 2023, you were hunting for landmarks. In 2024, you sat in one spot, watched the light shift on a river, and called it the best day of the trip. That's not slowing down — that's waking up.
        </p>
      </div>

      {/* Next Chapter CTA */}
      <div className="px-5 pb-6">
        <Card className="text-center !py-8">
          <h3 className="text-lg font-bold font-serif">Ready for the next chapter?</h3>
          <Button onClick={() => navigate("/plan")} className="mt-4">
            Plan a New Journey
          </Button>
        </Card>
      </div>
    </div>
  );
}
