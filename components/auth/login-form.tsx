'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, type LoginFormData } from '@/lib/validation/schemas'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2 } from 'lucide-react'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes in milliseconds

export function LoginForm() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema)
  })

  // Check if account is locked
  const isLocked = !!(lockedUntil && Date.now() < lockedUntil)

  const onSubmit = async (data: LoginFormData) => {
    console.log('🔐 Login attempt:', { email: data.email, pin: '***' })

    // Check if account is locked
    if (isLocked) {
      const remainingMinutes = Math.ceil((lockedUntil! - Date.now()) / 60000)
      setError(`Аккаунт заблокирован. Попробуйте через ${remainingMinutes} мин`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('📡 Calling signIn...')
      const { error: signInError } = await signIn(data.email, data.pin)

      if (signInError) {
        console.error('❌ Sign in error:', signInError)

        // Increment failed attempts
        const newAttempts = failedAttempts + 1
        setFailedAttempts(newAttempts)

        // Lock account after max attempts
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockoutTime = Date.now() + LOCKOUT_DURATION
          setLockedUntil(lockoutTime)
          localStorage.setItem('lockout_until', lockoutTime.toString())
          setError(`Превышено количество попыток. Аккаунт заблокирован на 15 минут`)
        } else {
          setError(signInError.message || `Неверный email или PIN. Попыток осталось: ${MAX_ATTEMPTS - newAttempts}`)
        }
        return
      }

      console.log('✅ Sign in successful, redirecting...')

      // Success - reset attempts and redirect
      setFailedAttempts(0)
      localStorage.removeItem('lockout_until')
      router.push('/projects')
    } catch (err) {
      console.error('❌ Exception during login:', err)
      setError('Произошла ошибка при входе. Попробуйте снова')
    } finally {
      setIsLoading(false)
    }
  }

  // Check lockout on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLockout = localStorage.getItem('lockout_until')
      if (savedLockout) {
        const lockoutTime = parseInt(savedLockout)
        if (Date.now() < lockoutTime) {
          setLockedUntil(lockoutTime)
        } else {
          localStorage.removeItem('lockout_until')
        }
      }
    }
  }, [])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="worker@example.com"
          {...register('email')}
          disabled={isLoading || isLocked}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          type="password"
          placeholder="••••"
          inputMode="numeric"
          maxLength={6}
          {...register('pin')}
          disabled={isLoading || isLocked}
        />
        {errors.pin && (
          <p className="text-sm text-red-500">{errors.pin.message}</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-800 bg-red-50 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || isLocked}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Вход...
          </>
        ) : (
          'Войти'
        )}
      </Button>

      <div className="text-center text-sm">
        <a href="/reset-password" className="text-primary hover:underline">
          Забыли PIN?
        </a>
      </div>
    </form>
  )
}
