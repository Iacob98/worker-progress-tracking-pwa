'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/offline/db'
import { useAuth } from '@/lib/hooks/use-auth'
import { useOffline } from '@/lib/hooks/use-offline'
import type { ProjectDocument, DocumentCategory } from '@/types/models'
import { PROJECT_DOCUMENTS_BUCKET } from '@/lib/constants/project-document-types'

/**
 * Hook to fetch project documents for a specific project
 * Returns documents from documents + project_documents + document_categories tables
 * Supports offline mode with IndexedDB caching
 * Workers can only see documents from their assigned projects (RLS enforced)
 */
export function useProjectDocuments(
  projectId: string | undefined,
  filters?: {
    categoryCode?: string
    search?: string
    isRequired?: boolean
  }
): UseQueryResult<ProjectDocument[], Error> {
  const { worker } = useAuth()
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['project_documents', projectId, filters],
    queryFn: async (): Promise<ProjectDocument[]> => {
      if (!projectId || !worker) return []

      // Offline mode: read from IndexedDB
      if (isOffline) {
        let documents = await db.project_documents
          ?.where('projectId')
          .equals(projectId)
          .toArray() || []

        // Apply filters
        if (filters?.categoryCode) {
          documents = documents.filter(doc => doc.categoryCode === filters.categoryCode)
        }

        if (filters?.search) {
          const searchLower = filters.search.toLowerCase()
          documents = documents.filter(doc =>
            doc.originalFilename?.toLowerCase().includes(searchLower) ||
            doc.description?.toLowerCase().includes(searchLower) ||
            doc.categoryName?.toLowerCase().includes(searchLower)
          )
        }

        if (filters?.isRequired !== undefined) {
          documents = documents.filter(doc => doc.isRequired === filters.isRequired)
        }

        return documents as ProjectDocument[]
      }

      // Online mode: fetch from Admin API via local proxy (to avoid CORS)
      console.log('📄 Fetching documents for projectId:', projectId)
      console.log('📄 Worker:', worker?.id, worker?.email)

      // Use local API route as proxy to avoid CORS issues
      const apiUrl = `/api/admin-proxy/projects/${projectId}/documents`

      console.log('📄 Fetching from proxy API:', apiUrl)

      const response = await fetch(apiUrl)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error fetching from Admin API:', response.status, errorText)
        throw new Error(`Failed to fetch project documents: ${response.status} ${response.statusText}`)
      }

      const apiData = await response.json()
      const allData = apiData.documents || []

      console.log('📄 Fetched documents from Admin API:', allData.length, 'documents')
      console.log('📄 Raw data:', JSON.stringify(allData?.slice(0, 2), null, 2)) // Log first 2 only

      // Transform Admin API data to ProjectDocument format
      let documents: ProjectDocument[] = (allData || []).map((doc: any) => ({
        id: doc.id,
        projectId: doc.project_id,
        filename: doc.file_name, // Admin API uses file_name
        originalFilename: doc.file_name, // Admin API doesn't have original_filename
        filePath: doc.file_path, // ✅ Save file_path for download
        fileType: doc.mime_type || null, // Admin API might not have this
        fileSize: doc.file_size,
        documentType: doc.document_type,
        categoryId: null, // Admin API doesn't have category_id
        categoryCode: null, // Admin API doesn't have this
        categoryName: doc.document_type, // Use document_type as category name
        categoryType: null,
        description: doc.notes || null, // Admin API uses notes
        uploadDate: doc.uploaded_at,
        uploadedBy: doc.uploaded_by,
        isActive: doc.status === 'active',
        documentRole: null, // Admin API doesn't have this
        isRequired: false, // Default to false, Admin API doesn't have this
        dueDate: null, // Admin API doesn't have this
        createdAt: doc.uploaded_at,
        updatedAt: doc.uploaded_at,
      }))

      // Apply filters
      if (filters?.categoryCode) {
        documents = documents.filter(doc => doc.categoryCode === filters.categoryCode)
      }

      if (filters?.isRequired !== undefined) {
        documents = documents.filter(doc => doc.isRequired === filters.isRequired)
      }

      // Apply client-side search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        documents = documents.filter(doc =>
          doc.originalFilename?.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.categoryName?.toLowerCase().includes(searchLower)
        )
      }

      // Cache in IndexedDB for offline access
      if (db.project_documents) {
        await db.project_documents.bulkPut(documents as any[])
      }

      return documents
    },
    enabled: !!projectId && !!worker,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  })
}

/**
 * Hook to fetch all document categories from the database
 * Categories are reference data, so they can be cached longer
 */
export function useDocumentCategories(): UseQueryResult<DocumentCategory[], Error> {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['document_categories'],
    queryFn: async (): Promise<DocumentCategory[]> => {
      // Offline mode: read from IndexedDB
      if (isOffline) {
        const categories = await db.document_categories?.toArray() || []
        return categories as DocumentCategory[]
      }

      // Online mode: fetch from Supabase
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('category_type')
        .order('code')

      if (error) {
        console.error('Error fetching document categories:', error)
        throw new Error(`Failed to fetch document categories: ${error.message}`)
      }

      // Transform to DocumentCategory interface
      const categories: DocumentCategory[] = (data || []).map((cat: any) => ({
        id: cat.id,
        code: cat.code,
        nameRu: cat.name_ru,
        nameEn: cat.name_en,
        nameDe: cat.name_de,
        categoryType: cat.category_type,
        createdAt: cat.created_at,
      }))

      // Cache in IndexedDB
      if (db.document_categories) {
        await db.document_categories.bulkPut(categories as any[])
      }

      return categories
    },
    staleTime: 60 * 60 * 1000, // 1 hour (categories change rarely)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  })
}

/**
 * Hook to download a project document
 * Returns a function that fetches from Admin API or public storage
 */
export function useDownloadProjectDocument() {
  return async (doc: ProjectDocument, filePath?: string): Promise<void> => {
    try {
      const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3000'

      // Check if filePath starts with /api/ (Admin API endpoint)
      let downloadUrl: string
      if (filePath && filePath.startsWith('/api/')) {
        // Use Admin API endpoint
        downloadUrl = `${adminApiUrl}${filePath}`
      } else if (filePath && filePath.startsWith('/documents/')) {
        // Direct Storage path from Admin
        downloadUrl = `${adminApiUrl}${filePath}`
      } else {
        // Fallback to Supabase Storage
        downloadUrl = `https://oijmohlhdxoawzvctnxx.supabase.co/storage/v1/object/public/project-documents/${doc.filename}`
      }

      console.log('📥 Downloading from:', downloadUrl)

      // Fetch the file
      const response = await fetch(downloadUrl)

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()

      // Create blob URL and trigger download
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = doc.originalFilename || doc.filename
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      throw error
    }
  }
}
