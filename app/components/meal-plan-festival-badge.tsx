"use client";

import { MEAL_PLAN_FESTIVALS, type MealPlanFestival } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";
import { translateFestival } from "@/lib/i18n/translations";

export function MealPlanFestivalBadge({
  festival,
  className = "",
}: {
  festival: MealPlanFestival;
  className?: string;
}) {
  const { locale } = useLanguage();
  const option = MEAL_PLAN_FESTIVALS.find((item) => item.value === festival);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 ${className}`}
    >
      <span aria-hidden>{option?.icon ?? "✨"}</span>
      {translateFestival(festival, locale)}
    </span>
  );
}
