"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { RecipeCard } from "@/app/components/recipe-card";
import { RECIPE_CATEGORIES, CUISINES } from "@/lib/types";
import type { Recipe, RecipeCategory } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "top_rated", label: "Top Rated" },
  { value: "popular", label: "Most Saved" },
] as const;

export default function RecipesMarketPage() {
  const supabase = createClient();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("all");
  const [cuisineFilter, setCuisineFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "top_rated" | "popular">("newest");

  const loadRecipes = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("recipes")
      .select("*, profiles(displayname)")
      .eq("is_public", true);

    if (search.trim()) {
      query = query.ilike("title", `%${search.trim()}%`);
    }
    if (cuisineFilter) {
      query = query.eq("cuisine", cuisineFilter);
    }
    if (category !== "all") {
      query = query.eq("category", category);
    }

    if (sortBy === "top_rated") {
      query = query.order("avg_rating", { ascending: false });
    } else if (sortBy === "popular") {
      query = query.order("save_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.limit(80);
    const { data } = await query;

    if (!data) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    // Attach author_name from joined profiles
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

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Recipes Market
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Browse public recipes shared by the community
          </p>
        </div>

        {/* Search + Category + Cuisine filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              🔍
            </span>
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RecipeCategory)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {RECIPE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
          <select
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">All Cuisines</option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
              {opt.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="mt-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-3 text-sm text-zinc-500">Loading recipes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">🍽</div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              No recipes found
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Try adjusting your search, category, or cuisine filter.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-zinc-500">
              {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} showAuthor />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
