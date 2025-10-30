'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/offline/db'
import type { WorkerDocument, WorkerDocumentCategory } from '@/types/models'
import { useAuth } from './use-auth'
import { useOffline } from './use-offline'
import { WORKER_DOCUMENTS_BUCKET } from '@/lib/constants/document-categories'

/**
 * Hook для получения списка документов текущего работника
 */
export function useWorkerDocuments(filters?: {
  category?: WorkerDocumentCategory
  search?: string
}) {
  const { worker } = useAuth()
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['worker_documents', worker?.id, filters],
    queryFn: async (): Promise<WorkerDocument[]> => {
      if (!worker) return []

      // If offline, return cached data
      if (isOffline) {
        let documents = await db.worker_documents?.toArray() || []

        // Apply filters
        if (filters?.category) {
          documents = documents.filter(doc => doc.category === filters.category)
        }
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase()
          documents = documents.filter(doc =>
            doc.title.toLowerCase().includes(searchLower) ||
            doc.originalFilename.toLowerCase().includes(searchLower) ||
            doc.description?.toLowerCase().includes(searchLower)
          )
        }

        return documents as WorkerDocument[]
      }

      // Fetch from Supabase
      let query = supabase
        .from('files')
        .select('*')
        .eq('user_id', worker.id)
        .eq('bucket_name', WORKER_DOCUMENTS_BUCKET)
        .order('created_at', { ascending: false })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,original_filename.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching worker documents:', {
          error,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        })
        // Fall back to cached data
        let documents = await db.worker_documents?.toArray() || []
        if (filters?.category) {
          documents = documents.filter(doc => doc.category === filters.category)
        }
        return documents as WorkerDocument[]
      }

      // Handle null or empty data
      if (!data || data.length === 0) {
        return []
      }

      // Transform and cache data
      const documents: WorkerDocument[] = data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        filename: d.filename,
        originalFilename: d.original_filename,
        fileSize: d.file_size,
        mimeType: d.mime_type,
        bucketName: d.bucket_name,
        filePath: d.file_path,
        fileUrl: d.file_url,
        category: d.category,
        title: d.title,
        description: d.description,
        metadata: d.metadata,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }))

      // Cache documents for offline access
      if (db.worker_documents) {
        for (const doc of documents) {
          await db.worker_documents.put(doc)
        }
      }

      return documents
    },
    enabled: !!worker,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook для получения одного документа по ID
 */
export function useWorkerDocument(documentId: string | null) {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['worker_document', documentId],
    queryFn: async (): Promise<WorkerDocument | null> => {
      if (!documentId) return null

      // If offline, return cached data
      if (isOffline) {
        const cached = await db.worker_documents?.get(documentId)
        return (cached as WorkerDocument) || null
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', documentId)
        .eq('bucket_name', WORKER_DOCUMENTS_BUCKET)
        .single()

      if (error) {
        console.error('Error fetching worker document:', {
          error,
          message: error?.message,
          documentId,
        })
        const cached = await db.worker_documents?.get(documentId)
        return (cached as WorkerDocument) || null
      }

      // Transform data
      const document: WorkerDocument = {
        id: data.id,
        userId: data.user_id,
        filename: data.filename,
        originalFilename: data.original_filename,
        fileSize: data.file_size,
        mimeType: data.mime_type,
        bucketName: data.bucket_name,
        filePath: data.file_path,
        fileUrl: data.file_url,
        category: data.category,
        title: data.title,
        description: data.description,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }

      // Cache document
      if (db.worker_documents) {
        await db.worker_documents.put(document)
      }

      return document
    },
    enabled: !!documentId,
  })
}

/**
 * Hook для скачивания документа
 * Возвращает функцию для скачивания файла
 */
export function useDownloadDocument() {
  const supabase = createClient()

  return async (document: WorkerDocument): Promise<void> => {
    try {
      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from(WORKER_DOCUMENTS_BUCKET)
        .createSignedUrl(document.filePath, 60) // 60 seconds expiry

      if (error) {
        console.error('Error creating signed URL:', error)
        throw new Error('Не удалось создать ссылку для скачивания')
      }

      if (!data?.signedUrl) {
        throw new Error('Ссылка для скачивания не получена')
      }

      // Download file
      const response = await fetch(data.signedUrl)
      if (!response.ok) {
        throw new Error('Ошибка при скачивании файла')
      }

      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.originalFilename
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      console.log('Document downloaded successfully:', document.originalFilename)
    } catch (error) {
      console.error('Error downloading document:', error)
      throw error
    }
  }
}

/**
 * Hook для получения signed URL для просмотра документа
 */
export function useGetDocumentUrl() {
  const supabase = createClient()

  return async (document: WorkerDocument): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from(WORKER_DOCUMENTS_BUCKET)
        .createSignedUrl(document.filePath, 3600) // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error)
        throw new Error('Не удалось создать ссылку для просмотра')
      }

      if (!data?.signedUrl) {
        throw new Error('Ссылка для просмотра не получена')
      }

      return data.signedUrl
    } catch (error) {
      console.error('Error getting document URL:', error)
      throw error
    }
  }
}
