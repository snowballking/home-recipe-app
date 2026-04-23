import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Helper: build service-role client
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// POST /api/approval-plans/[id]/slots — Add a recipe slot (approver only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getServiceClient();
  if (!admin) return Response.json({ error: "Service key not configured" }, { status: 500 });

  // Verify user is approver for this plan
  const { data: plan } = await admin
    .from("meal_plans").select("id, approver_id").eq("id", planId).single();
  if (!plan || plan.approver_id !== user.id) {
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

// DELETE /api/approval-plans/[id]/slots — Remove a slot (approver only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getServiceClient();
  if (!admin) return Response.json({ error: "Service key not configured" }, { status: 500 });

  // Verify user is approver
  const { data: plan } = await admin
    .from("meal_plans").select("id, approver_id").eq("id", planId).single();
  if (!plan || plan.approver_id !== user.id) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { slot_id } = await request.json();
  const { error } = await admin
    .from("meal_plan_slots").delete().eq("id", slot_id).eq("meal_plan_id", planId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
