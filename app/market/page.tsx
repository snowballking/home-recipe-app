"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { RecipeCard } from "@/app/components/recipe-card";
import { RECIPE_CATEGORIES, CUISINES } from "@/lib/types";
import type { Recipe, RecipeCategory } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";
import { translateCategory } from "@/lib/i18n/translations";

const SORT_OPTIONS = [
  { value: "newest", labelKey: "market.newest" as const },
  { value: "top_rated", labelKey: "market.top_rated" as const },
  { value: "popular", labelKey: "market.most_saved" as const },
] as const;

export default function RecipesMarketPage() {
  const supabase = createClient();
  const { locale, t } = useLanguage();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("all");
  const [cuisineFilter, setCuisineFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "top_rated" | "popular">("newest");

  const categoryOptions = RECIPE_CATEGORIES.filter((c) => c.value !== "all");

  const loadRecipes = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("recipes")
      .select("*, profiles(displayname)")
      .eq("is_public", true);

    if (search.trim()) {
      const s = search.trim();
      query = query.or(`title.ilike.%${s}%,title_zh.ilike.%${s}%`);
    }
    if (cuisineFilter) query = query.eq("cuisine", cuisineFilter);
    if (category !== "all") query = query.eq("category", category);

    if (sortBy === "top_rated") query = query.order("avg_rating", { ascending: false });
    else if (sortBy === "popular") query = query.order("save_count", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    query = query.limit(200);
    const { data } = await query;

    if (!data) { setRecipes([]); setLoading(false); return; }

    const withAuthors = data.map((r) => ({
      ...r,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      author_name: (r.profiles as any)?.displayname ?? "Anonymous",
    })) as Recipe[];

    setRecipes(withAuthors);
    setLoading(false);
  }, [search, cuisineFilter, category, sortBy, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadRecipes, 300);
    return () => clearTimeout(timer);
  }, [loadRecipes]);

  // Group by category when "All" is selected
  const groupedByCategory = useMemo(() => {
    if (category !== "all") return null;
    const groups: { label: string; icon: string; recipes: Recipe[] }[] = [];
    for (const cat of categoryOptions) {
      const catRecipes = recipes.filter((r) => r.category === cat.value);
      if (catRecipes.length > 0) groups.push({ label: translateCategory(cat.value, locale), icon: cat.icon, recipes: catRecipes });
    }
    const uncategorized = recipes.filter((r) => !r.category || !categoryOptions.some((c) => c.value === r.category));
    if (uncategorized.length > 0) groups.push({ label: t("market.other"), icon: "📋", recipes: uncategorized });
    return groups;
  }, [recipes, category, categoryOptions, t, locale]);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">{t("market.title")}</h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{t("market.subtitle")}</p>
        </div>

        {/* Search + Cuisine */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("market.search")}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <select
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">{t("market.all_cuisines")}</option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Category pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === "all"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t("market.all")}
          </button>
          {categoryOptions.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(category === cat.value ? "all" : cat.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === cat.value
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {cat.icon} {translateCategory(cat.value, locale)}
            </button>
          ))}
        </div>

        {/* Sort Tabs */}
        <div className="mt-3 flex gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
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
            <p className="mt-3 text-sm text-zinc-500">{t("market.loading")}</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">🍽</div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t("market.no_recipes")}</h2>
            <p className="mt-2 text-sm text-zinc-500">{t("market.no_recipes_hint")}</p>
          </div>
        ) : category !== "all" ? (
          /* Single category selected — flat grid */
          <>
            <p className="mt-4 text-sm text-zinc-500">{recipes.length} {recipes.length !== 1 ? t("market.recipes_count") : t("market.recipe_count")}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} showAuthor />
              ))}
            </div>
          </>
        ) : (
          /* Grouped by category */
          <div className="mt-6 space-y-8">
            {groupedByCategory?.map(({ label, icon, recipes: catRecipes }) => (
              <section key={label}>
                <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                  <span>{icon}</span> {label}
                  <span className="text-xs font-normal text-zinc-400">({catRecipes.length})</span>
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {catRecipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} showAuthor />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
