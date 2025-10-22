'use client'

import { useAuthContext } from '@/components/auth/session-provider'

/**
 * Hook for accessing authentication state and methods
 * Must be used within SessionProvider
 */
export function useAuth() {
  return useAuthContext()
}

/**
 * Hook to check if user is authenticated
 */
export function useRequireAuth() {
  const { worker, loading } = useAuth()

  return {
    isAuthenticated: !!worker,
    isLoading: loading,
    worker
  }
}

/**
 * Hook to get current worker data
 */
export function useWorker() {
  const { worker, loading } = useAuth()

  return {
    worker,
    isLoading: loading,
    isWorker: worker?.role === 'worker',
    isForeman: worker?.role === 'foreman'
  }
}
