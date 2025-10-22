import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

interface PhotoMetadata {
  workEntryId: string
  stage: 'progress' | 'before' | 'after' | 'issue'
  description?: string
  issueType?: 'quality' | 'safety' | 'missing' | 'incorrect'
  qualityRating?: number
  location?: {
    latitude?: number
    longitude?: number
    address?: string
    segmentId?: string
    cutId?: string
  }
  userId?: string
  tags?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error in work-photos API:', {
        authError,
        hasUser: !!user,
        cookies: request.cookies.getAll(),
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Authenticated user:', user.id)

    // Parse FormData
    const formData = await request.formData()

    // Extract metadata
    const metadataJson = formData.get('metadata')
    if (!metadataJson || typeof metadataJson !== 'string') {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const metadata: PhotoMetadata = JSON.parse(metadataJson)

    // Validate required fields
    if (!metadata.workEntryId) {
      return NextResponse.json({ error: 'Missing workEntryId in metadata' }, { status: 400 })
    }

    // Extract files (file0, file1, file2, ...)
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Upload each file
    const uploadedPhotos = []
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Compress image (similar to client-side compression)
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Generate unique filename
      const photoId = uuidv4()
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const filename = `${timestamp}_${photoId}.${fileExtension}`
      const filePath = `work-entries/${metadata.workEntryId}/${filename}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('work-photos')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
          metadata: {
            workEntryId: metadata.workEntryId,
            stage: metadata.stage,
            description: metadata.description?.slice(0, 100),
            issueType: metadata.issueType,
            uploadedBy: user.id,
            originalName: file.name,
          },
        })

      if (uploadError) {
        console.error('Error uploading photo:', uploadError)
        return NextResponse.json(
          { error: `Failed to upload ${file.name}: ${uploadError.message}` },
          { status: 500 }
        )
      }

      // Save metadata to database
      const photoData = {
        id: photoId,
        work_entry_id: metadata.workEntryId,
        url: filePath,
        ts: new Date().toISOString(),
        gps_lat: metadata.location?.latitude,
        gps_lon: metadata.location?.longitude,
        label: metadata.stage === 'before' ? 'before' : metadata.stage === 'after' ? 'after' : 'during',
        author_user_id: user.id,
      }

      const { error: dbError } = await supabase.from('photos').insert(photoData)

      if (dbError) {
        console.error('Error saving photo metadata:', dbError)
        // Try to delete the uploaded file
        await supabase.storage.from('work-photos').remove([filePath])
        return NextResponse.json(
          { error: `Failed to save photo metadata: ${dbError.message}` },
          { status: 500 }
        )
      }

      uploadedPhotos.push({
        id: photoId,
        url: filePath,
        workEntryId: metadata.workEntryId,
      })
    }

    return NextResponse.json({
      success: true,
      photos: uploadedPhotos,
      count: uploadedPhotos.length,
    })
  } catch (error) {
    console.error('Error in work-photos API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
