'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ChevronRight, MapPin, Ruler } from 'lucide-react'
import type { Segment } from '@/types/models'
import { formatMeters } from '@/lib/utils/format'

interface SegmentCardProps {
  segment: Segment
  projectId: string
  nvtId: string
}

export function SegmentCard({ segment, projectId, nvtId }: SegmentCardProps) {
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-500'
      case 'in_progress':
        return 'bg-blue-500'
      case 'open':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'done':
        return 'Завершено'
      case 'in_progress':
        return 'В работе'
      case 'open':
        return 'Открыт'
      default:
        return status
    }
  }

  const getSurfaceText = (surface: string) => {
    switch (surface) {
      case 'asphalt':
        return 'Асфальт'
      case 'concrete':
        return 'Бетон'
      case 'pavers':
        return 'Брусчатка'
      case 'green':
        return 'Грунт'
      default:
        return surface
    }
  }

  const getAreaText = (area: string) => {
    switch (area) {
      case 'roadway':
        return 'Проезжая часть'
      case 'sidewalk':
        return 'Тротуар'
      case 'driveway':
        return 'Подъезд'
      case 'green':
        return 'Зеленая зона'
      default:
        return area
    }
  }

  const handleClick = () => {
    router.push(`/projects/${projectId}/nvt/${nvtId}/segment/${segment.id}` as any)
  }

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">
              {segment.name || `Сегмент ${segment.id.slice(0, 8)}`}
            </CardTitle>
            <Badge className={getStatusColor(segment.status)}>
              {getStatusText(segment.status)}
            </Badge>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Length */}
        <div className="flex items-center gap-2 text-sm">
          <Ruler className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Длина:</span>
          <span className="font-medium">{formatMeters(segment.lengthPlannedM)}</span>
        </div>

        {/* Surface & Area */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Покрытие:</span>
          <span className="font-medium">{getSurfaceText(segment.surface)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Зона:</span>
          <span className="font-medium">{getAreaText(segment.area)}</span>
        </div>

        {/* Depth & Width requirements */}
        {segment.depthReqM && (
          <div className="text-sm">
            <span className="text-muted-foreground">Глубина:</span>{' '}
            <span className="font-medium">{segment.depthReqM} м</span>
          </div>
        )}

        {segment.widthReqM && (
          <div className="text-sm">
            <span className="text-muted-foreground">Ширина:</span>{' '}
            <span className="font-medium">{segment.widthReqM} м</span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation()
            handleClick()
          }}
        >
          Открыть сегмент
        </Button>
      </CardContent>
    </Card>
  )
}
