"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AGE_GROUPS, HouseholdMember, AgeGroup } from "@/lib/types";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberAgeGroup, setNewMemberAgeGroup] = useState<AgeGroup>("adult");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setDisplayName(data.displayname ?? "");
        setBio(data.bio ?? "");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        displayname: displayName.trim() || null,
        bio: bio.trim() || null,
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
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
  const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Edit Profile
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          This is how other users will see you in the community.
        </p>

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
