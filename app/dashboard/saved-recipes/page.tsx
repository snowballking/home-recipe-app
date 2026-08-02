"use client";

import { useEffect, useMemo, useState } from "react";
import { SavedRecipeCollection } from "@/app/components/saved-recipe-collection";
import { useAuth } from "@/lib/auth/auth-context";
import { getSavedRecipeIds, normalizeSavedRecipeRows } from "@/lib/saved-recipes";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@/lib/types";

export default function SavedRecipesPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const supabase = useMemo(() => createClient(), []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = userId ?? "";
    if (authLoading || !currentUserId) return;

    let active = true;

    async function loadSavedRecipes() {
      const { data } = await supabase
        .from("recipe_saves")
        .select("recipe_id, created_at, recipes(*)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (!active) return;

      // Keep the saved recipe IDs normalized here as a defensive guard for
      // duplicated rows, while the collection only renders available joins.
      const savedRecipeIds = new Set(getSavedRecipeIds(data));
      setRecipes(normalizeSavedRecipeRows(data).filter((recipe) => savedRecipeIds.has(recipe.id)));
      setLoadedUserId(currentUserId);
    }

    void loadSavedRecipes();

    return () => {
      active = false;
    };
  }, [authLoading, supabase, userId]);

  if (authLoading || (userId && loadedUserId !== userId)) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
        <div className="flex min-h-64 items-center justify-center" role="status" aria-label="Loading saved recipes">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SavedRecipeCollection recipes={recipes} headingLevel="h1" />
      </div>
    </div>
  );
}
