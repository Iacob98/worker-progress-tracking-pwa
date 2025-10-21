'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Camera, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { usePhotoUpload, useDeletePhoto } from '@/lib/hooks/use-photos'
import { getPhotoUrl } from '@/lib/utils/storage'
import type { Photo } from '@/types/models'

interface PhotoUploadProps {
  projectId: string
  workEntryId?: string
  photos: Photo[]
  onChange: (photos: Photo[]) => void
  required?: number
  disabled?: boolean
}

export function PhotoUpload({
  projectId,
  workEntryId,
  photos,
  onChange,
  required = 0,
  disabled = false,
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const uploadPhoto = usePhotoUpload()
  const deletePhoto = useDeletePhoto()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadPhoto.mutateAsync({
          file,
          projectId,
          workEntryId,
          photoType: 'progress',
        })
      )

      const uploadedPhotos = await Promise.all(uploadPromises)
      onChange([...photos, ...uploadedPhotos])
    } catch (error) {
      console.error('Error uploading photos:', error)
      alert('Ошибка при загрузке фотографий')
    } finally {
      setIsUploading(false)
      event.target.value = '' // Reset input
    }
  }

  const handleDelete = async (photo: Photo) => {
    try {
      await deletePhoto.mutateAsync({
        photoId: photo.id,
        filePath: photo.url,
      })
      onChange(photos.filter((p) => p.id !== photo.id))
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert('Ошибка при удалении фотографии')
    }
  }

  const isSatisfied = photos.length >= required

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            Фотографии
            {required > 0 && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {required > 0 && (
            <p className="text-sm text-muted-foreground">
              Минимум {required} {required === 1 ? 'фото' : 'фотографий'}
              {photos.length > 0 && ` (загружено ${photos.length})`}
            </p>
          )}
        </div>

        <label>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || isUploading}
            asChild
          >
            <span>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Добавить фото
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <Card key={photo.id} className="relative aspect-square overflow-hidden">
              <img
                src={
                  photo.url.startsWith('blob:')
                    ? photo.url
                    : getPhotoUrl(photo.url)
                }
                alt="Progress photo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to placeholder
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EФото%3C/text%3E%3C/svg%3E'
                }}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0"
                onClick={() => handleDelete(photo)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p className="text-sm">Нет загруженных фотографий</p>
          <p className="text-xs mt-1">
            {required > 0
              ? `Требуется минимум ${required} фото`
              : 'Фотографии необязательны'}
          </p>
        </Card>
      )}

      {!isSatisfied && required > 0 && (
        <p className="text-sm text-orange-600">
          ⚠️ Загрузите еще {required - photos.length}{' '}
          {required - photos.length === 1 ? 'фото' : 'фотографий'} для отправки отчета
        </p>
      )}
    </div>
  )
}
