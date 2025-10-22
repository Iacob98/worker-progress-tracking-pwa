-- ========================================
-- QUICK FIX: RLS POLICIES FOR EXISTING TABLES
-- ========================================
-- This script adds temporary policies for testing
-- Apply only to tables that exist in your database

-- ========================================
-- HOUSES TABLE
-- ========================================

-- Enable RLS if not already enabled
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS "houses_allow_all_temp" ON public.houses;

-- Create temporary policy (allows all access for testing)
CREATE POLICY "houses_allow_all_temp"
ON public.houses
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- SEGMENTS TABLE
-- ========================================

ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "segments_allow_all_temp" ON public.segments;

CREATE POLICY "segments_allow_all_temp"
ON public.segments
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- WORK_ENTRIES TABLE
-- ========================================

ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_entries_allow_all_temp" ON public.work_entries;

CREATE POLICY "work_entries_allow_all_temp"
ON public.work_entries
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- PHOTOS TABLE
-- ========================================

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_allow_all_temp" ON public.photos;

CREATE POLICY "photos_allow_all_temp"
ON public.photos
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- USERS TABLE
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_allow_all_temp" ON public.users;

CREATE POLICY "users_allow_all_temp"
ON public.users
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- PROJECTS TABLE
-- ========================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_allow_all_temp" ON public.projects;

CREATE POLICY "projects_allow_all_temp"
ON public.projects
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- CREWS TABLE
-- ========================================

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crews_allow_all_temp" ON public.crews;

CREATE POLICY "crews_allow_all_temp"
ON public.crews
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- CREW_MEMBERS TABLE
-- ========================================

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crew_members_allow_all_temp" ON public.crew_members;

CREATE POLICY "crew_members_allow_all_temp"
ON public.crew_members
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- VERIFICATION
-- ========================================

-- Check which tables have RLS enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'projects', 'cabinets', 'segments', 'houses',
    'work_entries', 'photos', 'crews', 'crew_members'
  )
ORDER BY tablename;

-- List all policies on these tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
