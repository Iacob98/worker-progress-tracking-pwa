/**
 * Storage utilities for Supabase Storage
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Get public URL for a photo from Supabase Storage
 * @param path - Storage path (e.g., "projectId/temp/photoId.jpg")
 * @returns Public URL to access the photo
 */
export function getPhotoUrl(path: string): string {
  const supabase = createClient()

  const { data } = supabase.storage
    .from('work-photos')
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Get public URL for a photo from Photo object
 * @param photo - Photo object with url field
 * @returns Public URL to access the photo
 */
export function getPhotoUrlFromObject(photo: { url: string }): string {
  return getPhotoUrl(photo.url)
}
