'use client'

import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { worker, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && worker) {
      // Already authenticated, redirect to projects
      router.push('/projects')
    }
  }, [worker, loading, router])

  if (loading || worker) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Вход в систему
          </CardTitle>
          <CardDescription className="text-center">
            Введите email и PIN для входа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
