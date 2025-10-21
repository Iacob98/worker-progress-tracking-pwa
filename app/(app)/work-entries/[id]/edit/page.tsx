'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWorkEntry, useUpdateWorkEntry, useDeleteWorkEntry } from '@/lib/hooks/use-work-entries'
import { WorkEntryEditForm } from '@/components/work-entries/work-entry-edit-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { RejectionAlert } from '@/components/work-entries/rejection-alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

/**
 * Page for editing rejected work entries
 * Allows worker to fix issues and resubmit for approval
 */
export default function EditWorkEntryPage() {
  const params = useParams()
  const router = useRouter()
  const entryId = params.id as string
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: entry, isLoading } = useWorkEntry(entryId)
  const deleteEntry = useDeleteWorkEntry()

  const handleDelete = async () => {
    if (!entry) return

    // Only allow deletion if not approved
    if (entry.approved) {
      toast.error('Нельзя удалить одобренный отчет')
      return
    }

    try {
      setIsDeleting(true)
      await deleteEntry.mutateAsync(entryId)
      toast.success('Отчет успешно удален')
      router.push(`/projects/${entry.projectId}`)
    } catch (error) {
      console.error('Error deleting work entry:', error)
      toast.error('Ошибка при удалении отчета')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Отчет не найден</CardTitle>
            <CardDescription>
              Запрашиваемый отчет не существует или был удален
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if entry can be edited or deleted
  const canModify = !entry.approved

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Back Button */}
      <div className="mb-6 flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к проекту
        </Button>

        {/* Delete Button - only for unapproved entries */}
        {canModify && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить отчет
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить отчет?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Отчет и все связанные с ним фотографии будут удалены навсегда.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Удаление...
                    </>
                  ) : (
                    'Удалить'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Rejection Alert */}
      {entry.rejectedAt && (
        <div className="mb-6">
          <RejectionAlert entry={entry} />
        </div>
      )}

      {/* Approval Notice - if already approved */}
      {entry.approved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✓ Этот отчет одобрен и доступен только для просмотра. Редактирование и удаление невозможны.
          </p>
        </div>
      )}

      {/* Edit Form or View Only */}
      <Card>
        <CardHeader>
          <CardTitle>{canModify ? 'Редактирование отчета' : 'Просмотр отчета'}</CardTitle>
          <CardDescription>
            {canModify
              ? 'Внесите необходимые изменения и отправьте отчет повторно'
              : 'Отчет одобрен и не может быть изменен'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkEntryEditForm
            entry={entry}
            onSuccess={() => {
              router.push(`/projects/${entry.projectId}`)
            }}
            disabled={!canModify}
          />
        </CardContent>
      </Card>
    </div>
  )
}
