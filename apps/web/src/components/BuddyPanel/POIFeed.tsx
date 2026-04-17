import type { POI } from "../../stores/locationStore";

const categoryIcon: Record<string, string> = {
  Restaurant: "🍜",
  "Cultural Site": "🛕",
  Café: "☕",
  Nature: "🌿",
  Place: "📍",
};

export function POIFeed({ pois }: { pois: POI[] }) {
  if (pois.length === 0) return null;

  return (
    <div className="px-4">
      <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">Nearby</p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {pois.map((poi) => (
          <div
            key={poi.id}
            className="flex-shrink-0 w-52 bg-cream rounded-2xl p-3 border border-cream-dark"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{categoryIcon[poi.category] ?? "📍"}</span>
              <span className="text-xs font-semibold truncate">{poi.name}</span>
            </div>
            <p className="text-[10px] text-text-muted mb-1.5">{poi.distance}m away</p>
            <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
              {poi.buddyMessage}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
