# API Contracts: Worker Progress Tracking

**Feature**: Worker Progress Tracking PWA
**Date**: 2025-10-16
**Architecture**: Supabase-First (PostgreSQL + Auth + Storage + Realtime)

## Overview

This PWA uses **Supabase** as the primary backend, meaning most API operations are performed through the Supabase JavaScript client rather than custom REST endpoints. This document defines:

1. **Supabase Client Patterns**: How the PWA interacts with Supabase
2. **Custom API Routes**: Any Next.js API routes needed beyond Supabase
3. **Realtime Subscriptions**: How the app receives live updates
4. **Storage Operations**: Photo upload patterns

---

## Supabase Client Patterns

### Authentication

All auth operations use `@supabase/auth-helpers-nextjs`:

```typescript
// Login with email + PIN
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'worker@example.com',
  password: '1234' // PIN (bcrypt hashed in database)
})

// Get current session
const { data: { session } } = await supabase.auth.getSession()

// Logout
await supabase.auth.signOut()

// Reset PIN
await supabase.auth.resetPasswordForEmail('worker@example.com')
```

---

### Database Queries

All database operations use Row Level Security (RLS):

#### Projects

```typescript
// Get assigned projects
const { data: projects } = await supabase
  .from('projects')
  .select(`
    *,
    crews!inner(
      id,
      name,
      crew_members!inner(user_id)
    )
  `)
  .eq('crews.crew_members.user_id', userId)
  .eq('crews.crew_members.is_active', true)

// Get project details
const { data: project } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single()
```

#### Cabinets (NVT Points)

```typescript
// Get cabinets for a project
const { data: cabinets } = await supabase
  .from('cabinets')
  .select(`
    *,
    segments(count)
  `)
  .eq('project_id', projectId)
  .order('code')

// Search cabinets
const { data: cabinets } = await supabase
  .from('cabinets')
  .select('*')
  .eq('project_id', projectId)
  .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
```

#### Segments

```typescript
// Get segments for a cabinet with progress
const { data: segments } = await supabase
  .from('v_segment_progress')
  .select('*')
  .eq('cabinet_id', cabinetId)
  .order('segment_code')
```

#### Work Stages

```typescript
// Get available work stages
const { data: stages } = await supabase
  .from('work_stages')
  .select('*')
  .or(`project_id.is.null,project_id.eq.${projectId}`)
  .eq('is_active', true)
  .order('order')
```

#### Work Entries

```typescript
// Create draft entry
const { data: entry } = await supabase
  .from('work_entries')
  .insert({
    project_id: projectId,
    user_id: userId,
    crew_id: crewId,
    work_type: 'segment_progress',
    start_time: new Date().toISOString(),
    status: 'draft',
    description: 'Cable installation',
    latitude: gpsLat,
    longitude: gpsLng
  })
  .select()
  .single()

// Create segment work entry link
const { data } = await supabase
  .from('segment_work_entries')
  .insert({
    segment_id: segmentId,
    work_entry_id: entryId,
    work_stage_id: stageId,
    meters_completed: metersValue,
    stage_data: { /* dynamic fields */ },
    checklist_completed: [ /* checklist status */ ]
  })

// Submit entry (change status)
const { data } = await supabase
  .from('work_entries')
  .update({ status: 'submitted', end_time: new Date().toISOString() })
  .eq('id', entryId)

// Get my entries filtered by status
const { data: entries } = await supabase
  .from('work_entries')
  .select(`
    *,
    photos(id, file_path, thumbnail_path, photo_type),
    segment_work_entries(
      meters_completed,
      segments(code, length_planned_m)
    )
  `)
  .eq('user_id', userId)
  .eq('status', 'returned')
  .order('created_at', { ascending: false })
```

#### Photos

```typescript
// Get photos for an entry
const { data: photos } = await supabase
  .from('photos')
  .select('*')
  .eq('work_entry_id', entryId)
  .order('created_at')

// Create photo record (after upload to storage)
const { data: photo } = await supabase
  .from('photos')
  .insert({
    project_id: projectId,
    work_entry_id: entryId,
    filename: file.name,
    file_path: storagePath,
    thumbnail_path: thumbnailPath,
    taken_at: exifDate,
    taken_by: userId,
    photo_type: 'progress',
    location_point: { lat: gpsLat, lng: gpsLng }
  })
  .select()
  .single()
```

#### Appointments

```typescript
// Get today's appointments
const { data: appointments } = await supabase
  .from('appointments')
  .select('*')
  .eq('user_id', userId)
  .gte('start_time', startOfDay)
  .lte('start_time', endOfDay)
  .order('start_time')

// Update appointment status
const { data } = await supabase
  .from('appointments')
  .update({ status: 'completed', notes: 'Connection successful' })
  .eq('id', appointmentId)
```

---

## Storage Operations

### Photo Upload

```typescript
// Upload photo to Supabase Storage
const filePath = `${projectId}/${userId}/${entryId}/${photoId}.jpg`

const { data, error } = await supabase.storage
  .from('work-photos')
  .upload(filePath, compressedFile, {
    cacheControl: '3600',
    upsert: false
  })

// Get signed URL for display (1 hour expiry)
const { data: { signedUrl } } = await supabase.storage
  .from('work-photos')
  .createSignedUrl(filePath, 3600)
```

### Photo Download

```typescript
// Download photo for offline caching
const { data, error } = await supabase.storage
  .from('work-photos')
  .download(filePath)

// Convert to blob URL for display
const blobUrl = URL.createObjectURL(data)
```

---

## Realtime Subscriptions

### Entry Status Updates

Workers subscribe to status changes on their entries:

```typescript
const subscription = supabase
  .channel('work_entries_changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'work_entries',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Entry status changed:', payload.new)
      // Update UI to show returned entry or approval
    }
  )
  .subscribe()

// Cleanup
subscription.unsubscribe()
```

---

## Custom Next.js API Routes

These routes handle operations that are better suited for server-side processing:

### `POST /api/sync/trigger`

Manual sync trigger for offline queue.

**Request**:
```typescript
{
  entries: [
    {
      localId: string,
      data: WorkEntryInput,
      photos: PhotoInput[]
    }
  ]
}
```

**Response**:
```typescript
{
  success: boolean,
  synced: number,
  failed: Array<{ localId: string, error: string }>
}
```

**Implementation**:
```typescript
// app/api/sync/trigger/route.ts
export async function POST(request: Request) {
  const { entries } = await request.json()
  const supabase = createClient(request)

  const results = []

  for (const entry of entries) {
    try {
      // Insert entry
      const { data: newEntry } = await supabase
        .from('work_entries')
        .insert(entry.data)
        .select()
        .single()

      // Upload photos
      for (const photo of entry.photos) {
        await uploadPhoto(supabase, newEntry.id, photo)
      }

      results.push({ localId: entry.localId, success: true })
    } catch (error) {
      results.push({ localId: entry.localId, success: false, error: error.message })
    }
  }

  return Response.json({
    success: results.every(r => r.success),
    synced: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success)
  })
}
```

---

## Data Types

### TypeScript Types (Generated from Supabase)

```typescript
// types/database.ts (generated via supabase gen types typescript)

export type Database = {
  public: {
    Tables: {
      work_entries: {
        Row: {
          id: string
          project_id: string
          user_id: string
          crew_id: string | null
          work_type: string
          description: string | null
          start_time: string
          end_time: string | null
          duration_hours: number | null
          latitude: number | null
          longitude: number | null
          location_accuracy: number | null
          status: 'draft' | 'submitted' | 'returned' | 'approved'
          approved: boolean
          approved_by: string | null
          approved_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Insert>
      }
      // ... other tables
    }
  }
}
```

### Domain Models

```typescript
// types/models.ts

export interface WorkEntry {
  id: string
  projectId: string
  userId: string
  crewId?: string
  workType: string
  description?: string
  startTime: Date
  endTime?: Date
  latitude?: number
  longitude?: number
  status: 'draft' | 'submitted' | 'returned' | 'approved'
  approved: boolean
  notes?: string
  photos?: Photo[]
  segmentWork?: SegmentWorkEntry[]
}

export interface SegmentWorkEntry {
  id: string
  segmentId: string
  workEntryId: string
  workStageId?: string
  metersCompleted: number
  stageData: Record<string, any>
  checklistCompleted: ChecklistItem[]
}

export interface DynamicField {
  name: string
  type: 'number' | 'text' | 'textarea' | 'select'
  label: string
  required: boolean
  min?: number
  max?: number
  maxLength?: number
  options?: string[]
}

export interface ChecklistItem {
  text: string
  required: boolean
  order: number
  checked?: boolean
}
```

---

## Error Handling

All Supabase operations return `{ data, error }`:

```typescript
const { data, error } = await supabase
  .from('work_entries')
  .insert(entryData)
  .select()
  .single()

if (error) {
  // Handle Supabase error
  if (error.code === 'PGRST116') {
    // Row not found
  } else if (error.code === '23505') {
    // Unique constraint violation
  }
  throw new Error(error.message)
}

// Use data
return data
```

---

## Rate Limiting & Performance

### Supabase Limits

- **Realtime**: 100 concurrent connections per project
- **Storage**: 100 uploads/minute per client
- **Database**: No hard query limits, but RLS policies add overhead

### Optimization Strategies

1. **Batch Operations**: Use `.insert([...])` for multiple rows
2. **Select Only Needed Columns**: `.select('id, name, status')` not `.select('*')`
3. **Use Views**: Query `v_segment_progress` instead of joining manually
4. **Cache Aggressively**: Store projects/cabinets/segments in IndexedDB
5. **Debounce Sync**: Don't sync on every draft save, batch changes

---

## Summary

This API contract defines:
- **Supabase client patterns** for all CRUD operations
- **RLS-enforced security** at the database level
- **Realtime subscriptions** for live updates
- **Storage operations** for photo management
- **Custom API routes** only where server-side logic is needed

All operations respect constitutional principles (RLS, no direct SQL, offline-first caching).
