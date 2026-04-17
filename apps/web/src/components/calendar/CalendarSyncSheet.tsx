import { useState, useEffect } from "react";
import { useAuthContext } from "../auth/AuthProvider";
import {
  openAllInGoogle,
  openAllInOutlook,
  downloadICS,
  getOrCreateFeedToken,
  getSubscriptionUrl,
  revokeFeedToken,
} from "../../services/calendarSync";
import type { CalendarEvent } from "../../types";

interface CalendarSyncSheetProps {
  events: CalendarEvent[];
  onClose: () => void;
}

type Tab = "export" | "subscribe";

export function CalendarSyncSheet({ events, onClose }: CalendarSyncSheetProps) {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<Tab>("export");
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "subscribe" && !feedUrl && user) {
      setFeedLoading(true);
      getOrCreateFeedToken(user.id)
        .then((token) => {
          if (token) setFeedUrl(getSubscriptionUrl(token));
        })
        .finally(() => setFeedLoading(false));
    }
  }, [tab, feedUrl, user]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = (provider: "google" | "outlook" | "ics") => {
    if (provider === "google") {
      openAllInGoogle(events);
      setSynced("Google Calendar");
    } else if (provider === "outlook") {
      openAllInOutlook(events);
      setSynced("Outlook");
    } else {
      downloadICS(events);
      setSynced("downloaded");
    }
    setTimeout(() => setSynced(null), 3000);
  };

  const handleRevoke = async () => {
    if (!user) return;
    await revokeFeedToken(user.id);
    setFeedUrl(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className="relative bg-surface rounded-t-3xl w-full max-w-[430px] p-6 space-y-5 animate-slide-up"
      >

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg font-serif">Sync to Calendar</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-text-muted hover:bg-cream-dark transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-cream rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab("export")}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
              tab === "export" ? "bg-surface shadow-sm text-text" : "text-text-muted"
            }`}
          >
            Add to Calendar
          </button>
          <button
            type="button"
            onClick={() => setTab("subscribe")}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
              tab === "subscribe" ? "bg-surface shadow-sm text-text" : "text-text-muted"
            }`}
          >
            Auto-Sync
          </button>
        </div>

        {/* ── ADD TO CALENDAR ── */}
        {tab === "export" && (
          <>
            <p className="text-xs text-text-secondary">
              Add {events.length} event{events.length !== 1 ? "s" : ""} to your calendar with one click.
              {events.length > 10 && " (First 10 will open as tabs; use .ics for all.)"}
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleExport("google")}
                disabled={events.length === 0}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-cream hover:bg-cream-dark transition-colors text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
                    <path d="M5.84 14.09A6.97 6.97 0 0 1 5.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98Z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-[10px] text-text-muted">Opens Google Calendar with events pre-filled</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={() => handleExport("outlook")}
                disabled={events.length === 0}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-cream hover:bg-cream-dark transition-colors text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M24 7.387v10.478c0 .23-.08.424-.238.583a.793.793 0 0 1-.583.238h-9.296V5.314h5.862l4.255 2.073Z" fill="#0364B8"/>
                    <path d="M24 7.387v10.478c0 .23-.08.424-.238.583a.793.793 0 0 1-.583.238h-9.296v-5.314l4.255-2.073L24 7.387Z" fill="#0A2767" opacity=".5"/>
                    <path d="M13.883 13.372 7.2 18.686h6.683V5.314L7.2 5.314l6.683 8.058Z" fill="#28A8EA"/>
                    <path d="M0 4.493v15.014c0 .461.373.834.834.834H13.883V3.66H.834A.834.834 0 0 0 0 4.493Z" fill="#0078D4"/>
                    <ellipse cx="7" cy="12" rx="3.5" ry="4" fill="white"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Outlook / Microsoft 365</p>
                  <p className="text-[10px] text-text-muted">Opens Outlook.com with events pre-filled</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={() => handleExport("ics")}
                disabled={events.length === 0}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-cream hover:bg-cream-dark transition-colors text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-lg">
                  🍎
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Apple Calendar / .ics</p>
                  <p className="text-[10px] text-text-muted">Download file — works with any calendar app</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>

            {synced && (
              <div className="px-4 py-3 rounded-xl bg-success/10 text-success text-xs font-medium text-center">
                {synced === "downloaded"
                  ? "File downloaded — open it to add events to your calendar"
                  : `Events sent to ${synced}! Check your calendar.`}
              </div>
            )}
          </>
        )}

        {/* ── AUTO-SYNC (subscription URL) ── */}
        {tab === "subscribe" && (
          <>
            <p className="text-xs text-text-secondary">
              Add this URL to your calendar app once — your OmniTrip events will stay in sync automatically as you plan new trips.
            </p>

            {feedLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : feedUrl ? (
              <div className="space-y-4">
                {/* Feed URL display */}
                <div className="bg-cream rounded-xl p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Your subscription URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] text-text-secondary bg-surface rounded-lg px-3 py-2 break-all select-all">
                      {feedUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(feedUrl)}
                      className="shrink-0 px-3 py-2 rounded-lg bg-primary text-white text-[11px] font-medium hover:bg-primary-dark transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Instructions per app */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">How to add</p>

                  <details className="group bg-cream rounded-xl">
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                      <span className="text-base">📧</span>
                      <span className="text-xs font-medium flex-1">Google Calendar</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted transition-transform group-open:rotate-180">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </summary>
                    <div className="px-4 pb-3 text-[11px] text-text-secondary space-y-1">
                      <p>1. Open <a href="https://calendar.google.com/calendar/r/settings/addbyurl" target="_blank" rel="noopener" className="text-primary underline">Google Calendar → Add by URL</a></p>
                      <p>2. Paste the URL above</p>
                      <p>3. Click "Add calendar" — done!</p>
                    </div>
                  </details>

                  <details className="group bg-cream rounded-xl">
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                      <span className="text-base">📬</span>
                      <span className="text-xs font-medium flex-1">Outlook / Microsoft 365</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted transition-transform group-open:rotate-180">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </summary>
                    <div className="px-4 pb-3 text-[11px] text-text-secondary space-y-1">
                      <p>1. Open Outlook → Calendar → "Add calendar" → "Subscribe from web"</p>
                      <p>2. Paste the URL above</p>
                      <p>3. Name it "OmniTrip" and save</p>
                    </div>
                  </details>

                  <details className="group bg-cream rounded-xl">
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                      <span className="text-base">🍎</span>
                      <span className="text-xs font-medium flex-1">Apple Calendar (Mac / iPhone)</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted transition-transform group-open:rotate-180">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </summary>
                    <div className="px-4 pb-3 text-[11px] text-text-secondary space-y-1">
                      <p><strong>Mac:</strong> Calendar → File → New Calendar Subscription → paste URL</p>
                      <p><strong>iPhone:</strong> Settings → Calendar → Accounts → Add Subscribed Calendar → paste URL</p>
                    </div>
                  </details>
                </div>

                {/* Revoke */}
                <button
                  type="button"
                  onClick={handleRevoke}
                  className="w-full text-center text-[11px] text-text-muted hover:text-conflict transition-colors py-2"
                >
                  Revoke subscription link
                </button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-text-secondary">Couldn't generate subscription URL.</p>
                <p className="text-[11px] text-text-muted">The calendar_subscriptions table may need to be created in Supabase.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
