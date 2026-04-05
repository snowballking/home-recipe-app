import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "your account";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Signed in as{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-200">
              {email}
            </span>
            .
          </p>
          <div className="mt-8">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
