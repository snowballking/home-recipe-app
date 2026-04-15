"use client";

import { useState } from "react";
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
