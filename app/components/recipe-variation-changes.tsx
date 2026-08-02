"use client";

import type { Ingredient } from "@/lib/types";
import { isVariationDiffV1 } from "@/lib/recipe-variation";
import { useLanguage } from "@/lib/i18n/language-context";

function formatIngredient(ingredient: Ingredient) {
  return [ingredient.quantity.trim(), ingredient.unit.trim(), ingredient.name.trim()]
    .filter(Boolean)
    .join(" ");
}

export function RecipeVariationChanges({ diff }: { diff: unknown }) {
  const { t } = useLanguage();

  if (!isVariationDiffV1(diff)) return null;
  if (diff.ingredientChanges.length === 0 && diff.stepChanges.length === 0) return null;

  return (
    <section
      role="region"
      aria-labelledby="variation-changes-heading"
      className="mt-4 rounded-3xl border border-orange-100 bg-[#fffaf4] p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-lg dark:bg-orange-950">
          ↗
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
            {t("fork.variation_tag")}
          </p>
          <h2 id="variation-changes-heading" className="text-xl font-bold tracking-[-0.02em] text-stone-950 dark:text-stone-50">
            {t("variation.changes_title")}
          </h2>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {diff.ingredientChanges.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {t("variation.changes_ingredients")}
            </h3>
            <ul className="mt-2 space-y-2">
              {diff.ingredientChanges.map((change, index) => (
                <li key={`${change.kind}-${index}`} className="rounded-2xl bg-white px-3 py-2 text-sm leading-6 text-stone-700 dark:bg-stone-950 dark:text-stone-300">
                  {change.kind === "replace" && (
                    <p>
                      <strong className="text-orange-700 dark:text-orange-300">{t("variation.changed_replaced")}</strong>{" "}
                      {formatIngredient(change.from)} <span aria-hidden="true">→</span> {formatIngredient(change.to)}
                    </p>
                  )}
                  {change.kind === "add" && (
                    <p>
                      <strong className="text-emerald-700 dark:text-emerald-300">{t("variation.changed_added")}</strong>{" "}
                      {formatIngredient(change.ingredient)}
                    </p>
                  )}
                  {change.kind === "remove" && (
                    <p>
                      <strong className="text-red-700 dark:text-red-300">{t("variation.changed_removed")}</strong>{" "}
                      {formatIngredient(change.ingredient)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {diff.stepChanges.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {t("variation.changes_instructions")}
            </h3>
            <ul className="mt-2 space-y-2">
              {diff.stepChanges.map((change, index) => {
                let action = "";
                let content = "";
                if (change.kind === "edit") {
                  action = `${t("variation.changed_rewrote_step")} ${change.originalIndex + 1}`;
                  content = change.to;
                } else if (change.kind === "remove") {
                  action = `${t("variation.changed_removed_step")} ${change.originalIndex + 1}`;
                  content = change.step;
                } else {
                  action = change.afterOriginalIndex === null
                    ? `${t("variation.changed_added_before_step")} 1`
                    : `${t("variation.changed_added_after_step")} ${change.afterOriginalIndex + 1}`;
                  content = change.step;
                }

                return (
                  <li key={`${change.kind}-${index}`} className="rounded-2xl bg-white px-3 py-2 text-sm leading-6 dark:bg-stone-950">
                    <p className="font-semibold text-orange-700 dark:text-orange-300">{action}</p>
                    <p className="text-stone-700 dark:text-stone-300">{content}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
