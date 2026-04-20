-- Migration 017: Add meal_remarks JSONB to meal_plans + fix approver FK
-- meal_remarks stores per-cell remarks as { "2026-04-20_breakfast": "remark text", ... }

-- 1. Add meal_remarks JSONB column
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS meal_remarks jsonb DEFAULT '{}'::jsonb;

-- 2. Fix approver_id foreign key: drop the auth.users FK and re-add referencing profiles
-- The profiles table uses the same UUID as auth.users, but the FK must point to profiles
-- so that RLS and lookups work correctly.
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_approver_id_fkey;
ALTER TABLE public.meal_plans
  ADD CONSTRAINT meal_plans_approver_id_fkey
  FOREIGN KEY (approver_id) REFERENCES public.profiles(id);
