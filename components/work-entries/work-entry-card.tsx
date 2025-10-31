'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Ruler, CheckCircle, XCircle, Clock, Image as ImageIcon, Edit, Eye } from 'lucide-react'
import type { WorkEntry } from '@/types/models'
import { formatMeters, formatDate } from '@/lib/utils/format'
import { getSoilTypeLabel } from '@/lib/constants/soil-types'
import { STAGE_LABELS, METHOD_LABELS } from '@/lib/constants/stages'
import { useRouter } from 'next/navigation'

interface WorkEntryCardProps {
  entry: WorkEntry
  onView?: () => void
}

export function WorkEntryCard({ entry, onView }: WorkEntryCardProps) {
  const router = useRouter()

  const handleEdit = () => {
    router.push(`/work-entries/${entry.id}/edit`)
  }

  const getApprovalBadge = () => {
    // Check if rejected (has rejectedAt timestamp)
    if (entry.rejectedAt) {
      return (
        <Badge variant="destructive" className="bg-red-600">
          <XCircle className="h-3 w-3 mr-1" />
          Отклонено
        </Badge>
      )
    }

    if (entry.approved) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Утверждено
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-yellow-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          На проверке
        </Badge>
      )
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">
              {STAGE_LABELS[entry.stageCode] || entry.stageCode}
            </CardTitle>
            {getApprovalBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Дата:</span>
          <span className="font-medium">{formatDate(entry.date)}</span>
        </div>

        {/* Meters Done */}
        <div className="flex items-center gap-2 text-sm">
          <Ruler className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Выполнено:</span>
          <span className="font-medium text-lg text-primary">
            {formatMeters(entry.metersDoneM)}
          </span>
        </div>

        {/* Method */}
        {entry.method && (
          <div className="text-sm">
            <span className="text-muted-foreground">Метод:</span>{' '}
            <Badge variant="outline">{METHOD_LABELS[entry.method] || entry.method}</Badge>
          </div>
        )}

        {/* Soil Type */}
        {entry.soilType && (
          <div className="text-sm">
            <span className="text-muted-foreground">Тип грунта:</span>{' '}
            <Badge variant="outline">{getSoilTypeLabel(entry.soilType)}</Badge>
          </div>
        )}

        {/* Dimensions */}
        {(entry.depthM || entry.widthM) && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {entry.depthM && (
              <div>
                <span className="text-muted-foreground">Глубина:</span>{' '}
                <span className="font-medium">{entry.depthM} м</span>
              </div>
            )}
            {entry.widthM && (
              <div>
                <span className="text-muted-foreground">Ширина:</span>{' '}
                <span className="font-medium">{entry.widthM} м</span>
              </div>
            )}
          </div>
        )}

        {/* Photos count */}
        {entry.photos && entry.photos.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Фото: {entry.photos.length}
            </span>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="text-sm pt-2 border-t">
            <div className="text-muted-foreground mb-1">Заметки:</div>
            <p className="text-sm line-clamp-2">{entry.notes}</p>
          </div>
        )}

        {/* Approval info */}
        {entry.approvedBy && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {entry.approved ? (
              <>Утверждено {entry.approvedAt && formatDate(entry.approvedAt)}</>
            ) : (
              <>Отклонено {entry.approvedAt && formatDate(entry.approvedAt)}</>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {!entry.approved ? (
            <Button variant="default" className="flex-1" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Редактировать
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" onClick={handleEdit}>
              <Eye className="mr-2 h-4 w-4" />
              Просмотр
            </Button>
          )}
          {onView && (
            <Button variant="outline" onClick={onView}>
              Детали
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
