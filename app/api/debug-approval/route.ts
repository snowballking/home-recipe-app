import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/debug-approval
// Diagnostic endpoint to identify why approval plans aren't showing.
// Returns detailed info about auth state, RPC availability, and query results.

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const results: Record<string, any> = {};

  // 1. Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  results.auth = {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    error: authError?.message ?? null,
  };

  if (!user) {
    return Response.json({ ...results, conclusion: "NOT AUTHENTICATED" });
  }

  // 2. Check profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, displayname, is_admin, is_approved")
    .eq("id", user.id)
    .single();
  results.profile = {
    data: profile,
    error: profileError?.message ?? null,
  };

  // 3. Check if any meal_plans have this user as approver (direct query)
  const { data: directPlans, error: directError } = await supabase
    .from("meal_plans")
    .select("id, title, user_id, approver_id, approval_status, status")
    .eq("approver_id", user.id);
  results.directQuery = {
    count: directPlans?.length ?? 0,
    data: directPlans,
    error: directError?.message ?? null,
  };

  // 4. Try RPC function
  const { data: rpcPlans, error: rpcError } = await supabase.rpc("get_approval_plans");
  results.rpcQuery = {
    count: rpcPlans?.length ?? 0,
    data: rpcPlans?.map((p: any) => ({
      id: p.id, title: p.title, user_id: p.user_id,
      approver_id: p.approver_id, approval_status: p.approval_status,
    })),
    error: rpcError?.message ?? null,
  };

  // 5. Check all meal_plans that have any approver_id set (to verify data exists)
  // This will only return plans visible to the current user via RLS
  const { data: allWithApprover, error: allError } = await supabase
    .from("meal_plans")
    .select("id, title, user_id, approver_id, approval_status")
    .not("approver_id", "is", null);
  results.allPlansWithApprover = {
    count: allWithApprover?.length ?? 0,
    data: allWithApprover,
    error: allError?.message ?? null,
  };

  // 6. Check parameterized RPC function
  const { data: paramRpcData, error: paramRpcError } = await supabase.rpc("get_plans_for_approver", {
    p_user_id: user.id,
  });
  results.parameterizedRpc = {
    count: paramRpcData?.length ?? 0,
    data: paramRpcData?.map((p: any) => ({
      id: p.id, title: p.title, user_id: p.user_id,
      approver_id: p.approver_id, approval_status: p.approval_status,
    })),
    error: paramRpcError?.message ?? null,
  };

  // 7. Conclusion
  let conclusion = "UNKNOWN";
  if (directPlans && directPlans.length > 0) {
    conclusion = "WORKING - Direct query returns plans. The issue might be in the frontend.";
  } else if (rpcPlans && rpcPlans.length > 0) {
    conclusion = "RPC_WORKS_BUT_DIRECT_FAILS - RLS policy may be missing. The RPC fallback should work.";
  } else if (directError || rpcError) {
    conclusion = `QUERY_ERRORS - Direct: ${directError?.message ?? "OK"}, RPC: ${rpcError?.message ?? "OK"}`;
  } else {
    conclusion = "NO_DATA - No meal plans have this user as approver_id. Check that the plan creator actually set this user as approver.";
  }

  results.conclusion = conclusion;

  return Response.json(results, {
    headers: { "Content-Type": "application/json" },
  });
}
