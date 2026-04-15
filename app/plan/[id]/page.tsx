import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { NavBar } from "@/app/components/nav-bar";
import { MealPlanCommentSection } from "@/app/components/meal-plan-comments";
import Link from "next/link";
import type { MealPlan, MealPlanSlot, Recipe, Profile, NutritionSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SlotWithRecipe extends MealPlanSlot {
  recipes?: Recipe;
}

async function getMealPlanData(planId: string) {
  const supabase = await createClient();

  // Fetch meal plan
  const { data: planData } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", planId)
    .eq("is_public", true)
    .single();

  if (!planData) {
    return null;
  }

  // Fetch creator profile separately
  const { data: creatorData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", planData.user_id)
    .single();

  // Fetch meal plan slots with joined recipe data
  const { data: slotsData } = await supabase
    .from("meal_plan_slots")
    .select(
      `
      *,
      recipes:recipe_id (*)
    `
    )
    .eq("meal_plan_id", planId)
    .order("plan_date", { ascending: true })
    .order("meal_type", { ascending: true });

  return {
    plan: planData as MealPlan,
    creator: creatorData as Profile | null,
    slots: (slotsData ?? []) as SlotWithRecipe[],
  };
}

function calculateDailyNutrition(
  slots: SlotWithRecipe[],
  date: string
): NutritionSummary {
  const daySlots = slots.filter((s) => s.plan_date === date);
  const nutrition: NutritionSummary = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  daySlots.forEach((slot) => {
    if (slot.recipes) {
      nutrition.calories += (slot.recipes.calories_per_serving || 0) * (slot.servings || 1);
      nutrition.protein += (slot.recipes.protein_grams || 0) * (slot.servings || 1);
      nutrition.carbs += (slot.recipes.carbs_grams || 0) * (slot.servings || 1);
      nutrition.fat += (slot.recipes.fat_grams || 0) * (slot.servings || 1);
    }
  });

  return nutrition;
}

function getSlotForCell(
  slots: SlotWithRecipe[],
  date: string,
  mealType: string
): SlotWithRecipe | undefined {
  return slots.find((s) => s.plan_date === date && s.meal_type === mealType);
}

function generateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export default async function PublicMealPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getMealPlanData(id);

  if (!data) {
    notFound();
  }

  const { plan, creator, slots } = data;
  const dates = generateDates(plan.start_date, plan.end_date);
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

  // Extract unique ingredients from all slots
  const allIngredients: Record<string, { quantity: string; unit: string }> = {};
  slots.forEach((slot) => {
    if (slot.recipes?.ingredients) {
      slot.recipes.ingredients.forEach((ing: any) => {
        const key = ing.name.toLowerCase();
        if (!allIngredients[key]) {
          allIngredients[key] = { quantity: ing.quantity, unit: ing.unit };
        } else {
          // Simple addition of quantities if they're numbers
          const currentQty = parseFloat(allIngredients[key].quantity) || 0;
          const addQty = parseFloat(ing.quantity) || 0;
          if (!isNaN(currentQty) && !isNaN(addQty)) {
            allIngredients[key].quantity = String(currentQty + addQty);
          }
        }
      });
    }
  });

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {plan.title}
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {new Date(plan.start_date).toLocaleDateString()} —{" "}
                {new Date(plan.end_date).toLocaleDateString()}
              </p>
            </div>
            <Link
              href="/explore"
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Back to Explore
            </Link>
          </div>

          {/* Creator Info */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {(creator?.displayname?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {creator?.displayname ?? "Anonymous"}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Created {new Date(plan.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {plan.description && (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              {plan.description}
            </p>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 mb-8">
          <table className="w-full border-collapse bg-white dark:bg-zinc-900">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Date
                </th>
                {mealTypes.map((mealType) => (
                  <th
                    key={mealType}
                    className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-100 capitalize"
                  >
                    {mealType}
                  </th>
                ))}
                <th className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Daily Totals
                </th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const dateDisplay = new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                const dailyNutrition = calculateDailyNutrition(slots, date);

                return (
                  <tr
                    key={date}
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    {/* Date Column */}
                    <td className="px-4 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      <div>{dayOfWeek}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {dateDisplay}
                      </div>
                    </td>

                    {/* Meal Type Cells */}
                    {mealTypes.map((mealType) => {
                      const slot = getSlotForCell(slots, date, mealType);

                      return (
                        <td
                          key={`${date}-${mealType}`}
                          className="px-4 py-4 text-sm border-r border-zinc-200 dark:border-zinc-800"
                        >
                          {slot && slot.recipes ? (
                            <div className="space-y-2">
                              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-2 text-indigo-700 dark:text-indigo-400 font-medium text-xs break-words">
                                {slot.recipes.title}
                              </div>

                              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                {slot.recipes.calories_per_serving && (
                                  <div>
                                    {Math.round(
                                      slot.recipes.calories_per_serving *
                                        (slot.servings || 1)
                                    )}{" "}
                                    cal
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-1">
                                {slot.recipes.source_url && (
                                  <a
                                    href={slot.recipes.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                                  >
                                    View Original
                                  </a>
                                )}

                                {slot.recipes.source_url && (
                                  <Link
                                    href={`/dashboard/recipes/new?url=${encodeURIComponent(
                                      slot.recipes.source_url
                                    )}`}
                                    className="inline-block rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
                                  >
                                    Import to My Recipes
                                  </Link>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-400">—</div>
                          )}
                        </td>
                      );
                    })}

                    {/* Daily Nutrition Column */}
                    <td className="px-4 py-4">
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-emerald-700 dark:text-emerald-400">
                          {Math.round(dailyNutrition.calories)} cal
                        </div>
                        <div className="text-zinc-600 dark:text-zinc-400">
                          P: {dailyNutrition.protein.toFixed(0)}g
                        </div>
                        <div className="text-zinc-600 dark:text-zinc-400">
                          C: {dailyNutrition.carbs.toFixed(0)}g
                        </div>
                        <div className="text-zinc-600 dark:text-zinc-400">
                          F: {dailyNutrition.fat.toFixed(0)}g
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Grocery List Summary */}
        <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Grocery List Summary
          </h2>

          {Object.keys(allIngredients).length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No ingredients in this meal plan.
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(allIngredients).map(([name, ing]) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2 text-sm text-zinc-700 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                >
                  <span className="capitalize">{name}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {ing.quantity} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <MealPlanCommentSection
            mealPlanId={plan.id}
            mealPlanOwnerId={plan.user_id}
          />
        </div>
      </div>
    </div>
  );
}
