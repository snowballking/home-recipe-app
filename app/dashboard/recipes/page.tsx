"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { RecipeCard } from "@/app/components/recipe-card";
import { RECIPE_CATEGORIES, CUISINES } from "@/lib/types";
import type { Recipe, RecipeCategory } from "@/lib/types";

export default function MyRecipesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<RecipeCategory>("all");
  const [cuisineFilter, setCuisineFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data } = await supabase
          .from("recipes").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setAllRecipes((data ?? []) as Recipe[]);
      } catch {
        // auth lock race
      }
      setLoading(false);
    }
    load();
  }, []);

  // Filter
  const filtered = useMemo(() => {
    return allRecipes.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (cuisineFilter && r.cuisine !== cuisineFilter) return false;
      if (search.trim() && !r.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [allRecipes, category, cuisineFilter, search]);

  // Group by category for display
  const categoryOptions = RECIPE_CATEGORIES.filter((c) => c.value !== "all");

  const groupedByCategory = useMemo(() => {
    if (category !== "all") return null;
    const groups: { label: string; icon: string; recipes: Recipe[] }[] = [];
    for (const cat of categoryOptions) {
      const catRecipes = filtered.filter((r) => r.category === cat.value);
      if (catRecipes.length > 0) groups.push({ label: cat.label, icon: cat.icon, recipes: catRecipes });
    }
    const uncategorized = filtered.filter((r) => !r.category || !categoryOptions.some((c) => c.value === r.category));
    if (uncategorized.length > 0) groups.push({ label: "Other", icon: "📋", recipes: uncategorized });
    return groups;
  }, [filtered, category, categoryOptions]);

  const publicCount = allRecipes.filter((r) => r.is_public).length;
  const privateCount = allRecipes.filter((r) => !r.is_public).length;

  if (loading) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Recipes</h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {allRecipes.length} recipes ({publicCount} public, {privateCount} private)
            </p>
          </div>
          <Link href="/dashboard/recipes/new"
            className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
            + New Recipe
          </Link>
        </div>

        {allRecipes.length > 0 && (
          <>
            {/* Search + Cuisine */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your recipes..."
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <select
                value={cuisineFilter}
                onChange={(e) => setCuisineFilter(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">All Cuisines</option>
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
                All
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
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Results */}
        {allRecipes.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">📝</div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">No recipes yet</h2>
            <p className="mt-2 text-sm text-zinc-500">Start building your recipe collection by adding your first recipe.</p>
            <Link href="/dashboard/recipes/new"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Add Your First Recipe
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">🔍</div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">No matches</h2>
            <p className="mt-2 text-sm text-zinc-500">No recipes match your current filters.</p>
          </div>
        ) : category !== "all" ? (
          /* Single category selected — flat grid */
          <>
            <p className="mt-4 text-sm text-zinc-500">{filtered.length} recipe{filtered.length !== 1 ? "s" : ""}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} showAuthor={false} />
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
                    <RecipeCard key={recipe.id} recipe={recipe} showAuthor={false} />
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
