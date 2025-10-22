'use client'

import { useParams, useRouter } from 'next/navigation'
import { useNVT, useSegments, useHouses } from '@/lib/hooks/use-nvt'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, MapPin, Box, Home, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatMeters, formatPercentage } from '@/lib/utils/format'
import { calculateProgress, calculateRemaining } from '@/lib/utils/calculations'

export default function NVTDetailPage() {
  const params = useParams()
  const router = useRouter()
  const nvtId = params.id as string

  const { data: nvt, isLoading: nvtLoading } = useNVT(nvtId)
  const { data: segments, isLoading: segmentsLoading } = useSegments(nvtId)
  const { data: houses, isLoading: housesLoading } = useHouses(nvtId)

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
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{nvt.code}</h1>
            <Badge variant={statusColors[nvt.status]}>
              {statusLabels[nvt.status]}
            </Badge>
          </div>

          {nvt.name && (
            <p className="text-xl text-muted-foreground mb-2">{nvt.name}</p>
          )}

          {nvt.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{nvt.address}</span>
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

      {/* Segments Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Сегменты</h2>

        {segmentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : segments && segments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment) => {
              return (
                <Card key={segment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{segment.name || 'Сегмент'}</CardTitle>
                      <Badge
                        variant={
                          segment.status === 'done'
                            ? 'outline'
                            : segment.status === 'in_progress'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {segment.status === 'done'
                          ? 'Завершен'
                          : segment.status === 'in_progress'
                          ? 'В работе'
                          : 'Открыт'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Длина</div>
                        <div className="font-medium">
                          {formatMeters(segment.lengthPlannedM)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Покрытие</div>
                        <div className="font-medium capitalize">{segment.surface}</div>
                      </div>
                    </div>
                    {segment.area && (
                      <div className="text-sm pt-2 border-t">
                        <div className="text-muted-foreground">Область</div>
                        <div className="font-medium capitalize">{segment.area}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Alert>
            <AlertDescription>В этом НВТ пока нет сегментов</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Houses Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Дома для подключения</h2>

        {housesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : houses && houses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {houses.map((house) => (
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
