import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

// GET /api/approval-plans
// Returns meal plans where the current user is the assigned approver.
// Uses the service-role client to bypass RLS so non-admin approvers
// can see plans assigned to them.

export async function GET(_request: NextRequest) {
  // 1. Authenticate the caller via their session cookie
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();

    // 2. Fetch plans assigned to this user as approver (bypasses RLS)
    const { data: plans, error: plansError } = await admin
      .from("meal_plans")
      .select("*")
      .eq("approver_id", user.id)
      .order("created_at", { ascending: false });

    if (plansError) {
      console.error("[approval-plans] Query error:", plansError);
      return Response.json(
        { error: "Failed to fetch approval plans: " + plansError.message },
        { status: 500 }
      );
    }

    if (!plans || plans.length === 0) {
      return Response.json({ plans: [] });
    }

    // 3. Batch-fetch owner display names
    const ownerIds = [...new Set(plans.map((p: any) => p.user_id))];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, displayname")
      .in("id", ownerIds);

    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => {
      nameMap[p.id] = p.displayname ?? "Unknown";
    });

    const plansWithNames = plans.map((p: any) => ({
      ...p,
      owner_name: nameMap[p.user_id] ?? "Unknown",
    }));

    return Response.json({ plans: plansWithNames });
  } catch (err: any) {
    console.error("[approval-plans] Error:", err.message);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
