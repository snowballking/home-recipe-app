"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { REPORT_REASONS, type ContentReport } from "@/lib/types";

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label])
);

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  dismissed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function AdminReportsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    // content_reports.recipe_id has an FK to recipes, so the join works
    const { data, error: qError } = await supabase
      .from("content_reports")
      .select("*, recipes(id, title, user_id, is_public)")
      .order("created_at", { ascending: false });
    if (qError) {
      setError(qError.message);
      setLoading(false);
      return;
    }
    setReports((data ?? []) as ContentReport[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { data: profile } = await supabase
          .from("profiles").select("is_admin").eq("id", user.id).single();
        if (!profile?.is_admin) { router.push("/market"); return; }
        await loadReports();
      } catch {
        // auth lock race
        setLoading(false);
      }
    }
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(reportId: string, status: "open" | "resolved" | "dismissed") {
    setBusyId(reportId);
    const { error: err } = await supabase
      .from("content_reports")
      .update({ status })
      .eq("id", reportId);
    setBusyId(null);
    if (err) { alert("Update failed: " + err.message); return; }
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
  }

  const open = reports.filter((r) => r.status === "open");
  const closed = reports.filter((r) => r.status !== "open");

  function ReportRow({ report }: { report: ContentReport }) {
    const busy = busyId === report.id;
    return (
      <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLES[report.status]}`}>
            {report.status}
          </span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {REASON_LABELS[report.reason] ?? report.reason}
          </span>
          <span className="text-xs text-zinc-400">
            {new Date(report.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </span>
        </div>
        {report.recipes ? (
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Recipe:{" "}
            <Link href={`/recipe/${report.recipes.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
              {report.recipes.title}
            </Link>{" "}
            <span className="text-xs text-zinc-400">
              ({report.recipes.is_public ? "public" : "private"})
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm italic text-zinc-400">Recipe no longer exists.</p>
        )}
        {report.details && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            &ldquo;{report.details}&rdquo;
          </p>
        )}
        <div className="mt-3 flex gap-2">
          {report.status === "open" ? (
            <>
              <button
                onClick={() => setStatus(report.id, "resolved")}
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "..." : "Mark Resolved"}
              </button>
              <button
                onClick={() => setStatus(report.id, "dismissed")}
                disabled={busy}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {busy ? "..." : "Dismiss"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setStatus(report.id, "open")}
              disabled={busy}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {busy ? "..." : "Reopen"}
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <NavBar />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Content Reports
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Takedown requests and content complaints from users. For copyright
              reports, contact the recipe owner and ask them to make it private
              or remove it.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            ← User Approvals
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : (
          <>
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Open ({open.length})
              </h2>
              {open.length === 0 ? (
                <p className="mt-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  No open reports. 🎉
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {open.map((r) => <ReportRow key={r.id} report={r} />)}
                </ul>
              )}
            </section>

            {closed.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Closed ({closed.length})
                </h2>
                <ul className="mt-3 space-y-2">
                  {closed.map((r) => <ReportRow key={r.id} report={r} />)}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
