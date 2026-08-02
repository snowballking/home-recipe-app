"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CUISINES, MEAL_TYPES, DIETARY_TAGS, DIFFICULTIES, RECIPE_CATEGORIES } from "@/lib/types";
import type { Ingredient, AlternativeIngredient, ImageSource, Recipe } from "@/lib/types";
import { canPublishRecipe } from "@/lib/recipes/publish-policy";
import { useLanguage } from "@/lib/i18n/language-context";
import { RecipeVariationEditor } from "@/app/components/recipe-variation-editor";
import {
  buildMaterializedVariationInput,
  type VariationDiffV1,
} from "@/lib/recipe-variation";
import {
  translateCategory,
  translateCuisine,
  translateDietaryTag,
  translateDifficulty,
  translateMealType,
} from "@/lib/i18n/translations";

type DetectedPlatform = "youtube" | "website" | "rednote" | "instagram" | null;

function detectPlatformClient(url: string): DetectedPlatform {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("xiaohongshu.com") || host.includes("xhslink.com") || host.includes("rednote")) return "rednote";
    if (host.includes("instagram.com") || host.includes("instagr.am")) return "instagram";
    return "website";
  } catch {
    return null;
  }
}

const PLATFORM_INFO: Record<string, { label: string; icon: string; color: string }> = {
  youtube:   { label: "YouTube",   icon: "▶",  color: "text-red-600" },
  website:   { label: "Website",   icon: "🌐", color: "text-blue-600" },
  rednote:   { label: "RedNote",   icon: "📕", color: "text-red-500" },
  instagram: { label: "Instagram", icon: "📷", color: "text-pink-600" },
};

function NewRecipePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { t, locale } = useLanguage();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<DetectedPlatform>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource | null>(null);
  const [isChef, setIsChef] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [estimatingNutrition, setEstimatingNutrition] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [importantNote, setImportantNote] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "", quantity: "", unit: "" },
  ]);
  const [altIngredients, setAltIngredients] = useState<AlternativeIngredient[]>([]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState<string>("");
  const [cookTime, setCookTime] = useState<string>("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [cuisine, setCuisine] = useState("");
  const [mealType, setMealType] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("");
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [chefId, setChefId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [caloriesPerServing, setCaloriesPerServing] = useState<number | null>(null);
  const [proteinGrams, setProteinGrams] = useState<number | null>(null);
  const [carbsGrams, setCarbsGrams] = useState<number | null>(null);
  const [fatGrams, setFatGrams] = useState<number | null>(null);

  // Simplified Chinese translations (populated by AI extraction)
  const [titleZh, setTitleZh] = useState<string | null>(null);
  const [descriptionZh, setDescriptionZh] = useState<string | null>(null);
  const [importantNoteZh, setImportantNoteZh] = useState<string | null>(null);
  const [ingredientsZh, setIngredientsZh] = useState<Ingredient[] | null>(null);
  const [stepsZh, setStepsZh] = useState<string[] | null>(null);

  // Fork / variation state (set when opened via ?fork=<id>)
  const [forkParentId, setForkParentId] = useState<string | null>(null);
  const [forkParentTitle, setForkParentTitle] = useState("");
  const [forkParentTitleZh, setForkParentTitleZh] = useState<string | null>(null);
  const [forkParentAuthor, setForkParentAuthor] = useState("");
  const [variationNote, setVariationNote] = useState("");
  const [forkSource, setForkSource] = useState<Recipe | null>(null);
  const [forkLoading, setForkLoading] = useState(false);
  const [forkLoadError, setForkLoadError] = useState("");

  // ── Pre-fill from ?url= query parameter (e.g. from public meal plan) ──
  useEffect(() => {
    const prefillUrl = searchParams.get("url");
    if (prefillUrl) {
      handleUrlChange(prefillUrl);
    }
  }, [searchParams]);

  // ── Pre-fill from ?fork=<id> query parameter (make a variation) ──
  useEffect(() => {
    const forkId = searchParams.get("fork");
    if (forkId) {
      loadForkSource(forkId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Licensed chef accounts may publish imported content (creator agreement)
  useEffect(() => {
    async function loadChefStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("is_chef")
          .eq("id", user.id)
          .single();
        setIsChef(!!data?.is_chef);
      } catch {
        // auth lock race — safe to ignore
      }
    }
    loadChefStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────
  function addIngredient() {
    setIngredients([...ingredients, { name: "", quantity: "", unit: "" }]);
  }
  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  }
  function removeIngredient(index: number) {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  }
  function addAltIngredient() {
    setAltIngredients([...altIngredients, { name: "", description: "" }]);
  }
  function updateAltIngredient(index: number, field: keyof AlternativeIngredient, value: string) {
    const updated = [...altIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setAltIngredients(updated);
  }
  function removeAltIngredient(index: number) {
    setAltIngredients(altIngredients.filter((_, i) => i !== index));
  }
  function addStep() {
    setSteps([...steps, ""]);
  }
  function updateStep(index: number, value: string) {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  }
  function removeStep(index: number) {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  }
  function toggleDietaryTag(tag: string) {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // ── Image upload handler ────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    // Max 5MB
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.");
      return;
    }

    setUploadingImage(true);
    setError("");

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to upload image.");
        return;
      }

      setHeroImageUrl(data.url);
      setImageSource("user_upload");
    } catch {
      setError("Something went wrong while uploading the image.");
    } finally {
      setUploadingImage(false);
    }
  }

  // ── AI placeholder image (generated on publish, not on import) ──
  async function handleGenerateAiImage() {
    if (!title.trim()) {
      setError("Add a recipe title first so the AI knows what to draw.");
      return;
    }
    setGeneratingImage(true);
    setError("");
    try {
      const res = await fetch("/api/upload-image", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          cuisine,
          ingredients: ingredients.filter((i) => i.name.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate image.");
        return;
      }
      setHeroImageUrl(data.url);
      setImageSource("ai_generated");
    } catch {
      setError("Something went wrong while generating the image.");
    } finally {
      setGeneratingImage(false);
    }
  }

  // Load an immutable source snapshot for the variation editor. RLS returns
  // the source only if it is public (or owned), so private recipes remain safe.
  async function loadForkSource(forkId: string) {
    setForkLoading(true);
    setForkLoadError("");
    setForkSource(null);

    const { data: parent, error: forkError } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", forkId)
      .single();
    if (forkError || !parent) {
      setForkLoadError(t("variation.source_error"));
      setForkLoading(false);
      return;
    }

    const source = parent as Recipe;
    setForkSource(source);
    setForkParentId(parent.id);
    setForkParentTitle(parent.title ?? "");
    setForkParentTitleZh(parent.title_zh ?? null);

    const { data: author } = await supabase
      .from("profiles")
      .select("displayname")
      .eq("id", parent.user_id)
      .single();
    setForkParentAuthor(author?.displayname ?? "");
    setForkLoading(false);
  }

  function populateForm(r: any) {
    if (r.title) setTitle(r.title);
    if (r.description) setDescription(r.description);
    if (r.important_note) setImportantNote(r.important_note);
    if (r.ingredients?.length) {
      setIngredients(
        r.ingredients.map((i: { name?: string; quantity?: string; unit?: string }) => ({
          name: i.name || "",
          quantity: i.quantity || "",
          unit: i.unit || "",
        }))
      );
    }
    if (r.alternative_ingredients?.length) {
      setAltIngredients(
        r.alternative_ingredients.map((a: { name?: string; description?: string }) => ({
          name: a.name || "",
          description: a.description || "",
        }))
      );
    }
    if (r.steps?.length) setSteps(r.steps);
    if (r.servings) setServings(r.servings);
    if (r.prep_time != null) setPrepTime(String(r.prep_time));
    if (r.cook_time != null) setCookTime(String(r.cook_time));
    if (r.difficulty) {
      const validDifficulties = DIFFICULTIES.map((d) => d.value) as readonly string[];
      if (validDifficulties.includes(r.difficulty)) setDifficulty(r.difficulty);
    }
    if (r.cuisine) setCuisine(r.cuisine);
    if (r.meal_type) {
      const validMealTypes = MEAL_TYPES.map((m) => m.value) as readonly string[];
      if (validMealTypes.includes(r.meal_type)) setMealType(r.meal_type);
    }
    if (r.dietary_tags?.length) setDietaryTags(r.dietary_tags);
    if (r.category) setRecipeCategory(r.category);
    if (r.calories_per_serving != null) setCaloriesPerServing(r.calories_per_serving);
    if (r.protein_grams != null) setProteinGrams(r.protein_grams);
    if (r.carbs_grams != null) setCarbsGrams(r.carbs_grams);
    if (r.fat_grams != null) setFatGrams(r.fat_grams);

    if (r.hero_image_url) {
      setHeroImageUrl(r.hero_image_url);
      // Photo scraped from the source site — not publishable as-is
      setImageSource("imported");
    }

    // Simplified Chinese translations from AI
    if (r.title_zh) setTitleZh(r.title_zh);
    if (r.description_zh) setDescriptionZh(r.description_zh);
    if (r.important_note_zh) setImportantNoteZh(r.important_note_zh);
    if (r.ingredients_zh?.length) {
      setIngredientsZh(
        r.ingredients_zh.map((i: { name?: string; quantity?: string; unit?: string }) => ({
          name: i.name || "",
          quantity: i.quantity || "",
          unit: i.unit || "",
        }))
      );
    }
    if (r.steps_zh?.length) setStepsZh(r.steps_zh);
  }

  // ── URL change handler (auto-detect platform) ──────────────────
  function handleUrlChange(value: string) {
    setImportUrl(value);
    setError("");
    setSuccessMsg("");
    setDetectedPlatform(detectPlatformClient(value));
  }

  // ── Import via URL (all platforms) ──────────────────────────────
  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/extract-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("form.import_failed"));
        setImporting(false);
        return;
      }

      populateForm(data.recipe);
      setChefId(data.chef_id ?? null);
      setSourceUrl(importUrl.trim());
      // IP policy: imported recipes start private
      setIsPublic(false);
      setSuccessMsg(t("form.import_success"));
    } catch {
      setError(t("form.import_error"));
    } finally {
      setImporting(false);
    }
  }

  // ── Submit recipe ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("form.title_required"));
      return;
    }
    if (forkParentId && !variationNote.trim()) {
      setError(t("fork.note_required"));
      return;
    }
    if (isPublic && !canPublishRecipe({ imageSource, isChef }).allowed) {
      setError(t("form.publish_policy_error"));
      return;
    }
    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const validIngredients = ingredients.filter((i) => i.name.trim());
    const validAltIngredients = altIngredients.filter((a) => a.name.trim() || a.description.trim());
    const validSteps = steps.filter((s) => s.trim());

    // Validate constrained fields before insert
    const validMealTypeValues = MEAL_TYPES.map((m) => m.value) as readonly string[];
    const safeMealType = mealType && validMealTypeValues.includes(mealType) ? mealType : null;
    const validDifficultyValues = DIFFICULTIES.map((d) => d.value) as readonly string[];
    const safeDifficulty = validDifficultyValues.includes(difficulty) ? difficulty : "beginner";

    const { data, error: insertError } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        important_note: importantNote.trim() || null,
        ingredients: validIngredients,
        alternative_ingredients: validAltIngredients,
        steps: validSteps,
        servings,
        prep_time: prepTime ? parseInt(prepTime) : null,
        cook_time: cookTime ? parseInt(cookTime) : null,
        difficulty: safeDifficulty,
        cuisine: cuisine || null,
        meal_type: safeMealType,
        category: recipeCategory || null,
        dietary_tags: dietaryTags,
        source_url: sourceUrl.trim() || null,
        chef_id: chefId,
        hero_image_url: heroImageUrl,
        image_source: heroImageUrl ? imageSource : null,
        is_public: isPublic,
        original_recipe_id: forkParentId,
        variation_note: forkParentId ? variationNote.trim() : null,
        calories_per_serving: caloriesPerServing,
        protein_grams: proteinGrams,
        carbs_grams: carbsGrams,
        fat_grams: fatGrams,
        title_zh: titleZh,
        description_zh: descriptionZh,
        important_note_zh: importantNoteZh,
        ingredients_zh: ingredientsZh,
        steps_zh: stepsZh,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push(`/recipe/${data.id}`);
  }

  async function handleVariationSave(note: string, diff: VariationDiffV1) {
    if (!forkSource) return;

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    let payload;
    try {
      payload = buildMaterializedVariationInput(forkSource, user.id, note, diff);
    } catch {
      setError(t("variation.error_invalid"));
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("recipes")
      .insert(payload)
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? t("variation.save_error"));
      setSaving(false);
      return;
    }

    router.push(`/recipe/${data.id}`);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500";
  const labelClass =
    "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

  const platformBadge = detectedPlatform && PLATFORM_INFO[detectedPlatform];
  const forkRequestId = searchParams.get("fork");

  if (forkRequestId) {
    if (forkLoading || (!forkSource && !forkLoadError)) {
      return (
        <div className="min-h-full bg-[#fffaf4] px-4 py-12 dark:bg-stone-950">
          <p className="mx-auto max-w-3xl text-sm text-stone-600 dark:text-stone-300">
            {t("variation.loading")}
          </p>
        </div>
      );
    }

    if (forkLoadError || !forkSource) {
      return (
        <div className="min-h-full bg-[#fffaf4] px-4 py-12 dark:bg-stone-950">
          <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-stone-900">
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {forkLoadError || t("variation.source_error")}
            </p>
            <button type="button" onClick={() => router.back()} className="mt-4 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <RecipeVariationEditor
        source={forkSource}
        sourceAuthor={forkParentAuthor}
        saving={saving}
        error={error}
        onSave={handleVariationSave}
        onCancel={() => router.back()}
      />
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {forkParentId ? t("fork.form_heading") : t("form.add_new_recipe")}
        </h1>

        {/* Fork banner: making a variation of an existing recipe */}
        {forkParentId && (
          <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/40">
            <p className="text-sm text-violet-800 dark:text-violet-200">
              {locale === "zh" ? (
                <>
                  🔀 正在改编
                  {forkParentAuthor && <> <span className="font-semibold">{forkParentAuthor}</span> 的</>}
                  「<span className="font-semibold">{forkParentTitleZh || forkParentTitle}</span>」
                </>
              ) : (
                <>
                  🔀 Making a variation of{" "}
                  <span className="font-semibold">{forkParentTitle}</span>
                  {forkParentAuthor && (
                    <> by <span className="font-semibold">{forkParentAuthor}</span></>
                  )}
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">
              {t("fork.prefilled_hint")}
            </p>
          </div>
        )}

        {/* ── Import from URL / Screenshot section ────────────── */}
        {!forkParentId && (
        <div className="mt-6 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-5 dark:border-indigo-700 dark:bg-indigo-950/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {t("form.import_title")}
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t("form.import_hint")}
              </p>
            </div>
            {platformBadge && (
              <span
                className={`inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium shadow-sm dark:bg-zinc-800 ${platformBadge.color}`}
              >
                <span>{platformBadge.icon}</span> {platformBadge.label}
              </span>
            )}
          </div>

          {/* URL input */}
          <div className="mt-3 flex gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={t("form.import_placeholder")}
              className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {importUrl.trim() && (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !importUrl.trim()}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {detectedPlatform === "youtube"
                      ? t("form.importing_video")
                      : t("form.importing")}
                  </span>
                ) : (
                  t("form.import_button")
                )}
              </button>
            )}
          </div>

          {/* YouTube processing hint */}
          {importing && detectedPlatform === "youtube" && (
            <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 animate-pulse">
              {t("form.import_youtube_wait")}
            </p>
          )}

          {/* Import disclaimer (informational) */}
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("form.import_disclaimer")}
          </p>

        </div>
        )}

        {/* Error / Success messages */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {successMsg}
          </div>
        )}

        {!forkParentId && (
          <div className="relative my-6 flex items-center">
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700" />
            <span className="mx-4 shrink text-xs text-zinc-400">
              {t("form.or_manual")}
            </span>
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700" />
          </div>
        )}

        {/* ── Recipe form ─────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Variation note — required when making a fork */}
          {forkParentId && (
            <div>
              <label className={labelClass}>{t("fork.note_label")} *</label>
              <textarea
                value={variationNote}
                onChange={(e) => setVariationNote(e.target.value)}
                rows={3}
                placeholder={t("fork.note_placeholder")}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t("fork.note_helper")}
              </p>
            </div>
          )}

          {/* Recipe Photo */}
          <div>
            <label className={labelClass}>{t("form.photo")} *</label>
            {heroImageUrl ? (
              <div className="mt-1">
                <div className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <img
                    src={heroImageUrl}
                    alt="Recipe preview"
                    className="w-full max-h-72 object-cover"
                  />
                  {imageSource === "ai_generated" && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-indigo-600/90 px-2.5 py-1 text-xs font-medium text-white shadow">
                      {t("form.ai_image_badge")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setHeroImageUrl(null); setImageSource(null); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/80 transition-colors"
                  >
                    {t("form.photo_remove")}
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
                  >
                    {t("form.photo_replace")}
                  </button>
                  <span className="text-[11px] text-zinc-400">{t("form.photo_paste_url")}</span>
                  <input
                    type="url"
                    value={heroImageUrl}
                    onChange={(e) => {
                      setHeroImageUrl(e.target.value || null);
                      // Pasted URLs have unknown provenance — treat as imported
                      setImageSource(e.target.value ? "imported" : null);
                    }}
                    className={`${inputClass} flex-1 !text-xs`}
                  />
                </div>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 py-10 px-4 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20"
              >
                {uploadingImage ? (
                  <>
                    <svg className="h-8 w-8 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-indigo-600 dark:text-indigo-400">{t("form.photo_uploading")}</span>
                  </>
                ) : (
                  <>
                    <div className="text-4xl text-zinc-300 dark:text-zinc-600">📷</div>
                    <div>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        {t("form.photo_upload")}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                        {t("form.photo_formats")}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div>
            <label className={labelClass}>{t("form.title")} *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("form.title_placeholder")}
              className={inputClass}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>{t("form.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("form.description_placeholder")}
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Source URL */}
          <div>
            <label className={labelClass}>{t("form.source_url")}</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          {/* Quick Info Row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelClass}>{t("form.servings")}</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                min={1}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("form.prep")}</label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15"
                min={0}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("form.cook")}</label>
              <input
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30"
                min={0}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("form.difficulty")}</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={inputClass}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {translateDifficulty(d.value, locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category, Cuisine & Meal Type */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>{t("form.category")}</label>
              <select
                value={recipeCategory}
                onChange={(e) => setRecipeCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">{t("form.category_select")}</option>
                {RECIPE_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {translateCategory(c.value, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t("form.cuisine")}</label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className={inputClass}
              >
                <option value="">{t("form.cuisine_select")}</option>
                {CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {translateCuisine(c, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t("form.meal_type")}</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className={inputClass}
              >
                <option value="">{t("form.meal_type_select")}</option>
                {MEAL_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {translateMealType(m.value, locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dietary Tags */}
          <div>
            <label className={labelClass}>{t("form.dietary_tags")}</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleDietaryTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    dietaryTags.includes(tag)
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {translateDietaryTag(tag, locale)}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition (populated by AI import or AI estimate, editable) */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between mb-2">
              <label className={`${labelClass} text-emerald-700 dark:text-emerald-300 mb-0`}>
                {t("form.nutrition")}
              </label>
              <button
                type="button"
                onClick={async () => {
                  setEstimatingNutrition(true);
                  try {
                    const validIngs = ingredients.filter((i) => i.name.trim());
                    if (validIngs.length === 0) { setError(t("form.nutrition_need_ingredients")); setEstimatingNutrition(false); return; }
                    const res = await fetch("/api/estimate-nutrition", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ingredients: validIngs, servings }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed");
                    setCaloriesPerServing(Math.round(data.nutrition.calories_per_serving));
                    setProteinGrams(Math.round(data.nutrition.protein_grams));
                    setCarbsGrams(Math.round(data.nutrition.carbs_grams));
                    setFatGrams(Math.round(data.nutrition.fat_grams));
                    setError("");
                  } catch (err: any) {
                    setError(t("form.nutrition_error") + (err.message || "Unknown error"));
                  }
                  setEstimatingNutrition(false);
                }}
                disabled={estimatingNutrition}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
              >
                {estimatingNutrition ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                    {t("form.estimating")}
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    {t("form.estimate_ai")}
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">{t("form.calories")}</label>
                <input type="number" value={caloriesPerServing ?? ""} onChange={(e) => setCaloriesPerServing(e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">{t("form.protein_g")}</label>
                <input type="number" value={proteinGrams ?? ""} onChange={(e) => setProteinGrams(e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">{t("form.carbs_g")}</label>
                <input type="number" value={carbsGrams ?? ""} onChange={(e) => setCarbsGrams(e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">{t("form.fat_g")}</label>
                <input type="number" value={fatGrams ?? ""} onChange={(e) => setFatGrams(e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div>
            <label className={labelClass}>{t("recipe.important_note")}</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-0.5 mb-2">
              {t("form.important_note_hint")}
            </p>
            <textarea
              value={importantNote}
              onChange={(e) => setImportantNote(e.target.value)}
              placeholder={t("form.important_note_placeholder")}
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Ingredients */}
          <div>
            <label className={labelClass}>{t("recipe.ingredients")}</label>
            {/* Column headers */}
            <div className="grid grid-cols-[70px_90px_1fr_32px] gap-2 mb-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">{t("form.qty")}</span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">{t("form.unit")}</span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">{t("form.ingredient")}</span>
              <span></span>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="grid grid-cols-[70px_90px_1fr_32px] gap-2">
                  <input
                    type="text"
                    value={ing.quantity}
                    onChange={(e) =>
                      updateIngredient(i, "quantity", e.target.value)
                    }
                    placeholder={t("form.qty_placeholder")}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) =>
                      updateIngredient(i, "unit", e.target.value)
                    }
                    placeholder={t("form.unit_placeholder")}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) =>
                      updateIngredient(i, "name", e.target.value)
                    }
                    placeholder={t("form.ingredient_placeholder")}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="rounded px-2 text-zinc-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addIngredient}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {t("form.add_ingredient")}
            </button>
          </div>

          {/* Alternative Ingredients */}
          <div>
            <label className={labelClass}>{t("recipe.alternative_ingredients")}</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-0.5 mb-2">
              {t("form.alt_ingredients_hint")}
            </p>
            {altIngredients.length > 0 && (
              <>
                {/* Column headers: #, Alternative Ingredient (1/3), Description (2/3), remove */}
                <div className="grid grid-cols-[28px_1fr_2fr_32px] gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">#</span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">{t("form.alt_name")}</span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">{t("form.alt_desc")}</span>
                  <span></span>
                </div>
                <div className="space-y-2">
                  {altIngredients.map((alt, i) => (
                    <div key={i} className="grid grid-cols-[28px_1fr_2fr_32px] gap-2 items-start">
                      <span className="pt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 text-right">
                        {i + 1}.
                      </span>
                      <input
                        type="text"
                        value={alt.name}
                        onChange={(e) => updateAltIngredient(i, "name", e.target.value)}
                        placeholder={t("form.alt_name_placeholder")}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={alt.description}
                        onChange={(e) => updateAltIngredient(i, "description", e.target.value)}
                        placeholder={t("form.alt_desc_placeholder")}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => removeAltIngredient(i)}
                        className="pt-2 rounded px-2 text-zinc-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={addAltIngredient}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {t("form.add_alt_ingredient")}
            </button>
          </div>

          {/* Steps */}
          <div>
            <label className={labelClass}>{t("recipe.steps")}</label>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="mt-2 w-6 text-right text-sm font-medium text-zinc-400">
                    {i + 1}.
                  </span>
                  <textarea
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={`${t("form.step_placeholder")} ${i + 1}...`}
                    rows={2}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="self-start rounded px-2 pt-2 text-zinc-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addStep}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {t("form.add_step")}
            </button>
          </div>

          {/* Visibility */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-zinc-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-zinc-600" />
              </label>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {isPublic ? t("recipe.public") : t("recipe.private")}
                </p>
                <p className="text-xs text-zinc-500">
                  {isPublic
                    ? t("form.public_desc")
                    : t("form.private_desc")}
                </p>
              </div>
            </div>

            {/* IP policy: public recipes need a compliant photo */}
            {isPublic && !canPublishRecipe({ imageSource, isChef }).allowed && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  {t("form.publish_policy")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage || generatingImage}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-zinc-800 dark:text-amber-300"
                  >
                    {t("form.upload_my_photo")}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAiImage}
                    disabled={uploadingImage || generatingImage}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {generatingImage ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-white" />
                        {t("form.generating")}
                      </>
                    ) : (
                      <>{t("form.generate_ai_image")}</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? t("form.saving") : t("form.save_recipe")}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewRecipePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <NewRecipePageInner />
    </Suspense>
  );
}
