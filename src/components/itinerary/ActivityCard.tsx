import type { Activity } from "../../hooks/useItinerary";

const typeEmoji: Record<string, string> = {
  transport: "🚗",
  accommodation: "🏠",
  food: "🍜",
  experience: "✨",
  rest: "🧘",
};

const statusStyle: Record<string, string> = {
  completed: "bg-success/10 border-success/30",
  skipped: "bg-cream-dark/50 border-cream-dark opacity-60",
  planned: "bg-surface border-cream-dark",
};

interface ActivityCardProps {
  activity: Activity;
  onToggle: (id: string, status: "completed" | "skipped" | "planned") => void;
}

export function ActivityCard({ activity, onToggle }: ActivityCardProps) {
  const time = new Date(activity.startTime).toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const nextStatus = activity.status === "planned" ? "completed" : activity.status === "completed" ? "skipped" : "planned";

  return (
    <button
      type="button"
      onClick={() => onToggle(activity.id, nextStatus)}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-2xl border transition-all ${statusStyle[activity.status]}`}
    >
      {/* Status indicator */}
      <div className="mt-0.5 flex-shrink-0">
        {activity.status === "completed" ? (
          <span className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center text-xs">✓</span>
        ) : activity.status === "skipped" ? (
          <span className="w-5 h-5 rounded-full bg-cream-dark text-text-muted flex items-center justify-center text-xs">✕</span>
        ) : (
          <span className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs">{typeEmoji[activity.type] ?? "📍"}</span>
          <p className={`text-sm font-medium truncate ${activity.status === "skipped" ? "line-through" : ""}`}>
            {activity.title}
          </p>
          {activity.buddySuggested && (
            <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-medium">Buddy</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-text-muted">{time}</span>
          <span className="text-[10px] text-text-muted">·</span>
          <span className="text-[10px] text-text-muted truncate">{activity.locationName}</span>
        </div>
        {activity.estimatedCost != null && activity.estimatedCost > 0 && (
          <span className="text-[10px] text-primary font-medium mt-0.5 inline-block">
            ~${activity.estimatedCost}
          </span>
        )}
      </div>
    </button>
  );
}
