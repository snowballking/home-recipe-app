"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import type { RecipeFamilyOption } from "@/lib/recipe-family";

interface RecipeVariationSelectorProps {
  activeRecipeId: string;
  options: RecipeFamilyOption[];
}

export function RecipeVariationSelector({
  activeRecipeId,
  options,
}: RecipeVariationSelectorProps) {
  const { locale, t } = useLanguage();

  if (options.length < 2) return null;

  return (
    <nav
      aria-label={t("fork.recipe_versions")}
      className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/70 p-3 dark:border-orange-900/70 dark:bg-orange-950/30"
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">
            {t("fork.recipe_versions")}
          </p>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            {t("fork.variations_sub")}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-600 shadow-sm dark:bg-stone-900 dark:text-stone-300">
          {options.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {options.map((option) => {
          const selected = option.id === activeRecipeId;
          const title = (locale === "zh" && option.titleZh) || option.title || t("fork.untitled");

          return (
            <Link
              key={option.id}
              href={`/recipe/${option.id}`}
              aria-current={selected ? "page" : undefined}
              className={`block rounded-xl border px-3 py-3 transition-colors ${
                selected
                  ? "border-orange-400 bg-white shadow-sm dark:border-orange-500 dark:bg-stone-950"
                  : "border-transparent bg-white/60 hover:border-orange-200 hover:bg-white dark:bg-stone-900/60 dark:hover:border-orange-900"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 text-sm ${selected ? "text-orange-600" : "text-stone-500"}`}>
                  {option.isOriginal ? "●" : "↗"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-stone-900 dark:text-stone-100">{title}</span>
                    {option.isOriginal && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        {t("fork.original")}
                      </span>
                    )}
                    {selected && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                        {t("fork.selected_version")}
                      </span>
                    )}
                  </div>
                  {!option.isOriginal && option.authorName && (
                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                      {t("fork.variation_by")} {option.authorName}
                    </p>
                  )}
                  {!option.isOriginal && option.variationNote && (
                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                      <span className="font-medium text-stone-700 dark:text-stone-300">{t("fork.change_summary")}:</span>{" "}
                      {option.variationNote}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
