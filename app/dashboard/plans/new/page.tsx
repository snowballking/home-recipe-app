"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DURATION_OPTIONS } from "@/lib/types";

export default function NewMealPlanPage() {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationType, setDurationType] = useState<"1_week" | "2_weeks" | "3_weeks" | "1_month">("1_week");
  const [startDate, setStartDate] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Approver picker state
  const [approverSearch, setApproverSearch] = useState("");
  const [approverResults, setApproverResults] = useState<{ id: string; displayname: string | null }[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<{ id: string; displayname: string | null } | null>(null);
  const [searchingApprover, setSearchingApprover] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, [supabase]);

  // Search for approver users
  useEffect(() => {
    const query = approverSearch.trim();
    if (query.length < 2) { setApproverResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingApprover(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, displayname")
        .ilike("displayname", `%${query}%`)
        .neq("id", currentUserId ?? "")
        .limit(8);
      setApproverResults(data ?? []);
      setSearchingApprover(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [approverSearch, supabase, currentUserId]);

  // Calculate end_date based on duration_type
  function calculateEndDate(start: string, duration: string): string {
    if (!start) return "";
    const startDateObj = new Date(start);
    const durationOption = DURATION_OPTIONS.find((d) => d.value === duration);
    if (!durationOption) return "";

    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + durationOption.days - 1);

    // Format as YYYY-MM-DD
    return endDateObj.toISOString().split("T")[0];
  }

  const endDate = calculateEndDate(startDate, durationType);

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Plan title is required");
      return;
    }
    if (!startDate) {
      setError("Start date is required");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("meal_plans")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        duration_type: durationType,
        start_date: startDate,
        end_date: endDate,
        status: "draft",
        is_public: isPublic,
        approver_id: selectedApprover?.id ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push(`/dashboard/plans/${data.id}`);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500";
  const labelClass =
    "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Create New Meal Plan
        </h1>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Title */}
          <div>
            <label className={labelClass}>Plan Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Healthy Meal Plan"
              className={inputClass}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes or goals for this plan..."
              rows={3}
              className={inputClass}
            />
          </div>

          {/* Duration & Start Date */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className={labelClass}>Duration *</label>
              <select
                value={durationType}
                onChange={(e) => setDurationType(e.target.value as typeof durationType)}
                className={inputClass}
                required
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Auto-calculated End Date (Read-only) */}
          {endDate && (
            <div>
              <label className={labelClass}>End Date (Auto-calculated)</label>
              <input
                type="date"
                value={endDate}
                disabled
                className={`${inputClass} opacity-60 cursor-not-allowed`}
              />
            </div>
          )}

          {/* Approver Picker */}
          <div>
            <label className={labelClass}>Approver (Optional)</label>
            <p className="text-xs text-zinc-500 mb-2">Assign someone to review and approve this meal plan.</p>
            {selectedApprover ? (
              <div className="flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  {(selectedApprover.displayname?.[0] ?? "?").toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  {selectedApprover.displayname ?? "Unknown"}
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedApprover(null); setApproverSearch(""); }}
                  className="rounded-full p-1 text-indigo-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l6 6M9 3l-6 6" /></svg>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={approverSearch}
                  onChange={(e) => setApproverSearch(e.target.value)}
                  placeholder="Search by username…"
                  className={inputClass}
                />
                {searchingApprover && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                  </div>
                )}
                {approverResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-48 overflow-y-auto">
                    {approverResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelectedApprover(user);
                          setApproverSearch("");
                          setApproverResults([]);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {(user.displayname?.[0] ?? "?").toUpperCase()}
                        </div>
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">
                          {user.displayname ?? "Unknown"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Public/Private Toggle */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-zinc-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-zinc-600" />
              </label>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {isPublic ? "Public" : "Private"}
                </p>
                <p className="text-xs text-zinc-500">
                  {isPublic
                    ? "Others can view and comment on this plan"
                    : "Only you can see this plan"}
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating..." : "Create Plan"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
