'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/offline/db'
import { transformWorkEntryFromDb } from '@/lib/utils/transform'
import type { WorkEntry } from '@/types/models'
import { useAuth } from './use-auth'
import { useOffline } from './use-offline'

/**
 * Hook for fetching rejected work entries
 * Returns entries sorted by rejection date (newest first)
 */
export function useRejectedEntries(filters?: {
  projectId?: string
  userId?: string
}) {
  const { worker } = useAuth()
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['rejected_entries', worker?.id, filters],
    queryFn: async (): Promise<WorkEntry[]> => {
      const userId = filters?.userId || worker?.id
      if (!userId) return []

      // If offline, return cached rejected entries
      if (isOffline) {
        let query = db.work_entries
          .where('userId')
          .equals(userId)
          .and(entry => entry.rejectedAt !== null && entry.rejectedAt !== undefined)

        if (filters?.projectId) {
          query = query.and(entry => entry.projectId === filters.projectId)
        }

        const cached = await query.reverse().sortBy('rejectedAt')
        return cached as WorkEntry[]
      }

      // Fetch from Supabase
      let query = supabase
        .from('work_entries')
        .select(`
          *,
          photos:photos(*)
        `)
        .eq('user_id', userId)
        .not('rejected_at', 'is', null)
        .order('rejected_at', { ascending: false })

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching rejected entries:', error)
        // Fall back to cached data
        let cachedQuery = db.work_entries
          .where('userId')
          .equals(userId)
          .and(entry => entry.rejectedAt !== null && entry.rejectedAt !== undefined)

        if (filters?.projectId) {
          cachedQuery = cachedQuery.and(entry => entry.projectId === filters.projectId)
        }

        const cached = await cachedQuery.reverse().sortBy('rejectedAt')
        return cached as WorkEntry[]
      }

      // Handle null or empty data
      if (!data || data.length === 0) {
        return []
      }

      // Transform from snake_case to camelCase
      const entries = data.map(item => transformWorkEntryFromDb(item))

      // Cache locally
      await Promise.all(
        entries.map(entry =>
          db.work_entries.put(entry as any)
        )
      )

      return entries
    },
    enabled: !!worker?.id || !!filters?.userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
