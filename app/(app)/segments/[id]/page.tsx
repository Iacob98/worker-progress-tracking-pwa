'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ProgressEntryForm } from '@/components/progress/progress-entry-form'
import { ArrowLeft, Plus, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatMeters, formatPercentage } from '@/lib/utils/format'
import { calculateProgress, calculateRemaining } from '@/lib/utils/calculations'
import { useCreateWorkEntry, useWorkEntries, useDeleteWorkEntry } from '@/lib/hooks/use-work-entries'
import { WorkEntryList } from '@/components/progress/work-entry-list'
import { WorkEntryDetail } from '@/components/progress/work-entry-detail'
import type { WorkEntry } from '@/types/models'

export default function SegmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const segmentId = params.id as string

  const [showProgressForm, setShowProgressForm] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<WorkEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null)

  const createWorkEntry = useCreateWorkEntry()
  const deleteWorkEntry = useDeleteWorkEntry()

  // TODO: Fetch segment data using useSegment hook
  // For now, using placeholder data
  const segment = {
    id: segmentId,
    cabinetId: 'cabinet-1',
    name: 'SEG-001',
    lengthPlannedM: 500,
    surface: 'asphalt' as const,
    area: 'roadway' as const,
    status: 'in_progress' as const,
  }

  const projectId = 'project-1' // TODO: Get from route or context

  // Fetch work entries for this segment
  const { data: allEntries } = useWorkEntries({ projectId })
  const segmentEntries = allEntries?.filter(
    entry => entry.segmentId === segmentId
  ) || []

  const handleSubmitProgress = async (data: any, isDraft: boolean) => {
    try {
      await createWorkEntry.mutateAsync({
        projectId: projectId,
        segmentId: segmentId,
        date: new Date().toISOString().split('T')[0],
        stageCode: data.stageCode || 'stage_1_marking',
        metersDoneM: data.meters || 0,
        method: data.method,
        widthM: data.widthM,
        depthM: data.depthM,
        cablesCount: data.cablesCount,
        hasProtectionPipe: data.hasProtectionPipe,
        soilType: data.soilType,
        notes: data.comment,
      })

      // Clear draft from localStorage
      localStorage.removeItem(`draft_${segment.id}`)

      setShowProgressForm(false)
      setEditingEntry(null)
      alert(isDraft ? 'Черновик сохранен' : 'Отчет отправлен на утверждение')
    } catch (error) {
      console.error('Error creating work entry:', error)
      alert('Ошибка при сохранении отчета')
    }
  }

  const handleDeleteEntry = async (entry: WorkEntry) => {
    if (!confirm('Вы уверены, что хотите удалить этот черновик?')) {
      return
    }

    try {
      await deleteWorkEntry.mutateAsync(entry.id)
      setSelectedEntry(null)
      alert('Черновик удален')
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Ошибка при удалении черновика')
    }
  }

  const handleEditEntry = (entry: WorkEntry) => {
    setSelectedEntry(null)
    setEditingEntry(entry)
    setShowProgressForm(true)
  }

  // Calculate progress from work entries
  const totalDone = segmentEntries.reduce((sum, entry) => sum + (entry.metersDoneM || 0), 0)
  const progress = calculateProgress(totalDone, segment.lengthPlannedM)
  const remaining = calculateRemaining(segment.lengthPlannedM, totalDone)

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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{segment.name}</h1>
              <Badge variant={statusColors[segment.status]}>
                {statusLabels[segment.status]}
              </Badge>
            </div>
          </div>

          <Button onClick={() => setShowProgressForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Отчитаться
          </Button>
        </div>

        {/* Segment Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Прогресс сегмента</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Выполнено</span>
                <span className="font-medium">{formatPercentage(progress)}</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <div className="text-sm text-muted-foreground">Плановая длина</div>
                <div className="text-xl font-bold">
                  {formatMeters(segment.lengthPlannedM)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Выполнено</div>
                <div className="text-xl font-bold text-green-600">
                  {formatMeters(totalDone)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Осталось</div>
                <div className="text-xl font-bold text-orange-600">
                  {formatMeters(remaining)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Entries History */}
      <div>
        <h2 className="text-2xl font-bold mb-4">История отчетов</h2>
        <WorkEntryList
          entries={segmentEntries}
          onView={setSelectedEntry}
          onEdit={handleEditEntry}
        />
      </div>

      {/* Work Entry Detail Modal */}
      {selectedEntry && (
        <WorkEntryDetail
          entry={selectedEntry}
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={() => handleEditEntry(selectedEntry)}
          onDelete={() => handleDeleteEntry(selectedEntry)}
        />
      )}

      {/* Progress Report Form Modal */}
      {showProgressForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Отчет о прогрессе - {segment.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProgressForm(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ProgressEntryForm
                segment={segment}
                projectId={projectId}
                onSubmit={handleSubmitProgress}
                onCancel={() => setShowProgressForm(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
