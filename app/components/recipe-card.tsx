"use client";

import Link from "next/link";
import { StarRating } from "./star-rating";
import type { Recipe } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";
import { translateCuisine, translateDietaryTag, translateDifficulty } from "@/lib/i18n/translations";

interface RecipeCardProps {
  recipe: Recipe;
  showAuthor?: boolean;
  compact?: boolean;
}

export function RecipeCard({ recipe, showAuthor = true, compact = false }: RecipeCardProps) {
  const { locale, t } = useLanguage();
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  const displayTitle = (locale === "zh" && recipe.title_zh) ? recipe.title_zh : recipe.title;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900">
      <Link href={`/recipe/${recipe.id}`} className="flex flex-1 flex-col">
      {/* Image */}
      <div className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${compact ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
        {recipe.hero_image_url ? (
          <img
            src={recipe.hero_image_url}
            alt={displayTitle}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-zinc-300 dark:text-zinc-600">
            🍽
          </div>
        )}
        {/* Top-right badges stack */}
        <div className={`absolute flex flex-col items-end ${compact ? "right-1.5 top-1.5 gap-0.5" : "right-2 top-2 gap-1"}`}>
          {!recipe.source_url && !recipe.original_recipe_id && (
            <span className={`rounded-full bg-emerald-600/90 font-semibold text-white shadow-sm ${compact ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]"}`}>
              {t("recipe_card.original")}
            </span>
          )}
          {recipe.original_recipe_id && (
            <span className={`rounded-full bg-violet-600/90 font-semibold text-white shadow-sm ${compact ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]"}`}>
              🔀 {t("fork.variation_tag")}
            </span>
          )}
          {recipe.image_source === "ai_generated" && (
            <span className={`rounded-full bg-indigo-600/90 font-semibold text-white shadow-sm ${compact ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]"}`}>
              ✨ {t("recipe_card.ai_image")}
            </span>
          )}
          {recipe.is_public === false && (
            <span className={`rounded-full bg-zinc-900/70 text-white ${compact ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-xs"}`}>
              {t("recipe.private")}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-4"}`}>
        <h3 className={`line-clamp-2 font-semibold text-zinc-900 dark:text-zinc-50 ${compact ? "text-xs" : "text-sm"}`}>
          {displayTitle}
        </h3>

        <div className={compact ? "mt-1.5" : "mt-2"}>
          <StarRating
            rating={recipe.avg_rating}
            count={recipe.rating_count}
            size="sm"
          />
        </div>

        {/* Quick stats */}
        <div className={`mt-auto flex items-center text-zinc-500 dark:text-zinc-400 ${compact ? "gap-2 pt-2 text-[11px]" : "gap-3 pt-3 text-xs"}`}>
          {totalTime > 0 && <span>{totalTime} {t("recipe.minutes")}</span>}
          {recipe.calories_per_serving && (
            <span>{Math.round(recipe.calories_per_serving)} {t("recipe_card.cal")}</span>
          )}
          {recipe.difficulty && (
            <span className="capitalize">{translateDifficulty(recipe.difficulty, locale)}</span>
          )}
        </div>

        {/* Tags */}
        {(recipe.cuisine || recipe.dietary_tags?.length > 0) && (
          <div className={`flex flex-wrap gap-1 ${compact ? "mt-1.5" : "mt-2"}`}>
            {recipe.cuisine && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {translateCuisine(recipe.cuisine, locale)}
              </span>
            )}
            {recipe.dietary_tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                {translateDietaryTag(tag, locale)}
              </span>
            ))}
          </div>
        )}
      </div>
      </Link>
      {showAuthor && recipe.chefs && (
        <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-stone-950/75 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
          <span className="truncate">{t("recipe.by_chef")} {recipe.chefs.name}</span>
          <span className="shrink-0 rounded-full bg-orange-400 px-1.5 py-px text-[9px] font-bold text-stone-950">{t("recipe.chef_role")}</span>
        </div>
      )}
    </div>
  );
}
