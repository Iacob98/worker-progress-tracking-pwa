'use client'

import { useParams, useRouter } from 'next/navigation'
import { useNVT, useSegments } from '@/lib/hooks/use-nvt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowLeft, Search, Loader2, AlertCircle, Plus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SegmentCard } from '@/components/segments/segment-card'
import { CreateSegmentForm } from '@/components/segments/create-segment-form'
import { useState, useMemo } from 'react'

export default function SegmentsListPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const nvtId = params.nvtId as string

  const { data: nvt, isLoading: nvtLoading } = useNVT(nvtId)
  const { data: segments, isLoading: segmentsLoading } = useSegments(nvtId)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Filter segments by search query and status
  const filteredSegments = useMemo(() => {
    if (!segments) return []

    let filtered = segments

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((segment) =>
        segment.name?.toLowerCase().includes(query) ||
        segment.id.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((segment) => segment.status === statusFilter)
    }

    return filtered
  }, [segments, searchQuery, statusFilter])

  const isLoading = nvtLoading || segmentsLoading

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
            <h1 className="text-3xl font-bold">Сегменты</h1>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>НВТ точка не найдена</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск по названию или ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Создать сегмент
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создание нового сегмента</DialogTitle>
                <DialogDescription>
                  Заполните информацию о сегменте для НВТ {nvt?.code}
                </DialogDescription>
              </DialogHeader>
              <CreateSegmentForm
                cabinetId={nvtId}
                onSuccess={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            size="sm"
          >
            Все
          </Button>
          <Button
            variant={statusFilter === 'open' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('open')}
            size="sm"
          >
            Открыт
          </Button>
          <Button
            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('in_progress')}
            size="sm"
          >
            В работе
          </Button>
          <Button
            variant={statusFilter === 'done' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('done')}
            size="sm"
          >
            Завершено
          </Button>
        </div>
      </div>

      {/* Segments List */}
      {segmentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSegments.length > 0 ? (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            Найдено сегментов: {filteredSegments.length}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSegments.map((segment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
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
              ? 'Не найдено сегментов по вашему запросу'
              : 'В этом НВТ пока нет сегментов'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
