// UI translations for English and Simplified Chinese
// Recipe content translations are stored in the database (_zh columns)

export type Locale = "en" | "zh";

const translations = {
  // ── Navigation ──────────────────────────────────────
  "nav.recipes_market": { en: "Recipes\nMarket", zh: "食谱\n市场" },
  "nav.recipes_market_short": { en: "Recipes Market", zh: "食谱市场" },
  "nav.my_recipes": { en: "My\nRecipes", zh: "我的\n食谱" },
  "nav.my_recipes_short": { en: "My Recipes", zh: "我的食谱" },
  "nav.meal_plans_market": { en: "Meal Plans\nMarket", zh: "餐计划\n市场" },
  "nav.meal_plans_market_short": { en: "Meal Plans Market", zh: "餐计划市场" },
  "nav.my_meal_plans": { en: "My\nMeal Plans", zh: "我的\n餐计划" },
  "nav.my_meal_plans_short": { en: "My Meal Plans", zh: "我的餐计划" },
  "nav.admin": { en: "⚙ Admin", zh: "⚙ 管理" },
  "nav.sign_in": { en: "Sign In", zh: "登录" },
  "nav.log_out": { en: "Log Out", zh: "退出" },

  // ── Recipes Market ──────────────────────────────────
  "market.title": { en: "Recipes Market", zh: "食谱市场" },
  "market.subtitle": { en: "Browse public recipes shared by the community", zh: "浏览社区分享的公开食谱" },
  "market.search": { en: "Search recipes...", zh: "搜索食谱..." },
  "market.all_cuisines": { en: "All Cuisines", zh: "所有菜系" },
  "market.all": { en: "All", zh: "全部" },
  "market.newest": { en: "Newest", zh: "最新" },
  "market.top_rated": { en: "Top Rated", zh: "最高评分" },
  "market.most_saved": { en: "Most Saved", zh: "最多收藏" },
  "market.loading": { en: "Loading recipes...", zh: "加载食谱中..." },
  "market.no_recipes": { en: "No recipes found", zh: "未找到食谱" },
  "market.no_recipes_hint": { en: "Try adjusting your search, category, or cuisine filter.", zh: "请尝试调整搜索、分类或菜系筛选。" },
  "market.recipe_count": { en: "recipe", zh: "个食谱" },
  "market.recipes_count": { en: "recipes", zh: "个食谱" },
  "market.other": { en: "Other", zh: "其他" },

  // ── My Recipes ──────────────────────────────────────
  "my_recipes.title": { en: "My Recipes", zh: "我的食谱" },
  "my_recipes.public": { en: "public", zh: "公开" },
  "my_recipes.private": { en: "private", zh: "私密" },
  "my_recipes.new_recipe": { en: "+ New Recipe", zh: "+ 新食谱" },
  "my_recipes.search": { en: "Search your recipes...", zh: "搜索你的食谱..." },
  "my_recipes.no_recipes": { en: "No recipes yet", zh: "还没有食谱" },
  "my_recipes.no_recipes_hint": { en: "Start building your recipe collection by adding your first recipe.", zh: "添加你的第一个食谱，开始建立你的食谱集。" },
  "my_recipes.add_first": { en: "Add Your First Recipe", zh: "添加第一个食谱" },
  "my_recipes.no_matches": { en: "No matches", zh: "没有匹配" },
  "my_recipes.no_matches_hint": { en: "No recipes match your current filters.", zh: "没有食谱匹配当前筛选条件。" },

  // ── Recipe Detail ───────────────────────────────────
  "recipe.ingredients": { en: "Ingredients", zh: "食材" },
  "recipe.alternative_ingredients": { en: "Alternative Ingredients", zh: "替代食材" },
  "recipe.steps": { en: "Steps", zh: "步骤" },
  "recipe.important_note": { en: "Important Note", zh: "重要提示" },
  "recipe.servings": { en: "Servings", zh: "份量" },
  "recipe.prep_time": { en: "Prep Time", zh: "准备时间" },
  "recipe.cook_time": { en: "Cook Time", zh: "烹饪时间" },
  "recipe.difficulty": { en: "Difficulty", zh: "难度" },
  "recipe.cuisine": { en: "Cuisine", zh: "菜系" },
  "recipe.calories": { en: "Calories", zh: "卡路里" },
  "recipe.protein": { en: "Protein", zh: "蛋白质" },
  "recipe.carbs": { en: "Carbs", zh: "碳水" },
  "recipe.fat": { en: "Fat", zh: "脂肪" },
  "recipe.minutes": { en: "min", zh: "分钟" },
  "recipe.per_serving": { en: "per serving", zh: "每份" },
  "recipe.nutrition": { en: "Nutrition", zh: "营养信息" },
  "recipe.back": { en: "← Back", zh: "← 返回" },
  "recipe.edit": { en: "Edit", zh: "编辑" },
  "recipe.public": { en: "Public", zh: "公开" },
  "recipe.private": { en: "Private", zh: "私密" },

  // ── Meal Plans ──────────────────────────────────────
  "meal_plan.breakfast": { en: "Breakfast", zh: "早餐" },
  "meal_plan.lunch": { en: "Lunch", zh: "午餐" },
  "meal_plan.dinner": { en: "Dinner", zh: "晚餐" },
  "meal_plan.snack": { en: "Snack", zh: "小食" },
  "meal_plan.add_dish": { en: "+ Add", zh: "+ 添加" },
  "meal_plan.share": { en: "Share", zh: "分享" },
  "meal_plan.link_copied": { en: "Link copied!", zh: "链接已复制！" },
  "meal_plan.select_recipe": { en: "Select a Recipe", zh: "选择食谱" },
  "meal_plan.search_recipes": { en: "Search recipes...", zh: "搜索食谱..." },
  "meal_plan.no_recipes": { en: "No recipes available", zh: "没有可用的食谱" },

  // ── Meal Plans Market ────────────────────────────────
  "explore.title": { en: "Meal Plans Market", zh: "餐计划市场" },
  "explore.subtitle": { en: "Discover meal plans shared by the community", zh: "发现社区分享的餐计划" },
  "explore.search": { en: "Search meal plans...", zh: "搜索餐计划..." },
  "explore.newest": { en: "Newest", zh: "最新" },
  "explore.most_commented": { en: "Most Commented", zh: "最多评论" },
  "explore.loading": { en: "Loading meal plans...", zh: "加载餐计划中..." },
  "explore.no_plans": { en: "No meal plans found", zh: "未找到餐计划" },
  "explore.no_plans_hint": { en: "Try adjusting your search terms.", zh: "请尝试调整搜索关键词。" },
  "explore.plan_count": { en: "meal plan", zh: "个餐计划" },
  "explore.plans_count": { en: "meal plans", zh: "个餐计划" },
  "explore.found": { en: "found", zh: "" },
  "explore.comment": { en: "comment", zh: "条评论" },
  "explore.comments": { en: "comments", zh: "条评论" },

  // ── My Meal Plans ───────────────────────────────────
  "my_plans.title": { en: "My Meal Plans", zh: "我的餐计划" },
  "my_plans.plan_count": { en: "meal plan", zh: "个餐计划" },
  "my_plans.plans_count": { en: "meal plans", zh: "个餐计划" },
  "my_plans.new_plan": { en: "+ Create New Plan", zh: "+ 创建新计划" },
  "my_plans.no_plans": { en: "No meal plans yet", zh: "还没有餐计划" },
  "my_plans.no_plans_hint": { en: "Start planning your meals by creating your first meal plan.", zh: "创建你的第一个餐计划，开始规划你的饮食。" },
  "my_plans.create_first": { en: "Create Your First Plan", zh: "创建第一个计划" },
  "my_plans.finalized": { en: "✓ Finalized", zh: "✓ 已完成" },
  "my_plans.draft": { en: "Draft", zh: "草稿" },
  "my_plans.public": { en: "🌐 Public", zh: "🌐 公开" },
  "my_plans.delete_confirm": { en: "Are you sure you want to delete", zh: "确定要删除" },
  "my_plans.delete_warning": { en: "This will also remove its grocery list. This cannot be undone.", zh: "这也将删除对应的购物清单，此操作无法撤销。" },

  // ── Recipe Categories ───────────────────────────────
  "cat.all": { en: "All", zh: "全部" },
  "cat.recipes_category": { en: "Recipes Category", zh: "食谱分类" },
  "cat.breakfast": { en: "Breakfast", zh: "早餐" },
  "cat.appetizers": { en: "Appetizers", zh: "开胃菜" },
  "cat.soups": { en: "Soups & Stews", zh: "汤类" },
  "cat.salads": { en: "Salads", zh: "沙拉" },
  "cat.meat_seafood": { en: "Meat & Seafood", zh: "肉类和海鲜" },
  "cat.vegetables": { en: "Vegetable Dishes", zh: "蔬菜" },
  "cat.noodles_rice": { en: "Noodles & Rice", zh: "面食和米饭" },
  "cat.snacks": { en: "Snacks", zh: "小食" },
  "cat.desserts": { en: "Desserts", zh: "甜品" },
  "cat.drinks": { en: "Drinks", zh: "饮品" },

  // ── Difficulty ──────────────────────────────────────
  "diff.beginner": { en: "Beginner", zh: "入门" },
  "diff.intermediate": { en: "Intermediate", zh: "中等" },
  "diff.advanced": { en: "Advanced", zh: "高级" },

  // ── Duration Types ──────────────────────────────────
  "duration.1_week": { en: "1 Week", zh: "1 周" },
  "duration.2_weeks": { en: "2 Weeks", zh: "2 周" },
  "duration.3_weeks": { en: "3 Weeks", zh: "3 周" },
  "duration.1_month": { en: "1 Month", zh: "1 个月" },

  // ── Common ──────────────────────────────────────────
  "common.save": { en: "Save", zh: "保存" },
  "common.cancel": { en: "Cancel", zh: "取消" },
  "common.delete": { en: "Delete", zh: "删除" },
  "common.close": { en: "Close", zh: "关闭" },
  "common.loading": { en: "Loading...", zh: "加载中..." },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  return translations[key]?.[locale] ?? translations[key]?.en ?? key;
}

/** Map a category value (e.g. "meat_seafood") to its translated label */
const CATEGORY_KEY_MAP: Record<string, TranslationKey> = {
  all: "cat.all",
  breakfast: "cat.breakfast",
  appetizers: "cat.appetizers",
  soups: "cat.soups",
  salads: "cat.salads",
  meat_seafood: "cat.meat_seafood",
  vegetables: "cat.vegetables",
  noodles_rice: "cat.noodles_rice",
  snacks: "cat.snacks",
  desserts: "cat.desserts",
  drinks: "cat.drinks",
};

export function translateCategory(value: string, locale: Locale): string {
  const key = CATEGORY_KEY_MAP[value];
  if (key) return t(key, locale);
  return value; // fallback to raw value
}

export default translations;
