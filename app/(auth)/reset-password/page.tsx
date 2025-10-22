'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Loader2 } from 'lucide-react'

const ResetSchema = z.object({
  email: z.string().email('Неверный формат email')
})

type ResetFormData = z.infer<typeof ResetSchema>

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResetFormData>({
    resolver: zodResolver(ResetSchema)
  })

  const onSubmit = async (data: ResetFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password/confirm`
      })

      if (resetError) throw resetError

      setSuccess(true)
    } catch (err) {
      setError('Не удалось отправить письмо. Проверьте email и попробуйте снова')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Сброс PIN
          </CardTitle>
          <CardDescription className="text-center">
            Введите ваш email для получения инструкций
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h3 className="font-medium">Письмо отправлено!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Проверьте ваш email для инструкций по сбросу PIN
                </p>
              </div>
              <Button variant="outline" asChild className="w-full">
                <a href="/login">Вернуться к входу</a>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="worker@example.com"
                  {...register('email')}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              {error && (
                <div className="p-3 text-sm text-red-800 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Отправить инструкции'
                )}
              </Button>

              <div className="text-center text-sm">
                <a href="/login" className="text-primary hover:underline">
                  Вернуться к входу
                </a>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
