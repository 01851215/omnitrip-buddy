import { useState } from "react";
import { Button } from "../ui/Button";

const activityTypes = [
  { value: "food", label: "Food", emoji: "🍜" },
  { value: "experience", label: "Experience", emoji: "✨" },
  { value: "rest", label: "Rest", emoji: "🧘" },
  { value: "transport", label: "Transport", emoji: "🚗" },
];

interface AddActivitySheetProps {
  onSave: (data: {
    title: string;
    type: string;
    startTime: string;
    endTime: string;
    locationName: string;
    estimatedCost?: number;
  }) => void;
  onClose: () => void;
  date: string;
}

export function AddActivitySheet({ onSave, onClose, date }: AddActivitySheetProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("experience");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [location, setLocation] = useState("");
  const [cost, setCost] = useState("");

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      type,
      startTime: `${date}T${startTime}`,
      endTime: `${date}T${endTime}`,
      locationName: location.trim() || "TBD",
      estimatedCost: cost ? parseFloat(cost) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className="relative bg-surface rounded-t-3xl w-full max-w-[430px] p-5 space-y-3 animate-slide-up"
      >
        <h3 className="font-semibold text-lg font-serif">Add Activity</h3>

        <input
          type="text"
          placeholder="Activity name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Activity name"
          className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
          autoFocus
        />

        <div className="flex flex-wrap gap-2">
          {activityTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 ${
                t.value === type ? "bg-primary text-white" : "bg-cream-dark text-text-secondary"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-text-muted uppercase tracking-wider">Start</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-text-muted uppercase tracking-wider">End</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary" />
          </div>
        </div>

        <input
          type="text"
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Location"
          className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
        />

        <input
          type="number"
          placeholder="Estimated cost ($)"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          aria-label="Estimated cost"
          className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-cream text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary"
        />

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSave} className="flex-1">Add</Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
