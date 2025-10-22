'use client'

import { useParams, useRouter } from 'next/navigation'
import { useHouse } from '@/lib/hooks/use-nvt'
import { useWorkEntries } from '@/lib/hooks/use-work-entries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Home, Calendar, Loader2, AlertCircle, MapPin, Building } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { WorkEntryCard } from '@/components/work-entries/work-entry-card'

export default function HouseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const nvtId = params.nvtId as string
  const houseId = params.houseId as string

  const { data: house, isLoading: houseLoading } = useHouse(houseId)
  const { data: workEntries, isLoading: entriesLoading } = useWorkEntries({ projectId })

  // Filter work entries for this house
  const houseWorkEntries = workEntries?.filter(entry => entry.houseId === houseId) || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'in_progress':
        return 'bg-blue-500'
      case 'pending':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Подключен'
      case 'in_progress':
        return 'В работе'
      case 'pending':
        return 'Ожидает'
      default:
        return status
    }
  }

  if (houseLoading || entriesLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!house) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Дом не найден</AlertDescription>
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
          onClick={() => router.push(`/projects/${projectId}/nvt/${nvtId}/houses` as any)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к списку домов
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Home className="h-8 w-8 text-muted-foreground mt-1" />
            <div>
              <h1 className="text-3xl font-bold mb-2">{house.address}</h1>
              <Badge className={getStatusColor(house.connectionStatus)}>
                {getStatusText(house.connectionStatus)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* House Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Информация о доме</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Подъездов</div>
                <div className="text-2xl font-bold">{house.entranceCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Квартир</div>
                <div className="text-2xl font-bold">{house.apartmentCount}</div>
              </div>
            </div>

            {house.street && (
              <div className="flex items-start gap-2 pt-2 border-t">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Адрес</div>
                  <div className="font-medium">{house.address}</div>
                </div>
              </div>
            )}

            {house.city && (
              <div className="flex items-start gap-2">
                <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Город</div>
                  <div className="font-medium">{house.city}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Даты подключения</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {house.plannedConnectionDate && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Планируемая дата</div>
                  <div className="font-medium">
                    {formatDate(house.plannedConnectionDate.toISOString())}
                  </div>
                </div>
              </div>
            )}

            {house.actualConnectionDate && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Фактическая дата</div>
                  <div className="font-medium text-green-600">
                    {formatDate(house.actualConnectionDate.toISOString())}
                  </div>
                </div>
              </div>
            )}

            {!house.plannedConnectionDate && !house.actualConnectionDate && (
              <div className="text-sm text-muted-foreground">
                Даты подключения не указаны
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Work Entries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Отчеты о работах</h2>
          <Badge variant="secondary">
            {houseWorkEntries.length} {houseWorkEntries.length === 1 ? 'отчет' : 'отчетов'}
          </Badge>
        </div>

        {houseWorkEntries.length > 0 ? (
          <div className="space-y-4">
            {houseWorkEntries.map((entry) => (
              <WorkEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Для этого дома пока нет отчетов о работах
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
