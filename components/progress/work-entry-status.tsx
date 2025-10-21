'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useApproveWorkEntry } from '@/lib/hooks/use-work-entries'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface WorkEntryStatusProps {
  entryId: string
  approved: boolean
  canApprove?: boolean // true for foreman/admin
  onStatusChange?: () => void
}

export function WorkEntryStatus({
  entryId,
  approved,
  canApprove = false,
  onStatusChange
}: WorkEntryStatusProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState('')

  const approveEntry = useApproveWorkEntry()

  const handleAction = (action: 'approve' | 'reject') => {
    setActionType(action)
    setShowDialog(true)
  }

  const handleConfirm = async () => {
    if (!actionType) return

    try {
      await approveEntry.mutateAsync({
        entryId,
        approved: actionType === 'approve',
        notes: actionType === 'reject' ? rejectionNotes : undefined
      })

      setShowDialog(false)
      setRejectionNotes('')
      onStatusChange?.()
    } catch (error) {
      console.error('Error updating approval status:', error)
    }
  }

  const getStatusBadge = (isApproved: boolean) => {
    if (isApproved) {
      return (
        <Badge variant="default" className="gap-1.5 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Утверждено
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1.5">
        <XCircle className="h-3 w-3" />
        Ожидает утверждения
      </Badge>
    )
  }

  const getDialogContent = () => {
    switch (actionType) {
      case 'approve':
        return {
          title: 'Утвердить отчет?',
          description: 'После утверждения данные будут зафиксированы и не смогут быть изменены.',
        }
      case 'reject':
        return {
          title: 'Отклонить отчет?',
          description: 'Укажите причину отклонения в комментарии.',
        }
      default:
        return { title: '', description: '' }
    }
  }

  return (
    <div className="flex items-center gap-3">
      {getStatusBadge(approved)}

      {/* Foreman actions - only show if not approved and user can approve */}
      {canApprove && !approved && (
        <>
          <Button
            onClick={() => handleAction('reject')}
            size="sm"
            variant="outline"
            disabled={approveEntry.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Отклонить
          </Button>
          <Button
            onClick={() => handleAction('approve')}
            size="sm"
            disabled={approveEntry.isPending}
          >
            {approveEntry.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Утвердить
              </>
            )}
          </Button>
        </>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {actionType === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="rejection-notes">Причина отклонения (обязательно)</Label>
              <Textarea
                id="rejection-notes"
                placeholder="Укажите что не так с отчетом..."
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveEntry.isPending}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={approveEntry.isPending || (actionType === 'reject' && !rejectionNotes.trim())}
            >
              {approveEntry.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Подтвердить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
