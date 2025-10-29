'use client'

import { useWorkEntries } from '@/lib/hooks/use-work-entries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Edit, Calendar, Ruler, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { WorkEntry } from '@/types/models'
import { STAGE_LABELS, METHOD_LABELS } from '@/lib/constants/stages'

interface NVTRejectedEntriesProps {
  projectId: string
  nvtId: string
}

/**
 * Component that displays rejected work entries for a specific NVT
 * Shows entries grouped by segment
 */
export function NVTRejectedEntries({ projectId, nvtId }: NVTRejectedEntriesProps) {
  const router = useRouter()
  const { data: entries, isLoading } = useWorkEntries({
    projectId,
  })

  // Filter only rejected entries for this NVT (by cabinetId)
  const rejectedEntries = entries?.filter(entry =>
    entry.rejectedAt && entry.cabinetId === nvtId
  ) || []

  if (isLoading) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Загрузка отклоненных работ...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (rejectedEntries.length === 0) {
    return null
  }

  return (
    <Card className="border-red-300 bg-red-50 shadow-lg mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-red-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Отклоненные работы ({rejectedEntries.length})
        </CardTitle>
        <CardDescription className="text-red-700">
          Требуется исправление и повторная отправка
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rejectedEntries.map((entry) => (
          <RejectedEntryCard
            key={entry.id}
            entry={entry}
            onEdit={() => router.push(`/work-entries/${entry.id}/edit`)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface RejectedEntryCardProps {
  entry: WorkEntry
  onEdit: () => void
}

function RejectedEntryCard({ entry, onEdit }: RejectedEntryCardProps) {
  const rejectionDate = new Date(entry.rejectedAt!).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  const workDate = new Date(entry.date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  // Get stage name in Russian
  const stageName = getStageNameRu(entry.stageCode)

  return (
    <div className="bg-white border border-red-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="destructive" className="bg-red-600">
              Отклонено
            </Badge>
            <span className="text-sm text-gray-600">
              {rejectionDate}
            </span>
          </div>

          {/* Segment info */}
          {entry.segment && entry.segment.name && (
            <div className="text-sm font-medium text-gray-900 mt-2">
              Сегмент: {entry.segment.name}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-700 mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {workDate}
            </div>
            <div className="flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              {entry.metersDoneM} м
            </div>
          </div>

          <p className="text-sm font-medium text-gray-900 mt-1">
            {stageName}
          </p>
        </div>

        <Button
          onClick={onEdit}
          size="sm"
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          <Edit className="h-4 w-4 mr-1" />
          Исправить
        </Button>
      </div>

      <div className="bg-red-100 border border-red-200 rounded p-3">
        <p className="text-xs font-semibold text-red-900 mb-1">
          Причина отклонения:
        </p>
        <p className="text-sm text-red-800">
          {entry.rejectionReason}
        </p>
      </div>
    </div>
  )
}

// Helper function to get stage name in Russian
function getStageNameRu(stageCode: string): string {
  const stageNames: Record<string, string> = {
    stage_1_marking: 'Разметка',
    stage_2_excavation: 'Вскопка/Экскавация',
    stage_3_conduit: 'Прокладка защитной трубы',
    stage_4_cable: 'Прокладка кабеля',
    stage_5_splice: 'Сплайсинг/Соединение',
    stage_6_test: 'Тестирование',
    stage_7_connect: 'Подключение',
    stage_8_final: 'Финальная проверка',
    stage_9_backfill: 'Засыпка',
    stage_10_surface: 'Восстановление покрытия',
  }
  return stageNames[stageCode] || stageCode
}
