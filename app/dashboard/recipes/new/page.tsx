"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CUISINES, MEAL_TYPES, DIETARY_TAGS, DIFFICULTIES, RECIPE_CATEGORIES } from "@/lib/types";
import type { Ingredient, AlternativeIngredient } from "@/lib/types";

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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<DetectedPlatform>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  // ── Pre-fill from ?url= query parameter (e.g. from public meal plan) ──
  useEffect(() => {
    const prefillUrl = searchParams.get("url");
    if (prefillUrl) {
      handleUrlChange(prefillUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
    } catch {
      setError("Something went wrong while uploading the image.");
    } finally {
      setUploadingImage(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    if (r.difficulty) setDifficulty(r.difficulty);
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

    if (r.hero_image_url) setHeroImageUrl(r.hero_image_url);

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
        setError(data.error || "Failed to import recipe.");
        setImporting(false);
        return;
      }

      populateForm(data.recipe);
      setSourceUrl(importUrl.trim());
      setSuccessMsg(
        "Recipe extracted with AI. Review the details below and save!"
      );
    } catch {
      setError("Something went wrong while importing the recipe.");
    } finally {
      setImporting(false);
    }
  }

  // ── Submit recipe ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Recipe title is required");
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
        difficulty,
        cuisine: cuisine || null,
        meal_type: mealType || null,
        category: recipeCategory || null,
        dietary_tags: dietaryTags,
        source_url: sourceUrl.trim() || null,
        hero_image_url: heroImageUrl,
        is_public: isPublic,
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

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500";
  const labelClass =
    "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

  const platformBadge = detectedPlatform && PLATFORM_INFO[detectedPlatform];

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Add New Recipe
        </h1>

        {/* ── Import from URL / Screenshot section ────────────── */}
        <div className="mt-6 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-5 dark:border-indigo-700 dark:bg-indigo-950/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                Import Recipe with AI
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Paste a link from YouTube, recipe websites, RedNote, or Instagram
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
              placeholder="https://youtube.com/watch?v=... or any recipe URL"
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
                      ? "Watching video..."
                      : "Extracting..."}
                  </span>
                ) : (
                  "Import"
                )}
              </button>
            )}
          </div>

          {/* YouTube processing hint */}
          {importing && detectedPlatform === "youtube" && (
            <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 animate-pulse">
              AI is watching the full video to extract ingredients and steps. This may take up to 60 seconds...
            </p>
          )}

          {/* Import disclaimer (informational) */}
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            I understand that imported recipes are for <strong>personal use</strong>. The AI
            will rephrase cooking instructions in its own words, but I am responsible for
            ensuring I have the right to share any recipe I make public.
          </p>

        </div>

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

        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700" />
          <span className="mx-4 shrink text-xs text-zinc-400">
            or fill in manually
          </span>
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700" />
        </div>

        {/* ── Recipe form ─────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipe Photo */}
          <div>
            <label className={labelClass}>Recipe Photo *</label>
            {heroImageUrl ? (
              <div className="mt-1">
                <div className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <img
                    src={heroImageUrl}
                    alt="Recipe preview"
                    className="w-full max-h-72 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => { setHeroImageUrl(null); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/80 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
                  >
                    Replace photo
                  </button>
                  <span className="text-[11px] text-zinc-400">or paste an image URL:</span>
                  <input
                    type="url"
                    value={heroImageUrl}
                    onChange={(e) => setHeroImageUrl(e.target.value || null)}
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
                    <span className="text-sm text-indigo-600 dark:text-indigo-400">Uploading...</span>
                  </>
                ) : (
                  <>
                    <div className="text-4xl text-zinc-300 dark:text-zinc-600">📷</div>
                    <div>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Click to upload a photo of the dish
                      </p>
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                        JPG, PNG or WebP — max 10MB. Auto-filled when importing from a URL.
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
            <label className={labelClass}>Recipe Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Grandma's Chicken Curry"
              className={inputClass}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this dish..."
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Source URL */}
          <div>
            <label className={labelClass}>Source URL (if imported)</label>
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
              <label className={labelClass}>Servings</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                min={1}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Prep (min)</label>
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
              <label className={labelClass}>Cook (min)</label>
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
              <label className={labelClass}>Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={inputClass}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category, Cuisine & Meal Type */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={recipeCategory}
                onChange={(e) => setRecipeCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">Select category</option>
                {RECIPE_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cuisine</label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className={inputClass}
              >
                <option value="">Select cuisine</option>
                {CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Meal Type</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className={inputClass}
              >
                <option value="">Select type</option>
                {MEAL_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dietary Tags */}
          <div>
            <label className={labelClass}>Dietary Tags</label>
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
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition (populated by AI import, editable) */}
          {caloriesPerServing != null && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <label
                className={`${labelClass} text-emerald-700 dark:text-emerald-300`}
              >
                Estimated Nutrition (per serving)
              </label>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={caloriesPerServing ?? ""}
                    onChange={(e) =>
                      setCaloriesPerServing(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={proteinGrams ?? ""}
                    onChange={(e) =>
                      setProteinGrams(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={carbsGrams ?? ""}
                    onChange={(e) =>
                      setCarbsGrams(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    value={fatGrams ?? ""}
                    onChange={(e) =>
                      setFatGrams(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Important Note */}
          <div>
            <label className={labelClass}>Important Note</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-0.5 mb-2">
              Optional. Any remarks about this recipe — e.g. &quot;Less oil&quot;, &quot;No chilli&quot;, &quot;Kid-friendly version&quot;.
            </p>
            <textarea
              value={importantNote}
              onChange={(e) => setImportantNote(e.target.value)}
              placeholder="Add any important remarks here..."
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Ingredients */}
          <div>
            <label className={labelClass}>Ingredients</label>
            {/* Column headers */}
            <div className="grid grid-cols-[70px_90px_1fr_32px] gap-2 mb-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Qty</span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Unit</span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Ingredient</span>
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
                    placeholder="e.g. 2"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) =>
                      updateIngredient(i, "unit", e.target.value)
                    }
                    placeholder="e.g. cups"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) =>
                      updateIngredient(i, "name", e.target.value)
                    }
                    placeholder="e.g. sliced beef"
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
              + Add ingredient
            </button>
          </div>

          {/* Alternative Ingredients */}
          <div>
            <label className={labelClass}>Alternative Ingredients</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-0.5 mb-2">
              Optional. List ingredients that can be substituted and note what replacements work.
            </p>
            {altIngredients.length > 0 && (
              <>
                {/* Column headers: #, Alternative Ingredient (1/3), Description (2/3), remove */}
                <div className="grid grid-cols-[28px_1fr_2fr_32px] gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">#</span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Alternative Ingredient</span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Description / Replacement Ingredients</span>
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
                        placeholder="e.g. butter"
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={alt.description}
                        onChange={(e) => updateAltIngredient(i, "description", e.target.value)}
                        placeholder="e.g. margarine or coconut oil (1:1 ratio)"
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
              + Add alternative ingredient
            </button>
          </div>

          {/* Steps */}
          <div>
            <label className={labelClass}>Steps</label>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="mt-2 w-6 text-right text-sm font-medium text-zinc-400">
                    {i + 1}.
                  </span>
                  <textarea
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}...`}
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
              + Add step
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
                  {isPublic ? "Public" : "Private"}
                </p>
                <p className="text-xs text-zinc-500">
                  {isPublic
                    ? "Anyone can discover this recipe in the community"
                    : "Only you can see this recipe"}
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Recipe"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Cancel
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
