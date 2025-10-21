'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Worker } from '@/types/models'

interface AuthContextType {
  worker: Worker | null
  loading: boolean
  signIn: (email: string, pin: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Load worker data by ID
  const loadWorker = async (workerId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', workerId)
        .single()

      if (error) throw error

      if (userData && userData.is_active) {
        const workerData: Worker = {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: userData.role as 'worker' | 'foreman' | 'crew',
          phone: userData.phone,
          isActive: userData.is_active,
          languagePreference: userData.language_preference,
          skills: userData.skills
        }
        setWorker(workerData)

        // Cache worker data to localStorage for offline access
        localStorage.setItem('cached_worker', JSON.stringify(workerData))
        return workerData
      }
      return null
    } catch (error) {
      console.error('Error loading worker data:', error)

      // Try to load from cache if online fetch fails
      const cachedWorker = localStorage.getItem('cached_worker')
      if (cachedWorker) {
        const parsed = JSON.parse(cachedWorker)
        setWorker(parsed)
        return parsed
      }
      return null
    }
  }

  // Initialize session from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const sessionData = localStorage.getItem('worker_session')

        if (sessionData) {
          const session = JSON.parse(sessionData)

          // Check if session is still valid (7 days)
          const sessionAge = Date.now() - session.timestamp
          const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

          if (sessionAge < maxAge) {
            await loadWorker(session.workerId)
          } else {
            // Session expired
            localStorage.removeItem('worker_session')
            localStorage.removeItem('cached_worker')
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const signIn = async (email: string, pin: string) => {
    try {
      // Query users table for matching email
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      console.log('👤 User data from DB:', {
        found: !!userData,
        email: userData?.email,
        role: userData?.role,
        roleType: typeof userData?.role,
        is_active: userData?.is_active,
        has_pin: !!userData?.pin_code,
        pin_matches: userData?.pin_code === pin
      })

      if (error || !userData) {
        console.error('Database error:', error)
        return { error: new Error('Неверный email или PIN') }
      }

      // Check if user is active
      if (!userData.is_active) {
        return { error: new Error('Аккаунт деактивирован. Обратитесь к администратору.') }
      }

      // Check role (only worker, foreman, or crew)
      const userRole = userData.role?.toLowerCase()
      if (!['worker', 'foreman', 'crew'].includes(userRole)) {
        console.error('❌ Invalid role:', {
          original: userData.role,
          lowercase: userRole,
          allowed: ['worker', 'foreman', 'crew']
        })
        return { error: new Error(`У вас нет доступа к этому приложению (роль: ${userData.role})`) }
      }

      // Verify PIN
      if (userData.pin_code !== pin) {
        console.error('❌ PIN mismatch')
        return { error: new Error('Неверный email или PIN') }
      }

      // Create session
      const session = {
        workerId: userData.id,
        timestamp: Date.now()
      }
      localStorage.setItem('worker_session', JSON.stringify(session))

      // Load worker data
      await loadWorker(userData.id)

      return { error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    setWorker(null)
    localStorage.removeItem('worker_session')
    localStorage.removeItem('cached_worker')
  }

  return (
    <AuthContext.Provider
      value={{
        worker,
        loading,
        signIn,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within SessionProvider')
  }
  return context
}
