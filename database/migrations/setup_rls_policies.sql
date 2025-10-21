-- ========================================
-- COMPREHENSIVE RLS POLICIES FOR WORKER PWA
-- ========================================
-- This script sets up Row Level Security policies for all tables
-- to allow workers access to project data through the Worker PWA
--
-- Strategy: Workers can access data for projects they are assigned to via crew membership
-- For development/testing: Can use simplified policies with anon access

-- ========================================
-- 1. ENABLE RLS ON ALL TABLES
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_defs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. DROP EXISTING POLICIES (IF ANY)
-- ========================================

-- Drop test policies
DROP POLICY IF EXISTS "cabinets_read_all_test" ON public.cabinets;
DROP POLICY IF EXISTS "cabinets_read_for_assigned_workers" ON public.cabinets;
DROP POLICY IF EXISTS "cabinets_read_for_anon_workers" ON public.cabinets;

-- ========================================
-- 3. USERS TABLE POLICIES
-- ========================================

-- Workers can read their own user data and other users in their crews
CREATE POLICY "users_read_own_and_crew"
ON public.users
FOR SELECT
USING (
  id = auth.uid()
  OR
  auth.role() = 'anon'
  OR
  EXISTS (
    SELECT 1
    FROM crew_members cm1
    INNER JOIN crew_members cm2 ON cm1.crew_id = cm2.crew_id
    WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = users.id
  )
);

-- Workers can update their own profile
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ========================================
-- 4. PROJECTS TABLE POLICIES
-- ========================================

-- Workers can read projects they are assigned to via crew membership
CREATE POLICY "projects_read_assigned"
ON public.projects
FOR SELECT
USING (
  auth.role() = 'anon'
  OR
  EXISTS (
    SELECT 1
    FROM crew_members cm
    INNER JOIN crews c ON c.id = cm.crew_id
    WHERE cm.user_id = auth.uid()
      AND c.project_id = projects.id
      AND cm.active_to IS NULL  -- Active crew member
  )
  OR
  -- PM can see their projects
  pm_user_id = auth.uid()
);

-- ========================================
-- 5. CREWS TABLE POLICIES
-- ========================================

-- Workers can read crews they belong to
CREATE POLICY "crews_read_own"
ON public.crews
FOR SELECT
USING (
  auth.role() = 'anon'
  OR
  EXISTS (
    SELECT 1
    FROM crew_members cm
    WHERE cm.crew_id = crews.id
      AND cm.user_id = auth.uid()
  )
);

-- ========================================
-- 6. CREW_MEMBERS TABLE POLICIES
-- ========================================

-- Workers can read crew membership for their crews
CREATE POLICY "crew_members_read_own_crews"
ON public.crew_members
FOR SELECT
USING (
  auth.role() = 'anon'
  OR
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM crew_members cm
    WHERE cm.crew_id = crew_members.crew_id
      AND cm.user_id = auth.uid()
  )
);

-- ========================================
-- 7. CABINETS (NVT) TABLE POLICIES
-- ========================================

-- Workers can read cabinets for projects they are assigned to
CREATE POLICY "cabinets_read_assigned_projects"
ON public.cabinets
FOR SELECT
USING (
  auth.role() = 'anon'
  OR
  EXISTS (
    SELECT 1
    FROM crew_members cm
    INNER JOIN crews c ON c.id = cm.crew_id
    WHERE cm.user_id = auth.uid()
      AND cm.active_to IS NULL
      AND c.project_id = cabinets.project_id
  )
);

-- ========================================
-- 8. SEGMENTS TABLE POLICIES
-- ========================================

-- Workers can read segments for cabinets in their assigned projects
CREATE POLICY "segments_read_assigned_projects"
ON public.segments
FOR SELECT
USING (
  auth.role() = 'anon'
  OR
  EXISTS (
    SELECT 1
    FROM cabinets cab
    INNER JOIN crews c ON c.project_id = cab.project_id
    INNER JOIN crew_members cm ON cm.crew_id = c.id
    WHERE cab.id = segments.cabinet_id
      AND cm.user_id = auth.uid()
      AND cm.active_to IS NULL
  )
);

-- ========================================
-- 9. HOUSES TABLE POLICIES
-- ========================================

-- Workers can read houses for cabinets in their assigned projects
CREATE POLICY "houses_read_assigned_projects"
ON public.houses
FOR SELECT
USING (
  auth.role() = 'anon'
  OR
  EXISTS (
    SELECT 1
    FROM cabinets cab
    INNER JOIN crews c ON c.project_id = cab.project_id
    INNER JOIN crew_members cm ON cm.crew_id = c.id
    WHERE cab.id = houses.cabinet_id
      AND cm.user_id = auth.uid()
      AND cm.active_to IS NULL
  )
);

-- ========================================
-- 10. WORK_ENTRIES TABLE POLICIES
-- ========================================

-- Workers can read their own work entries and entries from their crew
CREATE POLICY "work_entries_read_own_and_crew"
ON public.work_entries
FOR SELECT
USING (
  auth.role() = 'anon'
  OR
  user_id = auth.uid()
  OR
  crew_id IN (
    SELECT crew_id
    FROM crew_members
    WHERE user_id = auth.uid()
  )
);

-- Workers can create work entries for their assigned projects
CREATE POLICY "work_entries_insert_own"
ON public.work_entries
FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR
  (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1
      FROM crew_members cm
      INNER JOIN crews c ON c.id = cm.crew_id
      WHERE cm.user_id = auth.uid()
        AND c.project_id = work_entries.project_id
        AND cm.active_to IS NULL
    )
  )
);

-- Workers can update their own work entries (if not approved)
CREATE POLICY "work_entries_update_own"
ON public.work_entries
FOR UPDATE
USING (
  auth.role() = 'anon'
  OR
  (
    user_id = auth.uid()
    AND approved = false
  )
)
WITH CHECK (
  auth.role() = 'anon'
  OR
  (
    user_id = auth.uid()
    AND approved = false
  )
);

-- Workers can delete their own work entries (if not approved)
CREATE POLICY "work_entries_delete_own"
ON public.work_entries
FOR DELETE
USING (
  auth.role() = 'anon'
  OR
  (
    user_id = auth.uid()
    AND approved = false
  )
);

-- ========================================
-- 11. PHOTOS TABLE POLICIES
-- ========================================

-- Workers can read photos for work entries they can access
CREATE POLICY "photos_read_accessible"
ON public.photos
FOR SELECT
USING (
  auth.role() = 'anon'
  OR
  author_user_id = auth.uid()
  OR
  work_entry_id IN (
    SELECT id
    FROM work_entries
    WHERE user_id = auth.uid()
      OR crew_id IN (
        SELECT crew_id
        FROM crew_members
        WHERE user_id = auth.uid()
      )
  )
);

-- Workers can insert photos for their own work entries
CREATE POLICY "photos_insert_own"
ON public.photos
FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR
  (
    author_user_id = auth.uid()
    AND
    work_entry_id IN (
      SELECT id
      FROM work_entries
      WHERE user_id = auth.uid()
    )
  )
);

-- Workers can delete their own photos
CREATE POLICY "photos_delete_own"
ON public.photos
FOR DELETE
USING (
  auth.role() = 'anon'
  OR
  author_user_id = auth.uid()
);

-- ========================================
-- 12. STAGE_DEFS TABLE POLICIES
-- ========================================

-- Everyone can read stage definitions (they are configuration data)
CREATE POLICY "stage_defs_read_all"
ON public.stage_defs
FOR SELECT
USING (true);

-- ========================================
-- 13. VERIFICATION QUERIES
-- ========================================

-- Check RLS status on all tables
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'users', 'projects', 'cabinets', 'segments', 'houses',
--     'work_entries', 'photos', 'crews', 'crew_members', 'stage_defs'
--   )
-- ORDER BY tablename;

-- List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ========================================
-- NOTES FOR PRODUCTION
-- ========================================

-- 1. The policies above allow 'anon' role access for development/testing
-- 2. For production, remove the "auth.role() = 'anon'" conditions
-- 3. Implement proper authentication with JWT tokens
-- 4. Consider adding more granular permissions based on user roles
-- 5. Add policies for admin users to manage all data
-- 6. Consider adding audit logging for sensitive operations

-- ========================================
-- ALTERNATIVE: SIMPLE POLICIES FOR TESTING
-- ========================================

-- If you need to quickly test without authentication, uncomment below:
-- This will allow ALL access (anon and authenticated) to ALL tables

/*
DROP POLICY IF EXISTS "users_read_own_and_crew" ON public.users;
DROP POLICY IF EXISTS "projects_read_assigned" ON public.projects;
DROP POLICY IF EXISTS "cabinets_read_assigned_projects" ON public.cabinets;
DROP POLICY IF EXISTS "segments_read_assigned_projects" ON public.segments;
DROP POLICY IF EXISTS "houses_read_assigned_projects" ON public.houses;

CREATE POLICY "users_allow_all" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "projects_allow_all" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cabinets_allow_all" ON public.cabinets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "segments_allow_all" ON public.segments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "houses_allow_all" ON public.houses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "work_entries_allow_all" ON public.work_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "photos_allow_all" ON public.photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crews_allow_all" ON public.crews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crew_members_allow_all" ON public.crew_members FOR ALL USING (true) WITH CHECK (true);
*/
