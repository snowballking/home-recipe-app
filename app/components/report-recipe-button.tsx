"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { REPORT_REASONS } from "@/lib/types";

interface ReportRecipeButtonProps {
  recipeId: string;
}

/**
 * "Report content" takedown link (IP policy, ROADMAP weeks 1-2).
 * Signed-in users file a report into content_reports; admins review it
 * in the admin panel.
 */
export function ReportRecipeButton({ recipeId }: ReportRecipeButtonProps) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("copyright");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(() => { /* auth lock race — safe to ignore */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    setError("");

    const { error: insertError } = await supabase.from("content_reports").insert({
      recipe_id: recipeId,
      reporter_id: userId,
      reason,
      details: details.trim() || null,
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-xs text-emerald-700 dark:text-emerald-400">
        ✓ Thanks — our team will review this report within 48 hours.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-400 underline-offset-2 hover:text-red-600 hover:underline dark:hover:text-red-400"
      >
        ⚑ Report this recipe
      </button>
    );
  }

  if (!userId) {
    return (
      <p className="text-xs text-zinc-500">
        <a href="/login" className="text-indigo-600 hover:underline">Sign in</a>{" "}
        to report this recipe.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 max-w-md rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        Report this recipe
      </p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      >
        {REPORT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Optional details — e.g. a link to your original content"
        rows={2}
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
