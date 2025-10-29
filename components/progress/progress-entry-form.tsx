'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PhotoUpload } from './photo-upload'
import { Loader2, Save, Send, AlertCircle } from 'lucide-react'
import type { Segment, Photo, StageCode, WorkMethod } from '@/types/models'
import { z } from 'zod'
import { STAGE_LABELS, METHOD_LABELS } from '@/lib/constants/stages'

const ProgressEntryFormSchema = z.object({
  stageCode: z.string().min(1, 'Выберите этап работы'),
  meters: z.coerce.number().positive('Метры должны быть больше нуля'),
  method: z.string().optional(),
  widthM: z.coerce.number().optional(),
  depthM: z.coerce.number().optional(),
  cablesCount: z.coerce.number().optional(),
  hasProtectionPipe: z.boolean().optional(),
  soilType: z.string().optional(),
  comment: z.string().optional(),
})

type ProgressEntryFormData = z.infer<typeof ProgressEntryFormSchema>

interface ProgressEntryFormProps {
  segment: Segment
  projectId: string
  onSubmit: (data: any, isDraft: boolean) => Promise<void>
  onCancel: () => void
}

export function ProgressEntryForm({
  segment,
  projectId,
  onSubmit,
  onCancel,
}: ProgressEntryFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProgressEntryFormData>({
    resolver: zodResolver(ProgressEntryFormSchema),
    defaultValues: {
      hasProtectionPipe: false,
    }
  })

  const meters = watch('meters')
  const stageCode = watch('stageCode')

  const handleFormSubmit = async (data: ProgressEntryFormData, isDraft: boolean) => {
    setIsLoading(true)

    try {
      await onSubmit(
        {
          ...data,
          photos: photos,
        },
        isDraft
      )
    } catch (error) {
      console.error('Error submitting progress entry:', error)
      alert('Ошибка при сохранении отчета')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="space-y-6">
      {/* Segment Info */}
      <div className="bg-muted p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Плановая длина</span>
          <span className="font-medium">{segment.lengthPlannedM} м</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Покрытие</span>
          <span className="font-medium capitalize">{segment.surface}</span>
        </div>
      </div>

      {/* Stage Selection */}
      <div className="space-y-2">
        <Label htmlFor="stageCode" className="text-base font-semibold">
          Этап работы <span className="text-red-500">*</span>
        </Label>
        <Select
          value={stageCode}
          onValueChange={(value) => setValue('stageCode', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите этап" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STAGE_LABELS).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.stageCode && (
          <p className="text-sm text-red-500">{errors.stageCode.message}</p>
        )}
      </div>

      {/* Meters Completed Input */}
      <div className="space-y-2">
        <Label htmlFor="meters" className="text-base font-semibold">
          Выполнено метров <span className="text-red-500">*</span>
        </Label>
        <Input
          id="meters"
          type="number"
          step="0.1"
          min="0"
          placeholder="0"
          {...register('meters')}
          disabled={isLoading}
          className="text-lg"
        />
        {errors.meters && (
          <p className="text-sm text-red-500">{errors.meters.message}</p>
        )}
      </div>

      {/* Method Selection */}
      <div className="space-y-2">
        <Label htmlFor="method">Метод работы</Label>
        <Select
          value={watch('method')}
          onValueChange={(value) => setValue('method', value as WorkMethod)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите метод" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(METHOD_LABELS).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Optional Detail Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="widthM">Ширина (м)</Label>
          <Input
            id="widthM"
            type="number"
            step="0.1"
            {...register('widthM')}
            disabled={isLoading}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="depthM">Глубина (м)</Label>
          <Input
            id="depthM"
            type="number"
            step="0.1"
            {...register('depthM')}
            disabled={isLoading}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cablesCount">Количество кабелей</Label>
          <Input
            id="cablesCount"
            type="number"
            {...register('cablesCount')}
            disabled={isLoading}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="soilType">Тип грунта</Label>
          <Input
            id="soilType"
            {...register('soilType')}
            disabled={isLoading}
            placeholder="например: песок, глина"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hasProtectionPipe" className="flex items-center gap-2">
          <input
            id="hasProtectionPipe"
            type="checkbox"
            {...register('hasProtectionPipe')}
            disabled={isLoading}
            className="h-4 w-4"
          />
          Есть защитная труба
        </Label>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="comment">Комментарий</Label>
        <textarea
          id="comment"
          {...register('comment')}
          disabled={isLoading}
          rows={3}
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Дополнительная информация о выполненной работе..."
        />
      </div>

      {/* Photo Upload */}
      <div className="pt-2 border-t">
        <PhotoUpload
          projectId={projectId}
          photos={photos}
          onChange={setPhotos}
          disabled={isLoading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Отмена
        </Button>
        <Button
          type="button"
          onClick={handleSubmit(data => handleFormSubmit(data, false))}
          disabled={isLoading || !stageCode || !meters}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Сохранить
        </Button>
      </div>

      {/* Offline Info */}
      <Alert>
        <AlertDescription className="text-xs">
          💡 Отчеты можно создавать offline. Они автоматически синхронизируются при
          подключении к интернету.
        </AlertDescription>
      </Alert>
    </form>
  )
}
