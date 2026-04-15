-- ============================================================
-- FIX: Add missing columns to existing profiles table
-- ============================================================
-- Run this in Supabase SQL Editor if you get:
--   "column X of relation profiles does not exist"
-- ============================================================

-- Add columns only if they don't already exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS follower_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recipe_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
