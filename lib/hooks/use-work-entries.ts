'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/offline/db'
import { queueEntry } from '@/lib/offline/sync'
import type { WorkEntry } from '@/types/models'
import { useAuth } from './use-auth'
import { useOffline } from './use-offline'
import { v4 as uuidv4 } from 'uuid'

/**
 * Hook for fetching work entries for the current worker
 */
export function useWorkEntries(filters?: {
  projectId?: string
  approved?: boolean
  dateFrom?: string
  dateTo?: string
}) {
  const { worker } = useAuth()
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['work_entries', worker?.id, filters],
    queryFn: async (): Promise<WorkEntry[]> => {
      if (!worker) return []

      // If offline, return cached data
      if (isOffline) {
        let query = db.work_entries.where('userId').equals(worker.id)

        if (filters?.projectId) {
          query = query.and(entry => entry.projectId === filters.projectId)
        }
        if (filters?.approved !== undefined) {
          query = query.and(entry => entry.approved === filters.approved)
        }

        const cached = await query.reverse().sortBy('date')
        return cached as WorkEntry[]
      }

      // Fetch from Supabase (without joins to avoid errors)
      let query = supabase
        .from('work_entries')
        .select(`
          *,
          photos:photos(*)
        `)
        .eq('user_id', worker.id)
        .order('date', { ascending: false })

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters?.approved !== undefined) {
        query = query.eq('approved', filters.approved)
      }
      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching work entries:', {
          error,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code
        })
        console.error('Full error object:', JSON.stringify(error, null, 2))
        // Fall back to cached data
        let cachedQuery = db.work_entries.where('userId').equals(worker.id)
        if (filters?.projectId) {
          cachedQuery = cachedQuery.and(entry => entry.projectId === filters.projectId)
        }
        if (filters?.approved !== undefined) {
          cachedQuery = cachedQuery.and(entry => entry.approved === filters.approved)
        }
        const cached = await cachedQuery.reverse().sortBy('date')
        return cached as WorkEntry[]
      }

      // Handle null or empty data
      if (!data || data.length === 0) {
        return []
      }

      // Transform and cache data
      const entries: WorkEntry[] = data.map((e: any) => ({
        id: e.id,
        projectId: e.project_id,
        cabinetId: e.cabinet_id,
        segmentId: e.segment_id,
        cutId: e.cut_id,
        houseId: e.house_id,
        crewId: e.crew_id,
        userId: e.user_id,
        date: e.date,
        stageCode: e.stage_code,
        metersDoneM: e.meters_done_m,
        method: e.method,
        widthM: e.width_m,
        depthM: e.depth_m,
        cablesCount: e.cables_count,
        hasProtectionPipe: e.has_protection_pipe,
        soilType: e.soil_type,
        notes: e.notes,
        approvedBy: e.approved_by,
        approvedAt: e.approved_at,
        approved: e.approved || false,
        rejectionReason: e.rejection_reason,
        rejectedBy: e.rejected_by,
        rejectedAt: e.rejected_at,
        photos: (e.photos || []).map((p: any) => ({
          id: p.id,
          workEntryId: p.work_entry_id,
          cutStageId: p.cut_stage_id,
          url: p.url,
          ts: p.ts,
          gpsLat: p.gps_lat,
          gpsLon: p.gps_lon,
          authorUserId: p.author_user_id,
          label: p.label,
        })),
      }))

      // Fetch cabinet and segment data for entries that have them
      const cabinetIds = [...new Set(entries.filter(e => e.cabinetId).map(e => e.cabinetId!))]
      const segmentIds = [...new Set(entries.filter(e => e.segmentId).map(e => e.segmentId!))]

      let cabinetsMap = new Map<string, any>()
      let segmentsMap = new Map<string, any>()

      if (cabinetIds.length > 0) {
        const { data: cabinets } = await supabase
          .from('cabinets')
          .select('id, code, name')
          .in('id', cabinetIds)

        if (cabinets) {
          cabinets.forEach(c => cabinetsMap.set(c.id, c))
        }
      }

      if (segmentIds.length > 0) {
        const { data: segments } = await supabase
          .from('segments')
          .select('id, name')
          .in('id', segmentIds)

        if (segments) {
          segments.forEach(s => segmentsMap.set(s.id, s))
        }
      }

      // Attach cabinet and segment data to entries
      const enrichedEntries = entries.map(entry => ({
        ...entry,
        cabinet: entry.cabinetId && cabinetsMap.has(entry.cabinetId)
          ? cabinetsMap.get(entry.cabinetId)
          : null,
        segment: entry.segmentId && segmentsMap.has(entry.segmentId)
          ? segmentsMap.get(entry.segmentId)
          : null,
      }))

      // Cache entries
      for (const entry of enrichedEntries) {
        await db.work_entries.put(entry)
      }

      return enrichedEntries
    },
    enabled: !!worker,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for fetching work entries for foreman approval
 * Loads entries from entire crew that need approval
 */
export function useWorkEntriesForApproval(approved?: boolean) {
  const { worker } = useAuth()
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['work_entries_approval', worker?.id, approved],
    queryFn: async (): Promise<WorkEntry[]> => {
      if (!worker) return []

      // Only foremen/crew can access this
      if (worker.role !== 'foreman' && worker.role !== 'crew') {
        return []
      }

      // If offline, return cached data
      if (isOffline) {
        let query = db.work_entries.toCollection()
        if (approved !== undefined) {
          query = query.filter(entry => entry.approved === approved)
        }
        const cached = await query.reverse().sortBy('date')
        return cached as WorkEntry[]
      }

      // Fetch work entries from crew members
      // Get all entries from workers in the same crew(s) as the foreman
      let query = supabase
        .from('work_entries')
        .select(`
          *,
          photos:photos(*)
        `)
        .order('date', { ascending: false })

      if (approved !== undefined) {
        query = query.eq('approved', approved)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching work entries for approval:', error)
        // Fall back to cached data
        let cachedQuery = db.work_entries.toCollection()
        if (approved !== undefined) {
          cachedQuery = cachedQuery.filter(entry => entry.approved === approved)
        }
        const cached = await cachedQuery.reverse().sortBy('date')
        return cached as WorkEntry[]
      }

      // Transform and cache data
      const entries: WorkEntry[] = data.map((e: any) => ({
        id: e.id,
        projectId: e.project_id,
        cabinetId: e.cabinet_id,
        segmentId: e.segment_id,
        cutId: e.cut_id,
        houseId: e.house_id,
        crewId: e.crew_id,
        userId: e.user_id,
        date: e.date,
        stageCode: e.stage_code,
        metersDoneM: e.meters_done_m,
        method: e.method,
        widthM: e.width_m,
        depthM: e.depth_m,
        cablesCount: e.cables_count,
        hasProtectionPipe: e.has_protection_pipe,
        soilType: e.soil_type,
        notes: e.notes,
        approvedBy: e.approved_by,
        approvedAt: e.approved_at,
        approved: e.approved || false,
        rejectionReason: e.rejection_reason,
        rejectedBy: e.rejected_by,
        rejectedAt: e.rejected_at,
        photos: (e.photos || []).map((p: any) => ({
          id: p.id,
          workEntryId: p.work_entry_id,
          cutStageId: p.cut_stage_id,
          url: p.url,
          ts: p.ts,
          gpsLat: p.gps_lat,
          gpsLon: p.gps_lon,
          authorUserId: p.author_user_id,
          label: p.label,
        })),
      }))

      // Cache entries
      for (const entry of entries) {
        await db.work_entries.put(entry)
      }

      return entries
    },
    enabled: !!worker && (worker.role === 'foreman' || worker.role === 'crew'),
    staleTime: 1 * 60 * 1000, // 1 minute - refresh frequently for approval workflow
  })
}

/**
 * Hook for fetching a single work entry
 */
export function useWorkEntry(entryId: string | null) {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['work_entry', entryId],
    queryFn: async (): Promise<WorkEntry | null> => {
      if (!entryId) return null

      // If offline, return cached data
      if (isOffline) {
        const cached = await db.work_entries.get(entryId)
        return (cached as WorkEntry) || null
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('work_entries')
        .select(`
          *,
          photos:photos(*)
        `)
        .eq('id', entryId)
        .single()

      if (error) {
        console.error('Error fetching work entry:', {
          error,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          entryId,
        })
        const cached = await db.work_entries.get(entryId)
        return (cached as WorkEntry) || null
      }

      // Transform data
      const entry: WorkEntry = {
        id: data.id,
        projectId: data.project_id,
        cabinetId: data.cabinet_id,
        segmentId: data.segment_id,
        cutId: data.cut_id,
        houseId: data.house_id,
        crewId: data.crew_id,
        userId: data.user_id,
        date: data.date,
        stageCode: data.stage_code,
        metersDoneM: data.meters_done_m,
        method: data.method,
        widthM: data.width_m,
        depthM: data.depth_m,
        cablesCount: data.cables_count,
        hasProtectionPipe: data.has_protection_pipe,
        soilType: data.soil_type,
        notes: data.notes,
        approvedBy: data.approved_by,
        approvedAt: data.approved_at,
        approved: data.approved || false,
        rejectionReason: data.rejection_reason,
        rejectedBy: data.rejected_by,
        rejectedAt: data.rejected_at,
        photos: (data.photos || []).map((p: any) => ({
          id: p.id,
          workEntryId: p.work_entry_id,
          cutStageId: p.cut_stage_id,
          url: p.url,
          ts: p.ts,
          gpsLat: p.gps_lat,
          gpsLon: p.gps_lon,
          authorUserId: p.author_user_id,
          label: p.label,
        })),
      }

      // Cache entry
      await db.work_entries.put(entry)

      return entry
    },
    enabled: !!entryId,
  })
}

/**
 * Hook for fetching work entries for a specific segment
 */
export function useSegmentWorkEntries(segmentId: string | null) {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['segment_work_entries', segmentId],
    queryFn: async (): Promise<WorkEntry[]> => {
      if (!segmentId) return []

      // If offline, return cached data
      if (isOffline) {
        const cached = await db.work_entries
          .where('segmentId')
          .equals(segmentId)
          .reverse()
          .sortBy('date')
        return cached as WorkEntry[]
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('work_entries')
        .select(`
          *,
          photos:photos(*)
        `)
        .eq('segment_id', segmentId)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching segment work entries:', {
          error,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code
        })
        // Fall back to cached data
        const cached = await db.work_entries
          .where('segmentId')
          .equals(segmentId)
          .reverse()
          .sortBy('date')
        return cached as WorkEntry[]
      }

      // Handle null or empty data
      if (!data || data.length === 0) {
        return []
      }

      // Transform and cache data
      const entries: WorkEntry[] = data.map((e: any) => ({
        id: e.id,
        projectId: e.project_id,
        cabinetId: e.cabinet_id,
        segmentId: e.segment_id,
        cutId: e.cut_id,
        houseId: e.house_id,
        crewId: e.crew_id,
        userId: e.user_id,
        date: e.date,
        stageCode: e.stage_code,
        metersDoneM: e.meters_done_m,
        method: e.method,
        widthM: e.width_m,
        depthM: e.depth_m,
        cablesCount: e.cables_count,
        hasProtectionPipe: e.has_protection_pipe,
        soilType: e.soil_type,
        notes: e.notes,
        approvedBy: e.approved_by,
        approvedAt: e.approved_at,
        approved: e.approved || false,
        rejectionReason: e.rejection_reason,
        rejectedBy: e.rejected_by,
        rejectedAt: e.rejected_at,
        photos: (e.photos || []).map((p: any) => ({
          id: p.id,
          workEntryId: p.work_entry_id,
          cutStageId: p.cut_stage_id,
          url: p.url,
          ts: p.ts,
          gpsLat: p.gps_lat,
          gpsLon: p.gps_lon,
          authorUserId: p.author_user_id,
          label: p.label,
        })),
      }))

      // Cache entries
      for (const entry of entries) {
        await db.work_entries.put(entry)
      }

      return entries
    },
    enabled: !!segmentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for creating a work entry
 */
export function useCreateWorkEntry() {
  const queryClient = useQueryClient()
  const { worker } = useAuth()
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (entry: Partial<WorkEntry>) => {
      if (!worker) throw new Error('Worker not authenticated')

      const workEntry = {
        ...entry,
        id: entry.id || uuidv4(), // Generate ID if not provided
        userId: worker.id,
        approved: false,
      }

      // If offline, queue for sync
      if (isOffline) {
        await queueEntry(workEntry as any)
        await db.work_entries.put(workEntry as any)
        return workEntry as WorkEntry
      }

      // Save to Supabase
      const { data, error } = await supabase
        .from('work_entries')
        .insert({
          project_id: workEntry.projectId,
          cabinet_id: workEntry.cabinetId,
          segment_id: workEntry.segmentId,
          cut_id: workEntry.cutId,
          house_id: workEntry.houseId,
          crew_id: workEntry.crewId,
          user_id: workEntry.userId,
          date: workEntry.date || new Date().toISOString().split('T')[0],
          stage_code: workEntry.stageCode,
          meters_done_m: workEntry.metersDoneM,
          method: workEntry.method,
          width_m: workEntry.widthM,
          depth_m: workEntry.depthM,
          cables_count: workEntry.cablesCount,
          has_protection_pipe: workEntry.hasProtectionPipe,
          soil_type: workEntry.soilType,
          notes: workEntry.notes,
          approved: false,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating work entry:', error)
        // Queue for sync if online insert fails
        await queueEntry(workEntry as any)
        await db.work_entries.put(workEntry as any)
        throw error
      }

      // Cache locally
      await db.work_entries.put(data as any)

      return data
    },
    onSuccess: () => {
      // Invalidate work entries queries
      queryClient.invalidateQueries({ queryKey: ['work_entries'] })
      queryClient.invalidateQueries({ queryKey: ['segments'] })
    },
  })
}

/**
 * Hook for updating work entry
 */
export function useUpdateWorkEntry() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { isOffline } = useOffline()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WorkEntry> }) => {
      // Update in local database
      await db.work_entries.update(id, updates)

      // If offline, queue for sync
      if (isOffline) {
        await queueEntry({ id, ...updates } as any)
        return updates
      }

      // Update in Supabase
      const updateData: any = {}
      if (updates.stageCode !== undefined) updateData.stage_code = updates.stageCode
      if (updates.metersDoneM !== undefined) updateData.meters_done_m = updates.metersDoneM
      if (updates.method !== undefined) updateData.method = updates.method
      if (updates.widthM !== undefined) updateData.width_m = updates.widthM
      if (updates.depthM !== undefined) updateData.depth_m = updates.depthM
      if (updates.cablesCount !== undefined) updateData.cables_count = updates.cablesCount
      if (updates.hasProtectionPipe !== undefined) updateData.has_protection_pipe = updates.hasProtectionPipe
      if (updates.soilType !== undefined) updateData.soil_type = updates.soilType
      if (updates.notes !== undefined) updateData.notes = updates.notes

      // Support updating approval status
      if (updates.approved !== undefined) updateData.approved = updates.approved
      if (updates.approvedBy !== undefined) updateData.approved_by = updates.approvedBy
      if (updates.approvedAt !== undefined) updateData.approved_at = updates.approvedAt

      // Support clearing rejection fields (for resubmission)
      if (updates.rejectedAt !== undefined) updateData.rejected_at = updates.rejectedAt
      if (updates.rejectedBy !== undefined) updateData.rejected_by = updates.rejectedBy
      if (updates.rejectionReason !== undefined) updateData.rejection_reason = updates.rejectionReason

      const { data, error } = await supabase
        .from('work_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating work entry:', error)
        await queueEntry({ id, ...updates } as any)
        throw error
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work_entries'] })
      queryClient.invalidateQueries({ queryKey: ['work_entry', variables.id] })
    },
  })
}

/**
 * Hook for approving/rejecting work entry (foreman only)
 */
export function useApproveWorkEntry() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { isOffline } = useOffline()
  const { worker } = useAuth()

  return useMutation({
    mutationFn: async ({
      entryId,
      approved,
      notes
    }: {
      entryId: string
      approved: boolean
      notes?: string
    }) => {
      const updateData: any = {
        approved,
      }

      // Add approval info if approving
      if (approved && worker) {
        updateData.approved_by = worker.id
        updateData.approved_at = new Date().toISOString()
      }

      // Add notes if provided (rejection reason)
      if (notes) {
        updateData.notes = notes
      }

      // Update in local database
      await db.work_entries.update(entryId, updateData)

      // If offline, queue for sync
      if (isOffline) {
        await queueEntry({ id: entryId, ...updateData } as any)
        return updateData
      }

      // Update in Supabase
      const { data, error } = await supabase
        .from('work_entries')
        .update(updateData)
        .eq('id', entryId)
        .select()
        .single()

      if (error) {
        console.error('Error approving work entry:', error)
        await queueEntry({ id: entryId, ...updateData } as any)
        throw error
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work_entries'] })
      queryClient.invalidateQueries({ queryKey: ['work_entries_approval'] })
      queryClient.invalidateQueries({ queryKey: ['work_entry', variables.entryId] })
      queryClient.invalidateQueries({ queryKey: ['segments'] })
    },
  })
}

/**
 * Hook for deleting a work entry (drafts only)
 */
export function useDeleteWorkEntry() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { isOffline } = useOffline()

  return useMutation({
    mutationFn: async (entryId: string) => {
      // Delete from local database
      await db.work_entries.delete(entryId)

      if (isOffline) {
        // Queue deletion for when online
        return
      }

      // Delete segment work entries first
      await supabase
        .from('segment_work_entries')
        .delete()
        .eq('work_entry_id', entryId)

      // Delete photos
      await supabase
        .from('photos')
        .delete()
        .eq('work_entry_id', entryId)

      // Delete main entry
      const { error } = await supabase
        .from('work_entries')
        .delete()
        .eq('id', entryId)

      if (error) {
        console.error('Error deleting work entry:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_entries'] })
    },
  })
}
