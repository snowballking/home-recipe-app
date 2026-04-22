import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// GET /api/approval-plans/[id]
// Returns a single meal plan + its slots if the current user is the approver.
// Uses service role key to bypass RLS.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build query client (service role if available, else cookie-auth)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const queryClient = (url && serviceKey)
    ? createSupabaseClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : supabase;

  // Fetch the plan (only if this user is the approver)
  const { data: plan, error: planError } = await queryClient
    .from("meal_plans")
    .select("*")
    .eq("id", planId)
    .eq("approver_id", user.id)
    .single();

  if (planError || !plan) {
    return Response.json(
      { error: "Plan not found or not assigned to you" },
      { status: 404 }
    );
  }

  // Fetch slots with recipe data
  const { data: slots } = await queryClient
    .from("meal_plan_slots")
    .select(`*, recipes:recipe_id (id, user_id, title, title_zh, hero_image_url, calories_per_serving, protein_grams, carbs_grams, fat_grams, category)`)
    .eq("meal_plan_id", planId)
    .order("plan_date", { ascending: true })
    .order("meal_type", { ascending: true });

  return Response.json({ plan, slots: slots ?? [] });
}
