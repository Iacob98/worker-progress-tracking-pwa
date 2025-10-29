'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatMeters } from '@/lib/utils/format'
import { CheckCircle2, XCircle, Eye } from 'lucide-react'
import type { WorkEntry, StageCode } from '@/types/models'
import { STAGE_LABELS, METHOD_LABELS } from '@/lib/constants/stages'

interface WorkEntryListProps {
  entries: WorkEntry[]
  onView: (entry: WorkEntry) => void
  onEdit?: (entry: WorkEntry) => void
}

export function WorkEntryList({ entries, onView, onEdit }: WorkEntryListProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Нет отчетов о прогрессе</p>
          <p className="text-sm mt-1">Создайте первый отчет, нажав кнопку "Отчитаться"</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const isApproved = entry.approved
        const Icon = isApproved ? CheckCircle2 : XCircle

        return (
          <Card key={entry.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isApproved ? 'text-green-600' : 'text-gray-600'}`} />
                    <Badge variant={isApproved ? 'default' : 'secondary'}>
                      {isApproved ? 'Утверждено' : 'Ожидает утверждения'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">
                    {formatDate(new Date(entry.date))}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {STAGE_LABELS[entry.stageCode] || entry.stageCode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    +{formatMeters(entry.metersDoneM)}
                  </div>
                  <div className="text-xs text-muted-foreground">выполнено</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Method */}
              {entry.method && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Метод: </span>
                  <span className="font-medium">{entry.method}</span>
                </div>
              )}

              {/* Photos */}
              {entry.photos && entry.photos.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  📸 {entry.photos.length} {entry.photos.length === 1 ? 'фото' : 'фотографий'}
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Комментарий: </span>
                  <span className="text-muted-foreground italic">{entry.notes}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(entry)}
                  className="flex-1"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Просмотр
                </Button>
                {onEdit && !isApproved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(entry)}
                    className="flex-1"
                  >
                    Редактировать
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
