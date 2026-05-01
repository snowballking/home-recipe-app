"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CUISINES, MEAL_TYPES, DIETARY_TAGS, DIFFICULTIES, RECIPE_CATEGORIES } from "@/lib/types";
import type { Ingredient, AlternativeIngredient } from "@/lib/types";

export default function EditRecipePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [importantNote, setImportantNote] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
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
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [estimatingNutrition, setEstimatingNutrition] = useState(false);
  const [caloriesPerServing, setCaloriesPerServing] = useState<number | null>(null);
  const [proteinGrams, setProteinGrams] = useState<number | null>(null);
  const [carbsGrams, setCarbsGrams] = useState<number | null>(null);
  const [fatGrams, setFatGrams] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!data) { router.push("/dashboard/recipes"); return; }

      setTitle(data.title);
      setDescription(data.description ?? "");
      setImportantNote(data.important_note ?? "");
      setIngredients(data.ingredients as Ingredient[] ?? [{ name: "", quantity: "", unit: "" }]);
      setAltIngredients((data.alternative_ingredients as AlternativeIngredient[]) ?? []);
      setSteps(data.steps as string[] ?? [""]);
      setServings(data.servings ?? 4);
      setPrepTime(data.prep_time?.toString() ?? "");
      setCookTime(data.cook_time?.toString() ?? "");
      setDifficulty(data.difficulty ?? "beginner");
      setCuisine(data.cuisine ?? "");
      setMealType(data.meal_type ?? "");
      setRecipeCategory(data.category ?? "");
      setDietaryTags(data.dietary_tags ?? []);
      setSourceUrl(data.source_url ?? "");
      setIsPublic(data.is_public ?? true);
      setHeroImageUrl(data.hero_image_url ?? null);
      setCaloriesPerServing(data.calories_per_serving ?? null);
      setProteinGrams(data.protein_grams ?? null);
      setCarbsGrams(data.carbs_grams ?? null);
      setFatGrams(data.fat_grams ?? null);
      setLoading(false);
    }
    load();
  }, [id]);

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
  function addStep() { setSteps([...steps, ""]); }
  function updateStep(index: number, value: string) {
    const updated = [...steps]; updated[index] = value; setSteps(updated);
  }
  function removeStep(index: number) {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  }
  function toggleDietaryTag(tag: string) {
    setDietaryTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10MB."); return; }
    setUploadingImage(true); setError("");
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to upload image."); return; }
      setHeroImageUrl(data.url);
    } catch { setError("Something went wrong while uploading the image."); }
    finally { setUploadingImage(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Recipe title is required"); return; }
    setSaving(true); setError("");

    const { error: updateError } = await supabase
      .from("recipes")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        important_note: importantNote.trim() || null,
        ingredients: ingredients.filter((i) => i.name.trim()),
        alternative_ingredients: altIngredients.filter((a) => a.name.trim() || a.description.trim()),
        steps: steps.filter((s) => s.trim()),
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) { setError(updateError.message); setSaving(false); return; }
    router.push(`/recipe/${id}`);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this recipe? This cannot be undone.")) return;
    await supabase.from("recipes").delete().eq("id", id);
    router.push("/dashboard/recipes");
  }

  const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500";
  const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

  if (loading) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Edit Recipe</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Recipe Photo */}
          <div>
            <label className={labelClass}>Recipe Photo</label>
            {heroImageUrl ? (
              <div className="mt-1">
                <div className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <img src={heroImageUrl} alt="Recipe" className="w-full max-h-72 object-cover" />
                  <button type="button" onClick={() => { setHeroImageUrl(null); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/80 transition-colors">
                    Remove
                  </button>
                </div>
                <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
                  className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 transition-colors">
                  Replace photo
                </button>
              </div>
            ) : (
              <div onClick={() => imageInputRef.current?.click()}
                className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 py-10 px-4 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20">
                {uploadingImage ? (
                  <span className="text-sm text-indigo-600 dark:text-indigo-400">Uploading...</span>
                ) : (
                  <>
                    <div className="text-4xl text-zinc-300 dark:text-zinc-600">📷</div>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Click to upload a photo of the dish</p>
                  </>
                )}
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          <div>
            <label className={labelClass}>Recipe Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Source URL</label>
            <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelClass}>Servings</label>
              <input type="number" value={servings} onChange={(e) => setServings(parseInt(e.target.value) || 1)} min={1} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Prep (min)</label>
              <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} min={0} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cook (min)</label>
              <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} min={0} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputClass}>
                {DIFFICULTIES.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Category</label>
              <select value={recipeCategory} onChange={(e) => setRecipeCategory(e.target.value)} className={inputClass}>
                <option value="">Select category</option>
                {RECIPE_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cuisine</label>
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className={inputClass}>
                <option value="">Select cuisine</option>
                {CUISINES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Meal Type</label>
              <select value={mealType} onChange={(e) => setMealType(e.target.value)} className={inputClass}>
                <option value="">Select type</option>
                {MEAL_TYPES.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Dietary Tags</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleDietaryTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    dietaryTags.includes(tag)
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition with AI Estimate */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between mb-2">
              <label className={`${labelClass} text-emerald-700 dark:text-emerald-300 mb-0`}>
                Estimated Nutrition (per serving)
              </label>
              <button
                type="button"
                onClick={async () => {
                  setEstimatingNutrition(true);
                  try {
                    const validIngs = ingredients.filter((i) => i.name.trim());
                    if (validIngs.length === 0) { setError("Add ingredients first before estimating nutrition."); setEstimatingNutrition(false); return; }
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
                  } catch (err: any) {
                    setError("Error estimating nutrition: " + (err.message || "Unknown error"));
                  }
                  setEstimatingNutrition(false);
                }}
                disabled={estimatingNutrition}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
              >
                {estimatingNutrition ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                    Estimating…
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    Estimate with AI
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Calories</label>
                <input type="number" value={caloriesPerServing ?? ""} onChange={(e) => setCaloriesPerServing(e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Protein (g)</label>
                <input type="number" value={proteinGrams ?? ""} onChange={(e) => setProteinGrams(e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Carbs (g)</label>
                <input type="number" value={carbsGrams ?? ""} onChange={(e) => setCarbsGrams(e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Fat (g)</label>
                <input type="number" value={fatGrams ?? ""} onChange={(e) => setFatGrams(e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
              </div>
            </div>
          </div>

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

          <div>
            <label className={labelClass}>Ingredients</label>
            <div className="grid grid-cols-[70px_90px_1fr_32px] gap-2 mb-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Qty</span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Unit</span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Ingredient</span>
              <span></span>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="grid grid-cols-[70px_90px_1fr_32px] gap-2">
                  <input type="text" value={ing.quantity} onChange={(e) => updateIngredient(i, "quantity", e.target.value)} placeholder="e.g. 2" className={inputClass} />
                  <input type="text" value={ing.unit} onChange={(e) => updateIngredient(i, "unit", e.target.value)} placeholder="e.g. cups" className={inputClass} />
                  <input type="text" value={ing.name} onChange={(e) => updateIngredient(i, "name", e.target.value)} placeholder="e.g. sliced beef" className={inputClass} />
                  <button type="button" onClick={() => removeIngredient(i)} className="rounded px-2 text-zinc-400 hover:text-red-500">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addIngredient} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700">+ Add ingredient</button>
          </div>

          {/* Alternative Ingredients */}
          <div>
            <label className={labelClass}>Alternative Ingredients</label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-0.5 mb-2">
              Optional. List ingredients that can be substituted and note what replacements work.
            </p>
            {altIngredients.length > 0 && (
              <>
                <div className="grid grid-cols-[28px_1fr_2fr_32px] gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">#</span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Alternative Ingredient</span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">Description / Replacement Ingredients</span>
                  <span></span>
                </div>
                <div className="space-y-2">
                  {altIngredients.map((alt, i) => (
                    <div key={i} className="grid grid-cols-[28px_1fr_2fr_32px] gap-2 items-start">
                      <span className="pt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 text-right">{i + 1}.</span>
                      <input type="text" value={alt.name} onChange={(e) => updateAltIngredient(i, "name", e.target.value)} placeholder="e.g. butter" className={inputClass} />
                      <input type="text" value={alt.description} onChange={(e) => updateAltIngredient(i, "description", e.target.value)} placeholder="e.g. margarine or coconut oil (1:1 ratio)" className={inputClass} />
                      <button type="button" onClick={() => removeAltIngredient(i)} className="pt-2 rounded px-2 text-zinc-400 hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button type="button" onClick={addAltIngredient} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700">+ Add alternative ingredient</button>
          </div>

          <div>
            <label className={labelClass}>Steps</label>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="mt-2 text-sm font-medium text-zinc-400 w-6 text-right">{i + 1}.</span>
                  <textarea value={step} onChange={(e) => updateStep(i, e.target.value)} rows={2} className={`${inputClass} flex-1`} />
                  <button type="button" onClick={() => removeStep(i)} className="self-start rounded px-2 pt-2 text-zinc-400 hover:text-red-500">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addStep} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700">+ Add step</button>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="peer sr-only" />
              <div className="h-5 w-9 rounded-full bg-zinc-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-zinc-600" />
            </label>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{isPublic ? "Public" : "Private"}</p>
              <p className="text-xs text-zinc-500">{isPublic ? "Anyone can discover this recipe" : "Only you can see this recipe"}</p>
            </div>
          </div>

          {/* Desktop buttons */}
          <div className="hidden sm:flex items-center justify-between pt-4">
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={() => router.back()}
                className="rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Cancel
              </button>
            </div>
            <button type="button" onClick={handleDelete}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              Delete Recipe
            </button>
          </div>

          {/* Mobile buttons — stacked layout */}
          <div className="sm:hidden flex flex-col gap-3 pt-4 pb-24">
            <button type="submit" disabled={saving}
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={() => router.back()}
              className="w-full rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Cancel
            </button>
            <button type="button" onClick={handleDelete}
              className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 active:bg-red-200 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              Delete Recipe
            </button>
          </div>
        </form>

        {/* Mobile sticky save bar — always visible at bottom */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-sm px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/95" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              const form = document.querySelector("form");
              if (form) form.requestSubmit();
            }}
            className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
