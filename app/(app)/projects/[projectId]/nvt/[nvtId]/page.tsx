'use client'

import { useParams, useRouter } from 'next/navigation'
import { useNVT, useSegments, useHouses } from '@/lib/hooks/use-nvt'
import { useProject } from '@/lib/hooks/use-projects'
import { useNVTPlan } from '@/lib/hooks/use-nvt-plan'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, MapPin, Box, Home, Loader2, AlertCircle, Plus, FileText, Eye } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatMeters, formatPercentage } from '@/lib/utils/format'
import { calculateProgress } from '@/lib/utils/calculations'
import { SegmentCard } from '@/components/segments/segment-card'
import { NVTRejectedEntries } from '@/components/work-entries/nvt-rejected-entries'

export default function NVTDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const nvtId = params.nvtId as string

  const { data: project } = useProject(projectId)
  const { data: nvt, isLoading: nvtLoading } = useNVT(nvtId)
  const { data: segments, isLoading: segmentsLoading } = useSegments(nvtId)
  const { data: houses, isLoading: housesLoading } = useHouses(nvtId)
  const { data: nvtPlan, isLoading: planLoading } = useNVTPlan(nvtId)

  // Debug logging for NVT plan
  console.log('🔍 NVT Plan Debug:', {
    nvtId,
    planLoading,
    hasPlanData: !!nvtPlan,
    planFileUrl: nvtPlan?.plan_file_url,
    fullPlanData: nvtPlan
  })

  const progress = nvt ? calculateProgress(nvt.completedLengthM, nvt.totalLengthM) : 0

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

  if (nvtLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!nvt) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>НВТ точка не найдена</AlertDescription>
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
          onClick={() => router.push(`/projects/${projectId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к проекту
        </Button>

        <div>
          <div className="text-sm text-muted-foreground mb-1">
            {project?.name}
          </div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold mb-2">
              {nvt.name || nvt.code}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Код: {nvt.code}
              </span>
              <Badge variant={statusColors[nvt.status]}>
                {statusLabels[nvt.status]}
              </Badge>
            </div>
          </div>

          {nvt.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{nvt.address}</span>
            </div>
          )}

          {/* Installation Plan Button */}
          {nvtPlan?.plan_file_url && (
            <div className="mt-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">
                    План установки
                  </h3>
                  {nvtPlan.plan_description && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {nvtPlan.plan_description}
                    </p>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(nvtPlan.plan_file_url!, '_blank', 'noopener,noreferrer')}
                    className="gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                    disabled={planLoading}
                  >
                    <Eye className="h-4 w-4" />
                    {nvtPlan.plan_title || 'Просмотр плана'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* NVT Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Прогресс</div>
            <div className="text-2xl font-bold">{formatPercentage(progress)}</div>
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {formatMeters(nvt.completedLengthM)} из {formatMeters(nvt.totalLengthM)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Сегментов</div>
            <div className="text-2xl font-bold">{nvt.segmentCount}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Домов</div>
            <div className="text-2xl font-bold">
              {houses?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Rejected Entries Alert */}
      <NVTRejectedEntries projectId={projectId} nvtId={nvtId} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/projects/${projectId}/nvt/${nvtId}/segments` as any)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Box className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Работа с сегментами</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Создавайте отчеты о выполнении работ
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/projects/${projectId}/nvt/${nvtId}/houses` as any)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Home className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Подключение домов</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Отчеты о подключении домов
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Segments Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Сегменты</h2>
          <Button onClick={() => router.push(`/projects/${projectId}/nvt/${nvtId}/segments` as any)}>
            Все сегменты
          </Button>
        </div>

        {segmentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : segments && segments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.slice(0, 6).map((segment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                projectId={projectId}
                nvtId={nvtId}
              />
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>В этом НВТ пока нет сегментов</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Houses Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Дома для подключения</h2>
          <Button onClick={() => router.push(`/projects/${projectId}/nvt/${nvtId}/houses` as any)}>
            Все дома
          </Button>
        </div>

        {housesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : houses && houses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {houses.slice(0, 4).map((house) => (
              <Card key={house.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <CardTitle className="text-base">{house.address}</CardTitle>
                    </div>
                    <Badge
                      variant={
                        house.connectionStatus === 'connected'
                          ? 'outline'
                          : house.connectionStatus === 'in_progress'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {house.connectionStatus === 'connected'
                        ? 'Подключен'
                        : house.connectionStatus === 'in_progress'
                        ? 'В работе'
                        : 'Ожидает'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Подъездов</div>
                      <div className="font-medium">{house.entranceCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Квартир</div>
                      <div className="font-medium">{house.apartmentCount}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              В этом НВТ пока нет домов для подключения
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
