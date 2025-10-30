-- ========================================
-- WORKER DOCUMENTS - RLS POLICIES AND INDEXES
-- ========================================
-- Migration: 08_worker_documents_rls
-- Date: 2025-10-30
-- Description: Настройка RLS политик и индексов для личных документов работников
--
-- Tables affected:
--   - files (existing table)
--   - storage.objects
--
-- Storage bucket: worker-documents (private)

-- ========================================
-- 1. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Индекс для быстрого поиска документов по user_id
CREATE INDEX IF NOT EXISTS idx_files_user_id
ON files(user_id)
WHERE user_id IS NOT NULL;

-- Индекс для фильтрации по категории и пользователю
CREATE INDEX IF NOT EXISTS idx_files_user_category
ON files(user_id, category)
WHERE user_id IS NOT NULL;

-- Индекс для поиска по bucket_name
CREATE INDEX IF NOT EXISTS idx_files_bucket_name
ON files(bucket_name);

-- ========================================
-- 2. RLS POLICIES FOR FILES TABLE
-- ========================================

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "files_read_own_documents" ON public.files;
DROP POLICY IF EXISTS "files_read_all_worker_documents_admin" ON public.files;
DROP POLICY IF EXISTS "files_insert_worker_documents_admin" ON public.files;
DROP POLICY IF EXISTS "files_delete_worker_documents_admin" ON public.files;
DROP POLICY IF EXISTS "files_update_worker_documents_admin" ON public.files;

-- Policy: Workers can read their own documents
CREATE POLICY "files_read_own_documents"
ON public.files
FOR SELECT
USING (
  user_id = auth.uid()
  AND bucket_name = 'worker-documents'
);

-- Policy: Admin/PM can read all worker documents
CREATE POLICY "files_read_all_worker_documents_admin"
ON public.files
FOR SELECT
USING (
  bucket_name = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'pm')
  )
);

-- Policy: Only admin can upload worker documents
CREATE POLICY "files_insert_worker_documents_admin"
ON public.files
FOR INSERT
WITH CHECK (
  bucket_name = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

-- Policy: Only admin can update worker document metadata
CREATE POLICY "files_update_worker_documents_admin"
ON public.files
FOR UPDATE
USING (
  bucket_name = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
)
WITH CHECK (
  bucket_name = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

-- Policy: Only admin can delete worker documents
CREATE POLICY "files_delete_worker_documents_admin"
ON public.files
FOR DELETE
USING (
  bucket_name = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

-- ========================================
-- 3. RLS POLICIES FOR STORAGE.OBJECTS
-- ========================================

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "worker_documents_read_own" ON storage.objects;
DROP POLICY IF EXISTS "worker_documents_read_admin" ON storage.objects;
DROP POLICY IF EXISTS "worker_documents_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "worker_documents_delete_admin" ON storage.objects;

-- Policy: Workers can read their own documents
-- Path structure: {user_id}/{category}/{filename}
CREATE POLICY "worker_documents_read_own"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'worker-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admin/PM can read all worker documents
CREATE POLICY "worker_documents_read_admin"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'pm')
  )
);

-- Policy: Only admin can upload documents
CREATE POLICY "worker_documents_insert_admin"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

-- Policy: Only admin can delete documents
CREATE POLICY "worker_documents_delete_admin"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

-- ========================================
-- 4. VERIFICATION QUERIES
-- ========================================

-- Check indexes
-- SELECT
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'files'
-- ORDER BY indexname;

-- Check RLS policies on files table
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'files'
--   AND policyname LIKE '%worker_documents%'
-- ORDER BY policyname;

-- Check Storage policies
-- SELECT
--   policyname,
--   cmd,
--   qual
-- FROM pg_policies
-- WHERE schemaname = 'storage'
--   AND tablename = 'objects'
--   AND policyname LIKE '%worker_documents%'
-- ORDER BY policyname;

-- ========================================
-- NOTES
-- ========================================

-- 1. Path structure в Storage: {user_id}/{category}/{filename}
--    Example: '550e8400-e29b-41d4-a716-446655440000/contract/employment_contract.pdf'
--
-- 2. Категории документов (в files.category):
--    - 'contract'      - Договоры
--    - 'certificate'   - Сертификаты
--    - 'instruction'   - Инструкции
--    - 'policy'        - Политики компании
--    - 'safety'        - Техника безопасности
--    - 'training'      - Обучающие материалы
--    - 'personal'      - Личные документы
--    - 'other'         - Прочее
--
-- 3. Только admin может загружать/удалять документы через Admin Panel
-- 4. Workers могут только просматривать и скачивать свои документы
-- 5. PM может просматривать документы всех работников для мониторинга

-- ========================================
-- ROLLBACK (if needed)
-- ========================================

-- DROP INDEX IF EXISTS idx_files_user_id;
-- DROP INDEX IF EXISTS idx_files_user_category;
-- DROP INDEX IF EXISTS idx_files_bucket_name;
--
-- DROP POLICY IF EXISTS "files_read_own_documents" ON public.files;
-- DROP POLICY IF EXISTS "files_read_all_worker_documents_admin" ON public.files;
-- DROP POLICY IF EXISTS "files_insert_worker_documents_admin" ON public.files;
-- DROP POLICY IF EXISTS "files_update_worker_documents_admin" ON public.files;
-- DROP POLICY IF EXISTS "files_delete_worker_documents_admin" ON public.files;
--
-- DROP POLICY IF EXISTS "worker_documents_read_own" ON storage.objects;
-- DROP POLICY IF EXISTS "worker_documents_read_admin" ON storage.objects;
-- DROP POLICY IF EXISTS "worker_documents_insert_admin" ON storage.objects;
-- DROP POLICY IF EXISTS "worker_documents_delete_admin" ON storage.objects;
