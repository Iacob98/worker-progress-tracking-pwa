'use client'

import { useParams, useRouter } from 'next/navigation'
import { useProject } from '@/lib/hooks/use-projects'
import { useNVTs } from '@/lib/hooks/use-nvt'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NVTCard } from '@/components/projects/nvt-card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Search, Loader2, AlertCircle, FileText } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RejectedEntriesList } from '@/components/work-entries/rejected-entries-list'
import { formatMeters, formatPercentage, formatDate } from '@/lib/utils/format'
import { calculateProgress } from '@/lib/utils/calculations'
import { useState, useMemo } from 'react'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const { worker } = useAuth()

  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: nvts, isLoading: nvtsLoading, error } = useNVTs(projectId)

  const [searchQuery, setSearchQuery] = useState('')

  // Filter NVTs by search query
  const filteredNVTs = useMemo(() => {
    if (!nvts) return []
    if (!searchQuery) return nvts

    const query = searchQuery.toLowerCase()
    return nvts.filter(
      (nvt) =>
        nvt.code.toLowerCase().includes(query) ||
        nvt.name?.toLowerCase().includes(query) ||
        nvt.address?.toLowerCase().includes(query)
    )
  }, [nvts, searchQuery])

  const isLoading = projectLoading || nvtsLoading

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Rejected Work Entries Alert */}
      {worker && (
        <div className="mb-6">
          <RejectedEntriesList projectId={projectId} />
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/projects')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к проектам
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/documents`)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Документы проекта
          </Button>
        </div>

        {projectLoading ? (
          <div className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Загрузка проекта...</span>
          </div>
        ) : project ? (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge
                variant={project.status === 'active' ? 'default' : 'secondary'}
              >
                {project.status === 'active' ? 'Активный' : project.status}
              </Badge>
            </div>

            {/* Project Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Общая длина</div>
                <div className="text-2xl font-bold">{formatMeters(project.totalLengthM)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">НВТ точек</div>
                <div className="text-2xl font-bold">{project.cabinetCount}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Период</div>
                <div className="text-lg font-medium">
                  {project.startDate ? formatDate(project.startDate) : '—'}
                  {project.endDatePlan && (
                    <>
                      {' '}
                      — {formatDate(project.endDatePlan)}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Проект не найден</AlertDescription>
          </Alert>
        )}
      </div>

      {/* NVT List Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">НВТ точки</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Поиск по коду, названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading State */}
        {nvtsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !nvtsLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка при загрузке НВТ точек. Проверьте подключение к интернету.
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!nvtsLoading && !error && filteredNVTs.length === 0 && (
          <Alert>
            <AlertDescription>
              {searchQuery
                ? 'Не найдено НВТ точек по вашему запросу'
                : 'В этом проекте пока нет НВТ точек'}
            </AlertDescription>
          </Alert>
        )}

        {/* NVT Grid */}
        {!nvtsLoading && filteredNVTs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNVTs.map((nvt) => (
              <NVTCard key={nvt.id} nvt={nvt} projectId={projectId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
