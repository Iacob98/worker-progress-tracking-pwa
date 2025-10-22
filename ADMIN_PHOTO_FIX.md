# Admin Rejection Photos - Root Cause and Fix

## Problem Diagnosis

Using Supabase MCP tools, I discovered the root cause of why admin rejection photos are not visible to workers:

### Database Investigation Results:

1. **Only 1 photo exists** for the rejected work entry `78d360dc-fa87-4c1b-9913-44c0c253d639`:
   - Photo ID: `12806fe8-9b43-4feb-849e-ce608bd14329`
   - Label: `during` (worker's original photo)
   - Photo type: `general`
   - Created: `2025-10-22T11:14:16` (BEFORE rejection at `2025-10-22T11:14:38`)

2. **Zero admin photos found** in the entire database with:
   - `label = 'after'`
   - `photo_type = 'issue'`
   - `is_after_photo = true`

### Root Cause:

**The Admin API (port 3002) is NOT saving photo metadata to the `photos` table when admins upload rejection photos.**

The Admin API is likely only uploading photos to Supabase Storage (`work-photos` bucket) but skipping the database insert. The Worker PWA (port 3001) queries the `photos` table to display photos, so it cannot see photos that only exist in Storage.

## Required Fix for Admin API (Port 3002)

When admin uploads rejection photos, the Admin API MUST insert records into the `photos` table with these fields:

```javascript
// Admin API photo upload - REQUIRED FIX
await supabase.from('photos').insert({
  id: photoId,                    // UUID - generate with uuidv4()
  work_entry_id: workEntryId,     // UUID - the rejected work entry ID
  url: filePath,                  // Storage path: 'work-entries/{workEntryId}/{filename}.jpg'
  file_path: filePath,            // Same as url
  ts: new Date().toISOString(),   // Timestamp
  created_at: new Date().toISOString(),
  taken_at: new Date().toISOString(),
  gps_lat: latitude,              // Optional - GPS coordinates
  gps_lon: longitude,             // Optional
  label: 'after',                 // *** CRITICAL: Must be 'after' ***
  photo_type: 'issue',            // *** CRITICAL: Must be 'issue' ***
  is_after_photo: true,           // *** CRITICAL: Must be true ***
  is_before_photo: false,
})
```

### Critical Fields for Admin Rejection Photos:

1. **`work_entry_id`** - Links photo to the rejected work entry
2. **`label`** - Must be `'after'` (indicates admin rejection photo)
3. **`photo_type`** - Must be `'issue'` (marks as problem documentation)
4. **`is_after_photo`** - Must be `true` (boolean flag for filtering)

### Storage Path Format:

Upload photos to Supabase Storage with this path structure:
```
work-photos/work-entries/{workEntryId}/{timestamp}_{photoId}.jpg
```

Example:
```
work-photos/work-entries/78d360dc-fa87-4c1b-9913-44c0c253d639/2025-10-22T11-15-30_a1b2c3d4.jpg
```

## Worker PWA Fixes Applied (Port 3001)

I've updated the Worker PWA to properly handle admin rejection photos:

### 1. Enhanced Photo Field Mapping ([use-work-entries.ts](lib/hooks/use-work-entries.ts:122-137))

Now includes all database fields:
- `photoType` - Maps from `photo_type`
- `isAfterPhoto` - Maps from `is_after_photo`
- `isBeforePhoto` - Maps from `is_before_photo`
- `filePath` - Maps from `file_path`
- `createdAt` - Maps from `created_at`

### 2. Updated Photo Upload ([use-photos.ts](lib/hooks/use-photos.ts:112-123))

When Worker PWA uploads rejection photos (as foreman/crew):
```typescript
{
  label: photoType === 'after' ? 'after' : 'during',
  is_before_photo: photoType === 'before',
  is_after_photo: photoType === 'after',
  photo_type: photoType === 'after' ? 'issue' : 'general',
}
```

### 3. Improved Filtering Logic ([rejection-alert.tsx](components/work-entries/rejection-alert.tsx:57-97))

Admin photos are now identified using **4 methods** (any match = admin photo):

1. **`is_after_photo === true`** - Primary method (database flag)
2. **`photo_type === 'issue'`** - Alternative method (type field)
3. **`label === 'after'`** - Legacy method (label field)
4. **Timestamp check** - Fallback (photos uploaded after rejection)

### 4. Comprehensive Logging

Added detailed console logs to help debug photo filtering:
- Total photos on work entry
- Each photo's fields (label, photoType, isAfterPhoto, timestamp)
- Individual evaluation of all 4 identification methods
- Final admin photo count

## Testing Steps

### Test in Admin API (Port 3002):

1. **Reject a work entry** with photos attached
2. **Check browser console** - verify photo upload logs
3. **Check database** - verify photos inserted to `photos` table:
   ```sql
   SELECT id, label, photo_type, is_after_photo, work_entry_id
   FROM photos
   WHERE work_entry_id = '{rejected_work_entry_id}'
   AND (is_after_photo = true OR photo_type = 'issue' OR label = 'after');
   ```

### Test in Worker PWA (Port 3001):

1. **Open rejected work entry** in worker app
2. **Check browser console** - see filtering logs:
   - `🔍 RejectionAlert - Filtering photos:`
   - Individual photo evaluations
   - `📷 Admin rejection photos found: X`
3. **Verify photos display** - should see admin photos in red alert box
4. **Click photos** - should open preview dialog

## Database Schema Reference

### `photos` table key fields:

```sql
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_entry_id uuid REFERENCES work_entries(id),
  file_path text,
  url text,
  label text,                      -- 'before' | 'during' | 'after'
  photo_type text DEFAULT 'general', -- 'general' | 'issue' | 'progress'
  is_before_photo boolean DEFAULT false,
  is_after_photo boolean DEFAULT false,
  ts timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  taken_at timestamp with time zone DEFAULT now(),
  gps_lat numeric,
  gps_lon numeric,
  author_user_id uuid,
  -- ... other fields
);
```

## Summary

**Worker PWA is now ready** - it will properly display admin rejection photos once Admin API starts saving them to the database.

**Admin API needs to be fixed** - must insert photo metadata to `photos` table with correct fields:
- `work_entry_id` - link to rejected entry
- `label = 'after'`
- `photo_type = 'issue'`
- `is_after_photo = true`

The comprehensive filtering logic ensures photos will be detected regardless of which field the Admin API uses, providing maximum compatibility and fault tolerance.
