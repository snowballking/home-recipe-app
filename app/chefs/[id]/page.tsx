"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { RecipeCard } from "@/app/components/recipe-card";
import { ChefFollowButton } from "@/app/components/chef-follow-button";
import type { Chef, Recipe } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";

export default function ChefProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const { t } = useLanguage();
  const [chef, setChef] = useState<Chef | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: chefData }, { data: recipeData }, { count }] = await Promise.all([
        supabase.from("chefs").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("recipes")
          .select("*")
          .eq("chef_id", id)
          .eq("is_public", true)
          .order("created_at", { ascending: false }),
        supabase.from("chef_follows").select("*", { count: "exact", head: true }).eq("chef_id", id),
      ]);
      setChef((chefData as Chef) ?? null);
      setRecipes((recipeData as Recipe[]) ?? []);
      setFollowerCount(count ?? 0);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-full bg-background">
        <NavBar />
        <p className="mt-16 text-center text-sm text-zinc-500">...</p>
      </div>
    );
  }

  if (!chef) {
    return (
      <div className="min-h-full bg-background">
        <NavBar />
        <p className="mt-16 text-center text-sm text-zinc-500">{t("chefs.no_chefs")}</p>
      </div>
    );
  }

  const channelLabel =
    chef.source_site === "youtube" ? t("chefs.watch_youtube") : t("chefs.visit_channel");

  return (
    <div className="min-h-full bg-background">
      <NavBar />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:flex sm:items-center sm:gap-6">
          {chef.avatar_url && /^https?:\/\//i.test(chef.avatar_url) ? (
            <img src={chef.avatar_url} alt={chef.name} className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 text-4xl dark:bg-amber-900/40">
              👨‍🍳
            </span>
          )}
          <div className="mt-4 flex-1 sm:mt-0">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{chef.name}</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {recipes.length} {t("chefs.recipes")} · {followerCount} {t("chefs.followers")}
            </p>
            {chef.bio && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{chef.bio}</p>}
            {chef.channel_url && /^https?:\/\//i.test(chef.channel_url) && (
              <a
                href={chef.channel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
              >
                ▶ {channelLabel} ↗
              </a>
            )}
            {chef.linked_profile_id && (
              <Link
                href={`/user/${chef.linked_profile_id}`}
                className="mt-1 block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                View app profile →
              </Link>
            )}
          </div>
          <div className="mt-4 sm:mt-0">
            <ChefFollowButton
              chefId={chef.id}
              size="lg"
              onToggled={(now) => setFollowerCount((c) => c + (now ? 1 : -1))}
            />
          </div>
        </div>

        {/* Recipes */}
        {recipes.length === 0 ? (
          <p className="mt-10 text-center text-sm text-zinc-500">{t("chefs.no_recipes")}</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} showAuthor={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
