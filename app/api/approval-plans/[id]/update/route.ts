import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// PATCH /api/approval-plans/[id]/update
// Allows approver to update specific fields on the meal plan (meal_remarks, notes, approval_status).
// Uses service role key to bypass RLS.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "Service key not configured" }, { status: 500 });
  }

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify user is approver for this plan
  const { data: plan } = await admin
    .from("meal_plans").select("id, approver_id").eq("id", planId).single();
  if (!plan || plan.approver_id !== user.id) {
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
    .from("meal_plans")
    .update(updateData)
    .eq("id", planId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ plan: data });
}
