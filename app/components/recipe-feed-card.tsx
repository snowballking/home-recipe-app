"use client";

import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { SaveRecipeButton } from "@/app/components/save-recipe-button";
import { useLanguage } from "@/lib/i18n/language-context";

interface RecipeFeedCardProps {
  recipe: Recipe;
}

export function RecipeFeedCard({ recipe }: RecipeFeedCardProps) {
  const { locale, t } = useLanguage();
  const title = (locale === "zh" && recipe.title_zh) || recipe.title;
  const description = (locale === "zh" && recipe.description_zh) || recipe.description;
  const author = recipe.author_name ?? "Anonymous";

  return (
    <article className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_10px_35px_rgba(89,57,33,0.08)] dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <Link href={`/user/${recipe.user_id}`} className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
            {author[0]?.toUpperCase() ?? "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{author}</span>
            <span className="block text-xs text-stone-500 dark:text-stone-400">{t("recipe.by_chef")}</span>
          </span>
        </Link>
        {recipe.original_recipe_id && (
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
            🔀 {t("fork.variation_tag")}
          </span>
        )}
      </div>

      <Link href={`/recipe/${recipe.id}`} className="group block">
        <div className="relative aspect-[16/10] overflow-hidden bg-orange-50 dark:bg-stone-800">
          {recipe.hero_image_url ? (
            <img
              src={recipe.hero_image_url}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">🍽</div>
          )}
          {recipe.image_source === "ai_generated" && (
            <span className="absolute bottom-3 left-3 rounded-full bg-stone-950/75 px-2.5 py-1 text-[10px] font-semibold text-white">
              ✨ {t("recipe_card.ai_image")}
            </span>
          )}
        </div>
      </Link>

      <div className="px-4 pb-4 pt-3">
        <Link href={`/recipe/${recipe.id}`} className="block">
          <h2 className="text-xl font-bold tracking-[-0.02em] text-stone-950 dark:text-stone-50">{title}</h2>
          {description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600 dark:text-stone-400">{description}</p>}
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-orange-50 pt-3 dark:border-stone-800">
          <SaveRecipeButton recipeId={recipe.id} saveCount={recipe.save_count} variant="icon" />
          <Link
            href={`/recipe/${recipe.id}#comments`}
            className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-orange-950 dark:hover:text-orange-300"
          >
            💬 {recipe.comment_count} {t("home.comments")}
          </Link>
        </div>

        <Link
          href={`/recipe/${recipe.id}`}
          className="mt-3 inline-flex text-sm font-semibold text-orange-700 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
        >
          {t("home.open_recipe")} <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
