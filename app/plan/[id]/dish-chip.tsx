"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import type { MealPlanSlot, Recipe } from "@/lib/types";

interface SlotWithRecipe extends MealPlanSlot {
  recipes?: Recipe;
}

export function DishChip({ slot }: { slot: SlotWithRecipe }) {
  const { locale } = useLanguage();
  if (!slot.recipes) return null;
  const r = slot.recipes;
  const cal = r.calories_per_serving != null
    ? Math.round(r.calories_per_serving * (slot.servings || 1))
    : null;
  const displayTitle = (locale === "zh" && r.title_zh) ? r.title_zh : r.title;

  return (
    <Link
      href={`/recipe/${r.id}`}
      className="block rounded-lg bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
    >
      <div className="flex items-center gap-2">
        {r.hero_image_url ? (
          <img src={r.hero_image_url} alt="" className="h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0 rounded-md object-cover" />
        ) : (
          <div className="h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-base">🍽</div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-indigo-700 dark:text-indigo-400 font-medium text-sm sm:text-xs leading-snug break-words block">
            {displayTitle}
          </span>
          {cal != null && (
            <span className="text-xs sm:text-[11px] text-zinc-500 dark:text-zinc-400">{cal} cal</span>
          )}
        </div>
      </div>
    </Link>
  );
}
