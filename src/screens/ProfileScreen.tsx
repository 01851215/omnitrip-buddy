import { useState } from "react";
import { Buddy } from "../components/Buddy";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useLocationStore } from "../stores/locationStore";
import { requestLocation } from "../services/location";
import { useAuthContext } from "../components/auth/AuthProvider";
import { useProfile } from "../hooks/useProfile";
import { TagInput } from "../components/profile/TagInput";
import { SliderField } from "../components/profile/SliderField";

const PACE_LABELS = ["Very Slow", "Slow", "Moderate", "Fast", "Very Fast"];
const BUDGET_OPTIONS = ["budget", "moderate", "luxury"] as const;
const TONE_OPTIONS = ["warm", "energetic", "calm"] as const;

export function ProfileScreen() {
  const { permission, quietMode, toggleQuietMode } = useLocationStore();
  const { user, signOut } = useAuthContext();
  const { profile, travelProfile, loading, updateProfile, updateTravelProfile } = useProfile();

  const [editingBasic, setEditingBasic] = useState(false);
  const [editingBuddy, setEditingBuddy] = useState(false);

  // Local edit state for basic info
  const [draftName, setDraftName] = useState("");
  const [draftAge, setDraftAge] = useState("");
  const [draftBio, setDraftBio] = useState("");

  // Local edit state for buddy settings
  const [draftBuddyName, setDraftBuddyName] = useState("");

  const startEditBasic = () => {
    setDraftName(profile?.displayName ?? "");
    setDraftAge(profile?.age != null ? String(profile.age) : "");
    setDraftBio(profile?.bio ?? "");
    setEditingBasic(true);
  };

  const saveBasic = () => {
    updateProfile({
      displayName: draftName,
      age: draftAge ? Number(draftAge) : null,
      bio: draftBio,
    });
    setEditingBasic(false);
  };

  const startEditBuddy = () => {
    setDraftBuddyName(profile?.buddyName ?? "");
    setEditingBuddy(true);
  };

  const saveBuddy = () => {
    updateProfile({ buddyName: draftBuddyName });
    setEditingBuddy(false);
  };

  const currentTone = (travelProfile?.buddySettings?.tone as string) ?? "warm";

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-text-muted">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="px-5 pt-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-cream-dark">
          <Buddy state="happy" size="mini" mode="video" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-serif">
            {profile?.displayName || user?.user_metadata?.display_name || "Traveller"}
          </h1>
          <p className="text-sm text-text-secondary">{user?.email ?? ""}</p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="px-5">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Basic Info</h3>
            {!editingBasic && (
              <button type="button" onClick={startEditBasic} className="text-primary" aria-label="Edit basic info">
                <PencilIcon />
              </button>
            )}
          </div>
          {editingBasic ? (
            <div className="space-y-3">
              <Field label="Display Name">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label="Age">
                <input
                  type="number"
                  value={draftAge}
                  onChange={(e) => setDraftAge(e.target.value)}
                  className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label="Bio / Tagline">
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </Field>
              <div className="flex gap-2 pt-1">
                <Button className="!text-xs !px-4 !py-2" onClick={saveBasic}>
                  Save
                </Button>
                <Button variant="ghost" className="!text-xs !px-4 !py-2" onClick={() => setEditingBasic(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <StatRow label="Name" value={profile?.displayName || "Not set"} />
              <StatRow label="Age" value={profile?.age != null ? String(profile.age) : "Not set"} />
              <StatRow label="Bio" value={profile?.bio || "Not set"} />
            </div>
          )}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Quiet Mode</p>
                <p className="text-[10px] text-text-muted">Pause proactive suggestions</p>
              </div>
              <ToggleSwitch checked={quietMode} onToggle={toggleQuietMode} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Alert Frequency</p>
                <p className="text-[10px] text-text-muted">How often Buddy pings you</p>
              </div>
              <span className="text-xs text-text-muted font-medium">Normal</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Buddy Settings */}
      <div className="px-5">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Buddy Settings</h3>
            {!editingBuddy && (
              <button type="button" onClick={startEditBuddy} className="text-primary" aria-label="Edit buddy settings">
                <PencilIcon />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {editingBuddy ? (
              <>
                <Field label="Buddy Name">
                  <input
                    type="text"
                    value={draftBuddyName}
                    onChange={(e) => setDraftBuddyName(e.target.value)}
                    className="w-full text-sm border border-cream-dark rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </Field>
                <div className="flex gap-2 pt-1">
                  <Button className="!text-xs !px-4 !py-2" onClick={saveBuddy}>
                    Save
                  </Button>
                  <Button variant="ghost" className="!text-xs !px-4 !py-2" onClick={() => setEditingBuddy(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <StatRow label="Name" value={profile?.buddyName || "Buddy"} />
            )}

            <Field label="Personality Tone">
              <div className="flex gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() =>
                      updateTravelProfile({
                        buddySettings: { ...(travelProfile?.buddySettings ?? {}), tone },
                      })
                    }
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
                    ? "Active — Buddy can suggest nearby places"
                    : permission === "denied"
                    ? "Denied — enable in browser settings"
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Quiet Mode</p>
                <p className="text-[10px] text-text-muted">Pause proactive suggestions</p>
              </div>
              <ToggleSwitch checked={quietMode} onToggle={toggleQuietMode} />
            </div>
          </div>
        </Card>
      </div>

      {/* Account */}
      <div className="px-5 pb-6 space-y-3">
        <Card>
          <h3 className="text-sm font-semibold mb-3">Account</h3>
          <div className="space-y-2">
            <StatRow label="Email" value={user?.email ?? "—"} />
          </div>
        </Card>
        <Button variant="ghost" className="w-full !text-xs" onClick={handleLogout}>
          Log Out
        </Button>
        <p className="text-center text-[10px] text-text-muted">
          OmniTrip v0.1.0 — Demo Build
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

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  );
}
