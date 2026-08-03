"use client";

import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/app/components/nav-bar";
import { RecipeCard } from "@/app/components/recipe-card";
import { filterDiscoverRecipes } from "@/lib/feed";
import { useLanguage } from "@/lib/i18n/language-context";
import { translateCategory } from "@/lib/i18n/translations";
import { createClient } from "@/lib/supabase/client";
import { RECIPE_CATEGORIES } from "@/lib/types";
import type { Recipe, RecipeCategory } from "@/lib/types";

type DiscoverMode = "latest" | "popular";

const CATEGORY_BUTTON_CLASS =
  "flex min-h-9 min-w-0 items-center justify-center gap-1 whitespace-normal rounded-2xl px-1.5 py-1.5 text-[10px] font-semibold leading-tight transition-colors sm:min-h-0 sm:shrink-0 sm:rounded-full sm:px-3.5 sm:py-2 sm:text-sm";

export default function DiscoverPage() {
  const supabase = createClient();
  const { locale, t } = useLanguage();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("all");
  const [mode, setMode] = useState<DiscoverMode>("latest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecipes() {
      setLoading(true);
      const { data } = await supabase
        .from("recipes")
        .select("*, chefs(id,name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(100);

      setRecipes((data ?? []) as Recipe[]);
      setLoading(false);
    }

    void loadRecipes();
    // The browser client is stable for the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRecipes = useMemo(() => {
    const searched = filterDiscoverRecipes(recipes, search);
    const categorised = category === "all"
      ? searched
      : searched.filter((recipe) => recipe.category === category);

    if (mode === "latest") return categorised;
    return [...categorised].sort((a, b) => {
      const score = (recipe: Recipe) =>
        recipe.save_count * 3 + recipe.rating_count * 2 + recipe.comment_count;
      return score(b) - score(a) || b.avg_rating - a.avg_rating;
    });
  }, [recipes, search, category, mode]);

  const categories = RECIPE_CATEGORIES.filter((item) => item.value !== "all");

  return (
    <div className="min-h-full bg-[#fffaf4] pb-20 dark:bg-stone-950 md:pb-8">
      <NavBar />

      <main className="mx-auto max-w-6xl px-4 py-7 sm:py-10">
        <section className="rounded-[2rem] bg-stone-950 px-5 py-7 text-white shadow-[0_18px_55px_rgba(62,37,16,0.18)] sm:px-8 sm:py-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">{t("nav.discover")}</p>
          <h1 className="mt-2 max-w-xl text-3xl font-bold tracking-[-0.045em] sm:text-4xl">{t("discover.title")}</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-stone-300">{t("discover.subtitle")}</p>
          <label className="mt-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-stone-900 shadow-sm focus-within:ring-2 focus-within:ring-orange-400">
            <span aria-hidden className="text-lg text-orange-600">⌕</span>
            <span className="sr-only">{t("market.search")}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("discover.search")}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium placeholder:text-stone-400 focus:outline-none"
            />
          </label>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div
            data-testid="discover-categories"
            className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-1 sm:flex-wrap sm:gap-2"
          >
            <button
              type="button"
              onClick={() => setCategory("all")}
              aria-pressed={category === "all"}
              className={`${CATEGORY_BUTTON_CLASS} ${
                category === "all"
                  ? "bg-orange-600 text-white"
                  : "bg-white text-stone-600 ring-1 ring-orange-100 hover:bg-orange-50 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-800"
              }`}
            >
              {t("market.all")}
            </button>
            {categories.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(category === item.value ? "all" : item.value)}
                aria-pressed={category === item.value}
                className={`${CATEGORY_BUTTON_CLASS} ${
                  category === item.value
                    ? "bg-orange-600 text-white"
                    : "bg-white text-stone-600 ring-1 ring-orange-100 hover:bg-orange-50 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-800"
                }`}
              >
                {item.icon} {translateCategory(item.value, locale)}
              </button>
            ))}
          </div>

          <div className="inline-flex shrink-0 self-end rounded-full bg-orange-100/80 p-1 sm:self-auto dark:bg-stone-900">
            {(["latest", "popular"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  mode === option
                    ? "bg-white text-orange-700 shadow-sm dark:bg-stone-800 dark:text-orange-300"
                    : "text-stone-600 dark:text-stone-400"
                }`}
              >
                {option === "latest" ? t("discover.latest") : t("discover.popular")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />
          </div>
        ) : visibleRecipes.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {visibleRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} showAuthor />)}
          </div>
        ) : (
          <section className="mt-8 rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 px-6 py-12 text-center dark:border-orange-900 dark:bg-orange-950/20">
            <div className="text-4xl" aria-hidden>🔎</div>
            <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">{search ? t("discover.no_matches") : t("discover.empty")}</p>
          </section>
        )}
      </main>
    </div>
  );
}
