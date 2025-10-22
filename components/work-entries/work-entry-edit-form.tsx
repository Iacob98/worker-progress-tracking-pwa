'use client'

import { useState, useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useUpdateWorkEntry } from '@/lib/hooks/use-work-entries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { PhotoUpload } from '@/components/progress/photo-upload'
import { STAGE_OPTIONS, METHOD_OPTIONS } from '@/lib/constants/stages'
import { SOIL_TYPE_OPTIONS } from '@/lib/constants/soil-types'
import type { WorkEntry, Photo } from '@/types/models'

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

interface WorkEntryEditFormProps {
  entry: WorkEntry
  onSuccess?: () => void
  disabled?: boolean
}

/**
 * Form component for editing work entries
 * Used primarily for fixing rejected entries
 * Clears rejection fields on save to resubmit for approval
 */
export function WorkEntryEditForm({ entry, onSuccess, disabled = false }: WorkEntryEditFormProps) {
  const updateWorkEntry = useUpdateWorkEntry()
  const [photos, setPhotos] = useState<Photo[]>(entry.photos || [])
  const [selectedStage, setSelectedStage] = useState<string>(entry.stageCode)
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
      stageCode: entry.stageCode,
      metersDoneM: entry.metersDoneM,
      method: entry.method || undefined,
      depthM: entry.depthM ?? undefined,
      widthM: entry.widthM ?? undefined,
      cablesCount: entry.cablesCount ?? undefined,
      hasProtectionPipe: entry.hasProtectionPipe ?? undefined,
      soilType: entry.soilType || undefined,
      notes: entry.notes || undefined,
    },
  })

  const method = watch('method')

  useEffect(() => {
    setSelectedStage(entry.stageCode)
  }, [entry.stageCode])

  const onSubmit: SubmitHandler<WorkEntryFormData> = async (data) => {
    console.log('Form submitted with data:', data)

    try {
      setError(null)

      // Prepare update data
      // IMPORTANT: Clear rejection fields to resubmit for approval
      const updates = {
        stageCode: data.stageCode as any,
        metersDoneM: data.metersDoneM,
        method: data.method as any,
        depthM: data.depthM,
        widthM: data.widthM,
        cablesCount: data.cablesCount,
        hasProtectionPipe: data.hasProtectionPipe,
        soilType: data.soilType,
        notes: data.notes,
        // Clear rejection data - entry is being resubmitted
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        // Set to pending approval
        approved: false,
        approvedAt: null,
        approvedBy: null,
      }

      console.log('Updating work entry:', entry.id, 'with updates:', updates)

      await updateWorkEntry.mutateAsync({
        id: entry.id,
        updates,
      })

      console.log('Work entry updated successfully')

      // Success
      if (onSuccess) {
        console.log('Calling onSuccess callback')
        onSuccess()
      }
    } catch (err) {
      console.error('Error updating work entry:', err)
      setError('Ошибка при обновлении отчета. Попробуйте еще раз.')
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

      {updateWorkEntry.isSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Отчет успешно обновлен и отправлен на повторную проверку
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
          disabled={disabled}
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
          disabled={disabled}
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
          disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
          />
        </div>
      )}

      {/* Soil Type - shown for excavation and conduit stages */}
      {(selectedStage === 'stage_2_excavation' || selectedStage === 'stage_3_conduit') && (
        <div className="space-y-2">
          <Label htmlFor="soilType">Тип грунта</Label>
          <Select
            value={watch('soilType') || ''}
            onValueChange={(value) => setValue('soilType', value)}
            disabled={disabled}
          >
            <SelectTrigger id="soilType">
              <SelectValue placeholder="Выберите тип грунта" />
            </SelectTrigger>
            <SelectContent>
              {SOIL_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          disabled={disabled}
        />
      </div>

      {/* Photo Upload */}
      <PhotoUpload
        projectId={entry.projectId}
        workEntryId={entry.id}
        photos={photos}
        onChange={setPhotos}
        required={1}
        disabled={disabled || isSubmitting}
      />

      {/* Submit Button - only show if not disabled */}
      {!disabled && (
        <>
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || updateWorkEntry.isPending}
            >
              {isSubmitting || updateWorkEntry.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить и отправить на проверку'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            После сохранения отчет будет отправлен на повторную проверку
          </p>
        </>
      )}
    </form>
  )
}
