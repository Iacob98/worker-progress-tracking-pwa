'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { WorkEntry } from '@/types/models'

interface RejectionAlertProps {
  entry: WorkEntry
}

/**
 * Red alert component that displays rejection reason
 * Shows when a work entry has been rejected by manager/admin
 */
export function RejectionAlert({ entry }: RejectionAlertProps) {
  // Only show if entry is rejected
  if (!entry.rejectedAt || !entry.rejectionReason) {
    return null
  }

  const rejectionDate = new Date(entry.rejectedAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <Alert variant="destructive" className="border-red-500 bg-red-50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-red-800 font-semibold">
        Работа отклонена
      </AlertTitle>
      <AlertDescription className="text-red-700 space-y-2">
        <p className="font-medium">
          Причина: {entry.rejectionReason}
        </p>
        <p className="text-sm text-red-600">
          Отклонено: {rejectionDate}
        </p>
        <p className="text-sm text-red-600 mt-2">
          Пожалуйста, исправьте замечания и отправьте работу повторно.
        </p>
      </AlertDescription>
    </Alert>
  )
}
