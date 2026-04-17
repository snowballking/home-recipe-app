// ============================================================
// Data types for Home Recipe App
// ============================================================

// ── Profiles & Household ────────────────────────────────────

export type AgeGroup = "toddler" | "child_4_8" | "child_9_13" | "teen_14_18" | "adult";

export interface HouseholdMember {
  name: string;
  age_group: AgeGroup;
}

export interface Profile {
  id: string;
  displayname: string | null;
  bio: string | null;
  avatar_url: string | null;
  household_members: HouseholdMember[];
  follower_count: number;
  following_count: number;
  recipe_count: number;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

// ── Recipes ─────────────────────────────────────────────────

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface AlternativeIngredient {
  name: string;
  description: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  important_note: string | null;
  ingredients: Ingredient[];
  alternative_ingredients: AlternativeIngredient[];
  steps: string[];
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  cuisine: string | null;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | "drinks" | null;
  category: string | null;
  dietary_tags: string[];
  calories_per_serving: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  hero_image_url: string | null;
  source_url: string | null;
  is_public: boolean;
  original_recipe_id: string | null;
  avg_rating: number;
  rating_count: number;
  save_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  // Simplified Chinese translations (populated by AI during import)
  title_zh: string | null;
  description_zh: string | null;
  important_note_zh: string | null;
  ingredients_zh: Ingredient[] | null;
  steps_zh: string[] | null;
  profiles?: Profile;
  author_name?: string;
}

// ── Meal Plans ──────────────────────────────────────────────

export type DurationType = "1_week" | "2_weeks" | "3_weeks" | "1_month";
export type PlanStatus = "draft" | "finalized";
export type SlotMealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealPlan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  duration_type: DurationType;
  start_date: string;
  end_date: string;
  status: PlanStatus;
  is_public: boolean;
  notes: string | null;
  comment_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  profiles?: Profile;
}

export interface MealPlanSlot {
  id: string;
  meal_plan_id: string;
  recipe_id: string;
  plan_date: string;
  meal_type: SlotMealType;
  servings: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  // Joined
  recipes?: Recipe;
}

export interface MealPlanComment {
  id: string;
  user_id: string;
  meal_plan_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  replies?: MealPlanComment[];
}

// ── Grocery ─────────────────────────────────────────────────

export type GroceryCategory =
  | "produce" | "dairy" | "meat" | "seafood" | "bakery" | "frozen"
  | "canned" | "condiments" | "spices" | "grains" | "snacks" | "beverages" | "other";

export interface GroceryList {
  id: string;
  user_id: string;
  meal_plan_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface GroceryItem {
  id: string;
  grocery_list_id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: GroceryCategory;
  is_checked: boolean;
  sort_order: number;
  created_at: string;
}

// ── Nutrition Targets ───────────────────────────────────────

export interface NutritionTarget {
  id: string;
  age_group: AgeGroup;
  label: string;
  calories_min: number;
  calories_max: number;
  protein_min_g: number;
  protein_max_g: number;
  carbs_min_g: number;
  carbs_max_g: number;
  fat_min_g: number;
  fat_max_g: number;
}

// Computed nutrition for a day or period
export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ── Legacy types (kept for backward compatibility) ──────────

export interface Rating {
  id: string;
  user_id: string;
  recipe_id: string;
  score: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Comment {
  id: string;
  user_id: string;
  recipe_id: string;
  parent_id: string | null;
  body: string;
  photo_url: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  replies?: Comment[];
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface RecipeSave {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
}

export interface RecipeFormData {
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  cuisine: string;
  meal_type: string;
  dietary_tags: string[];
  source_url: string;
  is_public: boolean;
}

export interface RecipeFilters {
  cuisine?: string;
  meal_type?: string;
  difficulty?: string;
  dietary_tag?: string;
  max_cook_time?: number;
  max_calories?: number;
  sort_by?: "trending" | "popular" | "newest" | "top_rated";
  search?: string;
}

// ── Constants ───────────────────────────────────────────────

export const CUISINES = [
  "Chinese", "Malay", "Indian", "Western", "Japanese", "Korean",
  "Thai", "Vietnamese", "Italian", "Mexican", "Middle Eastern",
  "French", "American", "Mediterranean", "Other",
] as const;

export const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
  { value: "drinks", label: "Drinks" },
] as const;

// ── Recipe Categories (for browsing / filtering) ────────────
// Stored as a TEXT column (`category`) on the recipes table.
export const RECIPE_CATEGORIES = [
  { value: "all",           label: "Recipes Category", icon: "🍽" },
  { value: "breakfast",     label: "Breakfast",        icon: "🥞" },
  { value: "appetizers",    label: "Appetizers",       icon: "🥟" },
  { value: "soups",         label: "Soups & Stews",    icon: "🍲" },
  { value: "salads",        label: "Salads",           icon: "🥗" },
  { value: "meat_seafood",   label: "Meat & Seafood",   icon: "🥩" },
  { value: "vegetables",    label: "Vegetable Dishes", icon: "🥦" },
  { value: "noodles_rice",  label: "Noodles & Rice",   icon: "🍜" },
  { value: "snacks",        label: "Snacks",           icon: "🧀" },
  { value: "desserts",      label: "Desserts",         icon: "🍰" },
  { value: "drinks",        label: "Drinks",           icon: "🥤" },
] as const;

/** All valid DB values (excludes "all" which is a UI-only filter). */
export const RECIPE_CATEGORY_VALUES = RECIPE_CATEGORIES
  .filter((c) => c.value !== "all")
  .map((c) => c.value);

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]["value"];

export const SLOT_MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

export const DIETARY_TAGS = [
  "Vegetarian", "Vegan", "Halal", "Gluten-Free", "Keto",
  "Low-Carb", "Dairy-Free", "Nut-Free", "Paleo", "Whole30",
] as const;

export const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export const DURATION_OPTIONS = [
  { value: "1_week", label: "1 Week", days: 7 },
  { value: "2_weeks", label: "2 Weeks", days: 14 },
  { value: "3_weeks", label: "3 Weeks", days: 21 },
  { value: "1_month", label: "1 Month", days: 30 },
] as const;

export const AGE_GROUPS = [
  { value: "toddler", label: "Toddler (1-3 years)" },
  { value: "child_4_8", label: "Child (4-8 years)" },
  { value: "child_9_13", label: "Child (9-13 years)" },
  { value: "teen_14_18", label: "Teenager (14-18 years)" },
  { value: "adult", label: "Adult (19+ years)" },
] as const;

export const GROCERY_CATEGORIES = [
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "meat", label: "Meat" },
  { value: "seafood", label: "Seafood" },
  { value: "bakery", label: "Bakery" },
  { value: "frozen", label: "Frozen" },
  { value: "canned", label: "Canned Goods" },
  { value: "condiments", label: "Condiments & Sauces" },
  { value: "spices", label: "Spices & Herbs" },
  { value: "grains", label: "Grains & Pasta" },
  { value: "snacks", label: "Snacks" },
  { value: "beverages", label: "Beverages" },
  { value: "other", label: "Other" },
] as const;
