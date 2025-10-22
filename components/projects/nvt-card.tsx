'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MapPin, Box } from 'lucide-react'
import type { NVT } from '@/types/models'
import { formatMeters, formatPercentage } from '@/lib/utils/format'
import { calculateProgress } from '@/lib/utils/calculations'

interface NVTCardProps {
  nvt: NVT
  projectId?: string
}

export function NVTCard({ nvt, projectId }: NVTCardProps) {
  const progress = calculateProgress(nvt.completedLengthM, nvt.totalLengthM)

  const statusColors = {
    pending: 'secondary',
    in_progress: 'default',
    completed: 'outline',
  } as const

  const statusLabels = {
    pending: 'Ожидает',
    in_progress: 'В работе',
    completed: 'Завершен',
  } as const

  const nvtLink = (projectId ? `/projects/${projectId}/nvt/${nvt.id}` : `/projects/${nvt.projectId}/nvt/${nvt.id}`) as any

  return (
    <Link href={nvtLink}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{nvt.code}</CardTitle>
              {nvt.name && (
                <p className="text-sm text-muted-foreground mt-1">{nvt.name}</p>
              )}
            </div>
            <Badge variant={statusColors[nvt.status]}>
              {statusLabels[nvt.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Address */}
          {nvt.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{nvt.address}</p>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-medium">{formatPercentage(progress)}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Выполнено: {formatMeters(nvt.completedLengthM)}</span>
              <span>Всего: {formatMeters(nvt.totalLengthM)}</span>
            </div>
          </div>

          {/* Segment Count */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Box className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Сегментов</div>
              <div className="text-sm font-medium">{nvt.segmentCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
