"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";

interface SaveRecipeButtonProps {
  recipeId: string;
  saveCount: number;
  variant?: "icon" | "full";
  /** When supplied by a list page, avoid one saved-state request per card. */
  initialSaved?: boolean;
}

export function SaveRecipeButton({
  recipeId,
  saveCount,
  variant = "full",
  initialSaved,
}: SaveRecipeButtonProps) {
  const supabase = createClient();
  const { locale, t } = useLanguage();
  const [isSaved, setIsSaved] = useState(initialSaved ?? false);
  const [count, setCount] = useState(saveCount);
  const [loading, setLoading] = useState(initialSaved === undefined);

  useEffect(() => {
    if (initialSaved !== undefined) return;

    let active = true;
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (active) setLoading(false);
          return;
        }
        const { data } = await supabase
          .from("recipe_saves")
          .select("id")
          .eq("user_id", user.id)
          .eq("recipe_id", recipeId)
          .maybeSingle();
        if (active) setIsSaved(!!data);
      } catch {
        // Auth lock race condition — safe to ignore
      }
      if (active) setLoading(false);
    }
    check();
    return () => {
      active = false;
    };
  }, [recipeId, initialSaved, supabase]);

  async function toggleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);

    if (isSaved) {
      const result = await supabase
        .from("recipe_saves")
        .delete()
        .eq("user_id", user.id)
        .eq("recipe_id", recipeId);
      if (result.error) {
        setLoading(false);
        return;
      }
      setIsSaved(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      const result = await supabase.from("recipe_saves").insert({
        user_id: user.id,
        recipe_id: recipeId,
      });
      if (result.error) {
        setLoading(false);
        return;
      }
      setIsSaved(true);
      setCount((c) => c + 1);
    }
    setLoading(false);
  }

  if (variant === "icon") {
    return (
      <button
        onClick={toggleSave}
        disabled={loading}
        aria-label={isSaved ? t("saved.remove_action") : t("saved.save_action")}
        aria-pressed={isSaved}
        className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
          isSaved
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
            : "bg-zinc-100 text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-zinc-800 dark:text-zinc-400"
        } disabled:opacity-50`}
      >
        {isSaved ? "♥" : "♡"} {count}
      </button>
    );
  }

  return (
    <button
      onClick={toggleSave}
      disabled={loading}
      aria-label={isSaved ? t("saved.remove_action") : t("saved.save_action")}
      aria-pressed={isSaved}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        isSaved
          ? "border border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          : "bg-indigo-600 text-white hover:bg-indigo-700"
      } disabled:opacity-50`}
    >
      {locale === "zh"
        ? (isSaved ? "♥ 已收藏" : "♡ 收藏")
        : (isSaved ? "♥ Saved" : "♡ Save to Collection")} ({count})
    </button>
  );
}
