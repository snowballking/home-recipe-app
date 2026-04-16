import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { NavBar } from "@/app/components/nav-bar";
import { RecipeCard } from "@/app/components/recipe-card";
import { FollowButton } from "@/app/components/follow-button";
import { EditProfileButton } from "./edit-profile-button";
import { ChangePassword } from "./change-password";
import type { Recipe, Profile } from "@/lib/types";

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

  // Get user's public recipes
  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const userRecipes = (recipes ?? []) as Recipe[];

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
                {typedProfile.is_admin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    ⚙ Admin
                  </span>
                )}
                {isOwner ? (
                  <EditProfileButton
                    profileId={id}
                    currentUsername={typedProfile.displayname ?? ""}
                  />
                ) : (
                  <FollowButton targetUserId={id} />
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

              {/* Stats */}
              <div className="mt-4 flex flex-wrap gap-6">
                <div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {typedProfile.recipe_count}
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
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {userRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} showAuthor={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
