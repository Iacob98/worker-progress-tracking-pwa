'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSegment } from '@/lib/hooks/use-nvt'
import { useSegmentWorkEntries } from '@/lib/hooks/use-work-entries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowLeft, Plus, Loader2, AlertCircle, MapPin, Ruler } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WorkEntryCard } from '@/components/work-entries/work-entry-card'
import { WorkEntryForm } from '@/components/work-entries/work-entry-form'
import { SegmentRejectedEntries } from '@/components/work-entries/segment-rejected-entries'
import { formatMeters } from '@/lib/utils/format'

export default function SegmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const nvtId = params.nvtId as string
  const segmentId = params.segmentId as string

  const { data: segment, isLoading: segmentLoading } = useSegment(segmentId)
  const { data: workEntries, isLoading: entriesLoading } = useSegmentWorkEntries(segmentId)

  const [isFormOpen, setIsFormOpen] = useState(false)

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

  // Calculate completed meters
  const completedMeters = workEntries
    ?.filter((entry) => entry.approved)
    .reduce((sum, entry) => sum + entry.metersDoneM, 0) || 0

  const pendingMeters = workEntries
    ?.filter((entry) => !entry.approved && !entry.approvedBy)
    .reduce((sum, entry) => sum + entry.metersDoneM, 0) || 0

  if (segmentLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!segment) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Сегмент не найден</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push(`/projects/${projectId}/nvt/${nvtId}/segments` as any)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к сегментам
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">
            {segment.name || `Сегмент ${segment.id.slice(0, 8)}`}
          </h1>
          <Badge className={getStatusColor(segment.status)}>
            {getStatusText(segment.status)}
          </Badge>
        </div>
      </div>

      {/* Segment Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Планируемая длина
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMeters(segment.lengthPlannedM)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Выполнено (утверждено)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMeters(completedMeters)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              На проверке
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatMeters(pendingMeters)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segment Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Детали сегмента</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Покрытие:</span>
              <span className="font-medium">{getSurfaceText(segment.surface)}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Зона:</span>
              <span className="font-medium">{getAreaText(segment.area)}</span>
            </div>

            {segment.depthReqM && (
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Требуемая глубина:</span>
                <span className="font-medium">{segment.depthReqM} м</span>
              </div>
            )}

            {segment.widthReqM && (
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Требуемая ширина:</span>
                <span className="font-medium">{segment.widthReqM} м</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rejected Entries Alert */}
      <SegmentRejectedEntries segmentId={segmentId} />

      {/* Work Entries Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Отчеты о работах</h2>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Создать отчет
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Новый отчет о работах</DialogTitle>
              </DialogHeader>
              <WorkEntryForm
                projectId={projectId}
                segmentId={segmentId}
                cabinetId={nvtId}
                onSuccess={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {entriesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : workEntries && workEntries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workEntries.map((entry) => (
              <WorkEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              В этом сегменте пока нет отчетов о работах
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
