"use client";

import Link from "next/link";
import { useState } from "react";
import type { Recipe } from "@/lib/types";
import type { IngredientChange, StepChange, VariationDiffV1 } from "@/lib/recipe-variation";
import { validateVariationDiff } from "@/lib/recipe-variation";
import { useLanguage } from "@/lib/i18n/language-context";

interface RecipeVariationEditorProps {
  source: Recipe;
  sourceAuthor: string;
  saving: boolean;
  error: string;
  onSave: (note: string, diff: VariationDiffV1) => void | Promise<void>;
  onCancel: () => void;
}

export function RecipeVariationEditor({
  source,
  sourceAuthor,
  saving,
  error,
  onSave,
  onCancel,
}: RecipeVariationEditorProps) {
  const { t } = useLanguage();
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState("");
  const [ingredientChanges, setIngredientChanges] = useState<IngredientChange[]>([]);
  const [stepChanges, setStepChanges] = useState<StepChange[]>([]);
  const diff: VariationDiffV1 = { version: 1, ingredientChanges, stepChanges };
  const addedIngredients = ingredientChanges.flatMap((change, changeIndex) =>
    change.kind === "add" ? [{ change, changeIndex }] : [],
  );

  function ingredientTerminal(originalIndex: number) {
    return ingredientChanges.find(
      (change) => change.kind !== "add" && change.originalIndex === originalIndex,
    );
  }

  function setIngredientTerminal(originalIndex: number, next: IngredientChange) {
    setIngredientChanges((current) => [
      ...current.filter((change) => change.kind === "add" || change.originalIndex !== originalIndex),
      next,
    ]);
    setLocalError("");
  }

  function startReplacement(originalIndex: number) {
    const original = source.ingredients[originalIndex];
    setIngredientTerminal(originalIndex, {
      kind: "replace",
      originalIndex,
      from: original,
      to: { name: "", quantity: original.quantity, unit: original.unit },
    });
  }

  function updateReplacement(originalIndex: number, field: "name" | "quantity" | "unit", value: string) {
    setIngredientChanges((current) => current.map((change) => {
      if (change.kind !== "replace" || change.originalIndex !== originalIndex) return change;
      return { ...change, to: { ...change.to, [field]: value } };
    }));
    setLocalError("");
  }

  function restoreIngredient(originalIndex: number) {
    setIngredientChanges((current) => current.filter(
      (change) => change.kind === "add" || change.originalIndex !== originalIndex,
    ));
    setLocalError("");
  }

  function addIngredient() {
    setIngredientChanges((current) => [...current, {
      kind: "add",
      afterOriginalIndex: source.ingredients.length > 0 ? source.ingredients.length - 1 : null,
      ingredient: { name: "", quantity: "", unit: "" },
    }]);
    setLocalError("");
  }

  function updateAddedIngredient(changeIndex: number, field: "name" | "quantity" | "unit", value: string) {
    setIngredientChanges((current) => current.map((change, index) => {
      if (index !== changeIndex || change.kind !== "add") return change;
      return { ...change, ingredient: { ...change.ingredient, [field]: value } };
    }));
    setLocalError("");
  }

  function removeAddedIngredient(changeIndex: number) {
    setIngredientChanges((current) => current.filter((_, index) => index !== changeIndex));
    setLocalError("");
  }

  function stepTerminal(originalIndex: number) {
    return stepChanges.find(
      (change) => change.kind !== "add" && change.originalIndex === originalIndex,
    );
  }

  function setStepTerminal(originalIndex: number, next: StepChange) {
    setStepChanges((current) => [
      ...current.filter((change) => change.kind === "add" || change.originalIndex !== originalIndex),
      next,
    ]);
    setLocalError("");
  }

  function startStepEdit(originalIndex: number) {
    const original = source.steps[originalIndex];
    setStepTerminal(originalIndex, {
      kind: "edit",
      originalIndex,
      from: original,
      to: original,
    });
  }

  function updateStepEdit(originalIndex: number, value: string) {
    setStepChanges((current) => current.map((change) => {
      if (change.kind !== "edit" || change.originalIndex !== originalIndex) return change;
      return { ...change, to: value };
    }));
    setLocalError("");
  }

  function restoreStep(originalIndex: number) {
    setStepChanges((current) => current.filter(
      (change) => change.kind === "add" || change.originalIndex !== originalIndex,
    ));
    setLocalError("");
  }

  function addStepAt(afterOriginalIndex: number | null) {
    setStepChanges((current) => [...current, { kind: "add", afterOriginalIndex, step: "" }]);
    setLocalError("");
  }

  function updateAddedStep(changeIndex: number, value: string) {
    setStepChanges((current) => current.map((change, index) => {
      if (index !== changeIndex || change.kind !== "add") return change;
      return { ...change, step: value };
    }));
    setLocalError("");
  }

  function removeAddedStep(changeIndex: number) {
    setStepChanges((current) => current.filter((_, index) => index !== changeIndex));
    setLocalError("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim()) {
      setLocalError(t("variation.error_summary"));
      return;
    }
    const validationErrors = validateVariationDiff(source, diff);
    if (validationErrors.length > 0) {
      setLocalError(validationErrors.includes("variation_empty")
        ? t("variation.error_empty")
        : t("variation.error_invalid"));
      return;
    }
    setLocalError("");
    void onSave(note.trim(), diff);
  }

  return (
    <div className="min-h-full bg-[#fffaf4] px-4 py-8 dark:bg-stone-950">
      <main className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
          {t("fork.variation_tag")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-stone-950 dark:text-stone-50">
          {t("variation.editor_title")}
        </h1>

        <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30">
          <p className="text-sm text-violet-800 dark:text-violet-200">
            {t("variation.based_on")}{" "}
            <Link href={`/recipe/${source.id}`} className="font-semibold underline underline-offset-2">
              {source.title}
            </Link>
            {sourceAuthor && <> {t("recipe.by_chef")} {sourceAuthor}</>}
          </p>
          <p className="mt-2 text-sm leading-6 text-violet-700 dark:text-violet-300">
            {t("variation.inherited_hint")}
          </p>
        </section>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {(error || localError) && (
            <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error || localError}
            </p>
          )}

          <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <label htmlFor="variation-summary" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {t("variation.summary_label")}
            </label>
            <textarea
              id="variation-summary"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              required
              placeholder={t("variation.summary_placeholder")}
              className="mt-2 w-full rounded-2xl border border-stone-200 bg-[#fffaf4] px-4 py-3 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-orange-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
          </section>

          <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-xl font-bold text-stone-950 dark:text-stone-50">{t("variation.ingredients_title")}</h2>
            {ingredientChanges.length === 0 && (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t("variation.no_ingredient_changes")}</p>
            )}
            <ol className="mt-4 space-y-2">
              {source.ingredients.map((ingredient, index) => {
                const terminal = ingredientTerminal(index);
                return (
                  <li key={`${ingredient.name}-${index}`} className={`rounded-2xl px-4 py-3 text-sm ${terminal?.kind === "remove" ? "bg-red-50 dark:bg-red-950/20" : "bg-stone-50 dark:bg-stone-800"}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-orange-700 dark:text-orange-300">{index + 1}</span>
                      <span className={`mr-auto text-stone-700 dark:text-stone-300 ${terminal?.kind === "remove" ? "line-through opacity-60" : ""}`}>
                        {[ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ")}
                      </span>
                      {!terminal ? (
                        <>
                          <button type="button" onClick={() => startReplacement(index)} aria-label={`${t("variation.replace")} ${ingredient.name}`} className="rounded-full border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-900 dark:text-orange-300">
                            {t("variation.replace")}
                          </button>
                          <button type="button" onClick={() => setIngredientTerminal(index, { kind: "remove", originalIndex: index, ingredient })} aria-label={`${t("variation.remove")} ${ingredient.name}`} className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300">
                            {t("variation.remove")}
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => restoreIngredient(index)} aria-label={`${t("variation.restore")} ${ingredient.name}`} className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300">
                          {t("variation.restore")}
                        </button>
                      )}
                    </div>
                    {terminal?.kind === "remove" && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{t("variation.removed")}</p>}
                    {terminal?.kind === "replace" && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[5rem_6rem_1fr]">
                        <input aria-label={`${t("variation.replacement_quantity")} ${ingredient.name}`} value={terminal.to.quantity} onChange={(event) => updateReplacement(index, "quantity", event.target.value)} className="min-w-0 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900" />
                        <input aria-label={`${t("variation.replacement_unit")} ${ingredient.name}`} value={terminal.to.unit} onChange={(event) => updateReplacement(index, "unit", event.target.value)} className="min-w-0 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900" />
                        <input aria-label={`${t("variation.replacement_ingredient")} ${ingredient.name}`} value={terminal.to.name} onChange={(event) => updateReplacement(index, "name", event.target.value)} className="col-span-2 min-w-0 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 sm:col-span-1" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {addedIngredients.length > 0 && (
              <div className="mt-4 space-y-2">
                {addedIngredients.map(({ change, changeIndex }, additionIndex) => (
                  <div key={changeIndex} className="grid grid-cols-2 gap-2 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/20 sm:grid-cols-[5rem_6rem_1fr_auto]">
                    <input aria-label={`${t("variation.additional_quantity")} ${additionIndex + 1}`} value={change.ingredient.quantity} onChange={(event) => updateAddedIngredient(changeIndex, "quantity", event.target.value)} className="min-w-0 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900" />
                    <input aria-label={`${t("variation.additional_unit")} ${additionIndex + 1}`} value={change.ingredient.unit} onChange={(event) => updateAddedIngredient(changeIndex, "unit", event.target.value)} className="min-w-0 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900" />
                    <input aria-label={`${t("variation.additional_ingredient")} ${additionIndex + 1}`} value={change.ingredient.name} onChange={(event) => updateAddedIngredient(changeIndex, "name", event.target.value)} className="min-w-0 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 sm:col-span-1" />
                    <button type="button" onClick={() => removeAddedIngredient(changeIndex)} aria-label={`${t("variation.remove")} ${t("variation.additional_ingredient")} ${additionIndex + 1}`} className="justify-self-end px-2 text-red-600">×</button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={addIngredient} aria-label={t("variation.add_ingredient")} className="mt-4 rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300">
              + {t("variation.add_ingredient")}
            </button>
          </section>

          <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-xl font-bold text-stone-950 dark:text-stone-50">{t("variation.instructions_title")}</h2>
            {stepChanges.length === 0 && (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t("variation.no_step_changes")}</p>
            )}
            <ol className="mt-4 space-y-2">
              {source.steps.map((step, index) => {
                const terminal = stepTerminal(index);
                const beforeAnchor = index === 0 ? null : index - 1;
                const additionsBefore = stepChanges.flatMap((change, changeIndex) =>
                  change.kind === "add" && change.afterOriginalIndex === beforeAnchor
                    ? [{ change, changeIndex }]
                    : [],
                );
                const additionsAfter = stepChanges.flatMap((change, changeIndex) =>
                  change.kind === "add" && change.afterOriginalIndex === index
                    ? [{ change, changeIndex }]
                    : [],
                );
                return (
                  <li key={`${index}-${step}`} className="space-y-2">
                    {index === 0 && additionsBefore.map(({ change, changeIndex }) => (
                      <div key={changeIndex} className="flex gap-2 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
                        <textarea aria-label={`${t("variation.new_step_before")} ${index + 1}`} value={change.step} onChange={(event) => updateAddedStep(changeIndex, event.target.value)} rows={2} className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900" />
                        <button type="button" onClick={() => removeAddedStep(changeIndex)} aria-label={`${t("variation.remove")} ${t("variation.new_step_before")} ${index + 1}`} className="px-2 text-red-600">×</button>
                      </div>
                    ))}
                    <div className={`rounded-2xl px-4 py-3 text-sm ${terminal?.kind === "remove" ? "bg-red-50 dark:bg-red-950/20" : "bg-stone-50 dark:bg-stone-800"}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-orange-700 dark:text-orange-300">{index + 1}</span>
                        <span className={`mr-auto text-stone-700 dark:text-stone-300 ${terminal?.kind === "remove" ? "line-through opacity-60" : ""}`}>{step}</span>
                        {!terminal ? (
                          <>
                            <button type="button" onClick={() => startStepEdit(index)} aria-label={`${t("variation.rewrite")} ${t("variation.step")} ${index + 1}`} className="rounded-full border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900 dark:text-orange-300">{t("variation.rewrite")}</button>
                            <button type="button" onClick={() => setStepTerminal(index, { kind: "remove", originalIndex: index, step })} aria-label={`${t("variation.remove")} ${t("variation.step")} ${index + 1}`} className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-300">{t("variation.remove")}</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => restoreStep(index)} aria-label={`${t("variation.restore")} ${t("variation.step")} ${index + 1}`} className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 dark:border-stone-700 dark:text-stone-300">{t("variation.restore")}</button>
                        )}
                        <button type="button" onClick={() => addStepAt(beforeAnchor)} aria-label={`${t("variation.add_before")} ${t("variation.step")} ${index + 1}`} className="rounded-full px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t("variation.add_before")}</button>
                        <button type="button" onClick={() => addStepAt(index)} aria-label={`${t("variation.add_after")} ${t("variation.step")} ${index + 1}`} className="rounded-full px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t("variation.add_after")}</button>
                      </div>
                      {terminal?.kind === "remove" && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{t("variation.removed")}</p>}
                      {terminal?.kind === "edit" && (
                        <textarea aria-label={`${t("variation.rewritten_step")} ${index + 1}`} value={terminal.to} onChange={(event) => updateStepEdit(index, event.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900" />
                      )}
                    </div>
                    {additionsAfter.map(({ change, changeIndex }) => (
                      <div key={changeIndex} className="flex gap-2 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
                        <textarea aria-label={`${t("variation.new_step_after")} ${index + 1}`} value={change.step} onChange={(event) => updateAddedStep(changeIndex, event.target.value)} rows={2} className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900" />
                        <button type="button" onClick={() => removeAddedStep(changeIndex)} aria-label={`${t("variation.remove")} ${t("variation.new_step_after")} ${index + 1}`} className="px-2 text-red-600">×</button>
                      </div>
                    ))}
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
              {saving ? t("variation.saving") : t("variation.save")}
            </button>
            <button type="button" onClick={onCancel} className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
              {t("common.cancel")}
            </button>
            <p className="w-full text-xs text-stone-500 dark:text-stone-400 sm:ml-auto sm:w-auto">{t("variation.private_hint")}</p>
          </div>
        </form>
      </main>
    </div>
  );
}
