"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AGE_GROUPS, CUISINES, DIETARY_TAGS, HouseholdMember, AgeGroup, ExternalLinks } from "@/lib/types";

const LINK_FIELDS = [
  { key: "instagram", label: "Instagram", icon: "📷", placeholder: "https://instagram.com/yourhandle" },
  { key: "youtube", label: "YouTube", icon: "▶", placeholder: "https://youtube.com/@yourchannel" },
  { key: "tiktok", label: "TikTok", icon: "🎵", placeholder: "https://tiktok.com/@yourhandle" },
  { key: "website", label: "Website", icon: "🌐", placeholder: "https://yoursite.com" },
] as const;

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLinks>({});
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberAgeGroup, setNewMemberAgeGroup] = useState<AgeGroup>("adult");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setDisplayName(data.displayname ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        setSpecialties(data.specialties ?? []);
        setDietaryPreferences(data.dietary_preferences ?? []);
        setExternalLinks((data.external_links as ExternalLinks) ?? {});
        setHouseholdMembers(data.household_members ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleAddMember() {
    if (!newMemberName.trim()) {
      setMessage("Please enter a member name");
      return;
    }

    const newMember: HouseholdMember = {
      name: newMemberName.trim(),
      age_group: newMemberAgeGroup,
    };

    setHouseholdMembers([...householdMembers, newMember]);
    setNewMemberName("");
    setNewMemberAgeGroup("adult");
  }

  function handleRemoveMember(index: number) {
    setHouseholdMembers(householdMembers.filter((_, i) => i !== index));
  }

  function toggleSpecialty(tag: string) {
    setSpecialties((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function toggleDietaryPreference(tag: string) {
    setDietaryPreferences((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Error: please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setMessage("Error: image must be under 10MB."); return; }
    setUploadingAvatar(true);
    setMessage("");
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage("Error: " + (data.error || "failed to upload photo.")); return; }
      setAvatarUrl(data.url);
    } catch {
      setMessage("Error: something went wrong while uploading the photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Keep only non-empty links; they must be full URLs
    const cleanedLinks: ExternalLinks = {};
    for (const { key, label } of LINK_FIELDS) {
      const value = externalLinks[key]?.trim();
      if (!value) continue;
      if (!/^https?:\/\//i.test(value)) {
        setMessage(`Error: the ${label} link must start with https://`);
        setSaving(false);
        return;
      }
      cleanedLinks[key] = value;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        displayname: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        specialties,
        dietary_preferences: dietaryPreferences,
        external_links: cleanedLinks,
        household_members: householdMembers,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setMessage("Error saving profile: " + error.message);
    } else {
      setMessage("Profile updated successfully!");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
  const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Edit Profile
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              This is how other users will see you in the community.
            </p>
          </div>
          {userId && (
            <a
              href={`/user/${userId}`}
              className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              View my profile →
            </a>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {message && (
            <div className={`rounded-lg p-3 text-sm ${
              message.includes("Error")
                ? "border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                : "border border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            }`}>
              {message}
            </div>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                (displayName[0] ?? "?").toUpperCase()
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {uploadingAvatar ? "Uploading..." : avatarUrl ? "Change photo" : "Add profile photo"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="ml-2 text-xs text-zinc-400 hover:text-red-500"
                >
                  Remove
                </button>
              )}
              <p className="mt-1 text-xs text-zinc-400">JPG, PNG or WebP — max 10MB.</p>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Display Name & Bio Section */}
          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should others see you?"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about your cooking style..."
                rows={3}
                className={inputClass}
              />
            </div>
          </div>

          {/* Specialties */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Cooking Specialties
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              Which cuisines do you cook best? Shown on your public profile.
            </p>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleSpecialty(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    specialties.includes(c)
                      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Preferences */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Dietary Preferences
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              Your household&apos;s dietary targets — shown on your profile and
              handy when planning meals.
            </p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleDietaryPreference(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    dietaryPreferences.includes(tag)
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* External Links */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Links
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              Share where people can follow your cooking.
            </p>
            <div className="space-y-3">
              {LINK_FIELDS.map(({ key, label, icon, placeholder }) => (
                <div key={key}>
                  <label className={labelClass}>
                    {icon} {label}
                  </label>
                  <input
                    type="url"
                    value={externalLinks[key] ?? ""}
                    onChange={(e) =>
                      setExternalLinks((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Household Members Section */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Household Members
            </h2>

            {/* Add New Member Form */}
            <div className="space-y-3 mb-4 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900">
              <div>
                <label className={labelClass}>
                  Name
                </label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Family member name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Age Group
                </label>
                <select
                  value={newMemberAgeGroup}
                  onChange={(e) => setNewMemberAgeGroup(e.target.value as AgeGroup)}
                  className={inputClass}
                >
                  {AGE_GROUPS.map((group) => (
                    <option key={group.value} value={group.value}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddMember}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Member
              </button>
            </div>

            {/* Members List */}
            {householdMembers.length > 0 ? (
              <div className="space-y-2">
                {householdMembers.map((member, index) => {
                  const ageGroupLabel = AGE_GROUPS.find(g => g.value === member.age_group)?.label || member.age_group;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {member.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {ageGroupLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(index)}
                        className="ml-2 rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                No household members added yet.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
