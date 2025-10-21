'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useWorkEntriesForApproval } from '@/lib/hooks/use-work-entries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WorkEntryDetail } from '@/components/progress/work-entry-detail'
import { formatDate, formatMeters } from '@/lib/utils/format'
import { Loader2, CheckCircle2, Clock, FileText, User } from 'lucide-react'
import type { WorkEntry } from '@/types/models'
import { useRouter } from 'next/navigation'

export default function ApprovalsPage() {
  const { worker } = useAuth()
  const router = useRouter()
  const [selectedEntry, setSelectedEntry] = useState<WorkEntry | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')

  const { data: pendingEntries, isLoading: loadingPending } = useWorkEntriesForApproval(false)
  const { data: approvedEntries, isLoading: loadingApproved } = useWorkEntriesForApproval(true)

  // Check if user is foreman
  if (worker && worker.role !== 'foreman' && worker.role !== 'crew') {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground">
              У вас нет доступа к этой странице. Только бригадиры могут утверждать отчеты.
            </p>
            <Button onClick={() => router.push('/projects')} className="mt-4">
              Вернуться к проектам
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleStatusChange = () => {
    setSelectedEntry(null)
    // Queries will auto-refresh
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Утверждение отчетов</h1>
        <p className="text-muted-foreground">
          Проверьте и утвердите отчеты о прогрессе от работников вашей бригады
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ожидают проверки</p>
                <p className="text-3xl font-bold">{pendingEntries?.length || 0}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Утверждено сегодня</p>
                <p className="text-3xl font-bold">
                  {approvedEntries?.filter(e => {
                    const today = new Date().toISOString().split('T')[0]
                    return e.date === today
                  }).length || 0}
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего утверждено</p>
                <p className="text-3xl font-bold">{approvedEntries?.length || 0}</p>
              </div>
              <FileText className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Ожидают проверки
            {(pendingEntries?.length || 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingEntries?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        {/* Pending Approvals */}
        <TabsContent value="pending" className="space-y-4">
          {loadingPending && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingPending && (!pendingEntries || pendingEntries.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-lg">Нет отчетов, ожидающих проверки</p>
                <p className="text-sm mt-1">Все отчеты проверены!</p>
              </CardContent>
            </Card>
          )}

          {!loadingPending && pendingEntries && pendingEntries.length > 0 && (
            <div className="space-y-3">
              {pendingEntries.map((entry) => {
                return (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Ожидает утверждения</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(new Date(entry.date))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Работник ID: {entry.userId.slice(0, 8)}...</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            +{formatMeters(entry.metersDoneM)}
                          </div>
                          <div className="text-xs text-muted-foreground">выполнено</div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Photos */}
                      {entry.photos && entry.photos.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          📸 {entry.photos.length} {entry.photos.length === 1 ? 'фото' : 'фотографий'}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
                          className="flex-1"
                        >
                          Просмотреть и утвердить
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          {loadingApproved && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingApproved && (!approvedEntries || approvedEntries.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>Нет утвержденных отчетов</p>
              </CardContent>
            </Card>
          )}

          {!loadingApproved && approvedEntries && approvedEntries.length > 0 && (
            <div className="space-y-3">
              {approvedEntries.map((entry) => {
                return (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Утверждено
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(new Date(entry.date))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Работник ID: {entry.userId.slice(0, 8)}...</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            +{formatMeters(entry.metersDoneM)}
                          </div>
                          <div className="text-xs text-muted-foreground">выполнено</div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEntry(entry)}
                        className="w-full"
                      >
                        Просмотреть детали
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <WorkEntryDetail
          entry={selectedEntry}
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
