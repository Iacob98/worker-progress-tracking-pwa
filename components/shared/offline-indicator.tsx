'use client'

import { useOffline } from '@/lib/hooks/use-offline'
import { useSync } from '@/lib/hooks/use-sync'
import { WifiOff, CloudOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OfflineIndicator() {
  const { isOnline, isOffline } = useOffline()
  const { hasUnsyncedData, pending, failed, clearFailed } = useSync()

  if (isOnline && !hasUnsyncedData) {
    return null // Don't show anything when online and synced
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {isOffline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Нет подключения к интернету</span>
        </div>
      )}

      {isOnline && hasUnsyncedData && (
        <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <CloudOff className="h-4 w-4" />
          <span>
            Синхронизация данных... ({pending} ожидает
            {failed > 0 && `, ${failed} ошибок`})
          </span>
          {failed > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFailed}
              className="h-6 px-2 text-white hover:bg-blue-600 ml-2"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Очистить ошибки
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
