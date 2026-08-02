// UI translations for English and Simplified Chinese
// Recipe content translations are stored in the database (_zh columns)

export type Locale = "en" | "zh";

const translations = {
  // ── Navigation ──────────────────────────────────────
  "nav.recipes": { en: "Recipes", zh: "食谱" },
  "nav.recipes_short": { en: "Recipes", zh: "食谱" },
  "nav.meal_plans": { en: "Meal\nPlans", zh: "餐计划" },
  "nav.meal_plans_short": { en: "Meal Plans", zh: "餐计划" },
  "nav.explore": { en: "Explore", zh: "探索" },
  "nav.explore_short": { en: "Explore", zh: "探索" },
  "nav.chefs": { en: "Chefs", zh: "厨师" },
  "nav.chefs_short": { en: "Chefs", zh: "厨师" },
  "nav.admin": { en: "⚙ Admin", zh: "⚙ 管理" },
  "nav.sign_in": { en: "Sign In", zh: "登录" },
  "nav.log_out": { en: "Log Out", zh: "退出" },
  "nav.logging_out": { en: "Logging out…", zh: "正在退出…" },
  "nav.my_profile": { en: "My Profile", zh: "我的主页" },
  "nav.saved_recipes": { en: "Saved Recipes", zh: "已收藏食谱" },
  "nav.edit_profile": { en: "Edit Profile", zh: "编辑个人资料" },
  "nav.home": { en: "Home", zh: "首页" },
  "nav.discover": { en: "Discover", zh: "发现" },
  "nav.plans": { en: "Plans", zh: "计划" },
  "nav.create": { en: "Create", zh: "创建" },
  "nav.cart": { en: "Cart", zh: "购物车" },
  "nav.cart_coming_soon": { en: "Universal cart coming soon", zh: "通用购物车即将推出" },
  "nav.coming_soon": { en: "Coming Soon", zh: "即将推出" },
  "nav.profile": { en: "Profile", zh: "个人主页" },

  // ── Global creation menu ───────────────────────────
  "create.title": { en: "Create", zh: "创建" },
  "create.add_recipe": { en: "Add recipe", zh: "添加食谱" },
  "create.add_recipe_description": { en: "Write one from scratch or import a recipe link.", zh: "手动创建，或导入食谱链接。" },
  "create.start_plan": { en: "Start a meal plan", zh: "开始餐计划" },
  "create.start_plan_description": { en: "Organise several meals when you are ready.", zh: "准备好后，再安排多顿餐食。" },

  // ── Community home ──────────────────────────────────
  "home.eyebrow": { en: "Community kitchen", zh: "社区厨房" },
  "home.title": { en: "What are you cooking next?", zh: "下一顿想做什么？" },
  "home.for_you": { en: "For you", zh: "为你推荐" },
  "home.following": { en: "Following", zh: "已关注" },
  "home.empty_following": { en: "Follow a cook to fill this feed.", zh: "关注一位厨友，这里就会有新内容。" },
  "home.open_recipe": { en: "View recipe", zh: "查看食谱" },
  "home.comments": { en: "Comments", zh: "评论" },

  // ── Saved recipe collection ────────────────────────
  "saved.title": { en: "Saved Recipes", zh: "已收藏食谱" },
  "saved.private": { en: "Only you can see this collection.", zh: "只有你能看到这个收藏夹。" },
  "saved.empty": { en: "Save recipes from Discover or a recipe page and they will appear here.", zh: "在发现页或食谱详情中收藏食谱，它们会显示在这里。" },
  "saved.browse": { en: "Browse recipes", zh: "浏览食谱" },
  "saved.save_action": { en: "Save recipe", zh: "收藏食谱" },
  "saved.remove_action": { en: "Remove from saved recipes", zh: "取消收藏食谱" },

  // ── Recipe discovery ────────────────────────────────
  "discover.title": { en: "Find your next favourite", zh: "发现下一道心头好" },
  "discover.subtitle": { en: "Search recipes, flavours, and community ideas.", zh: "搜索食谱、风味和社区灵感。" },
  "discover.search": { en: "Try laksa, vegetarian, or Japanese…", zh: "试试搜索叻沙、素食或日式料理……" },
  "discover.no_matches": { en: "No recipes match that yet.", zh: "暂时没有符合的食谱。" },

  // ── Market/Mine toggle (merged Recipes & Meal Plans tabs) ──
  "collection.market": { en: "Market", zh: "市场" },
  "collection.mine": { en: "Mine", zh: "我的" },

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

  // ── Meal-plan festival / season tags ────────────────
  "festival.label": { en: "Festive / seasonal tag", zh: "节庆 / 季节标签" },
  "festival.helper": {
    en: "Optional. Tag a plan so people can find it with other community plans for the same celebration.",
    zh: "选填。为计划添加标签，让大家能在社区中找到同一节庆的餐计划。",
  },
  "festival.none": { en: "No festival or season", zh: "不标记节庆或季节" },
  "festival.all": { en: "All plans", zh: "所有计划" },
  "festival.updated": { en: "Festival tag updated", zh: "节庆标签已更新" },
  "festival.lunar_new_year": { en: "Lunar New Year", zh: "农历新年" },
  "festival.hari_raya": { en: "Hari Raya", zh: "开斋节" },
  "festival.deepavali": { en: "Deepavali", zh: "屠妖节" },
  "festival.mid_autumn": { en: "Mid-Autumn Festival", zh: "中秋节" },
  "festival.christmas": { en: "Christmas", zh: "圣诞节" },
  "festival.ramadan": { en: "Ramadan", zh: "斋月" },
  "festival.new_year": { en: "New Year", zh: "新年" },

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

  // ── Recipe Card ─────────────────────────────────────
  "recipe_card.ai_image": { en: "AI image", zh: "AI 图片" },

  // ── Forking / variations ────────────────────────────
  "fork.variation_tag": { en: "Variation", zh: "改良版" },
  "fork.make_it_your_own": { en: "🔀 Make it your own", zh: "🔀 做出我的版本" },
  "fork.variation_of": { en: "🔀 Variation of", zh: "🔀 改良版" },
  "fork.what_changed": { en: "What changed:", zh: "改动说明：" },
  "fork.variations": { en: "Variations", zh: "改良版" },
  "fork.variations_sub": { en: "Other cooks made it their own:", zh: "其他厨友也做出了自己的版本：" },
  "fork.recipe_versions": { en: "Recipe versions", zh: "食谱版本" },
  "fork.original": { en: "Original", zh: "原版" },
  "fork.variation_by": { en: "Variation by", zh: "改良者" },
  "fork.selected_version": { en: "Selected version", zh: "已选版本" },
  "fork.change_summary": { en: "What changed", zh: "改动说明" },
  "fork.untitled": { en: "Untitled variation", zh: "未命名改良版" },
  "fork.form_heading": { en: "Make a Variation", zh: "制作改良版" },
  "fork.prefilled_hint": {
    en: "We've pre-filled the details below — tweak anything you like. Your variation starts private, and the original author's photo isn't copied (add your own or generate one to publish).",
    zh: "我们已为你预填了以下内容——随意修改。你的改良版默认私密，且不会复制原作者的照片（上传自己的照片或生成 AI 图片后即可公开）。",
  },
  "fork.note_label": { en: "What did you change?", zh: "你改了什么？" },
  "fork.note_placeholder": { en: "e.g. Swapped chicken for tofu and cut the sugar in half", zh: "例如：把鸡肉换成豆腐，糖减半" },
  "fork.note_helper": { en: "A short note so others know how your variation differs from the original.", zh: "简单说明你的版本与原版有何不同，方便大家了解。" },
  "fork.note_required": { en: "Tell others what you changed in your variation", zh: "请填写你的改动说明" },
  "variation.editor_title": { en: "Make a variation", zh: "制作改良版" },
  "variation.based_on": { en: "Based on", zh: "基于" },
  "variation.inherited_hint": { en: "The original recipe stays underneath. Add only the ingredients and instructions you want to change.", zh: "原食谱会保留在底层。只需添加你想修改的食材和步骤。" },
  "variation.summary_label": { en: "What is different?", zh: "这个版本有什么不同？" },
  "variation.summary_placeholder": { en: "e.g. Less oil, nut-free, and a brighter lime finish", zh: "例如：少油、无坚果，并加入更清新的青柠风味" },
  "variation.ingredients_title": { en: "Ingredient changes", zh: "食材改动" },
  "variation.instructions_title": { en: "Instruction changes", zh: "步骤改动" },
  "variation.no_ingredient_changes": { en: "All ingredients are inherited until you change them.", zh: "在你修改之前，所有食材都沿用原版。" },
  "variation.no_step_changes": { en: "All instructions are inherited until you change them.", zh: "在你修改之前，所有步骤都沿用原版。" },
  "variation.replace": { en: "Replace", zh: "替换" },
  "variation.remove": { en: "Remove", zh: "移除" },
  "variation.restore": { en: "Restore", zh: "恢复" },
  "variation.add_ingredient": { en: "Add ingredient", zh: "添加食材" },
  "variation.replacement_quantity": { en: "Replacement quantity for", zh: "替换用量：" },
  "variation.replacement_unit": { en: "Replacement unit for", zh: "替换单位：" },
  "variation.replacement_ingredient": { en: "Replacement ingredient for", zh: "替换食材：" },
  "variation.additional_quantity": { en: "Additional quantity", zh: "新增用量" },
  "variation.additional_unit": { en: "Additional unit", zh: "新增单位" },
  "variation.additional_ingredient": { en: "Additional ingredient", zh: "新增食材" },
  "variation.removed": { en: "Removed", zh: "已移除" },
  "variation.rewrite": { en: "Rewrite", zh: "改写" },
  "variation.step": { en: "step", zh: "步骤" },
  "variation.add_before": { en: "Add before", zh: "在前面添加" },
  "variation.add_after": { en: "Add after", zh: "在后面添加" },
  "variation.rewritten_step": { en: "Rewritten step", zh: "改写后的步骤" },
  "variation.new_step_before": { en: "New step before step", zh: "新增步骤，位于步骤之前" },
  "variation.new_step_after": { en: "New step after step", zh: "新增步骤，位于步骤之后" },
  "variation.save": { en: "Save variation", zh: "保存改良版" },
  "variation.saving": { en: "Saving variation…", zh: "正在保存改良版……" },
  "variation.private_hint": { en: "Your variation starts private. You can manage publishing after saving.", zh: "你的改良版默认私密，保存后可再管理公开状态。" },
  "variation.error_summary": { en: "Describe what is different.", zh: "请说明这个版本有什么不同。" },
  "variation.error_empty": { en: "Make at least one ingredient or instruction change.", zh: "请至少修改一项食材或步骤。" },
  "variation.error_invalid": { en: "Complete or restore the highlighted change before saving.", zh: "请完成或恢复标出的改动后再保存。" },
  "variation.loading": { en: "Loading the original recipe…", zh: "正在加载原食谱……" },
  "variation.source_error": { en: "We couldn't load the original recipe.", zh: "无法加载原食谱。" },
  "variation.save_error": { en: "We couldn't save this variation.", zh: "无法保存这个改良版。" },
  "variation.changes_title": { en: "What changed", zh: "具体改动" },
  "variation.changes_ingredients": { en: "Ingredients", zh: "食材" },
  "variation.changes_instructions": { en: "Instructions", zh: "烹饪步骤" },
  "variation.changed_replaced": { en: "Replaced", zh: "替换" },
  "variation.changed_added": { en: "Added", zh: "新增" },
  "variation.changed_removed": { en: "Removed", zh: "移除" },
  "variation.changed_rewrote_step": { en: "Rewrote step", zh: "改写步骤" },
  "variation.changed_added_before_step": { en: "Added before step", zh: "新增于步骤之前" },
  "variation.changed_added_after_step": { en: "Added after step", zh: "新增于步骤之后" },
  "variation.changed_removed_step": { en: "Removed step", zh: "移除步骤" },

  // ── Recipe form (new / fork) ────────────────────────
  "form.add_new_recipe": { en: "Add New Recipe", zh: "添加新食谱" },
  "form.import_title": { en: "Import Recipe with AI", zh: "AI 导入食谱" },
  "form.import_hint": { en: "Paste a link from YouTube, recipe websites, RedNote, or Instagram", zh: "粘贴 YouTube、食谱网站、小红书或 Instagram 的链接" },
  "form.import_placeholder": { en: "https://youtube.com/watch?v=... or any recipe URL", zh: "https://youtube.com/watch?v=... 或任意食谱链接" },
  "form.import_button": { en: "Import", zh: "导入" },
  "form.importing": { en: "Extracting...", zh: "正在提取..." },
  "form.importing_video": { en: "Watching video...", zh: "正在观看视频..." },
  "form.import_youtube_wait": { en: "AI is watching the full video to extract ingredients and steps. This may take up to 60 seconds...", zh: "AI 正在观看完整视频以提取食材和步骤，最长可能需要 60 秒..." },
  "form.import_disclaimer": {
    en: "I understand that imported recipes are for personal use. The AI will rephrase cooking instructions in its own words, but I am responsible for ensuring I have the right to share any recipe I make public.",
    zh: "我理解导入的食谱仅供个人使用。AI 会用自己的语言改写烹饪步骤，但我有责任确保我有权公开分享任何食谱。",
  },
  "form.import_success": {
    en: "Recipe extracted with AI. Review the details below and save! Imported recipes start private to protect the original creator's copyright — you can publish after adding your own photo or an AI-generated image.",
    zh: "AI 已提取食谱。请检查以下内容并保存！为保护原创作者的版权，导入的食谱默认私密——添加自己的照片或 AI 生成图片后即可公开。",
  },
  "form.import_failed": { en: "Failed to import recipe.", zh: "食谱导入失败。" },
  "form.import_error": { en: "Something went wrong while importing the recipe.", zh: "导入食谱时出了点问题。" },
  "form.or_manual": { en: "or fill in manually", zh: "或手动填写" },
  "form.photo": { en: "Recipe Photo", zh: "食谱照片" },
  "form.photo_upload": { en: "Click to upload a photo of the dish", zh: "点击上传菜品照片" },
  "form.photo_formats": { en: "JPG, PNG or WebP — max 10MB. Auto-filled when importing from a URL.", zh: "JPG、PNG 或 WebP，最大 10MB。从链接导入时会自动填充。" },
  "form.photo_uploading": { en: "Uploading...", zh: "上传中..." },
  "form.photo_remove": { en: "Remove", zh: "移除" },
  "form.photo_replace": { en: "Replace photo", zh: "更换照片" },
  "form.photo_paste_url": { en: "or paste an image URL:", zh: "或粘贴图片链接：" },
  "form.ai_image_badge": { en: "✨ AI-generated image", zh: "✨ AI 生成图片" },
  "form.title": { en: "Recipe Title", zh: "食谱名称" },
  "form.title_placeholder": { en: "e.g., Grandma's Chicken Curry", zh: "例如：外婆的咖喱鸡" },
  "form.title_required": { en: "Recipe title is required", zh: "请填写食谱名称" },
  "form.description": { en: "Description", zh: "简介" },
  "form.description_placeholder": { en: "A brief description of this dish...", zh: "简单介绍这道菜..." },
  "form.source_url": { en: "Source URL (if imported)", zh: "来源链接（如为导入）" },
  "form.servings": { en: "Servings", zh: "份量" },
  "form.prep": { en: "Prep (min)", zh: "准备（分钟）" },
  "form.cook": { en: "Cook (min)", zh: "烹饪（分钟）" },
  "form.difficulty": { en: "Difficulty", zh: "难度" },
  "form.category": { en: "Category", zh: "分类" },
  "form.category_select": { en: "Select category", zh: "选择分类" },
  "form.cuisine": { en: "Cuisine", zh: "菜系" },
  "form.cuisine_select": { en: "Select cuisine", zh: "选择菜系" },
  "form.meal_type": { en: "Meal Type", zh: "餐别" },
  "form.meal_type_select": { en: "Select type", zh: "选择餐别" },
  "form.dietary_tags": { en: "Dietary Tags", zh: "饮食标签" },
  "form.nutrition": { en: "Estimated Nutrition (per serving)", zh: "预估营养（每份）" },
  "form.estimate_ai": { en: "Estimate with AI", zh: "AI 估算" },
  "form.estimating": { en: "Estimating…", zh: "估算中…" },
  "form.nutrition_need_ingredients": { en: "Add ingredients first before estimating nutrition.", zh: "请先添加食材，再估算营养。" },
  "form.nutrition_error": { en: "Error estimating nutrition: ", zh: "营养估算出错：" },
  "form.calories": { en: "Calories", zh: "卡路里" },
  "form.protein_g": { en: "Protein (g)", zh: "蛋白质（克）" },
  "form.carbs_g": { en: "Carbs (g)", zh: "碳水（克）" },
  "form.fat_g": { en: "Fat (g)", zh: "脂肪（克）" },
  "form.important_note_hint": { en: "Optional. Any remarks about this recipe — e.g. \"Less oil\", \"No chilli\", \"Kid-friendly version\".", zh: "选填。关于这道菜的备注——例如「少油」「不要辣」「儿童版」。" },
  "form.important_note_placeholder": { en: "Add any important remarks here...", zh: "在这里填写重要备注..." },
  "form.qty": { en: "Qty", zh: "用量" },
  "form.unit": { en: "Unit", zh: "单位" },
  "form.ingredient": { en: "Ingredient", zh: "食材" },
  "form.qty_placeholder": { en: "e.g. 2", zh: "如 2" },
  "form.unit_placeholder": { en: "e.g. cups", zh: "如 杯" },
  "form.ingredient_placeholder": { en: "e.g. sliced beef", zh: "如 牛肉片" },
  "form.add_ingredient": { en: "+ Add ingredient", zh: "+ 添加食材" },
  "form.alt_ingredients_hint": { en: "Optional. List ingredients that can be substituted and note what replacements work.", zh: "选填。列出可替换的食材，并说明可用什么替代。" },
  "form.alt_name": { en: "Alternative Ingredient", zh: "可替换食材" },
  "form.alt_desc": { en: "Description / Replacement Ingredients", zh: "说明 / 替代食材" },
  "form.alt_name_placeholder": { en: "e.g. butter", zh: "如 黄油" },
  "form.alt_desc_placeholder": { en: "e.g. margarine or coconut oil (1:1 ratio)", zh: "如 人造黄油或椰子油（1:1 比例）" },
  "form.add_alt_ingredient": { en: "+ Add alternative ingredient", zh: "+ 添加可替换食材" },
  "form.step_placeholder": { en: "Step", zh: "步骤" },
  "form.add_step": { en: "+ Add step", zh: "+ 添加步骤" },
  "form.public_desc": { en: "Anyone can discover this recipe in the community", zh: "社区中的任何人都能看到这个食谱" },
  "form.private_desc": { en: "Only you can see this recipe", zh: "只有你能看到这个食谱" },
  "form.publish_policy": {
    en: "To protect creators' copyright, public recipes need your own photo or an AI-generated image — photos imported from other sites can't be published.",
    zh: "为保护创作者版权，公开食谱需要你自己的照片或 AI 生成图片——从其他网站导入的照片不能公开。",
  },
  "form.publish_policy_error": {
    en: "Public recipes need your own photo or an AI-generated image — imported photos can't be published. Upload a photo, generate an AI image, or set the recipe to Private.",
    zh: "公开食谱需要你自己的照片或 AI 生成图片——导入的照片不能公开。请上传照片、生成 AI 图片，或将食谱设为私密。",
  },
  "form.upload_my_photo": { en: "📷 Upload my photo", zh: "📷 上传我的照片" },
  "form.generate_ai_image": { en: "✨ Generate AI image", zh: "✨ 生成 AI 图片" },
  "form.generating": { en: "Generating… (~10s)", zh: "生成中…（约 10 秒）" },
  "form.save_recipe": { en: "Save Recipe", zh: "保存食谱" },
  "form.saving": { en: "Saving...", zh: "保存中..." },

  // ── Recipe card extras ──────────────────────────────
  "recipe_card.original": { en: "⭐ User's Original", zh: "⭐ 用户原创" },
  "recipe_card.cal": { en: "cal", zh: "卡" },

  // Chefs directory
  "chefs.title": { en: "Chefs", zh: "厨师" },
  "chefs.subtitle": { en: "Discover the creators behind the recipes", zh: "发现食谱背后的创作者" },
  "chefs.search": { en: "Search chefs...", zh: "搜索厨师..." },
  "chefs.recipes": { en: "recipes", zh: "个食谱" },
  "chefs.followers": { en: "followers", zh: "位粉丝" },
  "chefs.no_chefs": { en: "No chefs yet", zh: "暂无厨师" },
  "chefs.visit_channel": { en: "Visit channel", zh: "访问频道" },
  "chefs.watch_youtube": { en: "Watch on YouTube", zh: "在 YouTube 观看" },
  "chefs.no_recipes": { en: "No public recipes yet", zh: "暂无公开食谱" },
  "chefs.featured": { en: "Featured", zh: "特邀" },
  "chefs.community": { en: "Community", zh: "社区" },

  // Recipe exploration deck
  "discover.latest": { en: "🆕 Latest", zh: "🆕 最新" },
  "discover.popular": { en: "🔥 Popular", zh: "🔥 热门" },
  "discover.save": { en: "♡ Save", zh: "♡ 收藏" },
  "discover.saved": { en: "♥ Saved", zh: "♥ 已收藏" },
  "discover.open": { en: "Open recipe →", zh: "查看食谱 →" },
  "discover.swipe_hint": { en: "Swipe up for more", zh: "上滑查看更多" },
  "discover.empty": { en: "No public recipes yet", zh: "暂无公开食谱" },

  "recipe.by_chef": { en: "By", zh: "作者" },

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

/** Map a difficulty value (e.g. "beginner") to its translated label */
const DIFFICULTY_KEY_MAP: Record<string, TranslationKey> = {
  beginner: "diff.beginner",
  intermediate: "diff.intermediate",
  advanced: "diff.advanced",
};

export function translateDifficulty(value: string, locale: Locale): string {
  const key = DIFFICULTY_KEY_MAP[value];
  if (key) return t(key, locale);
  return value;
}

/** Map a meal-type value (e.g. "dinner") to its translated label */
const MEAL_TYPE_KEY_MAP: Record<string, TranslationKey> = {
  breakfast: "meal_plan.breakfast",
  lunch: "meal_plan.lunch",
  dinner: "meal_plan.dinner",
  snack: "meal_plan.snack",
  dessert: "cat.desserts",
  drinks: "cat.drinks",
};

export function translateMealType(value: string, locale: Locale): string {
  const key = MEAL_TYPE_KEY_MAP[value];
  if (key) return t(key, locale);
  return value;
}

/** Map a stored meal-plan festival value to its localized label. */
const FESTIVAL_KEY_MAP: Record<string, TranslationKey> = {
  lunar_new_year: "festival.lunar_new_year",
  hari_raya: "festival.hari_raya",
  deepavali: "festival.deepavali",
  mid_autumn: "festival.mid_autumn",
  christmas: "festival.christmas",
  ramadan: "festival.ramadan",
  new_year: "festival.new_year",
};

export function translateFestival(value: string, locale: Locale): string {
  const key = FESTIVAL_KEY_MAP[value];
  if (key) return t(key, locale);
  return value;
}

/** Cuisines and dietary tags are stored as their English names — map to Chinese */
const CUISINE_ZH: Record<string, string> = {
  Chinese: "中餐",
  Malay: "马来菜",
  Indian: "印度菜",
  Western: "西餐",
  Japanese: "日本料理",
  Korean: "韩国料理",
  Thai: "泰国菜",
  Vietnamese: "越南菜",
  Italian: "意大利菜",
  Mexican: "墨西哥菜",
  "Middle Eastern": "中东菜",
  French: "法国菜",
  American: "美式",
  Mediterranean: "地中海菜",
  Other: "其他",
};

export function translateCuisine(value: string, locale: Locale): string {
  if (locale === "zh") return CUISINE_ZH[value] ?? value;
  return value;
}

const DIETARY_TAG_ZH: Record<string, string> = {
  Vegetarian: "素食",
  Vegan: "纯素",
  Halal: "清真",
  "Gluten-Free": "无麸质",
  Keto: "生酮",
  "Low-Carb": "低碳水",
  "Dairy-Free": "无乳制品",
  "Nut-Free": "无坚果",
  Paleo: "原始饮食",
  Whole30: "Whole30",
};

export function translateDietaryTag(value: string, locale: Locale): string {
  if (locale === "zh") return DIETARY_TAG_ZH[value] ?? value;
  return value;
}

export default translations;
