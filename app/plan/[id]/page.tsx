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

  const { data: planData } = await supabase
    .from("meal_plans").select("*").eq("id", planId).eq("is_public", true).single();
  if (!planData) return null;

  const { data: creatorData } = await supabase
    .from("profiles").select("*").eq("id", planData.user_id).single();

  const { data: slotsData } = await supabase
    .from("meal_plan_slots")
    .select(`*, recipes:recipe_id (*)`)
    .eq("meal_plan_id", planId)
    .order("plan_date", { ascending: true })
    .order("meal_type", { ascending: true });

  return {
    plan: planData as MealPlan,
    creator: creatorData as Profile | null,
    slots: (slotsData ?? []) as SlotWithRecipe[],
  };
}

function calcNutrition(slots: SlotWithRecipe[], date: string): NutritionSummary {
  const n: NutritionSummary = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  slots.filter((s) => s.plan_date === date).forEach((slot) => {
    if (slot.recipes) {
      const sv = slot.servings || 1;
      n.calories += (slot.recipes.calories_per_serving || 0) * sv;
      n.protein  += (slot.recipes.protein_grams || 0) * sv;
      n.carbs    += (slot.recipes.carbs_grams || 0) * sv;
      n.fat      += (slot.recipes.fat_grams || 0) * sv;
    }
  });
  return n;
}

function getSlotsForCell(slots: SlotWithRecipe[], date: string, mealType: string): SlotWithRecipe[] {
  return slots.filter((s) => s.plan_date === date && s.meal_type === mealType);
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

/* ── Dish chip (reusable for both layouts) ────────────────────────────── */
function DishChip({ slot }: { slot: SlotWithRecipe }) {
  if (!slot.recipes) return null;
  const r = slot.recipes;
  const cal = r.calories_per_serving != null
    ? Math.round(r.calories_per_serving * (slot.servings || 1))
    : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5">
        {r.hero_image_url ? (
          <img src={r.hero_image_url} alt="" className="h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0 rounded-md object-cover" />
        ) : (
          <div className="h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-base">🍽</div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-indigo-700 dark:text-indigo-400 font-medium text-sm sm:text-xs leading-snug break-words block">
            {r.title}
          </span>
          {cal != null && (
            <span className="text-xs sm:text-[11px] text-zinc-500 dark:text-zinc-400">{cal} cal</span>
          )}
        </div>
      </div>
      {r.source_url && (
        <div className="flex flex-wrap gap-1">
          <a href={r.source_url} target="_blank" rel="noopener noreferrer"
            className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors">
            View Original
          </a>
          <Link href={`/dashboard/recipes/new?url=${encodeURIComponent(r.source_url)}`}
            className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 transition-colors">
            Import
          </Link>
        </div>
      )}
    </div>
  );
}

export default async function PublicMealPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getMealPlanData(id);
  if (!data) notFound();

  const { plan, creator, slots } = data;
  const dates = generateDates(plan.start_date, plan.end_date);
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
  const mealLabels: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

  // Aggregate ingredients
  const allIngredients: Record<string, { quantity: string; unit: string }> = {};
  slots.forEach((slot) => {
    if (slot.recipes?.ingredients) {
      slot.recipes.ingredients.forEach((ing: any) => {
        const key = ing.name.toLowerCase();
        if (!allIngredients[key]) {
          allIngredients[key] = { quantity: ing.quantity, unit: ing.unit };
        } else {
          const cur = parseFloat(allIngredients[key].quantity) || 0;
          const add = parseFloat(ing.quantity) || 0;
          if (!isNaN(cur) && !isNaN(add)) allIngredients[key].quantity = String(cur + add);
        }
      });
    }
  });

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {plan.title}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                {new Date(plan.start_date).toLocaleDateString()} — {new Date(plan.end_date).toLocaleDateString()}
              </p>
            </div>
            <Link href="/explore"
              className="flex-shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-xs sm:text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Back
            </Link>
          </div>

          {/* Creator */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {(creator?.displayname?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{creator?.displayname ?? "Anonymous"}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Created {new Date(plan.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {plan.description && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{plan.description}</p>}
        </div>

        {/* ────────── DESKTOP: Table (hidden on mobile) ────────── */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 mb-8">
          <table className="w-full border-collapse bg-white dark:bg-zinc-900">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-100">Date</th>
                {mealTypes.map((mt) => (
                  <th key={mt} className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-100 capitalize">{mt}</th>
                ))}
                <th className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-100">Daily Totals</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
                const dateDisplay = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const dn = calcNutrition(slots, date);

                return (
                  <tr key={date} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      <div>{dayOfWeek}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{dateDisplay}</div>
                    </td>

                    {mealTypes.map((mealType) => {
                      const cellSlots = getSlotsForCell(slots, date, mealType);
                      return (
                        <td key={`${date}-${mealType}`} className="px-3 py-3 text-sm border-r border-zinc-200 dark:border-zinc-800 align-top min-w-[140px]">
                          {cellSlots.length > 0 ? (
                            <div className="space-y-1.5">
                              {cellSlots.map((slot) => <DishChip key={slot.id} slot={slot} />)}
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-400">—</div>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-4 py-3">
                      <div className="text-xs space-y-0.5">
                        <div className="font-medium text-emerald-700 dark:text-emerald-400">{Math.round(dn.calories)} cal</div>
                        <div className="text-zinc-500 dark:text-zinc-400">P {dn.protein.toFixed(0)}g · C {dn.carbs.toFixed(0)}g · F {dn.fat.toFixed(0)}g</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ────────── MOBILE: Card-based day view ────────── */}
        <div className="md:hidden space-y-4 mb-8">
          {dates.map((date) => {
            const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
            const dateDisplay = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const dn = calcNutrition(slots, date);

            return (
              <div key={date} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                {/* Day header */}
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{dayOfWeek}</span>
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{dateDisplay}</span>
                  </div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{Math.round(dn.calories)} cal</span>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {mealTypes.map((mealType) => {
                    const cellSlots = getSlotsForCell(slots, date, mealType);
                    return (
                      <div key={mealType} className="px-4 py-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 block">
                          {mealLabels[mealType]}
                        </span>
                        {cellSlots.length === 0 ? (
                          <p className="text-xs text-zinc-300 dark:text-zinc-600 italic">—</p>
                        ) : (
                          <div className="space-y-2">
                            {cellSlots.map((slot) => <DishChip key={slot.id} slot={slot} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 px-4 py-2 flex gap-4 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>P: {dn.protein.toFixed(0)}g</span>
                  <span>C: {dn.carbs.toFixed(0)}g</span>
                  <span>F: {dn.fat.toFixed(0)}g</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grocery List Summary */}
        <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Grocery List Summary</h2>
          {Object.keys(allIngredients).length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No ingredients in this meal plan.</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(allIngredients).map(([name, ing]) => (
                <div key={name} className="flex items-center justify-between py-1.5 text-sm text-zinc-700 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                  <span className="capitalize">{name}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs">{ing.quantity} {ing.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <MealPlanCommentSection mealPlanId={plan.id} mealPlanOwnerId={plan.user_id} />
        </div>
      </div>
    </div>
  );
}
