'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/offline/db'
import { cacheNVT } from '@/lib/offline/cache'
import type { NVT, Segment } from '@/types/models'
import { useOffline } from './use-offline'

/**
 * Hook for fetching NVT points (cabinets) for a project
 * Supports offline caching and search/filter
 */
export function useNVTs(projectId: string | null) {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['nvts', projectId],
    queryFn: async (): Promise<NVT[]> => {
      if (!projectId) return []

      // If offline, return cached data
      if (isOffline) {
        const cached = await db.cabinets
          .where('projectId')
          .equals(projectId)
          .toArray()
        return cached
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('cabinets')
        .select(`
          *,
          segments:segments(count)
        `)
        .eq('project_id', projectId)
        .order('code', { ascending: true })

      if (error) {
        console.error('Error fetching NVTs:', error)
        // Fall back to cached data
        const cached = await db.cabinets
          .where('projectId')
          .equals(projectId)
          .toArray()
        return cached
      }

      // Transform and cache data
      const nvts: NVT[] = data.map((c: any) => ({
        id: c.id,
        projectId: c.project_id,
        code: c.code,
        name: c.name,
        address: c.address,
        latitude: c.latitude,
        longitude: c.longitude,
        status: c.status,
        totalLengthM: c.total_length_m,
        completedLengthM: c.completed_length_m,
        segmentCount: c.segments?.[0]?.count || 0,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }))

      // Cache NVTs for offline use
      for (const nvt of nvts) {
        await cacheNVT(nvt)
      }

      return nvts
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook for fetching a single NVT by ID
 */
export function useNVT(nvtId: string | null) {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['nvt', nvtId],
    queryFn: async (): Promise<NVT | null> => {
      if (!nvtId) return null

      // If offline, return cached data
      if (isOffline) {
        const cached = await db.cabinets.get(nvtId)
        return cached || null
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('cabinets')
        .select(`
          *,
          segments:segments(count)
        `)
        .eq('id', nvtId)
        .single()

      if (error) {
        console.error('Error fetching NVT:', error)
        // Fall back to cached data
        const cached = await db.cabinets.get(nvtId)
        return cached || null
      }

      // Transform data
      const nvt: NVT = {
        id: data.id,
        projectId: data.project_id,
        code: data.code,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
        totalLengthM: data.total_length_m,
        completedLengthM: data.completed_length_m,
        segmentCount: data.segments?.[0]?.count || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }

      // Cache for offline use
      await cacheNVT(nvt)

      return nvt
    },
    enabled: !!nvtId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for fetching segments for an NVT
 */
export function useSegments(nvtId: string | null) {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['segments', nvtId],
    queryFn: async (): Promise<Segment[]> => {
      if (!nvtId) return []

      // If offline, return cached data
      if (isOffline) {
        const cached = await db.segments
          .where('cabinetId')
          .equals(nvtId)
          .toArray()
        return cached
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .eq('cabinet_id', nvtId)
        .order('code', { ascending: true })

      if (error) {
        console.error('Error fetching segments:', error)
        // Fall back to cached data
        const cached = await db.segments
          .where('cabinetId')
          .equals(nvtId)
          .toArray()
        return cached
      }

      // Transform and cache data
      const segments: Segment[] = data.map((s: any) => ({
        id: s.id,
        cabinetId: s.cabinet_id,
        name: s.code || `Сегмент ${s.id.slice(0, 8)}`, // Use code as name
        lengthPlannedM: s.length_planned_m || 0,
        surface: s.surface || 'asphalt', // Default values
        area: s.area || 'urban',
        depthReqM: s.depth_req_m || 0.8,
        widthReqM: s.width_req_m || 0.3,
        geomLine: s.geom_line || null,
        status: s.status || 'open',
      }))

      // Cache segments
      for (const segment of segments) {
        await db.segments.put(segment)
      }

      return segments
    },
    enabled: !!nvtId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for fetching a single segment by ID
 */
export function useSegment(segmentId: string | null) {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['segment', segmentId],
    queryFn: async (): Promise<Segment | null> => {
      if (!segmentId) return null

      // If offline, return cached data
      if (isOffline) {
        const cached = await db.segments.get(segmentId)
        return cached || null
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .eq('id', segmentId)
        .single()

      if (error) {
        console.error('Error fetching segment:', error)
        // Fall back to cached data
        const cached = await db.segments.get(segmentId)
        return cached || null
      }

      // Transform data
      const segment: Segment = {
        id: data.id,
        cabinetId: data.cabinet_id,
        name: data.code || `Сегмент ${data.id.slice(0, 8)}`,
        lengthPlannedM: data.length_planned_m || 0,
        surface: data.surface || 'asphalt',
        area: data.area || 'urban',
        depthReqM: data.depth_req_m || 0.8,
        widthReqM: data.width_req_m || 0.3,
        geomLine: data.geom_line || null,
        status: data.status || 'open',
      }

      // Cache for offline use
      await db.segments.put(segment)

      return segment
    },
    enabled: !!segmentId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for fetching houses for an NVT
 */
export function useHouses(nvtId: string | null) {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['houses', nvtId],
    queryFn: async () => {
      if (!nvtId) return []

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .eq('cabinet_id', nvtId)
        .order('street', { ascending: true })

      if (error) {
        console.error('Error fetching houses:', error)
        return []
      }

      return data.map((h: any) => {
        // Build address from separate fields
        const addressParts = [
          h.street,
          h.house_number,
          h.city,
        ].filter(Boolean)
        const address = addressParts.length > 0 ? addressParts.join(', ') : 'Адрес не указан'

        return {
          id: h.id,
          projectId: h.project_id,
          cabinetId: h.cabinet_id,
          address: address,
          entranceCount: h.floor_count || 0, // Using floor_count as there's no entrance_count
          apartmentCount: h.apartment_count || 0,
          connectionStatus: h.status || 'pending',
          status: h.status,
          plannedConnectionDate: h.planned_connection_date ? new Date(h.planned_connection_date) : undefined,
          actualConnectionDate: h.actual_connection_date ? new Date(h.actual_connection_date) : undefined,
          createdAt: h.created_at,
          updatedAt: h.updated_at,
        }
      })
    },
    enabled: !!nvtId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for creating a new segment
 */
export function useCreateSegment() {
  const queryClient = useQueryClient()
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      cabinetId,
      code,
      name,
      lengthPlannedM,
      status = 'open',
    }: {
      cabinetId: string
      code: string
      name?: string
      lengthPlannedM: number
      status?: 'open' | 'in_progress' | 'done'
    }) => {
      const newSegment = {
        cabinet_id: cabinetId,
        code,
        name: name || code, // Use provided name or fallback to code
        length_planned_m: lengthPlannedM,
        length_done_m: 0,
        status,
      }

      // If offline, queue for sync
      if (isOffline) {
        // Store in IndexedDB
        const segment: Segment = {
          id: crypto.randomUUID(),
          cabinetId,
          name: name || code,
          lengthPlannedM,
          status,
          surface: 'asphalt',
          area: 'roadway',
          depthReqM: 0.8,
          widthReqM: 0.3,
          geomLine: null,
        }
        await db.segments.put(segment)
        return segment
      }

      // Create in Supabase
      const { data, error } = await supabase
        .from('segments')
        .insert(newSegment)
        .select()
        .single()

      if (error) {
        console.error('Error creating segment:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw error
      }

      // Transform and cache
      const segment: Segment = {
        id: data.id,
        cabinetId: data.cabinet_id,
        name: data.name || data.code || `Сегмент ${data.id.slice(0, 8)}`,
        lengthPlannedM: data.length_planned_m || 0,
        status: data.status || 'open',
        surface: 'asphalt',
        area: 'roadway',
        depthReqM: 0.8,
        widthReqM: 0.3,
        geomLine: null,
      }

      await db.segments.put(segment)

      return segment
    },
    onSuccess: (_, variables) => {
      // Invalidate segments queries
      queryClient.invalidateQueries({ queryKey: ['segments', variables.cabinetId] })
      queryClient.invalidateQueries({ queryKey: ['nvt', variables.cabinetId] })
    },
  })
}
