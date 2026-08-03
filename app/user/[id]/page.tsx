import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { NavBar } from "@/app/components/nav-bar";
import { RecipeCard } from "@/app/components/recipe-card";
import { FollowButton } from "@/app/components/follow-button";
import Link from "next/link";
import { ChangePassword } from "./change-password";
import type { Recipe, Profile, MealPlan } from "@/lib/types";
import { orderProfileRecipes } from "@/lib/profile-recipes";

const PROFILE_LINK_LABELS: { key: keyof Profile["external_links"]; label: string; icon: string }[] = [
  { key: "instagram", label: "Instagram", icon: "📷" },
  { key: "youtube", label: "YouTube", icon: "▶" },
  { key: "tiktok", label: "TikTok", icon: "🎵" },
  { key: "website", label: "Website", icon: "🌐" },
];

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const typedProfile = profile as Profile;

  // Is the viewer the owner of this profile?
  const { data: { user: viewer } } = await supabase.auth.getUser();
  const isOwner = viewer?.id === id;
  const viewerEmail = isOwner ? viewer?.email ?? null : null;

  // A member's public profile includes each public recipe they added. Originals
  // and variations are displayed before imports so their own work leads.
  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const userRecipes = orderProfileRecipes((recipes ?? []) as Recipe[]);

  // Public meal plans shared by this user
  const { data: sharedPlans } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("user_id", id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(12);

  const publicPlans = (sharedPlans ?? []) as MealPlan[];

  // Stats
  const totalRatings = userRecipes.reduce((acc, r) => acc + r.rating_count, 0);
  const totalSaves = userRecipes.reduce((acc, r) => acc + r.save_count, 0);

  const joinDate = new Date(typedProfile.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Profile Header */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {typedProfile.avatar_url ? (
                <img
                  src={typedProfile.avatar_url}
                  alt={typedProfile.displayname ?? "User"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                (typedProfile.displayname?.[0] ?? viewerEmail?.[0] ?? "?").toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {typedProfile.displayname ?? "Anonymous"}
                </h1>
                {typedProfile.is_chef && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    👨‍🍳 Chef
                  </span>
                )}
                {typedProfile.is_admin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    ⚙ Admin
                  </span>
                )}
                {isOwner ? (
                  <Link
                    href="/dashboard/profile"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Edit Profile
                  </Link>
                ) : (
                  <FollowButton targetUserId={id} size="lg" />
                )}
              </div>

              {/* Account info (only visible to owner) */}
              {isOwner && (
                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[140px_1fr]">
                  <dt className="font-medium text-zinc-500 dark:text-zinc-400">Username</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {typedProfile.displayname ?? <span className="italic text-zinc-400">Not set</span>}
                  </dd>

                  <dt className="font-medium text-zinc-500 dark:text-zinc-400">Email</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">{viewerEmail}</dd>

                  <dt className="font-medium text-zinc-500 dark:text-zinc-400">Joined</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">{joinDate}</dd>

                  <dt className="font-medium text-zinc-500 dark:text-zinc-400">Status</dt>
                  <dd>
                    {typedProfile.is_approved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        ✓ Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        ⏳ Pending approval
                      </span>
                    )}
                  </dd>
                </dl>
              )}

              {typedProfile.bio && (
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {typedProfile.bio}
                </p>
              )}

              {/* Specialties */}
              {(typedProfile.specialties?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-500">Specialties:</span>
                  {typedProfile.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Dietary preferences */}
              {(typedProfile.dietary_preferences?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-500">Dietary:</span>
                  {typedProfile.dietary_preferences.map((d) => (
                    <span
                      key={d}
                      className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}

              {/* External links */}
              {PROFILE_LINK_LABELS.some(({ key }) => typedProfile.external_links?.[key]) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {PROFILE_LINK_LABELS.map(({ key, label, icon }) => {
                    const url = typedProfile.external_links?.[key];
                    // Only render http(s) links — blocks javascript: URIs
                    if (!url || !/^https?:\/\//i.test(url)) return null;
                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-indigo-300 hover:text-indigo-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-indigo-600 dark:hover:text-indigo-300"
                      >
                        <span>{icon}</span> {label}
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Stats */}
              <div className="mt-4 flex flex-wrap gap-6">
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {userRecipes.length}
                  </p>
                  <p className="text-xs text-zinc-500">Recipes</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {typedProfile.follower_count}
                  </p>
                  <p className="text-xs text-zinc-500">Followers</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {typedProfile.following_count}
                  </p>
                  <p className="text-xs text-zinc-500">Following</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {totalRatings}
                  </p>
                  <p className="text-xs text-zinc-500">Ratings Received</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {totalSaves}
                  </p>
                  <p className="text-xs text-zinc-500">Total Saves</p>
                </div>
              </div>

              {!isOwner && (
                <p className="mt-3 text-xs text-zinc-400">
                  Member since {new Date(typedProfile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Change Password (owner only) */}
        {isOwner && viewerEmail && <ChangePassword email={viewerEmail} />}

        {/* User's Recipes */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Recipes by {typedProfile.displayname ?? "this user"}
          </h2>

          {userRecipes.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-zinc-500">
                {isOwner
                  ? "You haven\u2019t shared any public recipes yet."
                  : "This user hasn\u2019t shared any public recipes yet."}
              </p>
            </div>
          ) : (
            <div data-testid="profile-recipe-grid" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {userRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} showAuthor={false} compact />
              ))}
            </div>
          )}
        </div>

        {/* Shared Meal Plans */}
        {publicPlans.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Shared Meal Plans
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publicPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/plan/${plan.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
                >
                  <h3 className="line-clamp-2 font-semibold text-zinc-900 dark:text-zinc-50">
                    {plan.title}
                  </h3>
                  {plan.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {plan.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {new Date(plan.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" – "}
                      {new Date(plan.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span>💬 {plan.comment_count}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
