"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealPlan, MealPlanSlot, MealPlanDayComment, Recipe, NutritionSummary } from "@/lib/types";
import { RECIPE_CATEGORIES } from "@/lib/types";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { translateCategory } from "@/lib/i18n/translations";

/** Helper: get display title for a recipe based on locale */
function recipeDisplayTitle(recipe: Recipe | undefined, locale: string): string {
  if (!recipe) return "";
  return (locale === "zh" && recipe.title_zh) ? recipe.title_zh : recipe.title;
}

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
  currentUserId,
}: {
  recipes: Recipe[];
  saving: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  mealLabel: string;
  currentUserId: string | null;
}) {
  const { locale, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "mine" | "community">("all");

  const filtered = useMemo(() => {
    let list = recipes;
    if (sourceFilter === "mine") list = list.filter((r) => r.user_id === currentUserId);
    else if (sourceFilter === "community") list = list.filter((r) => r.user_id !== currentUserId);
    if (category !== "all") list = list.filter((r) => r.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q) || (r.title_zh && r.title_zh.includes(q)));
    }
    return list;
  }, [recipes, category, search, sourceFilter, currentUserId]);

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
            {locale === "zh" ? `添加到${mealLabel}` : `Add to ${mealLabel}`}
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
              placeholder={t("meal_plan.search_recipes")}
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
              {t("cat.all")}
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
                {cat.icon} {translateCategory(cat.value, locale)}
              </button>
            ))}
          </div>

          {/* Source filter: All / My Recipes / Community */}
          <div className="mt-2 flex gap-1">
            {(["all", "mine", "community"] as const).map((val) => {
              const label = val === "all" ? (locale === "zh" ? "全部" : "All")
                : val === "mine" ? (locale === "zh" ? "我的食谱" : "My Recipes")
                : (locale === "zh" ? "社区食谱" : "Community");
              return (
                <button
                  key={val}
                  onClick={() => setSourceFilter(val)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    sourceFilter === val
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              {t("meal_plan.no_recipes")}
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
                      {recipeDisplayTitle(recipe, locale)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {recipe.user_id !== currentUserId && (
                        <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[10px] font-medium">
                          {(recipe as any).author_name ?? "Community"}
                        </span>
                      )}
                      {recipe.calories_per_serving != null && (
                        <span>{Math.round(recipe.calories_per_serving)} cal</span>
                      )}
                      {recipe.category && (
                        <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">
                          {translateCategory(recipe.category ?? "", locale)}
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
  const { locale, t } = useLanguage();

  // State
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [slots, setSlots] = useState<SlotWithRecipe[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // UI state
  const [activeCell, setActiveCell] = useState<{
    date: string;
    mealType: string;
  } | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Meal remarks (per cell: "date_mealType" key → remark text, stored in meal_plans.meal_remarks JSONB)
  const [mealRemarks, setMealRemarks] = useState<Record<string, string>>({});
  const [editingRemarkKey, setEditingRemarkKey] = useState<string | null>(null); // "date_mealType" being edited
  const [remarkDraft, setRemarkDraft] = useState("");

  // Overall plan notes
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  // Approval workflow
  const [approverProfile, setApproverProfile] = useState<{ id: string; displayname: string | null } | null>(null);
  const [dayComments, setDayComments] = useState<MealPlanDayComment[]>([]);
  const [editingDayComment, setEditingDayComment] = useState<string | null>(null); // date being edited
  const [dayCommentDraft, setDayCommentDraft] = useState("");
  const [isApprover, setIsApprover] = useState(false);

  // Approver picker (editable in detail page)
  const [editingApprover, setEditingApprover] = useState(false);
  const [approverSearch, setApproverSearch] = useState("");
  const [approverResults, setApproverResults] = useState<{ id: string; displayname: string | null }[]>([]);
  const [searchingApprover, setSearchingApprover] = useState(false);

  const slotsSelect = `
    *,
    recipes:recipe_id (
      id, user_id, title, title_zh, hero_image_url, calories_per_serving, protein_grams, carbs_grams, fat_grams, category
    )
  `;

  // Load data
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      let planData: any = null;
      let slotsData: any[] | null = null;

      // Try direct query first (works for plan owner)
      const { data: directPlan } = await supabase
        .from("meal_plans").select("*").eq("id", planId).single();
      planData = directPlan;

      if (planData) {
        // Direct query worked — also fetch slots directly
        const { data: directSlots } = await supabase
          .from("meal_plan_slots").select(slotsSelect)
          .eq("meal_plan_id", planId)
          .order("plan_date", { ascending: true })
          .order("meal_type", { ascending: true });
        slotsData = directSlots;
      } else {
        // Direct query failed (approver without RLS access) — use API route
        try {
          const res = await fetch(`/api/approval-plans/${planId}`);
          if (res.ok) {
            const json = await res.json();
            planData = json.plan ?? null;
            slotsData = json.slots ?? null;
          }
        } catch {
          // API route not available
        }
      }

      if (!planData) { router.push("/dashboard"); return; }
      setPlan(planData as MealPlan);
      setMealRemarks((planData as any).meal_remarks ?? {});
      setSlots((slotsData ?? []) as SlotWithRecipe[]);

      // Load user's own recipes + all public recipes
      const { data: recipesData } = await supabase
        .from("recipes").select("*, profiles(displayname)")
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order("title", { ascending: true });
      // Deduplicate (user's own public recipes appear in both conditions)
      const seen = new Set<string>();
      const deduped = (recipesData ?? []).filter((r: any) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      setRecipes(deduped.map((r: any) => ({
        ...r,
        author_name: r.profiles?.displayname ?? "Anonymous",
      })) as Recipe[]);
      setUserId(user.id);

      // Load approver profile if assigned
      if (planData.approver_id) {
        const { data: approverData } = await supabase
          .from("profiles").select("id, displayname").eq("id", planData.approver_id).single();
        if (approverData) setApproverProfile(approverData);
        setIsApprover(user.id === planData.approver_id);
      }

      // Load day comments — try RPC first (bypasses RLS), then direct query
      await loadDayComments(planId, user.id);

      setLoading(false);
    }
    loadData();
  }, [planId, supabase, router]);

  // Determine if current user can edit (owner or approver)
  const canEdit = plan?.user_id === userId || isApprover;
  const isOwner = plan?.user_id === userId;

  // Refetch helper — uses API route for approvers
  async function refetchSlots() {
    if (isApprover && !isOwner) {
      // Approver: use API route to fetch slots (bypasses RLS)
      try {
        const res = await fetch(`/api/approval-plans/${planId}`);
        if (res.ok) {
          const json = await res.json();
          setSlots((json.slots ?? []) as SlotWithRecipe[]);
          return;
        }
      } catch { /* fall through */ }
    }
    const { data: slotsData } = await supabase
      .from("meal_plan_slots").select(slotsSelect)
      .eq("meal_plan_id", planId)
      .order("plan_date", { ascending: true })
      .order("meal_type", { ascending: true });
    setSlots((slotsData ?? []) as SlotWithRecipe[]);
  }

  // Add recipe to slot — uses API route for approvers (bypasses RLS)
  async function addRecipeToSlot(recipeId: string) {
    if (!activeCell) return;
    setSaving(true);
    setMessage("");

    if (isApprover && !isOwner) {
      try {
        const res = await fetch(`/api/approval-plans/${planId}/slots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe_id: recipeId,
            plan_date: activeCell.date,
            meal_type: activeCell.mealType,
            servings: 1,
            sort_order: 0,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          setMessage("Error adding recipe: " + (err.error ?? "Unknown error"));
        } else {
          setMessage(locale === "zh" ? "已添加食谱！" : "Recipe added!");
          await refetchSlots();
          setActiveCell(null);
        }
      } catch (e: any) {
        setMessage("Error adding recipe: " + e.message);
      }
    } else {
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
        setMessage(locale === "zh" ? "已添加食谱！" : "Recipe added!");
        await refetchSlots();
        setActiveCell(null);
      }
    }
    setSaving(false);
  }

  // Remove recipe from slot — uses API route for approvers
  async function removeRecipeFromSlot(slotId: string) {
    setSaving(true);
    setMessage("");

    if (isApprover && !isOwner) {
      try {
        const res = await fetch(`/api/approval-plans/${planId}/slots`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot_id: slotId }),
        });
        if (!res.ok) {
          const err = await res.json();
          setMessage("Error removing recipe: " + (err.error ?? "Unknown error"));
        } else {
          setMessage(locale === "zh" ? "已移除食谱！" : "Recipe removed!");
          await refetchSlots();
          setHoveredSlot(null);
        }
      } catch (e: any) {
        setMessage("Error removing recipe: " + e.message);
      }
    } else {
      const { error } = await supabase.from("meal_plan_slots").delete().eq("id", slotId);
      if (error) {
        setMessage("Error removing recipe: " + error.message);
      } else {
        setMessage(locale === "zh" ? "已移除食谱！" : "Recipe removed!");
        await refetchSlots();
        setHoveredSlot(null);
      }
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

  // Update plan title
  async function saveTitle() {
    if (!plan || !titleDraft.trim()) { setEditingTitle(false); return; }
    setSaving(true); setMessage("");
    const { error } = await supabase.from("meal_plans").update({ title: titleDraft.trim() }).eq("id", planId);
    if (error) { setMessage("Error updating title: " + error.message); }
    else { setPlan({ ...plan, title: titleDraft.trim() }); }
    setEditingTitle(false);
    setSaving(false);
  }

  // Delete plan
  async function deletePlan() {
    if (!plan) return;
    setSaving(true); setMessage("");
    const { error } = await supabase.from("meal_plans").delete().eq("id", planId);
    if (error) {
      setMessage("Error deleting plan: " + error.message);
      setSaving(false);
    } else {
      router.push("/dashboard/plans");
    }
  }

  // Ensure plan is public before any share action
  async function ensurePublic(): Promise<string | null> {
    if (!plan) return null;
    if (!plan.is_public) {
      const { error } = await supabase.from("meal_plans").update({ is_public: true }).eq("id", planId);
      if (error) { setMessage("Error sharing plan: " + error.message); return null; }
      setPlan({ ...plan, is_public: true });
    }
    return `${window.location.origin}/plan/${planId}`;
  }

  // Copy link to clipboard
  async function copyLink() {
    setSaving(true); setMessage("");
    const shareUrl = await ensurePublic();
    if (!shareUrl) { setSaving(false); return; }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage(t("meal_plan.link_copied"));
    } catch {
      setMessage(`Share this link: ${shareUrl}`);
    }
    setShowShareMenu(false);
    setSaving(false);
  }

  // Share via WhatsApp
  async function shareWhatsApp() {
    setSaving(true); setMessage("");
    const shareUrl = await ensurePublic();
    if (!shareUrl || !plan) { setSaving(false); return; }
    const text = locale === "zh"
      ? `看看这个膳食计划: ${plan.title} ${shareUrl}`
      : `Check out this meal plan: ${plan.title} ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setShowShareMenu(false);
    setSaving(false);
  }

  // Share via WeChat (open share page with QR code approach)
  async function shareWeChat() {
    setSaving(true); setMessage("");
    const shareUrl = await ensurePublic();
    if (!shareUrl) { setSaving(false); return; }
    // WeChat doesn't have a direct web share URL, so copy and prompt user
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage(locale === "zh"
        ? "链接已复制！请打开微信粘贴分享给好友。"
        : "Link copied! Open WeChat and paste to share with friends.");
    } catch {
      setMessage(locale === "zh"
        ? `请复制此链接分享到微信: ${shareUrl}`
        : `Copy this link to share on WeChat: ${shareUrl}`);
    }
    setShowShareMenu(false);
    setSaving(false);
  }

  // Share via Email
  async function shareEmail() {
    setSaving(true); setMessage("");
    const shareUrl = await ensurePublic();
    if (!shareUrl || !plan) { setSaving(false); return; }
    const subject = locale === "zh" ? `膳食计划: ${plan.title}` : `Meal Plan: ${plan.title}`;
    const body = locale === "zh"
      ? `看看这个膳食计划: ${plan.title}\n\n${shareUrl}`
      : `Check out this meal plan: ${plan.title}\n\n${shareUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    setShowShareMenu(false);
    setSaving(false);
  }

  // Share via AirDrop / Notes / More — uses native share sheet
  async function shareNative() {
    setSaving(true); setMessage("");
    const shareUrl = await ensurePublic();
    if (!shareUrl || !plan) { setSaving(false); return; }
    try {
      await navigator.share({
        title: plan.title,
        text: locale === "zh" ? `看看这个膳食计划: ${plan.title}` : `Check out this meal plan: ${plan.title}`,
        url: shareUrl,
      });
      setMessage(locale === "zh" ? "已分享!" : "Shared!");
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessage(`Share this link: ${shareUrl}`);
      }
    }
    setShowShareMenu(false);
    setSaving(false);
  }

  // ── Approver search (debounced) ──────────────────────────────
  useEffect(() => {
    const query = approverSearch.trim();
    if (query.length < 2) { setApproverResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingApprover(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, displayname")
        .ilike("displayname", `%${query}%`)
        .neq("id", userId ?? "")
        .limit(8);
      setApproverResults(data ?? []);
      setSearchingApprover(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [approverSearch, supabase, userId]);

  // ── Meal Remarks (per cell, stored in meal_plans.meal_remarks JSONB) ──
  async function saveMealRemark(cellKey: string) {
    setSaving(true);
    const updated = { ...mealRemarks };
    if (remarkDraft.trim()) {
      updated[cellKey] = remarkDraft.trim();
    } else {
      delete updated[cellKey];
    }

    let saveError: string | null = null;

    if (isApprover && !isOwner) {
      // Approver: use API route to bypass RLS
      try {
        const res = await fetch(`/api/approval-plans/${planId}/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meal_remarks: updated }),
        });
        if (!res.ok) {
          const err = await res.json();
          saveError = err.error ?? "Unknown error";
        }
      } catch (e: any) {
        saveError = e.message;
      }
    } else {
      const { error } = await supabase
        .from("meal_plans")
        .update({ meal_remarks: updated })
        .eq("id", planId);
      if (error) saveError = error.message;
    }

    if (saveError) { setMessage("Error saving remark: " + saveError); }
    else { setMealRemarks(updated); setPlan({ ...plan!, meal_remarks: updated }); }
    setEditingRemarkKey(null);
    setRemarkDraft("");
    setSaving(false);
  }

  // ── Overall Plan Notes ─────────────────────────────────────
  async function saveOverallNotes() {
    setSaving(true);
    const newNotes = notesDraft.trim() || null;
    let saveError: string | null = null;

    if (isApprover && !isOwner) {
      try {
        const res = await fetch(`/api/approval-plans/${planId}/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: newNotes }),
        });
        if (!res.ok) {
          const err = await res.json();
          saveError = err.error ?? "Unknown error";
        }
      } catch (e: any) {
        saveError = e.message;
      }
    } else {
      const { error } = await supabase
        .from("meal_plans")
        .update({ notes: newNotes })
        .eq("id", planId);
      if (error) saveError = error.message;
    }

    if (saveError) {
      setMessage("Error saving notes: " + saveError);
    } else {
      setPlan({ ...plan!, notes: newNotes });
      setMessage(locale === "zh" ? "备注已保存！" : "Notes saved!");
    }
    setEditingNotes(false);
    setSaving(false);
  }

  // ── Change Approver ────────────────────────────────────────
  async function changeApprover(newApprover: { id: string; displayname: string | null } | null) {
    setSaving(true); setMessage("");
    const { error } = await supabase
      .from("meal_plans")
      .update({ approver_id: newApprover?.id ?? null, approval_status: null })
      .eq("id", planId);
    if (error) { setMessage("Error updating approver: " + error.message); }
    else {
      setPlan({ ...plan!, approver_id: newApprover?.id ?? null, approval_status: null });
      setApproverProfile(newApprover);
      setIsApprover(false);
    }
    setEditingApprover(false);
    setApproverSearch("");
    setApproverResults([]);
    setSaving(false);
  }

  // ── Approval Workflow ──────────────────────────────────────
  async function sendForApproval() {
    if (!plan?.approver_id) {
      setMessage(locale === "zh" ? "请先指定审批人" : "Please assign an approver first.");
      return;
    }
    setSaving(true); setMessage("");
    const { error } = await supabase
      .from("meal_plans")
      .update({ approval_status: "pending_approval" })
      .eq("id", planId);
    if (error) { setMessage("Error: " + error.message); }
    else {
      setPlan({ ...plan!, approval_status: "pending_approval" });
      setMessage(locale === "zh" ? "已发送审批！" : "Sent for approval!");
    }
    setSaving(false);
  }

  async function updateApprovalStatus(status: "approved" | "changes_requested") {
    setSaving(true); setMessage("");
    let saveError: string | null = null;

    if (isApprover && !isOwner) {
      try {
        const res = await fetch(`/api/approval-plans/${planId}/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approval_status: status }),
        });
        if (!res.ok) {
          const err = await res.json();
          saveError = err.error ?? "Unknown error";
        }
      } catch (e: any) {
        saveError = e.message;
      }
    } else {
      const { error } = await supabase
        .from("meal_plans")
        .update({ approval_status: status })
        .eq("id", planId);
      if (error) saveError = error.message;
    }

    if (saveError) { setMessage("Error: " + saveError); }
    else {
      setPlan({ ...plan!, approval_status: status });
      setMessage(status === "approved"
        ? (locale === "zh" ? "已批准！" : "Approved!")
        : (locale === "zh" ? "已请求修改" : "Changes requested."));
    }
    setSaving(false);
  }

  // ── Day Comments (approver) ────────────────────────────────
  // Helper to load day comments (used on initial load and after save)
  async function loadDayComments(mealPlanId: string, currentUserId: string) {
    let comments: any[] = [];

    // Try RPC function first (SECURITY DEFINER, bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_day_comments", {
      p_meal_plan_id: mealPlanId,
      p_user_id: currentUserId,
    });
    if (!rpcError && rpcData) {
      comments = rpcData.map((c: any) => ({
        ...c,
        profiles: { displayname: c.displayname ?? "Unknown" },
      }));
    } else {
      // Fallback: direct query + separate profile fetch
      const { data: directData } = await supabase
        .from("meal_plan_day_comments")
        .select("*")
        .eq("meal_plan_id", mealPlanId)
        .order("plan_date", { ascending: true })
        .order("created_at", { ascending: true });
      if (directData && directData.length > 0) {
        const userIds = [...new Set(directData.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles").select("id, displayname").in("id", userIds);
        const nameMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.displayname ?? "Unknown"; });
        comments = directData.map((c: any) => ({
          ...c,
          profiles: { displayname: nameMap[c.user_id] ?? "Unknown" },
        }));
      }
    }
    setDayComments(comments as MealPlanDayComment[]);
  }

  async function saveDayComment(planDate: string) {
    if (!dayCommentDraft.trim()) { setEditingDayComment(null); return; }
    setSaving(true); setMessage("");

    // Try RPC insert first (bypasses RLS), fallback to direct insert
    let insertError: string | null = null;
    const { error: rpcErr } = await supabase.rpc("insert_day_comment", {
      p_meal_plan_id: planId,
      p_plan_date: planDate,
      p_user_id: userId,
      p_comment: dayCommentDraft.trim(),
    });
    if (rpcErr) {
      // Fallback to direct insert
      const { error: directErr } = await supabase.from("meal_plan_day_comments").insert({
        meal_plan_id: planId,
        plan_date: planDate,
        user_id: userId,
        comment: dayCommentDraft.trim(),
      });
      if (directErr) insertError = directErr.message;
    }

    if (insertError) {
      setMessage("Error saving comment: " + insertError);
    } else {
      await loadDayComments(planId, userId!);
      setEditingDayComment(null);
      setDayCommentDraft("");
    }
    setSaving(false);
  }

  async function deleteDayComment(commentId: string) {
    setSaving(true);
    // Try RPC delete first (bypasses RLS), fallback to direct delete
    const { error: rpcErr } = await supabase.rpc("delete_day_comment", {
      p_comment_id: commentId,
      p_user_id: userId,
    });
    if (rpcErr) {
      await supabase.from("meal_plan_day_comments").delete().eq("id", commentId);
    }
    setDayComments((prev) => prev.filter((c) => c.id !== commentId));
    setSaving(false);
  }

  function getDayComments(date: string): MealPlanDayComment[] {
    return dayComments.filter((c) => c.plan_date === date);
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
    breakfast: t("meal_plan.breakfast"),
    lunch: t("meal_plan.lunch"),
    dinner: t("meal_plan.dinner"),
    snack: t("meal_plan.snack"),
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                    className="w-full text-xl sm:text-3xl font-bold bg-transparent border-b-2 border-indigo-500 text-zinc-900 dark:text-zinc-50 outline-none py-0.5"
                  />
                  <button onClick={saveTitle} className="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors">
                    {locale === "zh" ? "保存" : "Save"}
                  </button>
                  <button onClick={() => setEditingTitle(false)} className="flex-shrink-0 rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 transition-colors">
                    {locale === "zh" ? "取消" : "Cancel"}
                  </button>
                </div>
              ) : (
                <h1
                  onClick={() => { setTitleDraft(plan.title); setEditingTitle(true); }}
                  className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                  title={locale === "zh" ? "点击编辑标题" : "Click to edit title"}
                >
                  {plan.title}
                  <svg className="inline-block ml-2 h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </h1>
              )}
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

          {/* Status + Approval + Approver */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
              plan.status === "finalized"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}>
              {plan.status === "finalized" ? "Finalized" : "Draft"}
            </span>

            {/* Approval status badge */}
            {plan.approval_status && (
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                plan.approval_status === "approved"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : plan.approval_status === "pending_approval"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                {plan.approval_status === "approved" ? (locale === "zh" ? "已批准" : "Approved")
                  : plan.approval_status === "pending_approval" ? (locale === "zh" ? "待审批" : "Pending Approval")
                  : (locale === "zh" ? "需修改" : "Changes Requested")}
              </span>
            )}

            {/* Approver info */}
            {approverProfile && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {locale === "zh" ? "审批人: " : "Approver: "}{approverProfile.displayname ?? "Unknown"}
              </span>
            )}

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

        {/* Approver Section (editable, above action buttons) */}
        {plan.user_id === userId && (
          <div className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                {locale === "zh" ? "审批人" : "Approver"}
              </span>
            </div>
            {editingApprover ? (
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  value={approverSearch}
                  onChange={(e) => setApproverSearch(e.target.value)}
                  placeholder={locale === "zh" ? "搜索用户名…" : "Search by username…"}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchingApprover && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                  </div>
                )}
                {approverResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-48 overflow-y-auto">
                    {approverResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => changeApprover(u)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {(u.displayname?.[0] ?? "?").toUpperCase()}
                        </div>
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">{u.displayname ?? "Unknown"}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  {approverProfile && (
                    <button onClick={() => changeApprover(null)}
                      className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors">
                      {locale === "zh" ? "移除审批人" : "Remove Approver"}
                    </button>
                  )}
                  <button onClick={() => { setEditingApprover(false); setApproverSearch(""); setApproverResults([]); }}
                    className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 transition-colors">
                    {locale === "zh" ? "取消" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : approverProfile ? (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  {(approverProfile.displayname?.[0] ?? "?").toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {approverProfile.displayname ?? "Unknown"}
                </span>
                <button onClick={() => setEditingApprover(true)}
                  className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 transition-colors">
                  {locale === "zh" ? "更改" : "Change"}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingApprover(true)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors">
                + {locale === "zh" ? "指定审批人" : "Assign Approver"}
              </button>
            )}
          </div>
        )}

        {/* Overall Plan Notes / Remarks */}
        {canEdit && (
          <div className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                {locale === "zh" ? "整体备注" : "Overall Notes"}
              </span>
              {!editingNotes && (
                <button
                  onClick={() => { setNotesDraft(plan.notes ?? ""); setEditingNotes(true); }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors"
                >
                  {plan.notes ? (locale === "zh" ? "编辑" : "Edit") : (locale === "zh" ? "+ 添加备注" : "+ Add Notes")}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  placeholder={locale === "zh" ? "添加关于此膳食计划的备注…" : "Add notes about this meal plan…"}
                />
                <div className="flex gap-2">
                  <button onClick={saveOverallNotes} disabled={saving}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {locale === "zh" ? "保存" : "Save"}
                  </button>
                  <button onClick={() => { setEditingNotes(false); setNotesDraft(""); }}
                    className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
                    {locale === "zh" ? "取消" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : plan.notes ? (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{plan.notes}</p>
            ) : (
              <p className="text-xs text-zinc-400 italic">{locale === "zh" ? "暂无备注" : "No notes yet"}</p>
            )}
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
            {plan.is_public ? t("recipe.public") : t("recipe.private")}
          </button>
          <div className="relative">
            <button onClick={() => setShowShareMenu(!showShareMenu)} disabled={saving}
              className="rounded-lg bg-violet-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              {t("meal_plan.share")}
              <svg className={`h-3 w-3 transition-transform ${showShareMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {/* Share Dropdown Menu */}
            {showShareMenu && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setShowShareMenu(false)} />
                <div className="absolute left-0 top-full mt-2 z-[95] w-56 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
                  {/* Copy Link */}
                  <button onClick={copyLink}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    {locale === "zh" ? "复制链接" : "Copy Link"}
                  </button>

                  <div className="border-t border-zinc-100 dark:border-zinc-800" />

                  {/* WhatsApp */}
                  <button onClick={shareWhatsApp}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </button>

                  {/* WeChat */}
                  <button onClick={shareWeChat}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.49.49 0 01.177-.554C23.016 18.514 24 16.807 24 14.896c0-3.344-3.067-5.99-7.062-6.038zm-2.54 2.776c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/></svg>
                    {locale === "zh" ? "微信" : "WeChat"}
                  </button>

                  <div className="border-t border-zinc-100 dark:border-zinc-800" />

                  {/* AirDrop — triggers native share sheet */}
                  {typeof navigator !== "undefined" && !!navigator.share && (
                    <button onClick={shareNative}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                      <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" /></svg>
                      AirDrop
                    </button>
                  )}

                  {/* Notes — triggers native share sheet */}
                  {typeof navigator !== "undefined" && !!navigator.share && (
                    <button onClick={shareNative}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                      <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      {locale === "zh" ? "备忘录" : "Notes"}
                    </button>
                  )}

                  {/* Email */}
                  <button onClick={shareEmail}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {locale === "zh" ? "邮件" : "Email"}
                  </button>

                  <div className="border-t border-zinc-100 dark:border-zinc-800" />

                  {/* More options — native share sheet */}
                  {typeof navigator !== "undefined" && !!navigator.share && (
                    <button onClick={shareNative}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                      <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                      {locale === "zh" ? "更多选项…" : "More options…"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          {/* Send for Approval (owner only, when approver is assigned) */}
          {plan.approver_id && plan.user_id === userId && !plan.approval_status && (
            <button onClick={sendForApproval} disabled={saving}
              className="rounded-lg bg-amber-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              {locale === "zh" ? "发送审批" : "Send for Approval"}
            </button>
          )}
          {/* Re-send after changes requested */}
          {plan.approver_id && plan.user_id === userId && plan.approval_status === "changes_requested" && (
            <button onClick={sendForApproval} disabled={saving}
              className="rounded-lg bg-amber-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              {locale === "zh" ? "重新提交审批" : "Resubmit for Approval"}
            </button>
          )}

          {/* Approver actions */}
          {isApprover && (
            <>
              <button onClick={() => updateApprovalStatus("approved")} disabled={saving}
                className="rounded-lg bg-green-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {locale === "zh" ? "批准" : "Approve"}
              </button>
              <button onClick={() => updateApprovalStatus("changes_requested")} disabled={saving}
                className="rounded-lg bg-orange-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {locale === "zh" ? "请求修改" : "Request Changes"}
              </button>
            </>
          )}

          <button onClick={() => setShowDeleteConfirm(true)} disabled={saving}
            className="rounded-lg bg-red-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {locale === "zh" ? "删除" : "Delete"}
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {locale === "zh" ? "确认删除" : "Delete Meal Plan"}
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {locale === "zh"
                  ? `确定要删除「${plan.title}」吗？此操作不可撤销。`
                  : `Are you sure you want to delete "${plan.title}"? This action cannot be undone.`}
              </p>
              <div className="mt-5 flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  {locale === "zh" ? "取消" : "Cancel"}
                </button>
                <button
                  onClick={deletePlan}
                  disabled={saving}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? (locale === "zh" ? "删除中…" : "Deleting…") : (locale === "zh" ? "确认删除" : "Delete")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────── DESKTOP: Table Grid (hidden on mobile) ────────── */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full border-collapse bg-white dark:bg-zinc-900">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-100">Date</th>
                {mealTypes.map((mt) => (
                  <th key={mt} className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-100">{mealLabels[mt]}</th>
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
                  <React.Fragment key={date}>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
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
                                    {recipeDisplayTitle(slot.recipes, locale)}
                                  </span>
                                  <button onClick={() => removeRecipeFromSlot(slot.id)} disabled={saving}
                                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                    title="Remove">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l6 6M9 3l-6 6" /></svg>
                                  </button>

                                  {hoveredSlot === slot.id && (
                                    <div className="absolute z-50 left-0 top-full mt-1 w-44 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg p-2.5">
                                      <p className="font-medium text-zinc-900 dark:text-zinc-100 text-xs mb-1.5">{recipeDisplayTitle(slot.recipes, locale)}</p>
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

                            {/* Meal Remark per cell (before + Add) */}
                            {(() => {
                              const cellKey = `${date}_${mealType}`;
                              const existingRemark = mealRemarks[cellKey];
                              return editingRemarkKey === cellKey ? (
                                <div className="space-y-1">
                                  <textarea
                                    autoFocus
                                    value={remarkDraft}
                                    onChange={(e) => setRemarkDraft(e.target.value)}
                                    rows={2}
                                    className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none resize-none"
                                    placeholder={locale === "zh" ? "输入备注…" : "Enter remark…"}
                                  />
                                  <div className="flex gap-1">
                                    <button onClick={() => saveMealRemark(cellKey)}
                                      className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700">
                                      {locale === "zh" ? "保存" : "Save"}
                                    </button>
                                    <button onClick={() => { setEditingRemarkKey(null); setRemarkDraft(""); }}
                                      className="rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                                      {locale === "zh" ? "取消" : "Cancel"}
                                    </button>
                                  </div>
                                </div>
                              ) : existingRemark ? (
                                <div
                                  onClick={() => { setRemarkDraft(existingRemark); setEditingRemarkKey(cellKey); }}
                                  className="cursor-pointer rounded bg-amber-50 dark:bg-amber-900/20 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-400 leading-snug hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                  title={locale === "zh" ? "点击编辑备注" : "Click to edit remark"}
                                >
                                  <span className="font-medium">{locale === "zh" ? "备注: " : "Note: "}</span>{existingRemark}
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setRemarkDraft(""); setEditingRemarkKey(cellKey); }}
                                  className="text-[10px] text-zinc-400 hover:text-indigo-500 transition-colors"
                                >
                                  + {locale === "zh" ? "添加备注" : "Add Remark"}
                                </button>
                              );
                            })()}

                            <button
                              onClick={() => setActiveCell({ date, mealType })}
                              className={`w-full rounded-lg border border-dashed py-1 px-2 text-xs font-medium transition-colors ${
                                cellSlots.length === 0
                                  ? "border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
                                  : "border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-indigo-400 hover:text-indigo-500"
                              }`}
                            >
                              {cellSlots.length === 0 ? t("meal_plan.add_dish") : "+"}
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

                  {/* Approver's Comments row for this day */}
                  {(plan.approver_id || getDayComments(date).length > 0) && (
                    <tr key={`comments-${date}`} className="border-b border-zinc-200 dark:border-zinc-800 bg-indigo-50/30 dark:bg-indigo-950/20">
                      <td colSpan={6} className="px-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap mt-0.5">
                            {locale === "zh" ? "审批人评论:" : "Approver's Comments:"}
                          </span>
                          <div className="flex-1 space-y-1">
                            {getDayComments(date).map((c) => (
                              <div key={c.id} className="flex items-start gap-2 group">
                                <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-snug flex-1">
                                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{(c as any).profiles?.displayname ?? "Approver"}:</span>{" "}
                                  {c.comment}
                                  <span className="ml-2 text-zinc-400 text-[10px]">{new Date(c.created_at).toLocaleDateString()}</span>
                                </p>
                                {c.user_id === userId && (
                                  <button onClick={() => deleteDayComment(c.id)}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all">
                                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l6 6M9 3l-6 6" /></svg>
                                  </button>
                                )}
                              </div>
                            ))}
                            {getDayComments(date).length === 0 && !editingDayComment && (
                              <p className="text-[11px] text-zinc-400 italic">
                                {locale === "zh" ? "暂无评论" : "No comments yet"}
                              </p>
                            )}
                            {/* Approver can add comment */}
                            {isApprover && editingDayComment === date ? (
                              <div className="flex gap-1 items-end">
                                <textarea
                                  autoFocus
                                  value={dayCommentDraft}
                                  onChange={(e) => setDayCommentDraft(e.target.value)}
                                  rows={2}
                                  className="flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none resize-none"
                                  placeholder={locale === "zh" ? "输入评论…" : "Write a comment…"}
                                />
                                <button onClick={() => saveDayComment(date)}
                                  className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-indigo-700">
                                  {locale === "zh" ? "发送" : "Post"}
                                </button>
                                <button onClick={() => { setEditingDayComment(null); setDayCommentDraft(""); }}
                                  className="rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                                  {locale === "zh" ? "取消" : "Cancel"}
                                </button>
                              </div>
                            ) : isApprover ? (
                              <button onClick={() => { setEditingDayComment(date); setDayCommentDraft(""); }}
                                className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
                                + {locale === "zh" ? "添加评论" : "Add Comment"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
                            {t("meal_plan.add_dish")}
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
                                      {recipeDisplayTitle(slot.recipes, locale)}
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

                        {/* Mobile: Meal remark per cell (after dishes, before next meal) */}
                        {(() => {
                          const cellKey = `${date}_${mealType}`;
                          const existingRemark = mealRemarks[cellKey];
                          return (
                            <div className="mt-2">
                              {editingRemarkKey === cellKey ? (
                                <div className="space-y-1">
                                  <textarea
                                    autoFocus
                                    value={remarkDraft}
                                    onChange={(e) => setRemarkDraft(e.target.value)}
                                    rows={2}
                                    className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none resize-none"
                                    placeholder={locale === "zh" ? "输入备注…" : "Enter remark…"}
                                  />
                                  <div className="flex gap-1">
                                    <button onClick={() => saveMealRemark(cellKey)}
                                      className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700">
                                      {locale === "zh" ? "保存" : "Save"}
                                    </button>
                                    <button onClick={() => { setEditingRemarkKey(null); setRemarkDraft(""); }}
                                      className="rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                                      {locale === "zh" ? "取消" : "Cancel"}
                                    </button>
                                  </div>
                                </div>
                              ) : existingRemark ? (
                                <div
                                  onClick={() => { setRemarkDraft(existingRemark); setEditingRemarkKey(cellKey); }}
                                  className="cursor-pointer rounded bg-amber-50 dark:bg-amber-900/20 px-2 py-1 text-xs text-amber-700 dark:text-amber-400 leading-snug"
                                >
                                  <span className="font-medium">{locale === "zh" ? "备注: " : "Note: "}</span>{existingRemark}
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setRemarkDraft(""); setEditingRemarkKey(cellKey); }}
                                  className="text-[11px] text-zinc-400 hover:text-indigo-500 transition-colors"
                                >
                                  + {locale === "zh" ? "添加备注" : "Add Remark"}
                                </button>
                              )}
                            </div>
                          );
                        })()}
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

                {/* Approver's Comments for this day (mobile) */}
                {(plan.approver_id || getDayComments(date).length > 0) && (
                  <div className="border-t border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-950/20 px-4 py-3">
                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
                      {locale === "zh" ? "审批人评论" : "Approver's Comments"}
                    </p>
                    {getDayComments(date).length > 0 ? (
                      <div className="space-y-1.5">
                        {getDayComments(date).map((c) => (
                          <div key={c.id} className="flex items-start gap-2">
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug flex-1">
                              <span className="font-medium text-indigo-600 dark:text-indigo-400">{(c as any).profiles?.displayname ?? "Approver"}:</span>{" "}
                              {c.comment}
                            </p>
                            {c.user_id === userId && (
                              <button onClick={() => deleteDayComment(c.id)} className="text-zinc-400 hover:text-red-500">
                                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l6 6M9 3l-6 6" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-400 italic">{locale === "zh" ? "暂无评论" : "No comments yet"}</p>
                    )}
                    {isApprover && (
                      editingDayComment === date ? (
                        <div className="mt-2 flex gap-1 items-end">
                          <textarea
                            autoFocus
                            value={dayCommentDraft}
                            onChange={(e) => setDayCommentDraft(e.target.value)}
                            rows={2}
                            className="flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none resize-none"
                            placeholder={locale === "zh" ? "输入评论…" : "Write a comment…"}
                          />
                          <button onClick={() => saveDayComment(date)}
                            className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-indigo-700">
                            {locale === "zh" ? "发送" : "Post"}
                          </button>
                          <button onClick={() => { setEditingDayComment(null); setDayCommentDraft(""); }}
                            className="rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                            {locale === "zh" ? "取消" : "Cancel"}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingDayComment(date); setDayCommentDraft(""); }}
                          className="mt-1.5 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium">
                          + {locale === "zh" ? "添加评论" : "Add Comment"}
                        </button>
                      )
                    )}
                  </div>
                )}
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
          mealLabel={`${mealLabels[activeCell.mealType]} — ${new Date(activeCell.date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { weekday: "short", month: "short", day: "numeric" })}`}
          currentUserId={userId}
        />
      )}
    </div>
  );
}
