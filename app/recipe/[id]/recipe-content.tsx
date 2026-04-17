"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import type { Recipe, Ingredient } from "@/lib/types";

interface RecipeContentProps {
  recipe: Recipe;
}

/**
 * Client component that displays recipe content in the selected language.
 * Falls back to English if Chinese translations are not available.
 */
export function useRecipeI18n(recipe: Recipe) {
  const { locale } = useLanguage();
  const zh = locale === "zh";

  const title = (zh && recipe.title_zh) || recipe.title;
  const description = (zh && recipe.description_zh) || recipe.description;
  const importantNote = (zh && recipe.important_note_zh) || recipe.important_note;
  const ingredients: Ingredient[] = (zh && recipe.ingredients_zh?.length)
    ? recipe.ingredients_zh
    : (recipe.ingredients ?? []);
  const steps: string[] = (zh && recipe.steps_zh?.length)
    ? recipe.steps_zh
    : (recipe.steps ?? []);

  return { title, description, importantNote, ingredients, steps, locale };
}

export function RecipeTitle({ recipe }: RecipeContentProps) {
  const { title } = useRecipeI18n(recipe);
  return <>{title}</>;
}

export function RecipeDescription({ recipe }: RecipeContentProps) {
  const { description } = useRecipeI18n(recipe);
  if (!description) return null;
  return (
    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
      {description}
    </p>
  );
}

export function RecipeImportantNote({ recipe }: RecipeContentProps) {
  const { importantNote } = useRecipeI18n(recipe);
  const { t } = useLanguage();
  if (!importantNote) return null;
  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none">📝</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {t("recipe.important_note")}
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900/90 dark:text-amber-100">
            {importantNote}
          </p>
        </div>
      </div>
    </div>
  );
}

export function RecipeIngredients({ recipe }: RecipeContentProps) {
  const { ingredients } = useRecipeI18n(recipe);
  const { t, locale } = useLanguage();
  if (ingredients.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {t("recipe.ingredients")}
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
              <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 w-20">
                {locale === "zh" ? "用量" : "Amount"}
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 w-24">
                {locale === "zh" ? "单位" : "Unit"}
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {t("recipe.ingredients")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing, i) => (
              <tr
                key={i}
                className="border-b last:border-b-0 border-zinc-100 dark:border-zinc-800 odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50"
              >
                <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">{ing.quantity}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{ing.unit}</td>
                <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">{ing.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RecipeSteps({ recipe }: RecipeContentProps) {
  const { steps } = useRecipeI18n(recipe);
  const { locale } = useLanguage();
  if (steps.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {locale === "zh" ? "烹饪步骤" : "Instructions"}
      </h2>
      <ol className="mt-3 space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {i + 1}
            </span>
            <p className="pt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
              {step}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
