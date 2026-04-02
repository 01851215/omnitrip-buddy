import { useState, useRef, useEffect, useCallback, type ChangeEvent } from "react";
import { Buddy } from "../components/Buddy";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ScreenLoader } from "../components/ui/Spinner";
import { useLocationStore } from "../stores/locationStore";
import { requestLocation, stopPolling } from "../services/location";
import { useAuthContext } from "../components/auth/AuthProvider";
import { useProfileStore } from "../stores/profileStore";
import type { Profile, TravelProfile } from "../stores/profileStore";
import { useProfile } from "../hooks/useProfile";
import { TagInput } from "../components/profile/TagInput";
import { SliderField } from "../components/profile/SliderField";
import { supabase } from "../services/supabase";
import { useSettingsStore, LANGUAGE_LABELS } from "../stores/settingsStore";
import type { Theme, Language } from "../stores/settingsStore";
import { useT } from "../i18n/useT";
import { translations } from "../i18n/translations";

const BUDGET_OPTIONS = ["budget", "moderate", "luxury"] as const;
const TONE_OPTIONS = ["warm", "energetic", "calm"] as const;

type SaveStatus = "idle" | "saving" | "saved" | "error";

function readProfile() { return useProfileStore.getState().profile; }
function readTravel() { return useProfileStore.getState().travelProfile; }

export function ProfileScreen() {
  const { permission, lat, lng, quietMode, toggleQuietMode, setAlertFrequency } = useLocationStore();
  const { user, signOut } = useAuthContext();
  const { loading } = useProfile();
  const profile = useProfileStore((s) => s.profile);
  const travelProfile = useProfileStore((s) => s.travelProfile);

  const t = useT();
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state initialized from the Zustand store snapshot at mount time.
  // When the user navigates away and back, the store already has data,
  // so useState initializers pick up the saved values immediately.
  const [localName, setLocalName] = useState(() => readProfile()?.displayName ?? "");
  const [localAge, setLocalAge] = useState(() => { const a = readProfile()?.age; return a != null ? String(a) : ""; });
  const [localBio, setLocalBio] = useState(() => readProfile()?.bio ?? "");

  const [localPace, setLocalPace] = useState(() => readTravel()?.pacePreference ?? 3);
  const [localBudget, setLocalBudget] = useState(() => readTravel()?.budgetStyle ?? "moderate");
  const [localCuisines, setLocalCuisines] = useState<string[]>(() => readTravel()?.cuisinePreferences ?? []);
  const [localAvoidances, setLocalAvoidances] = useState<string[]>(() => readTravel()?.avoidances ?? []);

  const [localQuietMode, setLocalQuietMode] = useState(() => readTravel()?.notificationSettings?.quietMode === true);
  const [localAlertFrequency, setLocalAlertFrequency] = useState(() => {
    const v = readTravel()?.notificationSettings?.alertFrequency;
    return typeof v === "number" ? v : 3;
  });

  const [localBuddyName, setLocalBuddyName] = useState(() => readProfile()?.buddyName || "OmniBuddy");
  const [localTone, setLocalTone] = useState(() => (readTravel()?.buddySettings?.tone as string) ?? "warm");

  const [basicStatus, setBasicStatus] = useState<SaveStatus>("idle");
  const [travelStatus, setTravelStatus] = useState<SaveStatus>("idle");
  const [notifStatus, setNotifStatus] = useState<SaveStatus>("idle");
  const [buddyStatus, setBuddyStatus] = useState<SaveStatus>("idle");

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Hydrate local state from the store whenever the store data changes.
  // This covers: initial fetch, post-save re-fetch, and remount.
  const prevProfileRef = useRef<Profile | null>(null);
  const prevTravelRef = useRef<TravelProfile | null>(null);

  useEffect(() => {
    if (profile && profile !== prevProfileRef.current) {
      prevProfileRef.current = profile;
      setLocalName(profile.displayName ?? "");
      setLocalAge(profile.age != null ? String(profile.age) : "");
      setLocalBio(profile.bio ?? "");
      setLocalBuddyName(profile.buddyName || "OmniBuddy");
    }
  }, [profile]);

  useEffect(() => {
    if (travelProfile && travelProfile !== prevTravelRef.current) {
      prevTravelRef.current = travelProfile;
      setLocalPace(travelProfile.pacePreference ?? 3);
      setLocalBudget(travelProfile.budgetStyle ?? "moderate");
      setLocalCuisines(travelProfile.cuisinePreferences ?? []);
      setLocalAvoidances(travelProfile.avoidances ?? []);
      setLocalTone((travelProfile.buddySettings?.tone as string) ?? "warm");
      setLocalQuietMode(travelProfile.notificationSettings?.quietMode === true);
      const af = travelProfile.notificationSettings?.alertFrequency;
      setLocalAlertFrequency(typeof af === "number" ? af : 3);
    }
  }, [travelProfile]);

  // ── Save handlers ─────────────────────────────────────
  const flashStatus = (setter: (s: SaveStatus) => void, ok: boolean) => {
    setter(ok ? "saved" : "error");
    setTimeout(() => setter("idle"), 2000);
  };

  const store = useProfileStore;

  const handleSaveBasic = useCallback(async () => {
    if (!user) return;
    setBasicStatus("saving");
    const ok = await store.getState().saveProfile(user.id, {
      displayName: localName,
      age: localAge ? Number(localAge) : null,
      bio: localBio,
    });
    flashStatus(setBasicStatus, ok);
  }, [user, localName, localAge, localBio]);

  const handleSaveTravel = useCallback(async () => {
    if (!user) return;
    setTravelStatus("saving");
    const ok = await store.getState().saveTravelProfile(user.id, {
      pacePreference: localPace,
      budgetStyle: localBudget,
      cuisinePreferences: localCuisines,
      avoidances: localAvoidances,
    });
    flashStatus(setTravelStatus, ok);
  }, [user, localPace, localBudget, localCuisines, localAvoidances]);

  const handleSaveNotif = useCallback(async () => {
    if (!user) return;
    setNotifStatus("saving");
    if (localQuietMode !== quietMode) toggleQuietMode();
    setAlertFrequency(localAlertFrequency);
    const ok = await store.getState().saveTravelProfile(user.id, {
      notificationSettings: {
        ...(travelProfile?.notificationSettings ?? {}),
        quietMode: localQuietMode,
        alertFrequency: localAlertFrequency,
      },
    });
    flashStatus(setNotifStatus, ok);
  }, [user, localQuietMode, localAlertFrequency, quietMode, toggleQuietMode, setAlertFrequency, travelProfile?.notificationSettings]);

  const handleSaveBuddy = useCallback(async () => {
    if (!user) return;
    setBuddyStatus("saving");
    const ok1 = await store.getState().saveProfile(user.id, { buddyName: localBuddyName });
    const ok2 = await store.getState().saveTravelProfile(user.id, {
      buddySettings: { ...(travelProfile?.buddySettings ?? {}), tone: localTone },
    });
    flashStatus(setBuddyStatus, ok1 && ok2);
  }, [user, localBuddyName, localTone, travelProfile?.buddySettings]);

  // ── Location ──────────────────────────────────────────
  const handleRequestLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    const result = await requestLocation();
    setLocationLoading(false);

    if (!result) {
      const perm = useLocationStore.getState().permission;
      if (perm === "denied") {
        setLocationError("Permission denied. Please enable location in your browser settings, then reload the page.");
      } else {
        setLocationError("Could not get your location. Make sure location services are enabled on your device and try again.");
      }
    }
  }, []);

  const handleToggleLocation = useCallback(async () => {
    if (permission === "granted") {
      stopPolling();
      useLocationStore.getState().setPermission("prompt");
      useLocationStore.getState().clearPosition();
    } else {
      setLocationLoading(true);
      setLocationError(null);
      const result = await requestLocation();
      setLocationLoading(false);
      if (!result) {
        setLocationError("Could not get your location. Make sure location services are enabled on your device and try again.");
      }
    }
  }, [permission]);

  // ── Avatar ────────────────────────────────────────────
  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      await store.getState().saveProfile(user.id, { avatarUrl: publicUrl });
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    store.getState().clear();
    await signOut();
    window.location.href = "/";
  };

  if (loading && !profile) {
    return <ScreenLoader message="Loading profile..." />;
  }

  return (
    <div className="space-y-5 pb-28">
      {/* Language change confirmation dialog */}
      {pendingLanguage && (
        <LanguageConfirmDialog
          currentLang={useSettingsStore.getState().language}
          newLang={pendingLanguage}
          onConfirm={() => {
            useSettingsStore.getState().setLanguage(pendingLanguage);
            setPendingLanguage(null);
          }}
          onCancel={() => setPendingLanguage(null)}
        />
      )}

      {/* Header with avatar */}
      <div className="px-5 pt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleAvatarPick}
          className="relative w-16 h-16 rounded-full overflow-hidden bg-cream-dark shrink-0 group"
          disabled={uploadingAvatar}
        >
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Buddy state="happy" size="mini" mode="video" />
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <CameraIcon />
          </div>
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-serif">
            {profile?.displayName || user?.user_metadata?.display_name || t.common.yourTraveller}
          </h1>
          <p className="text-sm text-text-secondary">{user?.email ?? ""}</p>
        </div>
      </div>

      {/* ── Basic Info ── */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">{t.profile.basicInfo}</h3>
          <div className="space-y-3">
            <Field label={t.profile.displayName}>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder={t.profile.displayName}
                className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label={t.profile.age}>
              <input
                type="number"
                value={localAge}
                onChange={(e) => setLocalAge(e.target.value)}
                placeholder={t.profile.age}
                className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label={t.profile.bio}>
              <textarea
                value={localBio}
                onChange={(e) => setLocalBio(e.target.value)}
                placeholder={t.profile.bio}
                rows={2}
                className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </Field>
          </div>
          <SaveButton status={basicStatus} onClick={handleSaveBasic} t={t} />
        </Card>
      </div>

      {/* ── Travel Preferences ── */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">{t.profile.travelPreferences}</h3>
          <div className="space-y-4">
            <SliderField
              label={t.profile.pace}
              value={localPace}
              min={1}
              max={5}
              labels={t.pace as unknown as string[]}
              onChange={setLocalPace}
            />
            <Field label={t.profile.budgetStyle}>
              <div className="flex gap-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setLocalBudget(opt)}
                    className={`flex-1 text-xs py-1.5 rounded-full font-medium transition-colors ${
                      localBudget === opt ? "bg-primary text-white" : "bg-cream-dark text-text-secondary"
                    }`}
                  >
                    {t.budget[opt]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t.profile.cuisinePreferences}>
              <TagInput tags={localCuisines} onChange={setLocalCuisines} placeholder="e.g. Japanese, Thai..." />
            </Field>
            <Field label={t.profile.avoidances}>
              <TagInput tags={localAvoidances} onChange={setLocalAvoidances} placeholder="e.g. Tourist traps, chains..." />
            </Field>
          </div>
          <SaveButton status={travelStatus} onClick={handleSaveTravel} t={t} />
        </Card>
      </div>

      {/* ── Notification Settings ── */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">{t.profile.notificationSettings}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t.profile.quietMode}</p>
                <p className="text-[10px] text-text-muted">{t.profile.quietModeDesc}</p>
              </div>
              <ToggleSwitch checked={localQuietMode} onToggle={() => setLocalQuietMode((v) => !v)} />
            </div>
            <SliderField
              label={t.profile.alertFrequency}
              value={localAlertFrequency}
              min={1}
              max={5}
              labels={t.alerts as unknown as string[]}
              onChange={setLocalAlertFrequency}
            />
          </div>
          <SaveButton status={notifStatus} onClick={handleSaveNotif} t={t} />
        </Card>
      </div>

      {/* ── Buddy Settings ── */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">{t.profile.buddySettings}</h3>
          <div className="space-y-3">
            <Field label={t.profile.buddyName}>
              <input
                type="text"
                value={localBuddyName}
                onChange={(e) => setLocalBuddyName(e.target.value)}
                placeholder="OmniBuddy"
                className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label={t.profile.personalityTone}>
              <div className="flex gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setLocalTone(tone)}
                    className={`flex-1 text-xs py-1.5 rounded-full font-medium transition-colors ${
                      localTone === tone ? "bg-primary text-white" : "bg-cream-dark text-text-secondary"
                    }`}
                  >
                    {t.tone[tone]}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <SaveButton status={buddyStatus} onClick={handleSaveBuddy} t={t} />
        </Card>
      </div>

      {/* ── Location Services ── */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">{t.profile.locationServices}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{t.profile.locationAccess}</p>
                <p className="text-[10px] text-text-muted">
                  {permission === "granted"
                    ? t.profile.locationActive
                    : permission === "denied"
                    ? t.profile.locationDenied
                    : t.profile.locationPrompt}
                </p>
              </div>
              {permission === "denied" ? (
                <Button
                  className="!text-xs !px-4 !py-2"
                  onClick={handleRequestLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t.common.requesting}
                    </span>
                  ) : (
                    t.common.enable
                  )}
                </Button>
              ) : (
                <ToggleSwitch
                  checked={permission === "granted"}
                  onToggle={handleToggleLocation}
                />
              )}
            </div>

            {permission === "granted" && lat != null && lng != null && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cream">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-[11px] text-text-secondary">
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </span>
              </div>
            )}

            {locationError && (
              <p className="text-[11px] text-conflict">{locationError}</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── System Settings ── */}
      <SystemSettings onLanguageRequest={setPendingLanguage} />

      {/* ── Account ── */}
      <div className="px-5 pb-6 space-y-3">
        <Card>
          <h3 className="text-sm font-semibold mb-3">{t.profile.account}</h3>
          <div className="space-y-2">
            <StatRow label={t.profile.email} value={user?.email ?? "—"} />
          </div>
        </Card>
        <Button variant="ghost" className="w-full !text-xs" onClick={handleLogout}>
          {t.profile.logOut}
        </Button>
        <p className="text-center text-[10px] text-text-muted">
          OmniTrip v1.0.0
        </p>
      </div>
    </div>
  );
}

/* ---- Local helper components ---- */

function SaveButton({ status, onClick, t }: { status: SaveStatus; onClick: () => void; t: ReturnType<typeof useT> }) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      {status === "saved" && (
        <span className="text-xs text-success font-medium flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {t.common.saved}
        </span>
      )}
      {status === "error" && (
        <span className="text-xs text-conflict font-medium">{t.common.failed}</span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={status === "saving"}
        className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center gap-2"
      >
        {status === "saving" ? (
          <>
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t.common.saving}
          </>
        ) : (
          t.common.save
        )}
      </button>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-cream-dark"
      } relative`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function SystemSettings({ onLanguageRequest }: { onLanguageRequest: (l: Language) => void }) {
  const { theme, language, voiceRecitation, setTheme, setVoiceRecitation } = useSettingsStore();
  const t = useT();

  const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
    { value: "light", label: t.themeOptions.light, icon: "☀️" },
    { value: "dark", label: t.themeOptions.dark, icon: "🌙" },
    { value: "auto", label: t.themeOptions.auto, icon: "⚙️" },
  ];

  return (
    <div className="px-5">
      <Card>
        <h3 className="text-sm font-semibold mb-3">{t.profile.systemSettings}</h3>
        <div className="space-y-4">
          {/* Theme */}
          <Field label={t.profile.theme}>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                    theme === opt.value
                      ? "bg-primary text-white"
                      : "bg-cream-dark text-text-secondary"
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Language — clicking opens confirmation dialog */}
          <Field label={t.profile.language}>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    if (code !== language) onLanguageRequest(code);
                  }}
                  className={`py-1.5 rounded-full text-xs font-medium transition-colors ${
                    language === code
                      ? "bg-primary text-white"
                      : "bg-cream-dark text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {/* Voice Recitation */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t.profile.voiceRecitation}</p>
              <p className="text-[10px] text-text-muted">{t.profile.voiceRecitationDesc}</p>
            </div>
            <ToggleSwitch
              checked={voiceRecitation}
              onToggle={() => setVoiceRecitation(!voiceRecitation)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function LanguageConfirmDialog({
  currentLang,
  newLang,
  onConfirm,
  onCancel,
}: {
  currentLang: Language;
  newLang: Language;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Show dialog in both current AND new language so the user can read it either way
  const tCurrent = translations[currentLang];
  const tNew = translations[newLang];
  const newLangLabel = LANGUAGE_LABELS[newLang];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl animate-slide-up">
        {/* Current language */}
        <h3 className="text-base font-semibold text-center mb-1">{tCurrent.langConfirm.title}</h3>
        <p className="text-xs text-text-muted text-center mb-2">
          {tCurrent.langConfirm.message(newLangLabel)}
        </p>
        {/* New language (if different from English) */}
        {currentLang !== newLang && newLang !== "en" && (
          <>
            <div className="h-px bg-cream-dark my-3" />
            <h3 className="text-base font-semibold text-center mb-1">{tNew.langConfirm.title}</h3>
            <p className="text-xs text-text-muted text-center mb-2">
              {tNew.langConfirm.message(newLangLabel)}
            </p>
          </>
        )}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-cream-dark text-text-secondary text-sm font-medium"
          >
            {tCurrent.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold"
          >
            {tCurrent.langConfirm.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
      <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
      <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3H4.5a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM12 12.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
    </svg>
  );
}
