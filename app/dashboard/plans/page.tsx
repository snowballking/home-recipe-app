"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { MealPlan } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";

function formatDateRange(startDate: string, endDate: string, locale: string): string {
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startStr = start.toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function getStatusBadgeColor(status: string): string {
  if (status === "finalized") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
  }
  return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
}

export default function MyPlansPage() {
  const router = useRouter();
  const supabase = createClient();
  const { locale, t } = useLanguage();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data } = await supabase
          .from("meal_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setPlans((data ?? []) as MealPlan[]);
      } catch {
        // auth lock race
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(planId: string, planTitle: string) {
    const confirmed = window.confirm(
      `${t("my_plans.delete_confirm")} "${planTitle}"? ${t("my_plans.delete_warning")}`
    );
    if (!confirmed) return;

    setDeletingId(planId);

    // Delete related data first (grocery items, grocery list, meal plan slots), then the plan
    // Grocery items → grocery list → meal_plan_slots → meal_plan_comments → meal_plan
    const { data: groceryLists } = await supabase
      .from("grocery_lists")
      .select("id")
      .eq("meal_plan_id", planId);

    if (groceryLists?.length) {
      const listIds = groceryLists.map((g) => g.id);
      await supabase.from("grocery_items").delete().in("grocery_list_id", listIds);
      await supabase.from("grocery_lists").delete().eq("meal_plan_id", planId);
    }

    await supabase.from("meal_plan_slots").delete().eq("meal_plan_id", planId);
    await supabase.from("meal_plan_comments").delete().eq("meal_plan_id", planId);
    const { error } = await supabase.from("meal_plans").delete().eq("id", planId);

    if (error) {
      alert("Failed to delete plan: " + error.message);
      setDeletingId(null);
      return;
    }

    setPlans((prev) => prev.filter((p) => p.id !== planId));
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {t("my_plans.title")}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {plans.length} {plans.length === 1 ? t("my_plans.plan_count") : t("my_plans.plans_count")}
            </p>
          </div>
          <Link
            href="/dashboard/plans/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            {t("my_plans.new_plan")}
          </Link>
        </div>

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">📅</div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {t("my_plans.no_plans")}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              {t("my_plans.no_plans_hint")}
            </p>
            <Link
              href="/dashboard/plans/new"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t("my_plans.create_first")}
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="group relative rounded-lg border border-zinc-200 bg-white p-5 hover:shadow-md transition-shadow dark:border-zinc-700 dark:bg-zinc-800"
              >
                <Link href={`/dashboard/plans/${plan.id}`} className="block">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-50 dark:group-hover:text-indigo-400 transition-colors">
                        {plan.title}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDateRange(plan.start_date, plan.end_date, locale)}
                      </p>
                      {plan.description && (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(plan.status)}`}
                    >
                      {plan.status === "finalized" ? t("my_plans.finalized") : t("my_plans.draft")}
                    </span>
                    {plan.is_public && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {t("my_plans.public")}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(plan.id, plan.title);
                  }}
                  disabled={deletingId === plan.id}
                  className="absolute top-3 right-3 rounded-md p-1.5 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 transition-all disabled:opacity-50"
                  title="Delete plan"
                >
                  {deletingId === plan.id ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
