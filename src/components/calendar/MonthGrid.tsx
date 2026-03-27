import type { CalendarEvent } from "../../types";

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  events: CalendarEvent[];
  selectedDate: string; // ISO date string
  onSelectDate: (dateStr: string) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get Monday-based day of week (0=Mon, 6=Sun)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: Array<{ date: Date; inMonth: boolean }> = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, inMonth: false });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), inMonth: true });
  }

  // Next month padding (fill to complete the last row)
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - lastDay.getDate() - startDow + 1);
    days.push({ date: d, inMonth: false });
  }

  return days;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function MonthGrid({ year, month, events, selectedDate, onSelectDate }: MonthGridProps) {
  const days = getMonthDays(year, month);
  const todayStr = toISODate(new Date());

  // Build event map: dateStr → { travel: boolean, personal: boolean }
  const eventMap = new Map<string, { travel: boolean; personal: boolean; count: number }>();
  events.forEach((e) => {
    const dateStr = e.startTime.split("T")[0];
    const existing = eventMap.get(dateStr) || { travel: false, personal: false, count: 0 };
    if (e.type === "travel") existing.travel = true;
    else existing.personal = true;
    existing.count++;
    eventMap.set(dateStr, existing);
  });

  return (
    <div className="select-none">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-text-muted uppercase tracking-wider py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map(({ date, inMonth }, i) => {
          const dateStr = toISODate(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const info = eventMap.get(dateStr);

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`
                relative flex flex-col items-center justify-center py-2 rounded-xl transition-all
                ${!inMonth ? "opacity-30" : ""}
                ${isSelected ? "bg-primary text-white" : ""}
                ${isToday && !isSelected ? "bg-primary/10" : ""}
                ${!isSelected && inMonth ? "hover:bg-cream-dark" : ""}
              `}
            >
              <span
                className={`text-sm font-medium ${
                  isSelected ? "text-white" : isToday ? "text-primary font-bold" : ""
                }`}
              >
                {date.getDate()}
              </span>

              {/* Event dots */}
              {info && (
                <div className="flex gap-0.5 mt-0.5">
                  {info.travel && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white/80" : "bg-primary"
                      }`}
                    />
                  )}
                  {info.personal && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white/60" : "bg-success"
                      }`}
                    />
                  )}
                </div>
              )}

              {/* Event count badge */}
              {info && info.count > 1 && (
                <span
                  className={`absolute top-0.5 right-1 text-[8px] font-bold ${
                    isSelected ? "text-white/70" : "text-text-muted"
                  }`}
                >
                  {info.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-cream-dark/50">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[10px] text-text-muted">Travel</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-[10px] text-text-muted">Personal</span>
        </div>
      </div>
    </div>
  );
}
