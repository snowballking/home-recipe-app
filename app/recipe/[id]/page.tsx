import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/app/components/nav-bar";
import { CommentSection } from "@/app/components/comment-section";
import { SaveRecipeButton } from "@/app/components/save-recipe-button";
import { FollowButton } from "@/app/components/follow-button";
import { ReportRecipeButton } from "@/app/components/report-recipe-button";
import { RecipeRating } from "./recipe-rating";
import {
  RecipeTitle,
  RecipeDescription,
  RecipeImportantNote,
  RecipeIngredients,
  RecipeSteps,
  Tr,
  RecipeActions,
  ForkBanner,
  RecipeDifficultyValue,
  TrCuisine,
  TrMealType,
  TrDietaryTag,
} from "./recipe-content";
import { ChefFollowButton } from "@/app/components/chef-follow-button";
import { RecipeVariationSelector } from "@/app/components/recipe-variation-selector";
import { RecipeVariationChanges } from "@/app/components/recipe-variation-changes";
import { getRecipeFamilyOptions, getRecipeFamilyOriginalId } from "@/lib/recipe-family";
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

  // Curated chef attribution (imported recipes)
  let chef: { id: string; name: string; avatar_url: string | null } | null = null;
  let chefRecipeCount = 0;
  let chefFollowerCount = 0;
  if (recipe.chef_id) {
    const [{ data: chefData }, { count: recipeCount }, { count: followerCount }] = await Promise.all([
      supabase.from("chefs").select("id, name, avatar_url").eq("id", recipe.chef_id).maybeSingle(),
      supabase
        .from("recipes")
        .select("*", { count: "exact", head: true })
        .eq("chef_id", recipe.chef_id)
        .eq("is_public", true),
      supabase.from("chef_follows").select("*", { count: "exact", head: true }).eq("chef_id", recipe.chef_id),
    ]);
    chef = chefData;
    chefRecipeCount = recipeCount ?? 0;
    chefFollowerCount = followerCount ?? 0;
  }

  const typedRecipe = recipe as Recipe;
  const profile = authorProfile as { id: string; displayname: string | null; avatar_url: string | null; follower_count: number; recipe_count: number; is_chef: boolean | null; specialties: string[] | null } | null;

  // Check if current user is the recipe owner
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === typedRecipe.user_id;

  // A recipe and its public variations are presented as one family. A direct
  // link to a variation keeps its materialised recipe data selected while the
  // original and sibling variations remain available in the selector.
  const familyOriginalId = getRecipeFamilyOriginalId(
    typedRecipe.id,
    typedRecipe.original_recipe_id,
  );
  let familyOriginal: {
    id: string;
    title: string | null;
    title_zh: string | null;
    user_id: string;
  } = {
    id: typedRecipe.id,
    title: typedRecipe.title,
    title_zh: typedRecipe.title_zh,
    user_id: typedRecipe.user_id,
  };
  let forkParent: { id: string; title: string | null; title_zh: string | null; author: string | null } | null = null;
  if (familyOriginalId !== typedRecipe.id) {
    const { data: parent } = await supabase
      .from("recipes")
      .select("id, title, title_zh, user_id")
      .eq("id", familyOriginalId)
      .maybeSingle();
    if (parent) {
      familyOriginal = parent;
    }
  }

  const { data: variationsData } = await supabase
    .from("recipes")
    .select("id, title, title_zh, user_id, variation_note")
    .eq("original_recipe_id", familyOriginal.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  const variations = (variationsData ?? []) as {
    id: string;
    title: string | null;
    title_zh: string | null;
    user_id: string;
    variation_note: string | null;
  }[];

  const familyAuthorIds = [...new Set([familyOriginal.user_id, ...variations.map((variation) => variation.user_id)])];
  const { data: familyAuthors } = await supabase
    .from("profiles")
    .select("id, displayname")
    .in("id", familyAuthorIds);
  const familyAuthorNames = new Map(
    (familyAuthors ?? []).map((familyAuthor) => [familyAuthor.id, familyAuthor.displayname as string | null]),
  );
  const familyOptions = getRecipeFamilyOptions(
    {
      ...familyOriginal,
      authorName: familyAuthorNames.get(familyOriginal.user_id) ?? null,
    },
    variations.map((variation) => ({
      ...variation,
      authorName: familyAuthorNames.get(variation.user_id) ?? null,
      variationNote: variation.variation_note,
    })),
  );

  if (familyOriginal.id !== typedRecipe.id) {
    forkParent = {
      id: familyOriginal.id,
      title: familyOriginal.title,
      title_zh: familyOriginal.title_zh,
      author: familyAuthorNames.get(familyOriginal.user_id) ?? null,
    };
  }

  const totalTime = (typedRecipe.prep_time ?? 0) + (typedRecipe.cook_time ?? 0);
  const altIngredients = (typedRecipe.alternative_ingredients ?? []) as { name: string; description: string }[];

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-zinc-500">
          <Link href="/explore" className="hover:text-indigo-600">
            <Tr en="Explore" zh="探索" />
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
            {!typedRecipe.source_url && !typedRecipe.original_recipe_id && (
              <span className="absolute top-3 right-3 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white shadow">
                <Tr en="⭐ User's Original" zh="⭐ 用户原创" />
              </span>
            )}
            {typedRecipe.image_source === "ai_generated" && (
              <span className="absolute bottom-3 left-3 rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-semibold text-white shadow">
                <Tr en="✨ AI-generated image" zh="✨ AI 生成图片" />
              </span>
            )}
          </div>
        )}

        {/* Owner prompt: replace AI placeholder with a real photo */}
        {isOwner && typedRecipe.image_source === "ai_generated" && (
          <div className="mb-6 -mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/40">
            <Link
              href={`/dashboard/recipes/${typedRecipe.id}/edit`}
              className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
            >
              <Tr en="📷 Cooked it? Replace the AI image with a photo of your own dish →" zh="📷 做过这道菜？把 AI 图片换成你自己拍的照片 →" />
            </Link>
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
          <RecipeActions recipeId={typedRecipe.id} isOwner={isOwner} isLoggedIn={!!user} />
        </div>

        <RecipeVariationSelector
          activeRecipeId={typedRecipe.id}
          options={familyOptions}
        />

        {/* "Based on…" banner — this recipe is a variation of another */}
        {forkParent && (
          <ForkBanner
            parentId={forkParent.id}
            title={forkParent.title}
            titleZh={forkParent.title_zh}
            author={forkParent.author}
            note={typedRecipe.variation_note}
          />
        )}

        <RecipeVariationChanges diff={typedRecipe.variation_diff} />

        {/* Chef Card (curated attribution) — falls back to the uploader when no chef is assigned */}
        {chef ? (
          <div className="mt-4">
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <Link href={`/chefs/${chef.id}`} className="flex items-center gap-3 hover:opacity-80">
                {chef.avatar_url && /^https?:\/\//i.test(chef.avatar_url) ? (
                  <img src={chef.avatar_url} alt={chef.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg dark:bg-amber-900/40">
                    👨‍🍳
                  </span>
                )}
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {chef.name}
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      👨‍🍳 <Tr en="Chef" zh="厨师" />
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {chefRecipeCount} <Tr en="recipes" zh="个食谱" /> · {chefFollowerCount} <Tr en="followers" zh="位粉丝" />
                  </p>
                </div>
              </Link>
              <ChefFollowButton chefId={chef.id} />
            </div>
            <p className="mt-1.5 px-1 text-xs text-zinc-500">
              <Tr en="Uploaded by" zh="上传者：" />{" "}
              <Link
                href={`/user/${typedRecipe.user_id}`}
                className="font-medium text-indigo-700 hover:underline dark:text-indigo-300"
              >
                {profile?.displayname ?? "Anonymous"}
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Link
              href={`/user/${typedRecipe.user_id}`}
              className="flex items-center gap-3 hover:opacity-80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                {(profile?.displayname?.[0] ?? "?").toUpperCase()}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {profile?.displayname ?? "Anonymous"}
                  {profile?.is_chef && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      👨‍🍳 <Tr en="Chef" zh="厨师" />
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  {profile?.recipe_count ?? 0} <Tr en="recipes" zh="个食谱" />
                  {" · "}
                  {profile?.follower_count ?? 0} <Tr en="followers" zh="位粉丝" />
                  {(profile?.specialties?.length ?? 0) > 0 && (
                    <> · {profile?.specialties?.slice(0, 3).join(" · ")}</>
                  )}
                </p>
              </div>
            </Link>
            <FollowButton targetUserId={typedRecipe.user_id} />
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-4 flex flex-wrap gap-3">
          {totalTime > 0 && (
            <div className="rounded-lg bg-white px-3 py-2 text-center border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{totalTime}</p>
              <p className="text-xs text-zinc-500"><Tr en="minutes" zh="分钟" /></p>
            </div>
          )}
          <div className="rounded-lg bg-white px-3 py-2 text-center border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{typedRecipe.servings}</p>
            <p className="text-xs text-zinc-500"><Tr en="servings" zh="份量" /></p>
          </div>
          {typedRecipe.calories_per_serving && (
            <div className="rounded-lg bg-white px-3 py-2 text-center border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {Math.round(typedRecipe.calories_per_serving)}
              </p>
              <p className="text-xs text-zinc-500"><Tr en="cal/serving" zh="卡/份" /></p>
            </div>
          )}
          <div className="rounded-lg bg-white px-3 py-2 text-center border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-50">
              <RecipeDifficultyValue value={typedRecipe.difficulty} />
            </p>
            <p className="text-xs text-zinc-500"><Tr en="difficulty" zh="难度" /></p>
          </div>
        </div>

        {/* Tags */}
        {(typedRecipe.cuisine || typedRecipe.dietary_tags?.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {typedRecipe.cuisine && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                <TrCuisine value={typedRecipe.cuisine} />
              </span>
            )}
            {typedRecipe.meal_type && (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium capitalize text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <TrMealType value={typedRecipe.meal_type} />
              </span>
            )}
            {typedRecipe.dietary_tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                <TrDietaryTag value={tag} />
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
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
          <a
            href="#comments"
            className="text-sm text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
          >
            💬 {typedRecipe.comment_count}{" "}
            {typedRecipe.comment_count === 1 ? <Tr en="comment" zh="条评论" /> : <Tr en="comments" zh="条评论" />}
          </a>
        </div>

        {/* Nutrition Panel */}
        {typedRecipe.calories_per_serving && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <Tr en="Estimated Nutrition (per serving)" zh="预估营养（每份）" />
            </h2>
            <div className="mt-3 grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {Math.round(typedRecipe.calories_per_serving)}
                </p>
                <p className="text-xs text-zinc-500"><Tr en="Calories" zh="卡路里" /></p>
              </div>
              {typedRecipe.protein_grams != null && (
                <div>
                  <p className="text-xl font-bold text-blue-600">{Math.round(typedRecipe.protein_grams)}g</p>
                  <p className="text-xs text-zinc-500"><Tr en="Protein" zh="蛋白质" /></p>
                </div>
              )}
              {typedRecipe.carbs_grams != null && (
                <div>
                  <p className="text-xl font-bold text-amber-600">{Math.round(typedRecipe.carbs_grams)}g</p>
                  <p className="text-xs text-zinc-500"><Tr en="Carbs" zh="碳水" /></p>
                </div>
              )}
              {typedRecipe.fat_grams != null && (
                <div>
                  <p className="text-xl font-bold text-red-500">{Math.round(typedRecipe.fat_grams)}g</p>
                  <p className="text-xs text-zinc-500"><Tr en="Fat" zh="脂肪" /></p>
                </div>
              )}
            </div>
            <p className="mt-2 text-[10px] text-zinc-400">
              <Tr en="* Nutritional values are estimates and may vary based on preparation." zh="* 营养数值为估算值，实际可能因做法不同而有差异。" />
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

        {/* Source Attribution (scheme check blocks javascript: URIs) */}
        {typedRecipe.source_url && /^https?:\/\//i.test(typedRecipe.source_url) && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <Tr en="Original Source" zh="原始来源" />
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
              <Tr en="This recipe was adapted from the source above. Visit the original for the author's full version." zh="本食谱改编自上方来源。查看原文以获取作者的完整版本。" />
            </p>
          </div>
        )}

        {/* Comments */}
        <div id="comments" className="mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <CommentSection
            recipeId={typedRecipe.id}
            recipeOwnerId={typedRecipe.user_id}
          />
        </div>

        {/* Report content (takedown) */}
        <div className="mt-8 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="mb-1 text-xs text-zinc-400">
            <Tr en="Believe this recipe infringes your rights? Report it and we'll review it promptly." zh="认为此食谱侵犯了你的权益？举报后我们会尽快处理。" />
          </p>
          <ReportRecipeButton recipeId={typedRecipe.id} />
        </div>
      </div>
    </div>
  );
}
