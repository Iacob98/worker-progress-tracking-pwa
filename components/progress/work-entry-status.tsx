'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Camera, X } from 'lucide-react'
import { useApproveWorkEntry } from '@/lib/hooks/use-work-entries'
import { usePhotoUpload } from '@/lib/hooks/use-photos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface WorkEntryStatusProps {
  entryId: string
  approved: boolean
  canApprove?: boolean // true for foreman/admin
  onStatusChange?: () => void
}

export function WorkEntryStatus({
  entryId,
  approved,
  canApprove = false,
  onStatusChange
}: WorkEntryStatusProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [rejectionPhotos, setRejectionPhotos] = useState<File[]>([])
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)

  const approveEntry = useApproveWorkEntry()
  const uploadPhoto = usePhotoUpload()

  const handleAction = (action: 'approve' | 'reject') => {
    setActionType(action)
    setShowDialog(true)
  }

  const handleConfirm = async () => {
    if (!actionType) return

    try {
      // If rejecting with photos, upload them first with special label
      if (actionType === 'reject' && rejectionPhotos.length > 0) {
        setIsUploadingPhotos(true)

        console.log('🔴 Uploading rejection photos:', {
          entryId,
          photoCount: rejectionPhotos.length,
          photoType: 'after'
        })

        // Upload each photo with special label to identify as admin rejection photo
        for (let i = 0; i < rejectionPhotos.length; i++) {
          const file = rejectionPhotos[i]
          console.log(`📸 Uploading photo ${i + 1}/${rejectionPhotos.length}:`, file.name)

          try {
            const result = await uploadPhoto.mutateAsync({
              file,
              projectId: entryId, // Use entryId as projectId for now
              workEntryId: entryId,
              photoType: 'after', // Use 'after' type to mark as admin rejection photo
            })
            console.log(`✅ Photo ${i + 1} uploaded successfully:`, result)
          } catch (error) {
            console.error(`❌ Error uploading photo ${i + 1}:`, error)
            throw error
          }
        }

        console.log('✅ All rejection photos uploaded')
        setIsUploadingPhotos(false)
      }

      await approveEntry.mutateAsync({
        entryId,
        approved: actionType === 'approve',
        notes: actionType === 'reject' ? rejectionNotes : undefined
      })

      setShowDialog(false)
      setRejectionNotes('')
      setRejectionPhotos([])
      onStatusChange?.()
    } catch (error) {
      console.error('Error updating approval status:', error)
      setIsUploadingPhotos(false)
    }
  }

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setRejectionPhotos(Array.from(files))
    }
  }

  const handleRemovePhoto = (index: number) => {
    setRejectionPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const getStatusBadge = (isApproved: boolean) => {
    if (isApproved) {
      return (
        <Badge variant="default" className="gap-1.5 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Утверждено
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1.5">
        <XCircle className="h-3 w-3" />
        Ожидает утверждения
      </Badge>
    )
  }

  const getDialogContent = () => {
    switch (actionType) {
      case 'approve':
        return {
          title: 'Утвердить отчет?',
          description: 'После утверждения данные будут зафиксированы и не смогут быть изменены.',
        }
      case 'reject':
        return {
          title: 'Отклонить отчет?',
          description: 'Укажите причину отклонения в комментарии.',
        }
      default:
        return { title: '', description: '' }
    }
  }

  return (
    <div className="flex items-center gap-3">
      {getStatusBadge(approved)}

      {/* Foreman actions - only show if not approved and user can approve */}
      {canApprove && !approved && (
        <>
          <Button
            onClick={() => handleAction('reject')}
            size="sm"
            variant="outline"
            disabled={approveEntry.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Отклонить
          </Button>
          <Button
            onClick={() => handleAction('approve')}
            size="sm"
            disabled={approveEntry.isPending}
          >
            {approveEntry.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Утвердить
              </>
            )}
          </Button>
        </>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {actionType === 'reject' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-notes">Причина отклонения (обязательно)</Label>
                <Textarea
                  id="rejection-notes"
                  placeholder="Укажите что не так с отчетом..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Photo Upload for Rejection */}
              <div className="space-y-2">
                <Label htmlFor="rejection-photos">Фотографии проблем (необязательно)</Label>
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer">
                    <input
                      id="rejection-photos"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                      <span>
                        <Camera className="mr-2 h-4 w-4" />
                        {rejectionPhotos.length > 0
                          ? `Выбрано фото: ${rejectionPhotos.length}`
                          : 'Добавить фото проблем'}
                      </span>
                    </Button>
                  </label>

                  {/* Photo Preview */}
                  {rejectionPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {rejectionPhotos.map((file, index) => (
                        <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Rejection photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(index)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveEntry.isPending || isUploadingPhotos}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={approveEntry.isPending || isUploadingPhotos || (actionType === 'reject' && !rejectionNotes.trim())}
            >
              {(approveEntry.isPending || isUploadingPhotos) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingPhotos ? 'Загрузка фото...' : 'Обработка...'}
                </>
              ) : (
                'Подтвердить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
