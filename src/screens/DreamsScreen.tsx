import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDreamTrips } from "../hooks/useTrips";
import { usePlanningStore } from "../stores/planningStore";
import { EmptyState } from "../components/ui/EmptyState";
import { useT } from "../i18n/useT";

export function DreamsScreen() {
  const t = useT();
  const navigate = useNavigate();
  const { trips, loading, createDreamTrip, deleteDreamTrip } = useDreamTrips();
  const { setQuery: setPlanningQuery } = usePlanningStore();

  const [activeView, setActiveView] = useState<"bucket" | "list">("bucket");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add sheet state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const handlePlan = (dreamTitle: string) => {
    setPlanningQuery(dreamTitle);
    navigate("/plan");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteDreamTrip(id);
    setDeletingId(null);
  };

  const handleTitleBlur = () => {
    if (title.trim()) {
      const query = encodeURIComponent(`${title.trim()} travel landscape`);
      setCoverImageUrl(`https://source.unsplash.com/featured/800x400/?${query}`);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    await createDreamTrip(title.trim(), description.trim(), coverImageUrl);
    setSaving(false);
    setShowAddSheet(false);
    setTitle("");
    setDescription("");
    setCoverImageUrl(undefined);
  };

  const closeSheet = () => {
    setShowAddSheet(false);
    setTitle("");
    setDescription("");
    setCoverImageUrl(undefined);
  };

  return (
    <div className="space-y-5 pb-32">
      {/* Header */}
      <div className="px-5 pt-6">
        <h1 className="text-3xl font-bold font-serif">{t.dreams.title}</h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {t.dreams.subtitle}
        </p>
      </div>

      {/* Tab toggle */}
      <div className="px-5">
        <div className="flex gap-1 bg-cream-dark rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveView("bucket")}
            className={`text-xs font-medium px-4 py-1.5 rounded-lg transition-colors ${
              activeView === "bucket"
                ? "bg-surface text-primary shadow-sm"
                : "text-text-muted"
            }`}
          >
            {t.home.bucket}
          </button>
          <button
            type="button"
            onClick={() => setActiveView("list")}
            className={`text-xs font-medium px-4 py-1.5 rounded-lg transition-colors ${
              activeView === "list"
                ? "bg-surface text-primary shadow-sm"
                : "text-text-muted"
            }`}
          >
            {t.home.list}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-3 px-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-cream-dark animate-pulse h-52" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && trips.length === 0 && (
        <div className="px-5">
          <EmptyState
            icon="✈️"
            title={t.dreams.emptyTitle}
            description={t.dreams.emptyDesc}
            action={{ label: t.dreams.addDream, onClick: () => setShowAddSheet(true) }}
          />
        </div>
      )}

      {/* Bucket view — 2-col grid */}
      {!loading && trips.length > 0 && activeView === "bucket" && (
        <div className="grid grid-cols-2 gap-3 px-5">
          {trips.map((dream) => (
            <div
              key={dream.id}
              className="rounded-2xl overflow-hidden bg-surface shadow-sm border border-cream-dark"
            >
              {dream.coverImage ? (
                <img
                  src={dream.coverImage}
                  alt={dream.title}
                  className="w-full h-36 object-cover"
                />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-4xl">
                  🌍
                </div>
              )}
              <div className="p-3">
                <h3 className="font-semibold text-sm leading-tight">{dream.title}</h3>
                {dream.description && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                    {dream.description}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => handlePlan(dream.title)}
                  className="mt-2 text-[11px] font-semibold text-primary"
                >
                  {t.dreams.planThis}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && trips.length > 0 && activeView === "list" && (
        <div className="px-5 space-y-2">
          {trips.map((dream) => (
            <div
              key={dream.id}
              className="flex items-center gap-3 bg-surface rounded-xl border border-cream-dark p-3"
            >
              {dream.coverImage ? (
                <img
                  src={dream.coverImage}
                  alt={dream.title}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xl flex-shrink-0">
                  🌍
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{dream.title}</p>
                {dream.description && (
                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mt-0.5">
                    {dream.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handlePlan(dream.title)}
                  className="text-xs font-semibold text-primary"
                >
                  {t.dreams.plan}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(dream.id)}
                  disabled={deletingId === dream.id}
                  className="text-text-muted disabled:opacity-40 hover:text-red-400 transition-colors"
                  aria-label={t.dreams.delete}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setShowAddSheet(true)}
        className="fixed bottom-28 right-5 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-2xl z-40 active:scale-95 transition-transform"
        aria-label={t.dreams.addDream}
      >
        +
      </button>

      {/* Add Dream bottom sheet */}
      {showAddSheet && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeSheet}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-cream-dark rounded-full mx-auto" />

            <h2 className="text-lg font-bold font-serif">{t.dreams.addTitle}</h2>

            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder={t.dreams.titlePlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-background text-sm focus:outline-none focus:border-primary/40 placeholder:text-text-muted"
              />
            </div>

            {/* Description */}
            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.dreams.descriptionPlaceholder}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-background text-sm focus:outline-none focus:border-primary/40 placeholder:text-text-muted resize-none"
              />
            </div>

            {/* Cover image preview */}
            {coverImageUrl && (
              <div>
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="w-full h-40 object-cover rounded-xl"
                  onError={() => setCoverImageUrl(undefined)}
                />
              </div>
            )}

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {saving ? "..." : t.dreams.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
