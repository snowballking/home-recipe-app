"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealPlan, MealPlanSlot, Recipe, NutritionSummary } from "@/lib/types";
import Link from "next/link";

interface SlotWithRecipe extends MealPlanSlot {
  recipes?: Recipe;
}

export default function MealPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const supabase = createClient();

  // State
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [slots, setSlots] = useState<SlotWithRecipe[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // UI state
  const [activeCell, setActiveCell] = useState<{
    date: string;
    mealType: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch meal plan
      const { data: planData } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (!planData) {
        router.push("/dashboard");
        return;
      }

      setPlan(planData as MealPlan);

      // Fetch meal plan slots with joined recipe data
      const { data: slotsData } = await supabase
        .from("meal_plan_slots")
        .select(`
          *,
          recipes:recipe_id (
            id, user_id, title, calories_per_serving, protein_grams, carbs_grams, fat_grams
          )
        `)
        .eq("meal_plan_id", planId)
        .order("plan_date", { ascending: true })
        .order("meal_type", { ascending: true });

      setSlots((slotsData ?? []) as SlotWithRecipe[]);

      // Fetch user's recipes
      const { data: recipesData } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", user.id)
        .order("title", { ascending: true });

      setRecipes((recipesData ?? []) as Recipe[]);
      setLoading(false);
    }

    loadData();
  }, [planId, supabase, router]);

  // Add recipe to slot
  async function addRecipeToSlot(recipeId: string, date: string, mealType: string) {
    setSaving(true);
    setMessage("");

    const selectedRecipe = recipes.find((r) => r.id === recipeId);
    if (!selectedRecipe) {
      setMessage("Recipe not found");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("meal_plan_slots").insert({
      meal_plan_id: planId,
      recipe_id: recipeId,
      plan_date: date,
      meal_type: mealType,
      servings: plan?.profiles?.household_members?.length || 1,
      sort_order: 0,
    });

    if (error) {
      setMessage("Error adding recipe: " + error.message);
    } else {
      setMessage("Recipe added!");
      // Refetch slots
      const { data: slotsData } = await supabase
        .from("meal_plan_slots")
        .select(`
          *,
          recipes:recipe_id (
            id, user_id, title, calories_per_serving, protein_grams, carbs_grams, fat_grams
          )
        `)
        .eq("meal_plan_id", planId)
        .order("plan_date", { ascending: true })
        .order("meal_type", { ascending: true });

      setSlots((slotsData ?? []) as SlotWithRecipe[]);
      setActiveCell(null);
      setSearchQuery("");
    }
    setSaving(false);
  }

  // Remove recipe from slot
  async function removeRecipeFromSlot(slotId: string) {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("meal_plan_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      setMessage("Error removing recipe: " + error.message);
    } else {
      setMessage("Recipe removed!");
      // Refetch slots
      const { data: slotsData } = await supabase
        .from("meal_plan_slots")
        .select(`
          *,
          recipes:recipe_id (
            id, user_id, title, calories_per_serving, protein_grams, carbs_grams, fat_grams
          )
        `)
        .eq("meal_plan_id", planId)
        .order("plan_date", { ascending: true })
        .order("meal_type", { ascending: true });

      setSlots((slotsData ?? []) as SlotWithRecipe[]);
      setHoveredSlot(null);
    }
    setSaving(false);
  }

  // Finalize plan
  async function finalizePlan() {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("meal_plans")
      .update({ status: "finalized" })
      .eq("id", planId);

    if (error) {
      setMessage("Error finalizing plan: " + error.message);
    } else {
      setMessage("Plan finalized!");
      setPlan({ ...plan!, status: "finalized" });
    }
    setSaving(false);
  }

  // Toggle is_public
  async function togglePublic() {
    if (!plan) return;
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("meal_plans")
      .update({ is_public: !plan.is_public })
      .eq("id", planId);

    if (error) {
      setMessage("Error updating sharing: " + error.message);
    } else {
      setPlan({ ...plan, is_public: !plan.is_public });
    }
    setSaving(false);
  }

  // Generate date range
  function generateDates(): string[] {
    if (!plan) return [];
    const dates: string[] = [];
    const start = new Date(plan.start_date);
    const end = new Date(plan.end_date);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }

  // Calculate daily nutrition
  function getDailyNutrition(date: string): NutritionSummary {
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

  // Get slot for a specific date and meal type
  function getSlotForCell(date: string, mealType: string): SlotWithRecipe | undefined {
    return slots.find((s) => s.plan_date === date && s.meal_type === mealType);
  }

  // Filter recipes for dropdown
  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-zinc-600 dark:text-zinc-400">Plan not found</p>
        </div>
      </div>
    );
  }

  const dates = generateDates();
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {plan.title}
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {new Date(plan.start_date).toLocaleDateString()} —{" "}
                {new Date(plan.end_date).toLocaleDateString()}
              </p>
            </div>
            <Link
              href="/dashboard/plans"
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Back to My Plans
            </Link>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                plan.status === "finalized"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}
            >
              {plan.status === "finalized" ? "Finalized" : "Draft"}
            </span>
            {plan.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {plan.description}
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 rounded-lg p-3 text-sm ${
              message.includes("Error")
                ? "border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                : "border border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            }`}
          >
            {message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-3">
          {plan.status !== "finalized" && (
            <button
              onClick={finalizePlan}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Finalize Plan
            </button>
          )}

          <Link
            href={`/dashboard/plans/${planId}/grocery`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Generate Grocery List
          </Link>

          <button
            onClick={togglePublic}
            disabled={saving}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              plan.is_public
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            }`}
          >
            {plan.is_public ? "Shared" : "Private"}
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
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
                const dailyNutrition = getDailyNutrition(date);

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
                      const slot = getSlotForCell(date, mealType);
                      const isActive =
                        activeCell?.date === date && activeCell?.mealType === mealType;

                      return (
                        <td
                          key={`${date}-${mealType}`}
                          className="relative px-4 py-4 text-sm border-r border-zinc-200 dark:border-zinc-800"
                        >
                          {slot && slot.recipes ? (
                            // Recipe assigned
                            <div
                              className="relative group"
                              onMouseEnter={() => setHoveredSlot(slot.id)}
                              onMouseLeave={() => setHoveredSlot(null)}
                            >
                              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-2 text-indigo-700 dark:text-indigo-400 font-medium text-xs break-words">
                                {slot.recipes.title}
                              </div>

                              {/* Popover on hover */}
                              {hoveredSlot === slot.id && (
                                <div className="absolute z-50 left-0 top-full mt-1 w-48 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg p-3">
                                  <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm mb-2">
                                    {slot.recipes.title}
                                  </p>
                                  <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                                    {slot.recipes.calories_per_serving && (
                                      <div>
                                        Calories:{" "}
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                          {Math.round(
                                            slot.recipes.calories_per_serving *
                                              (slot.servings || 1)
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {slot.recipes.protein_grams && (
                                      <div>
                                        Protein:{" "}
                                        <span className="font-medium">
                                          {(
                                            slot.recipes.protein_grams *
                                            (slot.servings || 1)
                                          ).toFixed(1)}
                                          g
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => removeRecipeFromSlot(slot.id)}
                                    disabled={saving}
                                    className="w-full rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Empty cell with + button
                            <div>
                              <button
                                onClick={() =>
                                  setActiveCell({ date, mealType })
                                }
                                className="w-full rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 py-2 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors"
                              >
                                +
                              </button>

                              {/* Dropdown when active */}
                              {isActive && (
                                <div className="absolute z-50 left-0 top-full mt-1 w-56 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg">
                                  <div className="border-b border-zinc-200 dark:border-zinc-700 p-3">
                                    <input
                                      type="text"
                                      placeholder="Search recipes..."
                                      value={searchQuery}
                                      onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                      }
                                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      autoFocus
                                    />
                                  </div>

                                  <div className="max-h-64 overflow-y-auto">
                                    {filteredRecipes.length === 0 ? (
                                      <div className="p-3 text-sm text-center text-zinc-500 dark:text-zinc-400">
                                        No recipes found
                                      </div>
                                    ) : (
                                      filteredRecipes.map((recipe) => (
                                        <button
                                          key={recipe.id}
                                          onClick={() => {
                                            addRecipeToSlot(
                                              recipe.id,
                                              date,
                                              mealType
                                            );
                                          }}
                                          disabled={saving}
                                          className="w-full border-b border-zinc-100 dark:border-zinc-700 px-3 py-2 text-left text-sm text-zinc-900 dark:text-zinc-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-start justify-between"
                                        >
                                          <div>
                                            <div className="font-medium">
                                              {recipe.title}
                                            </div>
                                            {recipe.calories_per_serving && (
                                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {Math.round(
                                                  recipe.calories_per_serving
                                                )}{" "}
                                                cal
                                              </div>
                                            )}
                                          </div>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
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

        {/* Info text */}
        {dates.length === 0 && (
          <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No dates in this plan yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
