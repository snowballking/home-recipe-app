"use client";

import Link from "next/link";
import { RecipeCard } from "@/app/components/recipe-card";
import { useLanguage } from "@/lib/i18n/language-context";
import type { Recipe } from "@/lib/types";

interface SavedRecipeCollectionProps {
  recipes: Recipe[];
  headingLevel?: "h1" | "h2";
}

export function SavedRecipeCollection({ recipes, headingLevel = "h2" }: SavedRecipeCollectionProps) {
  const { t } = useLanguage();
  const Heading = headingLevel === "h1" ? "h1" : "h2";

  return (
    <section id="saved-recipes" className="mt-8 scroll-mt-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Heading className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {t("saved.title")}
          </Heading>
          <p className="mt-0.5 text-xs text-zinc-400">{t("saved.private")}</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {recipes.length}
        </span>
      </div>

      {recipes.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} showAuthor={false} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-8 text-center dark:border-indigo-900 dark:bg-indigo-950/20">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{t("saved.empty")}</p>
          <Link
            href="/discover"
            className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            {t("saved.browse")}
          </Link>
        </div>
      )}
    </section>
  );
}
