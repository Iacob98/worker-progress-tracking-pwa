'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useNVT, useHouses } from '@/lib/hooks/use-nvt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HouseCard } from '@/components/houses/house-card'

export default function HousesListPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const nvtId = params.nvtId as string

  const { data: nvt, isLoading: nvtLoading } = useNVT(nvtId)
  const { data: houses, isLoading: housesLoading } = useHouses(nvtId)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter houses by search query and status
  const filteredHouses = useMemo(() => {
    if (!houses) return []

    let filtered = houses

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((house) =>
        house.address.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((house) => house.connectionStatus === statusFilter)
    }

    return filtered
  }, [houses, searchQuery, statusFilter])

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push(`/projects/${projectId}/nvt/${nvtId}` as any)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к НВТ
        </Button>

        {nvtLoading ? (
          <div className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Загрузка...</span>
          </div>
        ) : nvt ? (
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              {nvt.code} {nvt.name && `- ${nvt.name}`}
            </div>
            <h1 className="text-3xl font-bold">Дома для подключения</h1>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>НВТ точка не найдена</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск по адресу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            Все
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
          >
            Ожидает
          </Button>
          <Button
            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('in_progress')}
          >
            В работе
          </Button>
          <Button
            variant={statusFilter === 'connected' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('connected')}
          >
            Подключен
          </Button>
        </div>
      </div>

      {/* Houses List */}
      {housesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredHouses.length > 0 ? (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            Найдено домов: {filteredHouses.length}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHouses.map((house) => (
              <HouseCard
                key={house.id}
                house={house}
                projectId={projectId}
                nvtId={nvtId}
              />
            ))}
          </div>
        </>
      ) : (
        <Alert>
          <AlertDescription>
            {searchQuery || statusFilter !== 'all'
              ? 'Не найдено домов по вашему запросу'
              : 'В этом НВТ пока нет домов для подключения'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
