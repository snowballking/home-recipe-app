"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";

interface AdminUserRow {
  id: string;
  email: string;
  displayname: string | null;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("admin_list_users");
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    setUsers((data ?? []) as AdminUserRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // Make sure viewer is an admin; middleware already gates this, but double-check client-side.
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { data: profile } = await supabase
          .from("profiles").select("is_admin").eq("id", user.id).single();
        if (!profile?.is_admin) { router.push("/dashboard/recipes"); return; }
        await loadUsers();
      } catch {
        // auth lock race
        setLoading(false);
      }
    }
    check();
  }, []);

  async function approve(userId: string) {
    setBusyId(userId);
    const { error: err } = await supabase
      .from("profiles")
      .update({ is_approved: true, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setBusyId(null);
    if (err) { alert("Approve failed: " + err.message); return; }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_approved: true } : u)));
  }

  async function revoke(userId: string) {
    if (!window.confirm("Revoke this user's approval? They will be locked out until re-approved.")) return;
    setBusyId(userId);
    const { error: err } = await supabase
      .from("profiles")
      .update({ is_approved: false, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setBusyId(null);
    if (err) { alert("Revoke failed: " + err.message); return; }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_approved: false } : u)));
  }

  const pending = users.filter((u) => !u.is_approved);
  const approved = users.filter((u) => u.is_approved);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          User Approvals
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Admin panel — approve or revoke access for users who have signed up.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : (
          <>
            {/* Pending */}
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Pending ({pending.length})
              </h2>
              {pending.length === 0 ? (
                <p className="mt-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  No pending approvals.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {pending.map((u) => (
                    <UserRow key={u.id} user={u} busy={busyId === u.id} onApprove={() => approve(u.id)} />
                  ))}
                </ul>
              )}
            </section>

            {/* Approved */}
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Approved ({approved.length})
              </h2>
              <ul className="mt-3 space-y-2">
                {approved.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    busy={busyId === u.id}
                    onRevoke={u.is_admin ? undefined : () => revoke(u.id)}
                  />
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function UserRow({
  user,
  busy,
  onApprove,
  onRevoke,
}: {
  user: AdminUserRow;
  busy: boolean;
  onApprove?: () => void;
  onRevoke?: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            {user.displayname || user.email.split("@")[0]}
          </p>
          {user.is_admin && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              ADMIN
            </span>
          )}
        </div>
        <p className="truncate text-xs text-zinc-500">{user.email}</p>
        <p className="mt-0.5 text-[11px] text-zinc-400">
          Joined {new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {onApprove && (
          <button
            onClick={onApprove}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "..." : "Approve"}
          </button>
        )}
        {onRevoke && (
          <button
            onClick={onRevoke}
            disabled={busy}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {busy ? "..." : "Revoke"}
          </button>
        )}
      </div>
    </li>
  );
}
