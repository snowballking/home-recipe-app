"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import type { Chef, ChefSourceSite } from "@/lib/types";

type RecipeRow = { id: string; title: string; source_url: string | null; chef_id: string | null };

const SOURCE_SITES: ChefSourceSite[] = ["youtube", "xiaohongshu", "website", "other"];

export default function AdminChefsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [editing, setEditing] = useState<Chef | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    bio: "",
    channel_url: "",
    source_site: "youtube" as ChefSourceSite,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    const [{ data: chefData }, { data: recipeData }] = await Promise.all([
      supabase.from("chefs").select("*").order("name"),
      supabase
        .from("recipes")
        .select("id, title, source_url, chef_id")
        .not("source_url", "is", null)
        .order("created_at", { ascending: false }),
    ]);
    setChefs((chefData as Chef[]) ?? []);
    setRecipes((recipeData as RecipeRow[]) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.is_admin) {
        router.push("/dashboard");
        return;
      }
      setAuthorized(true);
      await loadData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(chef: Chef) {
    setEditing(chef);
    setCreating(false);
    setForm({
      name: chef.name,
      bio: chef.bio ?? "",
      channel_url: chef.channel_url ?? "",
      source_site: chef.source_site,
    });
    setError("");
  }

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm({ name: "", bio: "", channel_url: "", source_site: "youtube" });
    setError("");
  }

  async function saveChef() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (form.channel_url && !/^https?:\/\//i.test(form.channel_url)) {
      setError("Channel link must start with http:// or https://");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      bio: form.bio.trim() || null,
      channel_url: form.channel_url.trim() || null,
      source_site: form.source_site,
    };
    const { error: dbError } = editing
      ? await supabase.from("chefs").update(payload).eq("id", editing.id)
      : await supabase.from("chefs").insert(payload);
    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setEditing(null);
    setCreating(false);
    await loadData();
  }

  async function deleteChef(chef: Chef) {
    if (!confirm(`Delete chef "${chef.name}"? Their recipes stay but lose the chef link.`)) return;
    await supabase.from("chefs").delete().eq("id", chef.id);
    await loadData();
  }

  async function uploadAvatar(chef: Chef, file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type, fileName: file.name }),
      });
      const json = await res.json();
      if (res.ok && json.url) {
        await supabase.from("chefs").update({ avatar_url: json.url }).eq("id", chef.id);
        await loadData();
      } else {
        alert(json.error ?? "Upload failed");
      }
    };
    reader.readAsDataURL(file);
  }

  async function assignRecipe(recipeId: string, chefId: string) {
    await supabase.rpc("admin_set_recipe_chef", {
      p_recipe_id: recipeId,
      p_chef_id: chefId || null,
    });
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, chef_id: chefId || null } : r))
    );
  }

  if (!authorized) return null;

  const unassigned = recipes.filter((r) => !r.chef_id);
  const assigned = recipes.filter((r) => r.chef_id);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">👨‍🍳 Chefs</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Curated creator profiles shown in the Chefs tab
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/users"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:text-zinc-300"
            >
              ← Users
            </Link>
            <button
              onClick={startCreate}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + New Chef
            </button>
          </div>
        </div>

        {(creating || editing) && (
          <div className="mt-6 rounded-xl border border-indigo-200 bg-white p-4 dark:border-indigo-900 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {editing ? `Edit: ${editing.name}` : "New Chef"}
            </h2>
            <div className="mt-3 grid gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Chef / channel name"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <input
                value={form.channel_url}
                onChange={(e) => setForm({ ...form, channel_url: e.target.value })}
                placeholder="Channel link (https://...)"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <select
                value={form.source_site}
                onChange={(e) => setForm({ ...form, source_site: e.target.value as ChefSourceSite })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {SOURCE_SITES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Short bio (shown on their profile)"
                rows={3}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={saveChef}
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(null);
                    setCreating(false);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chef list */}
        <div className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {chefs.map((chef) => (
            <div key={chef.id} className="flex flex-wrap items-center gap-3 p-4">
              {chef.avatar_url && /^https?:\/\//i.test(chef.avatar_url) ? (
                <img src={chef.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                  👨‍🍳
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {chef.name}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {chef.source_site} · {recipes.filter((r) => r.chef_id === chef.id).length} recipes
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => {
                    avatarInputRef.current?.setAttribute("data-chef", chef.id);
                    avatarInputRef.current?.click();
                  }}
                  className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:text-zinc-300"
                >
                  📷 Photo
                </button>
                <button
                  onClick={() => startEdit(chef)}
                  className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteChef(chef)}
                  className="rounded-md border border-red-300 px-2 py-1 text-red-600 dark:border-red-900"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {chefs.length === 0 && <p className="p-4 text-sm text-zinc-500">No chefs yet.</p>}
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const chefId = avatarInputRef.current?.getAttribute("data-chef");
            const chef = chefs.find((c) => c.id === chefId);
            if (file && chef) uploadAvatar(chef, file);
            e.target.value = "";
          }}
        />

        {/* Recipe assignment */}
        <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Recipe assignments
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Imported recipes without a chef ({unassigned.length}) — pick who created them.
        </p>
        {[...unassigned, ...assigned].map((r) => (
          <div
            key={r.id}
            className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-900 dark:text-zinc-100">{r.title}</p>
              <p className="truncate text-xs text-zinc-500">{r.source_url}</p>
            </div>
            <select
              value={r.chef_id ?? ""}
              onChange={(e) => assignRecipe(r.id, e.target.value)}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">— no chef —</option>
              {chefs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
