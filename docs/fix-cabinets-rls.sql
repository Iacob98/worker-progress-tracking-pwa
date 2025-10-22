-- Fix RLS policies for cabinets table
--
-- Problem: Worker PWA cannot access cabinets table due to missing RLS policies
-- This script adds the necessary policies to allow workers to read cabinet data
-- for projects they are assigned to via their crew memberships.

-- ========================================
-- OPTION 1: Simple policy (for testing)
-- ========================================
-- This allows ALL users (including anon) to read ALL cabinets
-- Use this ONLY for testing to verify the RLS issue is fixed

-- Enable RLS on cabinets table (if not already enabled)
ALTER TABLE public.cabinets ENABLE ROW LEVEL SECURITY;

-- Simple read policy for testing
CREATE POLICY "cabinets_read_all_test"
ON public.cabinets
FOR SELECT
USING (true);


-- ========================================
-- OPTION 2: Secure policy (recommended for production)
-- ========================================
-- This allows users to read cabinets only for projects they are assigned to
-- via their crew memberships

-- First, drop the test policy if it exists
-- DROP POLICY IF EXISTS "cabinets_read_all_test" ON public.cabinets;

-- Secure read policy based on crew membership
CREATE POLICY "cabinets_read_for_assigned_workers"
ON public.cabinets
FOR SELECT
USING (
  -- Allow if user is a member of a crew assigned to this project
  EXISTS (
    SELECT 1
    FROM crew_members cm
    INNER JOIN crews c ON c.id = cm.crew_id
    WHERE cm.user_id = auth.uid()
      AND cm.is_active = true
      AND c.project_id = cabinets.project_id
  )
);


-- ========================================
-- OPTION 3: Anon access policy (for Worker PWA)
-- ========================================
-- If Worker PWA uses anon key and stores worker_id in JWT claims
-- or uses a custom authentication method

-- This policy allows anon users if they have a valid worker_id in their JWT
CREATE POLICY "cabinets_read_for_anon_workers"
ON public.cabinets
FOR SELECT
USING (
  -- For authenticated users: check crew membership
  (auth.role() = 'authenticated' AND
   EXISTS (
     SELECT 1
     FROM crew_members cm
     INNER JOIN crews c ON c.id = cm.crew_id
     WHERE cm.user_id = auth.uid()
       AND cm.is_active = true
       AND c.project_id = cabinets.project_id
   )
  )
  OR
  -- For anon users: allow read (Worker PWA might use anon key)
  (auth.role() = 'anon')
);


-- ========================================
-- RECOMMENDED APPROACH FOR IMMEDIATE FIX
-- ========================================

-- Step 1: First use the simple test policy to verify RLS was the issue
-- Step 2: Then replace with the anon policy to allow Worker PWA access
-- Step 3: Later, implement proper authentication and use the secure policy

-- To apply:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Run the test policy (OPTION 1) first
-- 3. Test that cabinets are now visible in Worker PWA
-- 4. Once confirmed, replace with OPTION 3 for production use


-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check if RLS is enabled on cabinets
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'cabinets';

-- List all policies on cabinets table
SELECT *
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'cabinets';

-- Test query to verify access (run as anon user)
SELECT id, code, name, project_id
FROM cabinets
WHERE project_id = '8cd3a97f-e911-42c3-b145-f9f5c1c6340a'
LIMIT 10;
