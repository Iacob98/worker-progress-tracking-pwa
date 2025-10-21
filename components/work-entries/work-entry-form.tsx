'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useCreateWorkEntry } from '@/lib/hooks/use-work-entries'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { PhotoUpload } from '@/components/progress/photo-upload'
import { STAGE_OPTIONS, METHOD_OPTIONS } from '@/lib/constants/stages'
import type { Photo } from '@/types/models'

const workEntrySchema = z.object({
  stageCode: z.string().min(1, 'Выберите этап работ'),
  metersDoneM: z.number().min(0, 'Укажите выполненные метры').max(10000, 'Слишком большое значение'),
  method: z.string().optional(),
  depthM: z.number().min(0).max(10).optional(),
  widthM: z.number().min(0).max(10).optional(),
  cablesCount: z.number().int().min(0).optional(),
  hasProtectionPipe: z.boolean().optional(),
  soilType: z.string().optional(),
  notes: z.string().optional(),
})

type WorkEntryFormData = z.infer<typeof workEntrySchema>

interface WorkEntryFormProps {
  projectId: string
  segmentId?: string
  cabinetId?: string
  houseId?: string
  onSuccess?: () => void
}

export function WorkEntryForm({
  projectId,
  segmentId,
  cabinetId,
  houseId,
  onSuccess,
}: WorkEntryFormProps) {
  const { worker } = useAuth()
  const createWorkEntry = useCreateWorkEntry()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<WorkEntryFormData>({
    resolver: zodResolver(workEntrySchema),
    defaultValues: {
      metersDoneM: 0,
      cablesCount: 0,
      hasProtectionPipe: false,
    },
  })

  const method = watch('method')

  const onSubmit = async (data: WorkEntryFormData) => {
    if (!worker) {
      setError('Вы не авторизованы')
      return
    }

    try {
      setError(null)

      const workEntry = {
        projectId,
        segmentId,
        cabinetId,
        houseId,
        userId: worker.id,
        date: new Date().toISOString().split('T')[0],
        stageCode: data.stageCode as any,
        metersDoneM: data.metersDoneM,
        method: data.method as any,
        depthM: data.depthM,
        widthM: data.widthM,
        cablesCount: data.cablesCount,
        hasProtectionPipe: data.hasProtectionPipe,
        soilType: data.soilType,
        notes: data.notes,
        approved: false,
      }

      await createWorkEntry.mutateAsync(workEntry as any)

      // Success
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Error creating work entry:', err)
      setError('Ошибка при создании отчета. Попробуйте еще раз.')
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

      {createWorkEntry.isSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Отчет успешно создан и отправлен на проверку
          </AlertDescription>
        </Alert>
      )}

      {/* Stage Selection */}
      <div className="space-y-2">
        <Label htmlFor="stageCode">
          Этап работ <span className="text-red-500">*</span>
        </Label>
        <Select
          value={selectedStage}
          onValueChange={(value) => {
            setSelectedStage(value)
            setValue('stageCode', value)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите этап" />
          </SelectTrigger>
          <SelectContent>
            {STAGE_OPTIONS.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.stageCode && (
          <p className="text-sm text-red-500">{errors.stageCode.message}</p>
        )}
      </div>

      {/* Meters Done */}
      <div className="space-y-2">
        <Label htmlFor="metersDoneM">
          Выполнено метров <span className="text-red-500">*</span>
        </Label>
        <Input
          id="metersDoneM"
          type="number"
          step="0.1"
          {...register('metersDoneM', { valueAsNumber: true })}
          placeholder="Например: 100.5"
        />
        {errors.metersDoneM && (
          <p className="text-sm text-red-500">{errors.metersDoneM.message}</p>
        )}
      </div>

      {/* Method */}
      <div className="space-y-2">
        <Label htmlFor="method">Метод работ</Label>
        <Select
          value={method || ''}
          onValueChange={(value) => setValue('method', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите метод" />
          </SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="depthM">Глубина (м)</Label>
          <Input
            id="depthM"
            type="number"
            step="0.1"
            {...register('depthM', { valueAsNumber: true })}
            placeholder="Например: 0.8"
          />
          {errors.depthM && (
            <p className="text-sm text-red-500">{errors.depthM.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="widthM">Ширина (м)</Label>
          <Input
            id="widthM"
            type="number"
            step="0.1"
            {...register('widthM', { valueAsNumber: true })}
            placeholder="Например: 0.3"
          />
          {errors.widthM && (
            <p className="text-sm text-red-500">{errors.widthM.message}</p>
          )}
        </div>
      </div>

      {/* Additional Fields for Cable Stage */}
      {selectedStage === 'stage_4_cable' && (
        <div className="space-y-2">
          <Label htmlFor="cablesCount">Количество кабелей</Label>
          <Input
            id="cablesCount"
            type="number"
            {...register('cablesCount', { valueAsNumber: true })}
            placeholder="Например: 2"
          />
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Заметки / Комментарии</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Дополнительная информация о выполненных работах..."
          rows={3}
        />
      </div>

      {/* Photo Upload */}
      <PhotoUpload
        projectId={projectId}
        photos={photos}
        onChange={setPhotos}
        required={1}
        disabled={isSubmitting}
      />

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || createWorkEntry.isPending}
        >
          {isSubmitting || createWorkEntry.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Отправка...
            </>
          ) : (
            'Отправить на проверку'
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        После отправки отчет будет проверен бригадиром или менеджером проекта
      </p>
    </form>
  )
}
