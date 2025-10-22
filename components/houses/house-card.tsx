'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Home, ChevronRight, Calendar } from 'lucide-react'
import type { House } from '@/types/models'
import { formatDate } from '@/lib/utils/format'

interface HouseCardProps {
  house: House
  projectId: string
  nvtId: string
}

export function HouseCard({ house, projectId, nvtId }: HouseCardProps) {
  const router = useRouter()

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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <CardTitle className="text-base mb-2">{house.address}</CardTitle>
              <Badge className={getStatusColor(house.connectionStatus)}>
                {getStatusText(house.connectionStatus)}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Counts */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Подъездов</div>
            <div className="font-medium text-lg">{house.entranceCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Квартир</div>
            <div className="font-medium text-lg">{house.apartmentCount}</div>
          </div>
        </div>

        {/* Dates */}
        {(house.plannedConnectionDate || house.actualConnectionDate) && (
          <div className="pt-3 border-t space-y-2 text-sm">
            {house.plannedConnectionDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Планируется:</span>
                <span className="font-medium">
                  {formatDate(house.plannedConnectionDate.toISOString())}
                </span>
              </div>
            )}
            {house.actualConnectionDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Подключен:</span>
                <span className="font-medium">
                  {formatDate(house.actualConnectionDate.toISOString())}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/projects/${projectId}/nvt/${nvtId}/houses/${house.id}` as any)}
        >
          <ChevronRight className="mr-2 h-4 w-4" />
          Подробнее
        </Button>
      </CardContent>
    </Card>
  )
}
