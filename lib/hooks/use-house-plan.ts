'use client'

import { useQuery } from '@tanstack/react-query'

interface AdminPlanData {
  title: string | null
  description: string | null
  plan_type: string | null
  filename: string | null
  file_size: number | null
  file_url: string | null
  file_path: string | null
  uploaded_at: string | null
}

interface AdminAPIResponse {
  house: {
    id: string
    project_id: string
    cabinet_id: string
    street: string | null
    house_number: string | null
    city: string | null
  }
  plan: AdminPlanData | null
}

interface HousePlanResponse {
  plan_title: string | null
  plan_description: string | null
  plan_type: string | null
  plan_filename: string | null
  plan_file_size: number | null
  plan_file_url: string | null
  plan_file_path: string | null
  plan_uploaded_at: string | null
}

/**
 * Hook for fetching House connection plan from Admin API via proxy
 */
export function useHousePlan(houseId: string | null) {
  return useQuery({
    queryKey: ['house-plan', houseId],
    queryFn: async (): Promise<HousePlanResponse | null> => {
      if (!houseId) return null

      console.log('🏠 Fetching house plan for:', houseId)

      const apiUrl = `/api/admin-proxy/houses/${houseId}/plan`
      console.log('🏠 Fetching from proxy API:', apiUrl)

      const response = await fetch(apiUrl)

      if (!response.ok) {
        // If 404, 500, or error, return null (no plan exists or endpoint not ready)
        if (response.status === 404 || response.status === 500) {
          console.log('🏠 No plan found for house (or endpoint not ready):', houseId)
          return null
        }
        const errorText = await response.text()
        console.error('❌ Error fetching house plan:', response.status, errorText)
        return null
      }

      const data: AdminAPIResponse = await response.json()

      console.log('🏠 Full API response data:', JSON.stringify(data, null, 2))

      // Check if plan data exists
      if (!data.plan || !data.plan.file_url) {
        console.log('🏠 No plan available for house:', houseId, 'Reason: no plan or file_url')
        return null
      }

      console.log('✅ House plan loaded:', data.plan.filename)

      // Transform Admin API response to our expected format
      const transformedData: HousePlanResponse = {
        plan_title: data.plan.title,
        plan_description: data.plan.description,
        plan_type: data.plan.plan_type,
        plan_filename: data.plan.filename,
        plan_file_size: data.plan.file_size,
        plan_file_url: data.plan.file_url,
        plan_file_path: data.plan.file_path,
        plan_uploaded_at: data.plan.uploaded_at,
      }

      return transformedData
    },
    enabled: !!houseId,
    retry: false, // Don't retry if plan doesn't exist
  })
}
