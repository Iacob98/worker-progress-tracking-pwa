'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Image as ImageIcon } from 'lucide-react'
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

  // Filter photos to show only admin rejection photos
  // Admin photos are identified by the is_after_photo flag or photo_type='issue'
  // The Admin API should set is_after_photo=true when uploading rejection photos
  const allPhotos = entry.photos || []
  const rejectionTimestamp = entry.rejectedAt ? new Date(entry.rejectedAt).getTime() : 0

  console.log('🔍 RejectionAlert - Filtering photos:', {
    entryId: entry.id,
    totalPhotos: allPhotos.length,
    rejectionTimestamp: new Date(rejectionTimestamp).toISOString(),
    allPhotos: allPhotos.map(p => ({
      id: p.id,
      label: p.label,
      photoType: (p as any).photoType,
      isAfterPhoto: (p as any).isAfterPhoto,
      createdAt: (p as any).createdAt,
      ts: p.ts
    }))
  })

  const adminPhotos = allPhotos.filter(photo => {
    // Method 1: Check is_after_photo flag (primary method for Admin API)
    const isMarkedAsAfter = (photo as any).isAfterPhoto === true

    // Method 2: Check photo_type='issue' OR 'problem' (Admin API uses 'problem')
    const photoType = (photo as any).photoType
    const hasIssueType = photoType === 'issue' || photoType === 'problem'

    // Method 3: Check label='after' (for Worker PWA uploads)
    const hasAfterLabel = photo.label === 'after'

    // Method 4: Timestamp check (fallback - photos uploaded after rejection)
    let isAfterRejection = false
    const photoDate = photo.ts || (photo as any).createdAt || (photo as any).taken_at
    if (photoDate && rejectionTimestamp > 0) {
      try {
        const photoTimestamp = new Date(photoDate).getTime()
        if (!isNaN(photoTimestamp)) {
          // 5 second tolerance for clock differences
          isAfterRejection = photoTimestamp >= rejectionTimestamp - 5000
        }
      } catch (error) {
        console.error(`Error checking photo ${photo.id} timestamp:`, error)
      }
    }

    const isAdminPhoto = isMarkedAsAfter || hasIssueType || hasAfterLabel || isAfterRejection

    console.log(`Photo ${photo.id}:`, {
      label: photo.label,
      photoType: (photo as any).photoType,
      isAfterPhoto: (photo as any).isAfterPhoto,
      timestamp: photoDate ? new Date(photoDate).toISOString() : 'none',
      isMarkedAsAfter,
      hasIssueType,
      hasAfterLabel,
      isAfterRejection,
      isAdminPhoto
    })

    return isAdminPhoto
  })

  console.log('📷 Admin rejection photos found:', adminPhotos.length)

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
          {adminPhotos.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-red-300">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <ImageIcon className="h-4 w-4" />
                <span>Фото от администратора ({adminPhotos.length}):</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {adminPhotos.map((photo) => {
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
