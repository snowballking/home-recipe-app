"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import Link from "next/link";
import type { MealPlan, Profile } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";

const SORT_OPTIONS = [
  { value: "newest", labelKey: "explore.newest" as const },
  { value: "most_commented", labelKey: "explore.most_commented" as const },
] as const;

interface MealPlanWithCreator extends MealPlan {
  creator?: Profile;
}

export default function ExplorePage() {
  const supabase = createClient();
  const { locale, t } = useLanguage();
  const [plans, setPlans] = useState<MealPlanWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "most_commented">("newest");

  const loadPlans = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("meal_plans")
      .select("*")
      .eq("is_public", true);

    if (search.trim()) {
      query = query.ilike("title", `%${search.trim()}%`);
    }

    // Apply sorting
    if (sortBy === "most_commented") {
      query = query.order("comment_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.limit(40);

    const { data: plansData } = await query;

    if (!plansData) {
      setPlans([]);
      setLoading(false);
      return;
    }

    // Fetch creator profiles separately for each plan
    const plansWithCreators = await Promise.all(
      plansData.map(async (plan) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", plan.user_id)
          .single();

        return {
          ...plan,
          creator: profileData || undefined,
        };
      })
    );

    setPlans(plansWithCreators as MealPlanWithCreator[]);
    setLoading(false);
  }, [search, sortBy, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadPlans, 300);
    return () => clearTimeout(timer);
  }, [loadPlans]);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("explore.title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {t("explore.subtitle")}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-6 flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("explore.search")}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              🔍
            </span>
          </div>
        </div>

        {/* Sort Tabs */}
        <div className="mt-4 flex gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                sortBy === opt.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="mt-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-3 text-sm text-zinc-500">{t("explore.loading")}</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">📅</div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {t("explore.no_plans")}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              {t("explore.no_plans_hint")}
            </p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-zinc-500">
              {plans.length} {plans.length !== 1 ? t("explore.plans_count") : t("explore.plan_count")} {t("explore.found")}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/plan/${plan.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
                >
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2">
                    {plan.title}
                  </h3>

                  {plan.description && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {plan.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                      {(plan.creator?.displayname?.[0] ?? "?").toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {plan.creator?.displayname ?? "Anonymous"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <div>
                      {new Date(plan.start_date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")} —{" "}
                      {new Date(plan.end_date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                    </div>
                    <div>
                      {(() => {
                        const key = `duration.${plan.duration_type}` as Parameters<typeof t>[0];
                        return t(key);
                      })()}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
                    <span>💬 {plan.comment_count} {plan.comment_count !== 1 ? t("explore.comments") : t("explore.comment")}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
