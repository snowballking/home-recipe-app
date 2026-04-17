"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealPlan, MealPlanSlot, Recipe, NutritionSummary } from "@/lib/types";
import { RECIPE_CATEGORIES } from "@/lib/types";
import Link from "next/link";

interface SlotWithRecipe extends MealPlanSlot {
  recipes?: Recipe;
}

/* ───────────────────────── Recipe Picker Modal ───────────────────────── */

function RecipePickerModal({
  recipes,
  saving,
  onSelect,
  onClose,
  mealLabel,
}: {
  recipes: Recipe[];
  saving: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  mealLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    let list = recipes;
    if (category !== "all") list = list.filter((r) => r.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    return list;
  }, [recipes, category, search]);

  // Group by category for display
  const categoryOptions = RECIPE_CATEGORIES.filter((c) => c.value !== "all");

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-lg flex-col bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] sm:max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Add to {mealLabel}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Category pills — wrapped */}
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              All
            </button>
            {categoryOptions.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  category === cat.value
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              No recipes found
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => onSelect(recipe.id)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50"
                >
                  {recipe.hero_image_url ? (
                    <img
                      src={recipe.hero_image_url}
                      alt=""
                      className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <span className="text-lg">🍽</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {recipe.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {recipe.calories_per_serving != null && (
                        <span>{Math.round(recipe.calories_per_serving)} cal</span>
                      )}
                      {recipe.category && (
                        <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">
                          {categoryOptions.find((c) => c.value === recipe.category)?.label ?? recipe.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="h-4 w-4 flex-shrink-0 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Main Page ──────────────────────────────── */

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
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const slotsSelect = `
    *,
    recipes:recipe_id (
      id, user_id, title, hero_image_url, calories_per_serving, protein_grams, carbs_grams, fat_grams, category
    )
  `;

  // Load data
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: planData } = await supabase
        .from("meal_plans").select("*").eq("id", planId).single();
      if (!planData) { router.push("/dashboard"); return; }
      setPlan(planData as MealPlan);

      const { data: slotsData } = await supabase
        .from("meal_plan_slots").select(slotsSelect)
        .eq("meal_plan_id", planId)
        .order("plan_date", { ascending: true })
        .order("meal_type", { ascending: true });
      setSlots((slotsData ?? []) as SlotWithRecipe[]);

      const { data: recipesData } = await supabase
        .from("recipes").select("*").eq("user_id", user.id)
        .order("title", { ascending: true });
      setRecipes((recipesData ?? []) as Recipe[]);
      setLoading(false);
    }
    loadData();
  }, [planId, supabase, router]);

  // Refetch helper
  async function refetchSlots() {
    const { data: slotsData } = await supabase
      .from("meal_plan_slots").select(slotsSelect)
      .eq("meal_plan_id", planId)
      .order("plan_date", { ascending: true })
      .order("meal_type", { ascending: true });
    setSlots((slotsData ?? []) as SlotWithRecipe[]);
  }

  // Add recipe to slot
  async function addRecipeToSlot(recipeId: string) {
    if (!activeCell) return;
    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("meal_plan_slots").insert({
      meal_plan_id: planId,
      recipe_id: recipeId,
      plan_date: activeCell.date,
      meal_type: activeCell.mealType,
      servings: 1,
      sort_order: 0,
    });

    if (error) {
      setMessage("Error adding recipe: " + error.message);
    } else {
      setMessage("Recipe added!");
      await refetchSlots();
      setActiveCell(null);
    }
    setSaving(false);
  }

  // Remove recipe from slot
  async function removeRecipeFromSlot(slotId: string) {
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("meal_plan_slots").delete().eq("id", slotId);
    if (error) {
      setMessage("Error removing recipe: " + error.message);
    } else {
      setMessage("Recipe removed!");
      await refetchSlots();
      setHoveredSlot(null);
    }
    setSaving(false);
  }

  // Finalize plan
  async function finalizePlan() {
    setSaving(true); setMessage("");
    const { error } = await supabase.from("meal_plans").update({ status: "finalized" }).eq("id", planId);
    if (error) { setMessage("Error finalizing plan: " + error.message); }
    else { setMessage("Plan finalized!"); setPlan({ ...plan!, status: "finalized" }); }
    setSaving(false);
  }

  // Toggle is_public
  async function togglePublic() {
    if (!plan) return;
    setSaving(true); setMessage("");
    const { error } = await supabase.from("meal_plans").update({ is_public: !plan.is_public }).eq("id", planId);
    if (error) { setMessage("Error updating sharing: " + error.message); }
    else { setPlan({ ...plan, is_public: !plan.is_public }); }
    setSaving(false);
  }

  // Share plan: make public + copy link
  async function sharePlan() {
    if (!plan) return;
    setSaving(true); setMessage("");

    // Ensure plan is public first
    if (!plan.is_public) {
      const { error } = await supabase.from("meal_plans").update({ is_public: true }).eq("id", planId);
      if (error) { setMessage("Error sharing plan: " + error.message); setSaving(false); return; }
      setPlan({ ...plan, is_public: true });
    }

    // Copy shareable link
    const shareUrl = `${window.location.origin}/plan/${planId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Link copied! Share it with others to let them view your meal plan.");
    } catch {
      // Fallback for older browsers
      setMessage(`Share this link: ${shareUrl}`);
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
    const n: NutritionSummary = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    daySlots.forEach((slot) => {
      if (slot.recipes) {
        const s = slot.servings || 1;
        n.calories += (slot.recipes.calories_per_serving || 0) * s;
        n.protein  += (slot.recipes.protein_grams || 0) * s;
        n.carbs    += (slot.recipes.carbs_grams || 0) * s;
        n.fat      += (slot.recipes.fat_grams || 0) * s;
      }
    });
    return n;
  }

  // Get all slots for a specific date and meal type
  function getSlotsForCell(date: string, mealType: string): SlotWithRecipe[] {
    return slots.filter((s) => s.plan_date === date && s.meal_type === mealType);
  }

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
  const mealLabels: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {plan.title}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                {new Date(plan.start_date).toLocaleDateString()} — {new Date(plan.end_date).toLocaleDateString()}
              </p>
            </div>
            <Link
              href="/dashboard/plans"
              className="flex-shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-xs sm:text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Back
            </Link>
          </div>

          {/* Status + Description */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
              plan.status === "finalized"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}>
              {plan.status === "finalized" ? "Finalized" : "Draft"}
            </span>
            {plan.description && (
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">{plan.description}</p>
            )}
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${
            message.includes("Error")
              ? "border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              : "border border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
          }`}>
            {message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          {plan.status !== "finalized" && (
            <button onClick={finalizePlan} disabled={saving}
              className="rounded-lg bg-emerald-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              Finalize Plan
            </button>
          )}
          <Link href={`/dashboard/plans/${planId}/grocery`}
            className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
            Grocery List
          </Link>
          <button onClick={togglePublic} disabled={saving}
            className={`rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
              plan.is_public
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
            }`}>
            {plan.is_public ? "Public" : "Private"}
          </button>
          <button onClick={sharePlan} disabled={saving}
            className="rounded-lg bg-violet-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Share
          </button>
        </div>

        {/* ────────── DESKTOP: Table Grid (hidden on mobile) ────────── */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
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
                const dn = getDailyNutrition(date);

                return (
                  <tr key={date} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      <div>{dayOfWeek}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{dateDisplay}</div>
                    </td>

                    {mealTypes.map((mealType) => {
                      const cellSlots = getSlotsForCell(date, mealType);
                      return (
                        <td key={`${date}-${mealType}`} className="px-3 py-3 text-sm border-r border-zinc-200 dark:border-zinc-800 align-top min-w-[140px]">
                          <div className="space-y-1.5">
                            {cellSlots.map((slot) =>
                              slot.recipes ? (
                                <div key={slot.id}
                                  className="group relative flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5"
                                  onMouseEnter={() => setHoveredSlot(slot.id)}
                                  onMouseLeave={() => setHoveredSlot(null)}
                                >
                                  {slot.recipes.hero_image_url ? (
                                    <img src={slot.recipes.hero_image_url} alt="" className="h-8 w-8 flex-shrink-0 rounded-md object-cover" />
                                  ) : (
                                    <div className="h-8 w-8 flex-shrink-0 rounded-md bg-indigo-100 dark:bg-indigo-800/40 flex items-center justify-center text-sm">🍽</div>
                                  )}
                                  <span className="flex-1 text-indigo-700 dark:text-indigo-400 font-medium text-xs leading-snug break-words min-w-0">
                                    {slot.recipes.title}
                                  </span>
                                  <button onClick={() => removeRecipeFromSlot(slot.id)} disabled={saving}
                                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                    title="Remove">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l6 6M9 3l-6 6" /></svg>
                                  </button>

                                  {hoveredSlot === slot.id && (
                                    <div className="absolute z-50 left-0 top-full mt-1 w-44 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg p-2.5">
                                      <p className="font-medium text-zinc-900 dark:text-zinc-100 text-xs mb-1.5">{slot.recipes.title}</p>
                                      <div className="space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                                        {slot.recipes.calories_per_serving != null && <div>Cal: <span className="font-medium text-zinc-900 dark:text-zinc-100">{Math.round(slot.recipes.calories_per_serving * (slot.servings || 1))}</span></div>}
                                        {slot.recipes.protein_grams != null && <div>Protein: <span className="font-medium">{(slot.recipes.protein_grams * (slot.servings || 1)).toFixed(1)}g</span></div>}
                                        {slot.recipes.carbs_grams != null && <div>Carbs: <span className="font-medium">{(slot.recipes.carbs_grams * (slot.servings || 1)).toFixed(1)}g</span></div>}
                                        {slot.recipes.fat_grams != null && <div>Fat: <span className="font-medium">{(slot.recipes.fat_grams * (slot.servings || 1)).toFixed(1)}g</span></div>}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null
                            )}

                            <button
                              onClick={() => setActiveCell({ date, mealType })}
                              className={`w-full rounded-lg border border-dashed py-1 px-2 text-xs font-medium transition-colors ${
                                cellSlots.length === 0
                                  ? "border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
                                  : "border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-indigo-400 hover:text-indigo-500"
                              }`}
                            >
                              {cellSlots.length === 0 ? "+ Add dish" : "+"}
                            </button>
                          </div>
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

        {/* ────────── MOBILE: Card-based day view (visible only on mobile) ────────── */}
        <div className="md:hidden space-y-4">
          {dates.map((date) => {
            const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
            const dateDisplay = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const dn = getDailyNutrition(date);

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

                {/* Meals */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {mealTypes.map((mealType) => {
                    const cellSlots = getSlotsForCell(date, mealType);

                    return (
                      <div key={mealType} className="px-4 py-3">
                        {/* Meal type label */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            {mealLabels[mealType]}
                          </span>
                          <button
                            onClick={() => setActiveCell({ date, mealType })}
                            className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                          >
                            + Add
                          </button>
                        </div>

                        {/* Dishes */}
                        {cellSlots.length === 0 ? (
                          <p className="text-xs text-zinc-300 dark:text-zinc-600 italic">No dishes yet</p>
                        ) : (
                          <div className="space-y-2">
                            {cellSlots.map((slot) =>
                              slot.recipes ? (
                                <div key={slot.id} className="flex items-center gap-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-2">
                                  {slot.recipes.hero_image_url ? (
                                    <img src={slot.recipes.hero_image_url} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                                  ) : (
                                    <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-base">🍽</div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
                                      {slot.recipes.title}
                                    </p>
                                    {slot.recipes.calories_per_serving != null && (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {Math.round(slot.recipes.calories_per_serving * (slot.servings || 1))} cal
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => removeRecipeFromSlot(slot.id)}
                                    disabled={saving}
                                    className="flex-shrink-0 rounded-full p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                  >
                                    <svg className="h-4 w-4" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l6 6M9 3l-6 6" /></svg>
                                  </button>
                                </div>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Daily nutrition footer */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 px-4 py-2 flex gap-4 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>P: {dn.protein.toFixed(0)}g</span>
                  <span>C: {dn.carbs.toFixed(0)}g</span>
                  <span>F: {dn.fat.toFixed(0)}g</span>
                </div>
              </div>
            );
          })}
        </div>

        {dates.length === 0 && (
          <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No dates in this plan yet</p>
          </div>
        )}
      </div>

      {/* Recipe Picker Modal */}
      {activeCell && (
        <RecipePickerModal
          recipes={recipes}
          saving={saving}
          onSelect={addRecipeToSlot}
          onClose={() => setActiveCell(null)}
          mealLabel={`${mealLabels[activeCell.mealType]} — ${new Date(activeCell.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`}
        />
      )}
    </div>
  );
}
