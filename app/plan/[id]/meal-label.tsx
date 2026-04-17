"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import type { TranslationKey } from "@/lib/i18n/translations";

const MEAL_KEYS: Record<string, TranslationKey> = {
  breakfast: "meal_plan.breakfast",
  lunch: "meal_plan.lunch",
  dinner: "meal_plan.dinner",
  snack: "meal_plan.snack",
};

export function MealLabel({ mealType }: { mealType: string }) {
  const { t } = useLanguage();
  const key = MEAL_KEYS[mealType];
  return <>{key ? t(key) : mealType}</>;
}
