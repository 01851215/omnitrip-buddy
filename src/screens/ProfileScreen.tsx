import { useState, useRef, useEffect, useCallback, type ChangeEvent } from "react";
import { Buddy } from "../components/Buddy";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ScreenLoader } from "../components/ui/Spinner";
import { useLocationStore } from "../stores/locationStore";
import { requestLocation } from "../services/location";
import { useAuthContext } from "../components/auth/AuthProvider";
import { useProfile } from "../hooks/useProfile";
import { TagInput } from "../components/profile/TagInput";
import { SliderField } from "../components/profile/SliderField";
import { supabase } from "../services/supabase";

const PACE_LABELS = ["Very Slow", "Slow", "Moderate", "Fast", "Very Fast"];
const BUDGET_OPTIONS = ["budget", "moderate", "luxury"] as const;
const TONE_OPTIONS = ["warm", "energetic", "calm"] as const;
const ALERT_LABELS = ["Rare", "Low", "Normal", "Often", "Frequent"];

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ProfileScreen() {
  const { permission, quietMode, toggleQuietMode, setAlertFrequency } = useLocationStore();
  const { user, signOut } = useAuthContext();
  const { profile, travelProfile, loading, updateProfile, updateTravelProfile } = useProfile();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save basic info fields — gate on user edits to avoid overwriting on init
  const [localName, setLocalName] = useState("");
  const [localAge, setLocalAge] = useState("");
  const [localBio, setLocalBio] = useState("");
  const [localBuddyName, setLocalBuddyName] = useState("");
  const [initialized, setInitialized] = useState(false);
  const userEditedBasic = useRef(false);
  const userEditedBuddy = useRef(false);

  // Initialize local state from profile once loaded
  useEffect(() => {
    if (profile && !initialized) {
      setLocalName(profile.displayName ?? "");
      setLocalAge(profile.age != null ? String(profile.age) : "");
      setLocalBio(profile.bio ?? "");
      setLocalBuddyName(profile.buddyName || "OmniBuddy");
      setInitialized(true);
    }
  }, [profile, initialized]);

  // Wrap setters to track when the user actually types
  const onNameChange = (e: ChangeEvent<HTMLInputElement>) => { userEditedBasic.current = true; setLocalName(e.target.value); };
  const onAgeChange = (e: ChangeEvent<HTMLInputElement>) => { userEditedBasic.current = true; setLocalAge(e.target.value); };
  const onBioChange = (e: ChangeEvent<HTMLTextAreaElement>) => { userEditedBasic.current = true; setLocalBio(e.target.value); };
  const onBuddyNameChange = (e: ChangeEvent<HTMLInputElement>) => { userEditedBuddy.current = true; setLocalBuddyName(e.target.value); };

  // Debounced auto-save for basic info
  const debouncedName = useDebounced(localName, 800);
  const debouncedAge = useDebounced(localAge, 800);
  const debouncedBio = useDebounced(localBio, 800);
  const debouncedBuddyName = useDebounced(localBuddyName, 800);

  useEffect(() => {
    if (!userEditedBasic.current || !initialized || !profile) return;
    if (debouncedName === profile.displayName && (debouncedAge === (profile.age != null ? String(profile.age) : "")) && debouncedBio === profile.bio) return;
    updateProfile({
      displayName: debouncedName,
      age: debouncedAge ? Number(debouncedAge) : null,
      bio: debouncedBio,
    });
  }, [debouncedName, debouncedAge, debouncedBio]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userEditedBuddy.current || !initialized || !profile) return;
    if (debouncedBuddyName === (profile.buddyName || "OmniBuddy")) return;
    updateProfile({ buddyName: debouncedBuddyName });
  }, [debouncedBuddyName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToneChange = useCallback((tone: string) => {
    updateTravelProfile({
      buddySettings: { ...(travelProfile?.buddySettings ?? {}), tone },
    });
  }, [travelProfile?.buddySettings, updateTravelProfile]);

  // Persist quiet mode to Supabase alongside local toggle
  const handleToggleQuietMode = useCallback(() => {
    const newValue = !quietMode;
    toggleQuietMode();
    updateTravelProfile({
      notificationSettings: {
        ...(travelProfile?.notificationSettings ?? {}),
        quietMode: newValue,
      },
    });
  }, [quietMode, toggleQuietMode, travelProfile?.notificationSettings, updateTravelProfile]);

  // Restore quiet mode from Supabase on load
  useEffect(() => {
    if (travelProfile?.notificationSettings?.quietMode !== undefined) {
      const saved = travelProfile.notificationSettings.quietMode as boolean;
      if (saved !== quietMode) {
        toggleQuietMode();
      }
    }
  }, [travelProfile?.notificationSettings?.quietMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTone = (travelProfile?.buddySettings?.tone as string) ?? "warm";
  const alertFrequency = (travelProfile?.notificationSettings?.alertFrequency as number) ?? 3;

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now(); // cache bust

      // Save to profile
      await updateProfile({ avatarUrl: publicUrl });
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  if (loading) {
    return <ScreenLoader message="Loading profile..." />;
  }

  return (
    <div className="space-y-5 pb-28">
      {/* Header with avatar */}
      <div className="px-5 pt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleAvatarPick}
          className="relative w-16 h-16 rounded-full overflow-hidden bg-cream-dark shrink-0 group"
          disabled={uploadingAvatar}
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
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
            {profile?.displayName || user?.user_metadata?.display_name || "Traveller"}
          </h1>
          <p className="text-sm text-text-secondary">{user?.email ?? ""}</p>
        </div>
      </div>

      {/* Basic Info — auto-saves on change */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">Basic Info</h3>
          <div className="space-y-3">
            <Field label="Display Name">
              <input
                type="text"
                value={localName}
                onChange={onNameChange}
                placeholder="Your name"
                className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Age">
              <input
                type="number"
                value={localAge}
                onChange={onAgeChange}
                placeholder="Age"
                className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Bio / Tagline">
              <textarea
                value={localBio}
                onChange={onBioChange}
                placeholder="Tell us about yourself..."
                rows={2}
                className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Travel Preferences */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">Travel Preferences</h3>
          <div className="space-y-4">
            <SliderField
              label="Pace"
              value={travelProfile?.pacePreference ?? 3}
              min={1}
              max={5}
              labels={PACE_LABELS}
              onChange={(v) => updateTravelProfile({ pacePreference: v })}
            />

            <Field label="Budget Style">
              <div className="flex gap-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateTravelProfile({ budgetStyle: opt })}
                    className={`flex-1 text-xs py-1.5 rounded-full font-medium transition-colors ${
                      (travelProfile?.budgetStyle ?? "moderate") === opt
                        ? "bg-primary text-white"
                        : "bg-cream-dark text-text-secondary"
                    }`}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Cuisine Preferences">
              <TagInput
                tags={travelProfile?.cuisinePreferences ?? []}
                onChange={(tags) => updateTravelProfile({ cuisinePreferences: tags })}
                placeholder="e.g. Japanese, Thai..."
              />
            </Field>

            <Field label="Avoidances">
              <TagInput
                tags={travelProfile?.avoidances ?? []}
                onChange={(tags) => updateTravelProfile({ avoidances: tags })}
                placeholder="e.g. Tourist traps, chains..."
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Notification Settings */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">Notification Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Quiet Mode</p>
                <p className="text-[10px] text-text-muted">Pause proactive suggestions</p>
              </div>
              <ToggleSwitch checked={quietMode} onToggle={handleToggleQuietMode} />
            </div>
            <SliderField
              label="Alert Frequency"
              value={typeof alertFrequency === "number" ? Math.round(alertFrequency) : 3}
              min={1}
              max={5}
              labels={ALERT_LABELS}
              onChange={(v) => {
                setAlertFrequency(v);
                updateTravelProfile({
                  notificationSettings: {
                    ...(travelProfile?.notificationSettings ?? {}),
                    alertFrequency: v,
                  },
                });
              }}
            />
          </div>
        </Card>
      </div>

      {/* Buddy Settings — auto-saves on change */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">Buddy Settings</h3>
          <div className="space-y-3">
            <Field label="Buddy Name">
              <input
                type="text"
                value={localBuddyName}
                onChange={onBuddyNameChange}
                placeholder="OmniBuddy"
                className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Personality Tone">
              <div className="flex gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => handleToneChange(tone)}
                    className={`flex-1 text-xs py-1.5 rounded-full font-medium transition-colors ${
                      currentTone === tone
                        ? "bg-primary text-white"
                        : "bg-cream-dark text-text-secondary"
                    }`}
                  >
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Card>
      </div>

      {/* Location Services */}
      <div className="px-5">
        <Card>
          <h3 className="text-sm font-semibold mb-3">Location Services</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Location Access</p>
                <p className="text-[10px] text-text-muted">
                  {permission === "granted"
                    ? "Active \u2014 Buddy can suggest nearby places"
                    : permission === "denied"
                    ? "Denied \u2014 enable in browser settings"
                    : "Not yet requested"}
                </p>
              </div>
              {permission !== "granted" && (
                <Button className="!text-xs !px-4 !py-2" onClick={requestLocation}>
                  Enable
                </Button>
              )}
              {permission === "granted" && (
                <span className="text-xs text-success font-medium">On</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Account */}
      <div className="px-5 pb-6 space-y-3">
        <Card>
          <h3 className="text-sm font-semibold mb-3">Account</h3>
          <div className="space-y-2">
            <StatRow label="Email" value={user?.email ?? "\u2014"} />
          </div>
        </Card>
        <Button variant="ghost" className="w-full !text-xs" onClick={handleLogout}>
          Log Out
        </Button>
        <p className="text-center text-[10px] text-text-muted">
          OmniTrip v0.3.0 — Advanced Features Build
        </p>
      </div>
    </div>
  );
}

/* ---- Local helper components ---- */

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

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
      <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
      <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3H4.5a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM12 12.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
    </svg>
  );
}
