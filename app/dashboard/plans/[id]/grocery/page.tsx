"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  MealPlan,
  MealPlanSlot,
  Recipe,
  GroceryList,
  GroceryItem,
  GroceryCategory,
  Ingredient,
} from "@/lib/types";
import Link from "next/link";

interface SlotWithRecipe extends MealPlanSlot {
  recipes?: Recipe;
}

interface ConsolidatedIngredient {
  name: string;
  quantity: string;
  unit: string;
  category: GroceryCategory;
}

// Categorization map
const CATEGORY_MAP: Record<string, GroceryCategory> = {
  // Produce
  tomato: "produce",
  onion: "produce",
  garlic: "produce",
  potato: "produce",
  carrot: "produce",
  lettuce: "produce",
  cucumber: "produce",
  "bell pepper": "produce",
  broccoli: "produce",
  spinach: "produce",
  celery: "produce",
  mushroom: "produce",
  ginger: "produce",
  lemon: "produce",
  lime: "produce",
  avocado: "produce",
  corn: "produce",
  "bean sprout": "produce",
  scallion: "produce",
  cilantro: "produce",
  basil: "produce",
  parsley: "produce",
  chili: "produce",
  // Dairy
  milk: "dairy",
  cheese: "dairy",
  cream: "dairy",
  butter: "dairy",
  yogurt: "dairy",
  egg: "dairy",
  // Meat
  chicken: "meat",
  beef: "meat",
  pork: "meat",
  lamb: "meat",
  turkey: "meat",
  bacon: "meat",
  sausage: "meat",
  ham: "meat",
  // Seafood
  fish: "seafood",
  shrimp: "seafood",
  prawn: "seafood",
  salmon: "seafood",
  tuna: "seafood",
  crab: "seafood",
  squid: "seafood",
  mussel: "seafood",
  // Grains
  rice: "grains",
  pasta: "grains",
  noodle: "grains",
  flour: "grains",
  bread: "grains",
  oat: "grains",
  quinoa: "grains",
  couscous: "grains",
  // Spices
  salt: "spices",
  pepper: "spices",
  cumin: "spices",
  paprika: "spices",
  turmeric: "spices",
  cinnamon: "spices",
  oregano: "spices",
  thyme: "spices",
  rosemary: "spices",
  "chili powder": "spices",
  "curry powder": "spices",
  "soy sauce": "spices",
  "fish sauce": "spices",
  // Condiments
  oil: "condiments",
  vinegar: "condiments",
  ketchup: "condiments",
  mayonnaise: "condiments",
  mustard: "condiments",
  sauce: "condiments",
  honey: "condiments",
  sugar: "condiments",
  // Canned
  "tomato paste": "canned",
  "coconut milk": "canned",
  broth: "canned",
  stock: "canned",
  "canned beans": "canned",
};

function categorizeIngredient(name: string): GroceryCategory {
  const nameLower = name.toLowerCase().trim();

  // Direct match
  if (CATEGORY_MAP[nameLower]) {
    return CATEGORY_MAP[nameLower];
  }

  // Partial match (check if any key is substring of name)
  for (const [key, category] of Object.entries(CATEGORY_MAP)) {
    if (nameLower.includes(key)) {
      return category;
    }
  }

  return "other";
}

function parseQuantity(quantityStr: string): number {
  // Extract numeric part from quantity string like "2", "2.5", "1/2", etc.
  const match = quantityStr.match(/^(\d+(?:\.?\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function canAddQuantities(unit1: string, unit2: string): boolean {
  // Normalize units
  const normalize = (u: string) => u.toLowerCase().trim();
  return normalize(unit1) === normalize(unit2);
}

function consolidateIngredients(slots: SlotWithRecipe[]): ConsolidatedIngredient[] {
  const grouped: Record<
    string,
    { items: ConsolidatedIngredient[]; count: number }
  > = {};

  // Group by name (case-insensitive)
  slots.forEach((slot) => {
    if (!slot.recipes?.ingredients) return;

    slot.recipes.ingredients.forEach((ing: Ingredient) => {
      const key = ing.name.toLowerCase();
      if (!grouped[key]) {
        grouped[key] = { items: [], count: 0 };
      }
      grouped[key].count++;

      const category = categorizeIngredient(ing.name);
      grouped[key].items.push({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category,
      });
    });
  });

  // Consolidate quantities
  const consolidated: ConsolidatedIngredient[] = [];
  Object.values(grouped).forEach((group) => {
    // Try to combine items with same unit
    const byUnit: Record<string, { quantity: number; items: ConsolidatedIngredient[] }> = {};

    group.items.forEach((item) => {
      const unit = item.unit.toLowerCase();
      if (!byUnit[unit]) {
        byUnit[unit] = { quantity: 0, items: [] };
      }
      byUnit[unit].quantity += parseQuantity(item.quantity);
      byUnit[unit].items.push(item);
    });

    // Add consolidated items (one per unit type)
    Object.entries(byUnit).forEach(([unit, data]) => {
      if (data.items.length > 0) {
        const firstItem = data.items[0];
        consolidated.push({
          name: firstItem.name,
          quantity: data.quantity.toString(),
          unit: firstItem.unit,
          category: firstItem.category,
        });
      }
    });
  });

  return consolidated;
}

export default function GroceryListPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const supabase = createClient();

  // State
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [slots, setSlots] = useState<SlotWithRecipe[]>([]);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

      // Fetch meal plan slots with recipe ingredients
      const { data: slotsData } = await supabase
        .from("meal_plan_slots")
        .select(`
          *,
          recipes:recipe_id (
            id, title, title_zh, ingredients, ingredients_zh
          )
        `)
        .eq("meal_plan_id", planId)
        .order("plan_date", { ascending: true })
        .order("meal_type", { ascending: true });

      setSlots((slotsData ?? []) as SlotWithRecipe[]);

      // Check if grocery list exists
      const { data: existingList } = await supabase
        .from("grocery_lists")
        .select("*")
        .eq("meal_plan_id", planId)
        .single();

      if (existingList) {
        setGroceryList(existingList as GroceryList);
        // Fetch grocery items
        const { data: itemsData } = await supabase
          .from("grocery_items")
          .select("*")
          .eq("grocery_list_id", existingList.id)
          .order("sort_order", { ascending: true });
        setGroceryItems((itemsData ?? []) as GroceryItem[]);
      } else {
        // Auto-generate list
        await generateGroceryList(planData as MealPlan, (slotsData ?? []) as SlotWithRecipe[]);
      }

      setLoading(false);
    }

    loadData();
  }, [planId, supabase, router]);

  // Generate grocery list from meal plan
  async function generateGroceryList(mealPlan: MealPlan, mealSlots: SlotWithRecipe[]) {
    // Consolidate ingredients
    const consolidated = consolidateIngredients(mealSlots);

    // Group by category
    const byCategory: Record<GroceryCategory, ConsolidatedIngredient[]> = {
      produce: [],
      dairy: [],
      meat: [],
      seafood: [],
      bakery: [],
      frozen: [],
      canned: [],
      condiments: [],
      spices: [],
      grains: [],
      snacks: [],
      beverages: [],
      other: [],
    };

    consolidated.forEach((item) => {
      byCategory[item.category].push(item);
    });

    // Create grocery list
    const { data: newList, error: listError } = await supabase
      .from("grocery_lists")
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        meal_plan_id: planId,
        title: `${mealPlan.title} - Grocery List`,
      })
      .select()
      .single();

    if (listError) {
      setMessage("Error creating grocery list: " + listError.message);
      return;
    }

    // Insert items by category
    let sortOrder = 0;
    const allItems: any[] = [];

    for (const [category, items] of Object.entries(byCategory)) {
      items.forEach((item) => {
        allItems.push({
          grocery_list_id: newList.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: category as GroceryCategory,
          is_checked: false,
          sort_order: sortOrder++,
        });
      });
    }

    if (allItems.length > 0) {
      const { data: insertedItems, error: itemsError } = await supabase
        .from("grocery_items")
        .insert(allItems)
        .select();

      if (itemsError) {
        setMessage("Error adding items: " + itemsError.message);
        return;
      }

      setGroceryList(newList as GroceryList);
      setGroceryItems((insertedItems ?? []) as GroceryItem[]);
    } else {
      setGroceryList(newList as GroceryList);
      setGroceryItems([]);
    }

    setMessage("Grocery list generated successfully!");
  }

  // Toggle item checked status
  async function toggleItemChecked(itemId: string, isChecked: boolean) {
    setSaving(true);
    const { error } = await supabase
      .from("grocery_items")
      .update({ is_checked: !isChecked })
      .eq("id", itemId);

    if (error) {
      setMessage("Error updating item: " + error.message);
    } else {
      setGroceryItems(
        groceryItems.map((item) =>
          item.id === itemId ? { ...item, is_checked: !isChecked } : item
        )
      );
    }
    setSaving(false);
  }

  // Regenerate list
  async function regenerateList() {
    if (!plan || groceryList === null) return;

    setSaving(true);
    setMessage("");

    // Delete old items
    const { error: deleteError } = await supabase
      .from("grocery_items")
      .delete()
      .eq("grocery_list_id", groceryList.id);

    if (deleteError) {
      setMessage("Error deleting old items: " + deleteError.message);
      setSaving(false);
      return;
    }

    // Regenerate
    await generateGroceryList(plan, slots);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!plan || !groceryList) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="text-zinc-600 dark:text-zinc-400">Grocery list not found</p>
        </div>
      </div>
    );
  }

  // Group items by category
  const categories: GroceryCategory[] = [
    "produce",
    "dairy",
    "meat",
    "seafood",
    "bakery",
    "frozen",
    "canned",
    "condiments",
    "spices",
    "grains",
    "snacks",
    "beverages",
    "other",
  ];

  const categoryLabels: Record<GroceryCategory, string> = {
    produce: "Produce",
    dairy: "Dairy",
    meat: "Meat",
    seafood: "Seafood",
    bakery: "Bakery",
    frozen: "Frozen Foods",
    canned: "Canned Goods",
    condiments: "Condiments & Sauces",
    spices: "Spices & Herbs",
    grains: "Grains & Pasta",
    snacks: "Snacks",
    beverages: "Beverages",
    other: "Other",
  };

  const itemsByCategory: Record<GroceryCategory, GroceryItem[]> = {
    produce: [],
    dairy: [],
    meat: [],
    seafood: [],
    bakery: [],
    frozen: [],
    canned: [],
    condiments: [],
    spices: [],
    grains: [],
    snacks: [],
    beverages: [],
    other: [],
  };

  groceryItems.forEach((item) => {
    itemsByCategory[item.category].push(item);
  });

  const totalItems = groceryItems.length;
  const checkedItems = groceryItems.filter((item) => item.is_checked).length;

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Grocery List — {plan.title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {checkedItems} of {totalItems} items checked
          </p>

          {/* Progress bar */}
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden mb-6">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%` }}
            />
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
          <button
            onClick={regenerateList}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Regenerate List
          </button>

          <button
            onClick={() => window.print()}
            className="rounded-lg bg-zinc-200 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            Print
          </button>

          <Link
            href={`/dashboard/plans/${planId}`}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Back to Plan
          </Link>
        </div>

        {/* Grocery Items by Category */}
        <div className="space-y-8 print:space-y-4">
          {categories.map((category) => {
            const items = itemsByCategory[category];
            if (items.length === 0) return null;

            return (
              <div key={category} className="rounded-lg bg-white dark:bg-zinc-900 overflow-hidden border border-zinc-200 dark:border-zinc-800 print:border print:border-zinc-300">
                {/* Category Header */}
                <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {categoryLabels[category]}
                  </h2>
                </div>

                {/* Items */}
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors print:py-2"
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={item.is_checked}
                        onChange={() => toggleItemChecked(item.id, item.is_checked)}
                        disabled={saving}
                        className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />

                      {/* Item name and quantity */}
                      <div className="flex-1">
                        <div
                          className={`text-sm font-medium ${
                            item.is_checked
                              ? "line-through text-zinc-400 dark:text-zinc-500"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {item.name}
                        </div>
                        {item.quantity && item.unit && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {item.quantity} {item.unit}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {groceryItems.length === 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No ingredients found. Add recipes to your meal plan to generate a grocery list.
            </p>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            background-color: white;
          }
          .print\\:border {
            border: 1px solid #d4d4d8;
          }
          .print\\:py-2 {
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
          }
          .print\\:space-y-4 > * + * {
            margin-top: 1rem;
          }
          button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
