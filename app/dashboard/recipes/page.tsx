"use client";

import { useState, useEffect } from "react";
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
        if (!user) {
          router.push("/login");
          return;
        }

        const { data } = await supabase
          .from("recipes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setAllRecipes((data ?? []) as Recipe[]);
      } catch {
        // auth lock race
      }
      setLoading(false);
    }
    load();
  }, []);

  // Client-side filter by category + cuisine + search
  const filtered = allRecipes.filter((r) => {
    if (category !== "all" && r.category !== category) return false;
    if (cuisineFilter && r.cuisine !== cuisineFilter) return false;
    if (search.trim() && !r.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

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
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              My Recipes
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {allRecipes.length} recipes ({publicCount} public, {privateCount} private)
            </p>
          </div>
          <Link
            href="/dashboard/recipes/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            + New Recipe
          </Link>
        </div>

        {/* Search + Category + Cuisine filters */}
        {allRecipes.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your recipes..."
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
        )}

        {/* Recipe Grid */}
        {allRecipes.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">📝</div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              No recipes yet
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Start building your recipe collection by adding your first recipe.
            </p>
            <Link
              href="/dashboard/recipes/new"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add Your First Recipe
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">🔍</div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              No matches
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              No recipes match your current filters. Try a different category, cuisine, or search term.
            </p>
          </div>
        ) : (
          <>
            {(category !== "all" || cuisineFilter || search.trim()) && (
              <p className="mt-4 text-sm text-zinc-500">
                {filtered.length} recipe{filtered.length !== 1 ? "s" : ""} found
              </p>
            )}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} showAuthor={false} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
