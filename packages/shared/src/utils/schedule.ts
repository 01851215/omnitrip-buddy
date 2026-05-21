export interface BusyRange { startDate: string; endDate: string; } // ISO yyyy-mm-dd inclusive

export function findFirstFreeWindow(
  busy: BusyRange[],
  days: number,
  startAfter?: string, // ISO; default = today + 7 (one-week buffer)
): { startDate: string; endDate: string } {
  const buffer = 7;
  const today = new Date(); today.setHours(0,0,0,0);
  let cursor = startAfter
    ? new Date(startAfter + "T00:00:00")
    : new Date(today.getTime() + buffer * 86400000);

  const sorted = [...busy]
    .map(b => ({ s: new Date(b.startDate + "T00:00:00"), e: new Date(b.endDate + "T00:00:00") }))
    .filter(b => !isNaN(b.s.getTime()) && !isNaN(b.e.getTime()))
    .sort((a, b) => a.s.getTime() - b.s.getTime());

  for (const b of sorted) {
    const windowEnd = new Date(cursor.getTime() + (days - 1) * 86400000);
    if (windowEnd < b.s) break;             // fits before this busy block
    if (cursor <= b.e) cursor = new Date(b.e.getTime() + 86400000); // jump past it
  }

  const end = new Date(cursor.getTime() + (days - 1) * 86400000);
  return { startDate: toISO(cursor), endDate: toISO(end) };
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
