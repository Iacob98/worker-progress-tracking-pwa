import { db } from './db'
import { createClient } from '@/lib/supabase/client'
import type { WorkEntry, Photo, SyncQueueItem } from '@/types/models'
import { v4 as uuidv4 } from 'uuid'
import { transformWorkEntryToDb, transformPhotoToDb, removeUndefined } from '@/lib/utils/transform'

/**
 * Add work entry to sync queue
 */
export async function queueEntry(entry: Partial<WorkEntry>) {
  try {
    const queueItem: SyncQueueItem = {
      id: uuidv4(),
      type: 'work_entry',
      data: entry,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.sync_queue.add(queueItem)

    // Notify listeners
    window.dispatchEvent(new Event('sync-queue-updated'))

    return queueItem.id
  } catch (error) {
    console.error('Error queueing entry:', error)
    throw error
  }
}

/**
 * Add photo to sync queue
 */
export async function queuePhoto(photo: Partial<Photo>, file: File) {
  try {
    const queueItem: SyncQueueItem = {
      id: uuidv4(),
      type: 'photo',
      data: {
        ...photo,
        file // Store file blob for upload
      },
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.sync_queue.add(queueItem)

    // Notify listeners
    window.dispatchEvent(new Event('sync-queue-updated'))

    return queueItem.id
  } catch (error) {
    console.error('Error queueing photo:', error)
    throw error
  }
}

/**
 * Process sync queue - upload pending items
 */
export async function processSyncQueue() {
  const supabase = createClient()

  try {
    // Get all pending items
    const pendingItems = await db.sync_queue
      .where('status')
      .equals('pending')
      .or('status')
      .equals('failed')
      .and(item => item.retryCount < 3)
      .toArray()

    if (pendingItems.length === 0) {
      return { success: true, synced: 0, failed: [] }
    }

    const results: { success: boolean; id: string; error?: string }[] = []

    for (const item of pendingItems) {
      try {
        // Mark as in progress
        await db.sync_queue.update(item.id, {
          status: 'in_progress',
          updatedAt: new Date()
        })

        if (item.type === 'work_entry') {
          // Transform work entry from camelCase to snake_case for database
          const dbEntry = transformWorkEntryToDb(item.data as WorkEntry)
          const cleanEntry = removeUndefined(dbEntry)

          // Upload work entry
          const { data, error } = await supabase
            .from('work_entries')
            .insert(cleanEntry)
            .select()
            .single()

          if (error) throw error

          console.log('Work entry synced successfully:', data?.id)

          // Mark as completed
          await db.sync_queue.update(item.id, {
            status: 'completed',
            updatedAt: new Date()
          })

          results.push({ success: true, id: item.id })
        } else if (item.type === 'photo') {
          // Upload photo file first
          const file = item.data.file as File
          const filePath = `${item.data.projectId}/${item.data.workEntryId}/${item.id}.jpg`

          const { error: uploadError } = await supabase.storage
            .from('work-photos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) throw uploadError

          // Transform photo from camelCase to snake_case for database
          const photoData = { ...item.data, file: undefined }
          const dbPhoto = transformPhotoToDb(photoData as Photo)
          const cleanPhoto = removeUndefined(dbPhoto)

          // Then insert photo metadata
          const { data, error } = await supabase
            .from('photos')
            .insert(cleanPhoto)
            .select()
            .single()

          if (error) throw error

          console.log('Photo synced successfully:', data?.id)

          // Mark as completed
          await db.sync_queue.update(item.id, {
            status: 'completed',
            updatedAt: new Date()
          })

          results.push({ success: true, id: item.id })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Increment retry count and mark as failed
        await db.sync_queue.update(item.id, {
          status: 'failed',
          retryCount: item.retryCount + 1,
          lastError: errorMessage,
          updatedAt: new Date()
        })

        results.push({ success: false, id: item.id, error: errorMessage })
      }
    }

    // Notify listeners
    window.dispatchEvent(new Event('sync-queue-updated'))

    return {
      success: results.every(r => r.success),
      synced: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success)
    }
  } catch (error) {
    console.error('Error processing sync queue:', error)
    return { success: false, synced: 0, failed: [] }
  }
}

/**
 * Retry failed items in sync queue
 */
export async function retryFailed() {
  try {
    const failedItems = await db.sync_queue
      .where('status')
      .equals('failed')
      .toArray()

    // Reset failed items to pending
    for (const item of failedItems) {
      await db.sync_queue.update(item.id, {
        status: 'pending',
        lastError: undefined,
        updatedAt: new Date()
      })
    }

    // Trigger sync
    return await processSyncQueue()
  } catch (error) {
    console.error('Error retrying failed items:', error)
    throw error
  }
}

/**
 * Get sync queue status
 */
export async function getSyncQueueStatus() {
  try {
    const pending = await db.sync_queue.where('status').equals('pending').count()
    const inProgress = await db.sync_queue.where('status').equals('in_progress').count()
    const failed = await db.sync_queue.where('status').equals('failed').count()
    const completed = await db.sync_queue.where('status').equals('completed').count()

    return {
      pending,
      inProgress,
      failed,
      completed,
      total: pending + inProgress + failed + completed
    }
  } catch (error) {
    console.error('Error getting sync queue status:', error)
    return { pending: 0, inProgress: 0, failed: 0, completed: 0, total: 0 }
  }
}

/**
 * Clear completed sync queue items (older than 7 days)
 */
export async function clearCompletedSyncItems() {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  try {
    await db.sync_queue
      .where('status')
      .equals('completed')
      .and(item => item.updatedAt < sevenDaysAgo)
      .delete()
  } catch (error) {
    console.error('Error clearing completed sync items:', error)
  }
}

/**
 * Clear all failed sync queue items
 * Useful after schema changes when old data is incompatible
 */
export async function clearFailedSyncItems() {
  try {
    const deleted = await db.sync_queue
      .where('status')
      .equals('failed')
      .delete()

    console.log(`Cleared ${deleted} failed sync items`)

    // Notify listeners
    window.dispatchEvent(new Event('sync-queue-updated'))

    return deleted
  } catch (error) {
    console.error('Error clearing failed sync items:', error)
    throw error
  }
}

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online-restored', () => {
    processSyncQueue().catch(console.error)
  })

  window.addEventListener('trigger-sync', () => {
    processSyncQueue().catch(console.error)
  })
}
