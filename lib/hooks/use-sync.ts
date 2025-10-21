'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/offline/db'
import { useOffline } from './use-offline'
import { clearFailedSyncItems } from '@/lib/offline/sync'

export interface SyncStatus {
  pending: number
  inProgress: number
  failed: number
  completed: number
  isSyncing: boolean
  lastSyncAt: Date | null
}

export function useSync() {
  const { isOnline } = useOffline()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pending: 0,
    inProgress: 0,
    failed: 0,
    completed: 0,
    isSyncing: false,
    lastSyncAt: null
  })

  const updateSyncStatus = async () => {
    try {
      const pending = await db.sync_queue.where('status').equals('pending').count()
      const inProgress = await db.sync_queue.where('status').equals('in_progress').count()
      const failed = await db.sync_queue.where('status').equals('failed').count()
      const completed = await db.sync_queue.where('status').equals('completed').count()

      const lastSyncItem = await db.sync_queue
        .where('status')
        .equals('completed')
        .reverse()
        .sortBy('updatedAt')

      setSyncStatus({
        pending,
        inProgress,
        failed,
        completed,
        isSyncing: inProgress > 0,
        lastSyncAt: lastSyncItem[0]?.updatedAt || null
      })
    } catch (error) {
      console.error('Error updating sync status:', error)
    }
  }

  useEffect(() => {
    // Initial load
    updateSyncStatus()

    // Poll every 5 seconds
    const interval = setInterval(updateSyncStatus, 5000)

    // Listen for online restored event
    const handleOnlineRestored = () => {
      updateSyncStatus()
    }

    window.addEventListener('online-restored', handleOnlineRestored)

    // Listen for custom sync events
    const handleSyncUpdate = () => {
      updateSyncStatus()
    }

    window.addEventListener('sync-queue-updated', handleSyncUpdate)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online-restored', handleOnlineRestored)
      window.removeEventListener('sync-queue-updated', handleSyncUpdate)
    }
  }, [])

  // Trigger sync when online
  useEffect(() => {
    if (isOnline && syncStatus.pending > 0) {
      // Dispatch event to trigger sync
      window.dispatchEvent(new Event('trigger-sync'))
    }
  }, [isOnline, syncStatus.pending])

  const clearFailed = async () => {
    try {
      await clearFailedSyncItems()
      await updateSyncStatus()
    } catch (error) {
      console.error('Error clearing failed items:', error)
    }
  }

  return {
    ...syncStatus,
    hasUnsyncedData: syncStatus.pending > 0 || syncStatus.failed > 0,
    refresh: updateSyncStatus,
    clearFailed
  }
}
