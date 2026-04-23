import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Helper: authenticate + build service-role client
async function getAuthAndClient() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, admin: null, supabase };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = (url && serviceKey)
    ? createSupabaseClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : supabase; // fallback

  return { user, admin, supabase };
}

// Helper: verify user is approver for a plan
async function verifyApprover(admin: any, planId: string, userId: string) {
  const { data: plan } = await admin
    .from("meal_plans").select("id, approver_id").eq("id", planId).single();
  return plan && plan.approver_id === userId;
}

// ─────────────────────────────────────────────────────────────
// GET /api/approval-plans/[id]
// Returns a single meal plan + its slots if the current user is the approver.
// ─────────────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const { user, admin } = await getAuthAndClient();
  if (!user || !admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch the plan (only if this user is the approver)
  const { data: plan, error: planError } = await admin
    .from("meal_plans").select("*").eq("id", planId).eq("approver_id", user.id).single();

  if (planError || !plan) {
    return Response.json({ error: "Plan not found or not assigned to you" }, { status: 404 });
  }

  // Fetch slots with recipe data
  const { data: slots } = await admin
    .from("meal_plan_slots")
    .select(`*, recipes:recipe_id (id, user_id, title, title_zh, hero_image_url, calories_per_serving, protein_grams, carbs_grams, fat_grams, category)`)
    .eq("meal_plan_id", planId)
    .order("plan_date", { ascending: true })
    .order("meal_type", { ascending: true });

  return Response.json({ plan, slots: slots ?? [] });
}

// ─────────────────────────────────────────────────────────────
// POST /api/approval-plans/[id]
// Add a recipe slot to the meal plan (approver only)
// Body: { recipe_id, plan_date, meal_type, servings?, sort_order? }
// ─────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const { user, admin } = await getAuthAndClient();
  if (!user || !admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await verifyApprover(admin, planId, user.id))) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { recipe_id, plan_date, meal_type, servings = 1, sort_order = 0 } = body;

  const { data, error } = await admin.from("meal_plan_slots").insert({
    meal_plan_id: planId,
    recipe_id,
    plan_date,
    meal_type,
    servings,
    sort_order,
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ slot: data });
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/approval-plans/[id]
// Remove a slot from the meal plan (approver only)
// Body: { slot_id }
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const { user, admin } = await getAuthAndClient();
  if (!user || !admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await verifyApprover(admin, planId, user.id))) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { slot_id } = body;

  const { error } = await admin
    .from("meal_plan_slots").delete().eq("id", slot_id).eq("meal_plan_id", planId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/approval-plans/[id]
// Update plan fields: meal_remarks, notes, approval_status (approver only)
// Body: { meal_remarks?, notes?, approval_status? }
// ─────────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const { user, admin } = await getAuthAndClient();
  if (!user || !admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await verifyApprover(admin, planId, user.id))) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();

  // Only allow updating specific fields
  const allowedFields = ["meal_remarks", "notes", "approval_status"];
  const updateData: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updateData[key] = body[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("meal_plans").update(updateData).eq("id", planId).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ plan: data });
}
