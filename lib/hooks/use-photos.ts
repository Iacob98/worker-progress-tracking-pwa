'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/offline/db'
import { queuePhoto } from '@/lib/offline/sync'
import imageCompression from 'browser-image-compression'
import { useOffline } from './use-offline'
import { v4 as uuidv4 } from 'uuid'
import type { Photo } from '@/types/models'

/**
 * Hook for uploading photos with compression and offline support
 */
export function usePhotoUpload() {
  const queryClient = useQueryClient()
  const { isOffline } = useOffline()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      file,
      projectId,
      workEntryId,
      photoType = 'progress',
    }: {
      file: File
      projectId: string
      workEntryId?: string
      photoType?: 'progress' | 'before' | 'after'
    }) => {
      // Validate required parameters
      if (!projectId) {
        throw new Error('projectId is required for photo upload')
      }

      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
      }

      const compressedFile = await imageCompression(file, options)

      const photoId = uuidv4()
      const filename = `${photoId}.jpg`
      const filePath = `${projectId}/${workEntryId || 'temp'}/${filename}`

      // Get geolocation if available
      let latitude: number | undefined
      let longitude: number | undefined

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 60000,
            })
          })
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        } catch (error) {
          console.log('Geolocation not available:', error)
        }
      }

      const photoData: Photo = {
        id: photoId,
        workEntryId,
        cutStageId: undefined,
        url: filePath,
        ts: new Date().toISOString(),
        gpsLat: latitude,
        gpsLon: longitude,
        authorUserId: undefined, // Will be set on server
        label: photoType === 'before' ? 'before' : photoType === 'after' ? 'after' : 'during',
      }

      // If offline, queue for sync
      if (isOffline) {
        await queuePhoto(photoData, compressedFile)
        await db.photos.put(photoData)
        return photoData
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('work-photos')
        .upload(filePath, compressedFile, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        console.error('Error uploading photo:', uploadError)
        // Queue for sync if upload fails
        await queuePhoto(photoData, compressedFile)
        await db.photos.put(photoData as any)
        return photoData
      }

      // Save metadata to database
      const { error: dbError } = await supabase.from('photos').insert({
        id: photoId,
        project_id: projectId,
        work_entry_id: workEntryId,
        url: filePath,
        ts: new Date().toISOString(),
        gps_lat: latitude,
        gps_lon: longitude,
        label: photoType === 'before' ? 'before' : photoType === 'after' ? 'after' : 'during',
      })

      if (dbError) {
        console.error('Error saving photo metadata:', {
          error: dbError,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
          insertData: {
            id: photoId,
            project_id: projectId,
            work_entry_id: workEntryId,
            url: filePath,
            ts: new Date().toISOString(),
            gps_lat: latitude,
            gps_lon: longitude,
            label: photoType === 'before' ? 'before' : photoType === 'after' ? 'after' : 'during',
          }
        })
        throw dbError
      }

      // Cache locally
      await db.photos.put(photoData as any)

      return photoData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })
}

/**
 * Hook for linking photos to a work entry
 * Used when photos are uploaded before work entry is created
 */
export function useLinkPhotosToWorkEntry() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { isOffline } = useOffline()

  return useMutation({
    mutationFn: async ({
      photoIds,
      workEntryId
    }: {
      photoIds: string[]
      workEntryId: string
    }) => {
      if (!photoIds || photoIds.length === 0) {
        return
      }

      // Update local database
      for (const photoId of photoIds) {
        const photo = await db.photos.get(photoId)
        if (photo) {
          await db.photos.update(photoId, { workEntryId })
        }
      }

      if (isOffline) {
        // Queue update for when online
        return
      }

      // Update in Supabase
      const { error } = await supabase
        .from('photos')
        .update({ work_entry_id: workEntryId })
        .in('id', photoIds)

      if (error) {
        console.error('Error linking photos to work entry:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      queryClient.invalidateQueries({ queryKey: ['work_entries'] })
    },
  })
}

/**
 * Hook for deleting a photo
 */
export function useDeletePhoto() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { isOffline } = useOffline()

  return useMutation({
    mutationFn: async ({ photoId, filePath }: { photoId: string; filePath: string }) => {
      // Delete from local database
      await db.photos.delete(photoId)

      if (isOffline) {
        // Queue deletion for when online
        return
      }

      // Delete from Supabase Storage
      await supabase.storage.from('work-photos').remove([filePath])

      // Delete from database
      await supabase.from('photos').delete().eq('id', photoId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })
}
