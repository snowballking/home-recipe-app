"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/app/components/nav-bar";
import { RecipeFeedCard } from "@/app/components/recipe-feed-card";
import { filterFeedRecipes, type FeedTab } from "@/lib/feed";
import { useLanguage } from "@/lib/i18n/language-context";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@/lib/types";

type PublicRecipe = Recipe & {
  profiles?: { displayname: string | null } | null;
};

export default function HomePage() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setLoading(true);

    const recipeRequest = supabase
      .from("recipes")
      .select("*, profiles(displayname)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(100);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: publicRecipes }, followsResult] = await Promise.all([
      recipeRequest,
      user
        ? supabase.from("follows").select("following_id").eq("follower_id", user.id)
        : Promise.resolve({ data: [] as { following_id: string }[] }),
    ]);

    const withAuthors = ((publicRecipes ?? []) as PublicRecipe[]).map((recipe) => ({
      ...recipe,
      author_name: recipe.profiles?.displayname ?? "Anonymous",
    }));

    setRecipes(withAuthors);
    setFollowedUserIds(new Set((followsResult.data ?? []).map((follow) => follow.following_id)));
    setIsSignedIn(Boolean(user));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const feed = useMemo(
    () => filterFeedRecipes(recipes, tab, followedUserIds),
    [recipes, tab, followedUserIds],
  );

  return (
    <div className="min-h-full bg-[#fffaf4] pb-20 dark:bg-stone-950 md:pb-8">
      <NavBar />

      <main className="mx-auto max-w-2xl px-4 py-7 sm:py-10">
        <div className="mb-7 flex items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
              {t("home.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-stone-950 dark:text-stone-50 sm:text-4xl">
              {t("home.title")}
            </h1>
          </div>
          <Link
            href="/discover"
            className="shrink-0 text-sm font-semibold text-orange-700 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
          >
            {t("nav.discover")} <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mb-5 inline-flex rounded-full bg-orange-100/80 p-1 dark:bg-stone-900">
          {(["for-you", "following"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              aria-pressed={tab === option}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === option
                  ? "bg-white text-orange-700 shadow-sm dark:bg-stone-800 dark:text-orange-300"
                  : "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
              }`}
            >
              {option === "for-you" ? t("home.for_you") : t("home.following")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-orange-100 bg-white p-10 text-center shadow-[0_10px_35px_rgba(89,57,33,0.06)] dark:border-stone-800 dark:bg-stone-900">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />
          </div>
        ) : feed.length > 0 ? (
          <div className="space-y-5">
            {feed.map((recipe) => <RecipeFeedCard key={recipe.id} recipe={recipe} />)}
          </div>
        ) : tab === "following" ? (
          <section className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-12 text-center dark:border-orange-900 dark:bg-orange-950/20">
            <div className="text-4xl" aria-hidden>👩‍🍳</div>
            <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-stone-600 dark:text-stone-300">
              {t("home.empty_following")}
            </p>
            {!isSignedIn && (
              <Link href="/login" className="mt-5 inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 dark:bg-orange-600 dark:hover:bg-orange-700">
                {t("nav.sign_in")}
              </Link>
            )}
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-12 text-center dark:border-orange-900 dark:bg-orange-950/20">
            <div className="text-4xl" aria-hidden>🍲</div>
            <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">{t("market.no_recipes")}</p>
          </section>
        )}
      </main>
    </div>
  );
}
