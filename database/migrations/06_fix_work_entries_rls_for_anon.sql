-- Migration: Fix RLS policies for work_entries to allow anon users
-- Date: 2025-10-21
-- Description: Updates RLS policy to allow anon/authenticated roles to access work_entries

-- Drop existing policy and create new one for anon/authenticated roles
DROP POLICY IF EXISTS "work_entries_allow_all_temp" ON work_entries;

-- Allow anon and authenticated users to SELECT, INSERT, UPDATE work entries
-- This is for development - in production, restrict to user's own entries
CREATE POLICY "Allow anon users to manage work entries"
ON work_entries
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Add comment explaining this is temporary
COMMENT ON POLICY "Allow anon users to manage work entries" ON work_entries IS
'TEMPORARY: Development policy allowing all access. In production, restrict to user_id = auth.uid()';
