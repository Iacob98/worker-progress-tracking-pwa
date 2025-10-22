'use client'

import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useCreateSegment } from '@/lib/hooks/use-nvt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const segmentSchema = z.object({
  code: z.string().min(1, 'Введите код сегмента'),
  name: z.string().min(1, 'Введите название сегмента'),
  lengthPlannedM: z.number().min(0, 'Длина должна быть положительной').max(10000, 'Слишком большое значение'),
})

type SegmentFormData = z.infer<typeof segmentSchema>

interface CreateSegmentFormProps {
  cabinetId: string
  onSuccess?: () => void
}

/**
 * Form component for creating new segments
 */
export function CreateSegmentForm({ cabinetId, onSuccess }: CreateSegmentFormProps) {
  const createSegment = useCreateSegment()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SegmentFormData>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      code: '',
      name: '',
      lengthPlannedM: 0,
    },
  })

  const onSubmit: SubmitHandler<SegmentFormData> = async (data) => {
    console.log('Creating segment with data:', data)

    try {
      setError(null)

      await createSegment.mutateAsync({
        cabinetId,
        code: data.code,
        name: data.name,
        lengthPlannedM: data.lengthPlannedM,
        status: 'open',
      })

      console.log('Segment created successfully')
      reset()

      // Success
      if (onSuccess) {
        console.log('Calling onSuccess callback')
        onSuccess()
      }
    } catch (err) {
      console.error('Error creating segment:', err)
      setError('Ошибка при создании сегмента. Попробуйте еще раз.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Success/Error Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {createSegment.isSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Сегмент успешно создан
          </AlertDescription>
        </Alert>
      )}

      {/* Code Field */}
      <div className="space-y-2">
        <Label htmlFor="code">
          Код сегмента <span className="text-red-500">*</span>
        </Label>
        <Input
          id="code"
          type="text"
          {...register('code')}
          placeholder="Например: SEG-001"
        />
        {errors.code && (
          <p className="text-sm text-red-500">{errors.code.message}</p>
        )}
      </div>

      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Название сегмента <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          {...register('name')}
          placeholder="Например: Основной участок"
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Length Planned */}
      <div className="space-y-2">
        <Label htmlFor="lengthPlannedM">
          Планируемая длина (метры) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="lengthPlannedM"
          type="number"
          step="0.1"
          {...register('lengthPlannedM', { valueAsNumber: true })}
          placeholder="Например: 150.0"
        />
        {errors.lengthPlannedM && (
          <p className="text-sm text-red-500">{errors.lengthPlannedM.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || createSegment.isPending}
        >
          {isSubmitting || createSegment.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Создание...
            </>
          ) : (
            'Создать сегмент'
          )}
        </Button>
      </div>
    </form>
  )
}
