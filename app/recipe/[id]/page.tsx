import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/app/components/nav-bar";
import { CommentSection } from "@/app/components/comment-section";
import { SaveRecipeButton } from "@/app/components/save-recipe-button";
import { FollowButton } from "@/app/components/follow-button";
import { RecipeRating } from "./recipe-rating";
import { RecipeTitle, RecipeDescription, RecipeImportantNote, RecipeIngredients, RecipeSteps } from "./recipe-content";
import type { Recipe } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch recipe and author profile separately to avoid FK join issues
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (!recipe || recipeError) notFound();

  // Fetch author profile separately
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", recipe.user_id)
    .single();

  const typedRecipe = recipe as Recipe;
  const profile = authorProfile as { id: string; displayname: string | null; avatar_url: string | null; follower_count: number; recipe_count: number } | null;

  // Check if current user is the recipe owner
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === typedRecipe.user_id;

  const totalTime = (typedRecipe.prep_time ?? 0) + (typedRecipe.cook_time ?? 0);
  const altIngredients = (typedRecipe.alternative_ingredients ?? []) as { name: string; description: string }[];

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-zinc-500">
          <Link href="/explore" className="hover:text-indigo-600">
            Explore
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900 dark:text-zinc-100">
            <RecipeTitle recipe={typedRecipe} />
          </span>
        </nav>

        {/* Hero Image */}
        {typedRecipe.hero_image_url && (
          <div className="relative mb-6 aspect-video overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <img
              src={typedRecipe.hero_image_url}
              alt={typedRecipe.title ?? ""}
              className="h-full w-full object-cover"
            />
            {!typedRecipe.source_url && (
              <span className="absolute top-3 right-3 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white shadow">
                ⭐ User&apos;s Original
              </span>
            )}
          </div>
        )}

        {/* Title & Meta */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              <RecipeTitle recipe={typedRecipe} />
            </h1>
            <RecipeDescription recipe={typedRecipe} />
          </div>
          {isOwner && (
            <Link
              href={`/dashboard/recipes/${typedRecipe.id}/edit`}
              className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300"
            >
              Edit
            </Link>
          )}
        </div>

        {/* Author Card */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <Link
            href={`/user/${typedRecipe.user_id}`}
            className="flex items-center gap-3 hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {(profile?.displayname?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {profile?.displayname ?? "Anonymous"}
              </p>
              <p className="text-xs text-zinc-500">
                {profile?.recipe_count ?? 0} recipes
                {" · "}
                {profile?.follower_count ?? 0} followers
              </p>
            </div>
          </Link>
          <FollowButton targetUserId={typedRecipe.user_id} />
        </div>

        {/* Quick Stats */}
        <div className="mt-4 flex flex-wrap gap-3">
          {totalTime > 0 && (
            <div className="rounded-lg bg-white px-3 py-2 text-center border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{totalTime}</p>
              <p className="text-xs text-zinc-500">minutes</p>
            </div>
          )}
          <div className="rounded-lg bg-white px-3 py-2 text-center border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{typedRecipe.servings}</p>
            <p className="text-xs text-zinc-500">servings</p>
          </div>
          {typedRecipe.calories_per_serving && (
            <div className="rounded-lg bg-white px-3 py-2 text-center border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {Math.round(typedRecipe.calories_per_serving)}
              </p>
              <p className="text-xs text-zinc-500">cal/serving</p>
            </div>
          )}
          <div className="rounded-lg bg-white px-3 py-2 text-center border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-50">
              {typedRecipe.difficulty}
            </p>
            <p className="text-xs text-zinc-500">difficulty</p>
          </div>
        </div>

        {/* Tags */}
        {(typedRecipe.cuisine || typedRecipe.dietary_tags?.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {typedRecipe.cuisine && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {typedRecipe.cuisine}
              </span>
            )}
            {typedRecipe.meal_type && (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium capitalize text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                {typedRecipe.meal_type}
              </span>
            )}
            {typedRecipe.dietary_tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Rating & Save */}
        <div className="mt-6 flex items-center gap-4 border-y border-zinc-200 py-4 dark:border-zinc-800">
          <RecipeRating
            recipeId={typedRecipe.id}
            avgRating={typedRecipe.avg_rating}
            ratingCount={typedRecipe.rating_count}
          />
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
          <SaveRecipeButton
            recipeId={typedRecipe.id}
            saveCount={typedRecipe.save_count}
          />
        </div>

        {/* Nutrition Panel */}
        {typedRecipe.calories_per_serving && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Estimated Nutrition (per serving)
            </h2>
            <div className="mt-3 grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {Math.round(typedRecipe.calories_per_serving)}
                </p>
                <p className="text-xs text-zinc-500">Calories</p>
              </div>
              {typedRecipe.protein_grams != null && (
                <div>
                  <p className="text-xl font-bold text-blue-600">{Math.round(typedRecipe.protein_grams)}g</p>
                  <p className="text-xs text-zinc-500">Protein</p>
                </div>
              )}
              {typedRecipe.carbs_grams != null && (
                <div>
                  <p className="text-xl font-bold text-amber-600">{Math.round(typedRecipe.carbs_grams)}g</p>
                  <p className="text-xs text-zinc-500">Carbs</p>
                </div>
              )}
              {typedRecipe.fat_grams != null && (
                <div>
                  <p className="text-xl font-bold text-red-500">{Math.round(typedRecipe.fat_grams)}g</p>
                  <p className="text-xs text-zinc-500">Fat</p>
                </div>
              )}
            </div>
            <p className="mt-2 text-[10px] text-zinc-400">
              * Nutritional values are estimates and may vary based on preparation.
            </p>
          </div>
        )}

        {/* Important Note */}
        <RecipeImportantNote recipe={typedRecipe} />

        {/* Ingredients */}
        <RecipeIngredients recipe={typedRecipe} />

        {/* Alternative Ingredients */}
        {altIngredients.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Alternative Ingredients
            </h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 w-12">#</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 w-1/3">Alternative Ingredient</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400">Description / Replacement Ingredients</th>
                  </tr>
                </thead>
                <tbody>
                  {altIngredients.map((alt, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-b-0 border-zinc-100 dark:border-zinc-800 odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50"
                    >
                      <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">{alt.name}</td>
                      <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{alt.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Steps */}
        <RecipeSteps recipe={typedRecipe} />

        {/* Source Attribution */}
        {typedRecipe.source_url && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Original Source
            </p>
            <a
              href={typedRecipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
            >
              {(() => {
                try { return new URL(typedRecipe.source_url).hostname.replace("www.", ""); }
                catch { return typedRecipe.source_url; }
              })()}
              <span className="ml-1 text-blue-400">&#8599;</span>
            </a>
            <p className="mt-1.5 text-[11px] text-blue-500 dark:text-blue-400">
              This recipe was adapted from the source above. Visit the original for the author&apos;s full version.
            </p>
          </div>
        )}

        {/* Comments */}
        <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <CommentSection
            recipeId={typedRecipe.id}
            recipeOwnerId={typedRecipe.user_id}
          />
        </div>
      </div>
    </div>
  );
}
