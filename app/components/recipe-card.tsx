import Link from "next/link";
import { StarRating } from "./star-rating";
import type { Recipe } from "@/lib/types";

interface RecipeCardProps {
  recipe: Recipe;
  showAuthor?: boolean;
}

export function RecipeCard({ recipe, showAuthor = true }: RecipeCardProps) {
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {recipe.hero_image_url ? (
          <img
            src={recipe.hero_image_url}
            alt={recipe.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-zinc-300 dark:text-zinc-600">
            🍽
          </div>
        )}
        {/* Top-right badges stack */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {!recipe.source_url && (
            <span className="rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              ⭐ User&apos;s Original
            </span>
          )}
          {recipe.is_public === false && (
            <span className="rounded-full bg-zinc-900/70 px-2 py-0.5 text-xs text-white">
              Private
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {recipe.title}
        </h3>

        {showAuthor && recipe.author_name && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            by {recipe.author_name}
          </p>
        )}

        <div className="mt-2">
          <StarRating
            rating={recipe.avg_rating}
            count={recipe.rating_count}
            size="sm"
          />
        </div>

        {/* Quick stats */}
        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-zinc-500 dark:text-zinc-400">
          {totalTime > 0 && <span>{totalTime} min</span>}
          {recipe.calories_per_serving && (
            <span>{Math.round(recipe.calories_per_serving)} cal</span>
          )}
          {recipe.difficulty && (
            <span className="capitalize">{recipe.difficulty}</span>
          )}
        </div>

        {/* Tags */}
        {(recipe.cuisine || recipe.dietary_tags?.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.cuisine && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {recipe.cuisine}
              </span>
            )}
            {recipe.dietary_tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
