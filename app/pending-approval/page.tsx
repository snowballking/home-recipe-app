import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → go to login
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Already approved? Send them to the app.
  if ((profile as Profile | null)?.is_approved) {
    redirect("/dashboard/recipes");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Waiting for approval
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Thanks for signing up! This app is for close friends and family only, so the
          administrator needs to approve your account before you can access it.
        </p>
        <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Signed in as:</span>{" "}
            {user.email}
          </p>
        </div>
        <p className="mt-5 text-xs text-zinc-500 dark:text-zinc-500">
          You&apos;ll be able to sign in and use the app once approved. Please reach out
          to the administrator if you have any questions.
        </p>
        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
