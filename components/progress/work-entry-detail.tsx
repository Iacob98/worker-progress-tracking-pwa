'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatMeters } from '@/lib/utils/format'
import { CheckCircle2, XCircle, MapPin, Camera, X } from 'lucide-react'
import type { WorkEntry } from '@/types/models'
import { useState } from 'react'
import { WorkEntryStatus } from './work-entry-status'
import { useAuth } from '@/lib/hooks/use-auth'
import { STAGE_LABELS, METHOD_LABELS } from '@/lib/constants/stages'

interface WorkEntryDetailProps {
  entry: WorkEntry
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onStatusChange?: () => void
}

// Stage code labels in Russian

export function WorkEntryDetail({ entry, isOpen, onClose, onEdit, onDelete, onStatusChange }: WorkEntryDetailProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const { worker } = useAuth()

  const canApprove = worker?.role === 'foreman' || worker?.role === 'crew'

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {entry.approved ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-600" />
              )}
              Отчет о работе
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status & Date */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge variant={entry.approved ? 'default' : 'secondary'} className="mb-2">
                      {entry.approved ? 'Утверждено' : 'Ожидает утверждения'}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(new Date(entry.date))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">
                      +{formatMeters(entry.metersDoneM)}
                    </div>
                    <div className="text-sm text-muted-foreground">выполнено</div>
                  </div>
                </div>

                {/* Stage */}
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground">Этап работы</div>
                  <div className="font-medium">
                    {STAGE_LABELS[entry.stageCode] || entry.stageCode}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Детали работы</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {entry.method && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Метод:</span>
                    <span className="font-medium">{METHOD_LABELS[entry.method] || entry.method}</span>
                  </div>
                )}
                {entry.widthM !== null && entry.widthM !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ширина:</span>
                    <span className="font-medium">{entry.widthM} м</span>
                  </div>
                )}
                {entry.depthM !== null && entry.depthM !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Глубина:</span>
                    <span className="font-medium">{entry.depthM} м</span>
                  </div>
                )}
                {entry.cablesCount !== null && entry.cablesCount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Кабелей:</span>
                    <span className="font-medium">{entry.cablesCount}</span>
                  </div>
                )}
                {entry.hasProtectionPipe !== null && entry.hasProtectionPipe !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Защитная труба:</span>
                    <span className="font-medium">{entry.hasProtectionPipe ? 'Да' : 'Нет'}</span>
                  </div>
                )}
                {entry.soilType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Тип грунта:</span>
                    <span className="font-medium">{entry.soilType}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes/Comments */}
            {entry.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Комментарий</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{entry.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Photos */}
            {entry.photos && entry.photos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Фотографии ({entry.photos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {entry.photos.map((photo) => {
                      const photoUrl = photo.url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EФото%3C/text%3E%3C/svg%3E'
                      return (
                        <div
                          key={photo.id}
                          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedPhoto(photo.url || null)}
                        >
                          <img
                            src={photoUrl}
                            alt="Work photo"
                            className="w-full h-full object-cover"
                          />
                          {photo.label && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                              {photo.label}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Статус утверждения</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkEntryStatus
                  entryId={entry.id}
                  approved={entry.approved}
                  canApprove={canApprove}
                  onStatusChange={() => {
                    onStatusChange?.()
                    onClose()
                  }}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              {onEdit && !entry.approved && (
                <Button onClick={onEdit} className="flex-1">
                  Редактировать
                </Button>
              )}
              {onDelete && !entry.approved && (
                <Button onClick={onDelete} variant="destructive" className="flex-1">
                  <X className="mr-2 h-4 w-4" />
                  Удалить
                </Button>
              )}
              <Button onClick={onClose} variant="outline" className="flex-1">
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-5xl">
            <img
              src={selectedPhoto}
              alt="Full size photo"
              className="w-full h-auto"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
