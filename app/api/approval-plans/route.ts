import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// GET /api/approval-plans
// Returns meal plans where the current user is the assigned approver.
// Uses the service role key to bypass RLS entirely.

export async function GET(_request: NextRequest) {
  // 1. Authenticate via session cookie
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const errors: string[] = [];

  // 2. Build a service-role client inline (bypasses all RLS)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    errors.push(
      "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local. " +
      "Get it from: Supabase Dashboard → Settings → API → service_role (the secret key, NOT the anon key)."
    );
    // Fall back to regular client (will be subject to RLS)
  }

  const queryClient = (url && serviceKey)
    ? createSupabaseClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : supabase;  // fallback to cookie-auth client

  const method = (url && serviceKey) ? "service_role" : "anon_key_fallback";

  // 3. Query meal plans where this user is the approver
  const { data: plans, error: queryError } = await queryClient
    .from("meal_plans")
    .select("*")
    .eq("approver_id", userId)
    .order("created_at", { ascending: false });

  if (queryError) {
    errors.push(`Query error: ${queryError.message}`);
  }

  // 4. Fetch owner display names
  let plansWithNames = plans ?? [];
  if (plansWithNames.length > 0) {
    const ownerIds = [...new Set(plansWithNames.map((p: any) => p.user_id))];
    const { data: profiles } = await queryClient
      .from("profiles")
      .select("id, displayname")
      .in("id", ownerIds);

    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => {
      nameMap[p.id] = p.displayname ?? "Unknown";
    });

    plansWithNames = plansWithNames.map((p: any) => ({
      ...p,
      owner_name: nameMap[p.user_id] ?? "Unknown",
    }));
  }

  // 5. Debug: check ALL plans that have any approver_id set
  let debugApproverData: any[] = [];
  let debugYourProfile: any = null;
  let debugApproverProfile: any = null;
  if (plansWithNames.length === 0 && queryClient) {
    // Get your profile name
    const { data: yourProfile } = await queryClient
      .from("profiles")
      .select("id, displayname")
      .eq("id", userId)
      .single();
    debugYourProfile = yourProfile;

    const { data: allWithApprover } = await queryClient
      .from("meal_plans")
      .select("id, title, user_id, approver_id, approval_status")
      .not("approver_id", "is", null);

    // Get the approver profile names for all plans
    const approverIds = [...new Set((allWithApprover ?? []).map((p: any) => p.approver_id))];
    let approverNames: Record<string, string> = {};
    if (approverIds.length > 0) {
      const { data: approverProfiles } = await queryClient
        .from("profiles")
        .select("id, displayname")
        .in("id", approverIds);
      (approverProfiles ?? []).forEach((p: any) => {
        approverNames[p.id] = p.displayname ?? "Unknown";
      });
    }

    debugApproverData = (allWithApprover ?? []).map((p: any) => ({
      plan_title: p.title,
      approver_id_in_db: p.approver_id,
      approver_name_in_db: approverNames[p.approver_id] ?? "Unknown",
      approval_status: p.approval_status,
      matches_you: p.approver_id === userId,
    }));
  }

  return Response.json({
    plans: plansWithNames,
    _debug: {
      you: debugYourProfile
        ? `${debugYourProfile.displayname} (${userId})`
        : userId,
      method,
      planCount: plansWithNames.length,
      hasServiceKey: !!serviceKey,
      errors: errors.length > 0 ? errors : undefined,
      all_plans_with_approver: debugApproverData.length > 0 ? debugApproverData : undefined,
    },
  });
}
