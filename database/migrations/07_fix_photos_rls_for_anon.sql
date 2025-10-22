-- Migration: Fix RLS policies for photos to allow anon users
-- Date: 2025-10-21
-- Description: Updates RLS policy to allow anon/authenticated roles to access photos

-- Drop existing policy and create new one for anon/authenticated roles
DROP POLICY IF EXISTS "photos_allow_all_temp" ON photos;

-- Allow anon and authenticated users to SELECT, INSERT, UPDATE, DELETE photos
-- This is for development - in production, restrict to user's own photos
CREATE POLICY "Allow anon users to manage photos"
ON photos
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Add comment explaining this is temporary
COMMENT ON POLICY "Allow anon users to manage photos" ON photos IS
'TEMPORARY: Development policy allowing all access. In production, restrict based on work_entry ownership';
