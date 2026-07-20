"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { StarRating } from "@/app/components/star-rating";
import type { Recipe } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";

type DeckRecipe = Recipe & {
  profiles?: { displayname: string | null } | null;
  chefs?: { id: string; name: string } | null;
};

export default function DiscoverPage() {
  const supabase = createClient();
  const { locale, t } = useLanguage();
  const [recipes, setRecipes] = useState<DeckRecipe[]>([]);
  const [mode, setMode] = useState<"latest" | "popular">("latest");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("recipes")
        .select("*, profiles(displayname), chefs(id, name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(100);
      setRecipes((data as DeckRecipe[]) ?? []);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data: saves } = await supabase
            .from("recipe_saves")
            .select("recipe_id")
            .eq("user_id", user.id);
          setSavedIds(new Set((saves ?? []).map((s) => s.recipe_id)));
        }
      } catch {
        // Auth lock race — safe to ignore
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deck = useMemo(() => {
    if (mode === "latest") return recipes;
    // Popular = what users are saving / rating / commenting on (no view tracking)
    return [...recipes].sort((a, b) => {
      const score = (r: DeckRecipe) =>
        (r.save_count ?? 0) * 3 + (r.rating_count ?? 0) * 2 + (r.comment_count ?? 0);
      return score(b) - score(a) || (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
    });
  }, [recipes, mode]);

  async function toggleSave(recipeId: string) {
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    if (savedIds.has(recipeId)) {
      await supabase.from("recipe_saves").delete().eq("user_id", userId).eq("recipe_id", recipeId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    } else {
      await supabase.from("recipe_saves").insert({ user_id: userId, recipe_id: recipeId });
      setSavedIds((prev) => new Set(prev).add(recipeId));
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <NavBar />

      <div className="relative flex-1 overflow-hidden">
        {/* Latest / Popular toggle — floats over the deck */}
        <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 gap-1 rounded-full bg-black/50 p-1 backdrop-blur">
          {(["latest", "popular"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === m ? "bg-white text-zinc-900" : "text-white/80 hover:text-white"
              }`}
            >
              {m === "latest" ? t("discover.latest") : t("discover.popular")}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-20 text-center text-sm text-zinc-400">...</p>
        ) : deck.length === 0 ? (
          <p className="mt-20 text-center text-sm text-zinc-400">{t("discover.empty")}</p>
        ) : (
          <div className="h-full snap-y snap-mandatory overflow-y-auto">
            {deck.map((r, i) => {
              const title = locale === "zh" && r.title_zh ? r.title_zh : r.title;
              const byline = r.chefs?.name ?? r.profiles?.displayname ?? null;
              const saved = savedIds.has(r.id);
              return (
                <section key={r.id} className="relative h-full w-full snap-start overflow-hidden">
                  {/* Background photo */}
                  {r.hero_image_url ? (
                    <img
                      src={r.hero_image_url}
                      alt={title}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900 to-zinc-900 text-8xl">
                      🍽
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

                  {r.image_source === "ai_generated" && (
                    <span className="absolute right-3 top-16 z-10 rounded-full bg-indigo-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                      ✨ {t("recipe_card.ai_image")}
                    </span>
                  )}

                  {/* Info + actions */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-8">
                    <h2 className="text-2xl font-bold text-white drop-shadow">{title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {r.cuisine && (
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
                          {r.cuisine}
                        </span>
                      )}
                      <StarRating rating={r.avg_rating} count={r.rating_count} size="sm" />
                    </div>
                    {byline && (
                      <p className="mt-1.5 text-sm text-white/80">
                        {t("recipe.by_chef")}{" "}
                        {r.chefs ? (
                          <Link href={`/chefs/${r.chefs.id}`} className="font-medium underline">
                            {byline}
                          </Link>
                        ) : (
                          <span className="font-medium">{byline}</span>
                        )}
                      </p>
                    )}
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => toggleSave(r.id)}
                        className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                          saved
                            ? "bg-rose-600 text-white"
                            : "bg-white/20 text-white backdrop-blur hover:bg-white/30"
                        }`}
                      >
                        {saved ? t("discover.saved") : t("discover.save")}
                      </button>
                      <Link
                        href={`/recipe/${r.id}`}
                        className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                      >
                        {t("discover.open")}
                      </Link>
                    </div>
                    {i === 0 && deck.length > 1 && (
                      <p className="mt-4 animate-bounce text-center text-xs text-white/60">
                        ↑ {t("discover.swipe_hint")}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
