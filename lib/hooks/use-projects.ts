'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/offline/db'
import { cacheProject } from '@/lib/offline/cache'
import type { Project } from '@/types/models'
import { useAuth } from './use-auth'
import { useOffline } from './use-offline'

/**
 * Hook for fetching projects assigned to the current worker
 * Supports offline caching and automatic background sync
 */
export function useProjects() {
  const { worker } = useAuth()
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['projects', worker?.id],
    queryFn: async (): Promise<Project[]> => {
      // If offline, return cached data
      if (isOffline) {
        const cached = await db.projects.toArray()
        return cached
      }

      // Fetch from Supabase - get projects assigned to worker via crews
      console.log('🔍 Fetching projects for worker:', worker?.id)

      // Get active crew_members for this worker
      const { data: crewData, error: crewError } = await supabase
        .from('crew_members')
        .select('crew_id')
        .eq('user_id', worker?.id)
        .eq('is_active', true)

      if (crewError) {
        console.error('Error fetching crew memberships:', crewError)
        const cached = await db.projects.toArray()
        return cached
      }

      const crewIds = crewData?.map(cm => cm.crew_id) || []

      if (crewIds.length === 0) {
        console.log('⚠️ Worker has no active crew assignments')
        return []
      }

      console.log('✅ Found crew IDs:', crewIds)

      // Now fetch projects for these crews
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          cabinets:cabinets(count),
          crews!inner(id)
        `)
        .in('crews.id', crewIds)
        .in('status', ['draft', 'planning', 'active'])
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching projects:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          worker_id: worker?.id,
          timestamp: new Date().toISOString()
        })
        // Fall back to cached data on error
        const cached = await db.projects.toArray()
        return cached
      }

      // Transform and cache data
      const projects: Project[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        customer: p.customer,
        city: p.city,
        address: p.address,
        contact24h: p.contact_24h,
        status: p.status,
        startDate: p.start_date,
        endDatePlan: p.end_date_plan,
        totalLengthM: p.total_length_m,
        cabinetCount: p.cabinets?.[0]?.count || 0,
        baseRatePerM: p.base_rate_per_m,
        pmUserId: p.pm_user_id,
        languageDefault: p.language_default,
        approved: p.approved,
      }))

      // Cache projects for offline use
      for (const project of projects) {
        await cacheProject(project)
      }

      return projects
    },
    enabled: !!worker,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook for fetching a single project by ID
 */
export function useProject(projectId: string | null) {
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async (): Promise<Project | null> => {
      if (!projectId) return null

      // If offline, return cached data
      if (isOffline) {
        const cached = await db.projects.get(projectId)
        return cached || null
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          cabinets:cabinets(count)
        `)
        .eq('id', projectId)
        .single()

      if (error) {
        console.error('Error fetching project:', error)
        // Fall back to cached data
        const cached = await db.projects.get(projectId)
        return cached || null
      }

      // Transform data
      const project: Project = {
        id: data.id,
        name: data.name,
        customer: data.customer,
        city: data.city,
        address: data.address,
        contact24h: data.contact_24h,
        status: data.status,
        startDate: data.start_date,
        endDatePlan: data.end_date_plan,
        totalLengthM: data.total_length_m,
        cabinetCount: data.cabinets?.[0]?.count || 0,
        baseRatePerM: data.base_rate_per_m,
        pmUserId: data.pm_user_id,
        languageDefault: data.language_default,
        approved: data.approved,
      }

      // Cache for offline use
      await cacheProject(project)

      return project
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}
