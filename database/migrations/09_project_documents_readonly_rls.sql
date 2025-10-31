-- ========================================
-- PROJECT DOCUMENTS: READ-ONLY RLS FOR WORKERS
-- Migration: 09_project_documents_readonly_rls.sql
-- Date: 2025-10-30
-- Description: Add read-only RLS policies for workers to access project documents
-- ========================================

-- ========================================
-- 1. DROP EXISTING OVERLY PERMISSIVE POLICIES
-- ========================================

-- Drop the existing "allow all" policies that are too permissive
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.project_documents;

-- ========================================
-- 2. DOCUMENTS TABLE: READ-ONLY FOR WORKERS
-- ========================================

-- Workers can SELECT active documents from their assigned projects
CREATE POLICY "documents_read_for_project_workers"
ON public.documents
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    -- Verify worker is assigned to the project via crew membership
    SELECT 1
    FROM project_documents pd
    INNER JOIN crews c ON c.project_id = pd.project_id
    INNER JOIN crew_members cm ON cm.crew_id = c.id
    WHERE pd.document_id = documents.id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true  -- Active crew member only
  )
);

-- Admins can do everything with documents
CREATE POLICY "documents_admin_all"
ON public.documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

-- ========================================
-- 3. PROJECT_DOCUMENTS TABLE: READ-ONLY FOR WORKERS
-- ========================================

-- Workers can SELECT project_documents for their assigned projects
CREATE POLICY "project_documents_read_for_workers"
ON public.project_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    -- Verify worker is assigned to the project
    SELECT 1
    FROM crews c
    INNER JOIN crew_members cm ON cm.crew_id = c.id
    WHERE c.project_id = project_documents.project_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true  -- Active crew member only
  )
);

-- Admins can do everything with project_documents
CREATE POLICY "project_documents_admin_all"
ON public.project_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

-- ========================================
-- 4. DOCUMENT_CATEGORIES TABLE: READ FOR ALL
-- ========================================

-- Enable RLS on document_categories if not already enabled
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read document categories (reference data)
DROP POLICY IF EXISTS "document_categories_read_all" ON public.document_categories;

CREATE POLICY "document_categories_read_all"
ON public.document_categories
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify categories
CREATE POLICY "document_categories_admin_modify"
ON public.document_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

-- ========================================
-- 5. INDEXES FOR PERFORMANCE
-- ========================================

-- Index on documents.project_id for faster joins
CREATE INDEX IF NOT EXISTS idx_documents_project_id
ON documents(project_id)
WHERE is_active = true;

-- Index on documents.category_id for filtering
CREATE INDEX IF NOT EXISTS idx_documents_category_id
ON documents(category_id)
WHERE is_active = true;

-- Index on project_documents for crew membership checks
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id
ON project_documents(project_id);

CREATE INDEX IF NOT EXISTS idx_project_documents_document_id
ON project_documents(document_id);

-- ========================================
-- 6. COMMENTS
-- ========================================

COMMENT ON POLICY "documents_read_for_project_workers" ON public.documents IS
'Workers can read active documents from projects they are assigned to via crew membership';

COMMENT ON POLICY "documents_admin_all" ON public.documents IS
'Admins have full access to all documents';

COMMENT ON POLICY "project_documents_read_for_workers" ON public.project_documents IS
'Workers can read project document associations for their assigned projects';

COMMENT ON POLICY "project_documents_admin_all" ON public.project_documents IS
'Admins have full access to project document associations';

COMMENT ON POLICY "document_categories_read_all" ON public.document_categories IS
'All authenticated users can read document categories (reference data)';

COMMENT ON POLICY "document_categories_admin_modify" ON public.document_categories IS
'Only admins can create, update, or delete document categories';
