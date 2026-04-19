"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";
import type { Ingredient } from "@/lib/types";

interface Props {
  recipeId: string;
  ingredients: Ingredient[];
  servings: number;
  isOwner: boolean;
  hasNutrition: boolean;
}

export function EstimateNutritionButton({
  recipeId,
  ingredients,
  servings,
  isOwner,
  hasNutrition,
}: Props) {
  const { locale } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    calories_per_serving: number;
    protein_grams: number;
    carbs_grams: number;
    fat_grams: number;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Don't show if user doesn't own the recipe, or if nutrition already exists and hasn't been recalculated
  if (!isOwner || (hasNutrition && !result)) return null;

  async function estimate() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/estimate-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, servings }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to estimate");

      setResult(data.nutrition);
    } catch (err: any) {
      setError(err.message || "Failed to estimate nutrition");
    }
    setLoading(false);
  }

  async function saveNutrition() {
    if (!result) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("recipes")
      .update({
        calories_per_serving: result.calories_per_serving,
        protein_grams: result.protein_grams,
        carbs_grams: result.carbs_grams,
        fat_grams: result.fat_grams,
      })
      .eq("id", recipeId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
    }
    setLoading(false);
  }

  // After estimation, show the results with save button
  if (result) {
    return (
      <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
        <div className="flex items-center gap-2 mb-3">
          <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
            {locale === "zh" ? "AI 营养估算结果" : "AI Nutrition Estimate"}
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center mb-4">
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-2 border border-indigo-100 dark:border-indigo-900">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{Math.round(result.calories_per_serving)}</p>
            <p className="text-[10px] text-zinc-500">{locale === "zh" ? "卡路里" : "Calories"}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-2 border border-indigo-100 dark:border-indigo-900">
            <p className="text-lg font-bold text-blue-600">{Math.round(result.protein_grams)}g</p>
            <p className="text-[10px] text-zinc-500">{locale === "zh" ? "蛋白质" : "Protein"}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-2 border border-indigo-100 dark:border-indigo-900">
            <p className="text-lg font-bold text-amber-600">{Math.round(result.carbs_grams)}g</p>
            <p className="text-[10px] text-zinc-500">{locale === "zh" ? "碳水" : "Carbs"}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-2 border border-indigo-100 dark:border-indigo-900">
            <p className="text-lg font-bold text-red-500">{Math.round(result.fat_grams)}g</p>
            <p className="text-[10px] text-zinc-500">{locale === "zh" ? "脂肪" : "Fat"}</p>
          </div>
        </div>

        {saved ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            {locale === "zh" ? "营养信息已保存！刷新页面查看。" : "Nutrition saved! Refresh the page to see it."}
          </p>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={saveNutrition}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading
                ? (locale === "zh" ? "保存中…" : "Saving…")
                : (locale === "zh" ? "保存到食谱" : "Save to Recipe")}
            </button>
            <button
              onClick={estimate}
              disabled={loading}
              className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 disabled:opacity-50 transition-colors"
            >
              {locale === "zh" ? "重新估算" : "Re-estimate"}
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <p className="mt-2 text-[10px] text-indigo-400 dark:text-indigo-500">
          {locale === "zh"
            ? "* 营养值为基于食材的AI估算，可能因具体用量和烹饪方式而异。"
            : "* AI-estimated values based on ingredients. Actual values may vary."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={estimate}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
            {locale === "zh" ? "AI 正在估算营养…" : "AI estimating nutrition…"}
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            {hasNutrition
              ? (locale === "zh" ? "重新估算营养 (AI)" : "Re-estimate Nutrition (AI)")
              : (locale === "zh" ? "估算营养信息 (AI)" : "Estimate Nutrition (AI)")}
          </>
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
