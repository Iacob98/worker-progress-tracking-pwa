'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Image as ImageIcon, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { WorkEntry } from '@/types/models'
import { createClient } from '@/lib/supabase/client'

interface RejectionAlertProps {
  entry: WorkEntry
}

/**
 * Red alert component that displays rejection reason
 * Shows when a work entry has been rejected by manager/admin
 * Includes photos attached by admin explaining the rejection
 */
export function RejectionAlert({ entry }: RejectionAlertProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const supabase = createClient()

  // Only show if entry is rejected
  if (!entry.rejectedAt || !entry.rejectionReason) {
    return null
  }

  const rejectionDate = new Date(entry.rejectedAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Get photo URLs - support both Admin and Worker PWA formats
  const photos = entry.photos || []
  const getPhotoUrl = (photo: any) => {
    // If photo has full URL already, use it
    if (photo.url && photo.url.startsWith('http')) {
      return photo.url
    }

    // Otherwise, construct URL from Supabase Storage
    const path = photo.url || photo.file_path
    if (!path) return null

    const { data } = supabase.storage.from('work-photos').getPublicUrl(path)
    return data.publicUrl
  }

  return (
    <>
      <Alert variant="destructive" className="border-red-500 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-red-800 font-semibold">
          Работа отклонена
        </AlertTitle>
        <AlertDescription className="text-red-700 space-y-3">
          <p className="font-medium">
            Причина: {entry.rejectionReason}
          </p>
          <p className="text-sm text-red-600">
            Отклонено: {rejectionDate}
          </p>

          {/* Admin photos */}
          {photos.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-red-300">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <ImageIcon className="h-4 w-4" />
                <span>Фото от администратора ({photos.length}):</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => {
                  const photoUrl = getPhotoUrl(photo)
                  if (!photoUrl) return null

                  return (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photoUrl)}
                      className="relative aspect-square rounded-md overflow-hidden border-2 border-red-300 hover:border-red-500 transition-colors"
                    >
                      <img
                        src={photoUrl}
                        alt={photo.label || 'Rejection photo'}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-sm text-red-600 mt-2">
            Пожалуйста, исправьте замечания и отправьте работу повторно.
          </p>
        </AlertDescription>
      </Alert>

      {/* Photo preview dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Фото от администратора</DialogTitle>
          </DialogHeader>
          <div className="relative w-full">
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt="Rejection photo"
                className="w-full h-auto rounded-lg"
              />
            )}
          </div>
          <Button variant="outline" onClick={() => setSelectedPhoto(null)}>
            Закрыть
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
