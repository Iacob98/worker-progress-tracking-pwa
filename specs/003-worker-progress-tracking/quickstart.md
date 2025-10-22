# Quickstart Guide: Worker Progress Tracking PWA

**Feature**: Worker Progress Tracking Mobile App
**Date**: 2025-10-16
**For**: Developers implementing this feature

## Overview

This guide walks you through setting up and implementing the Worker Progress Tracking PWA from scratch. Follow these steps in order for the fastest path to a working prototype.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ and **pnpm** installed
- **Supabase** project created (or access to existing project)
- **Git** initialized in repository
- **Code editor** (VS Code recommended)

---

## Phase 1: Project Setup (Day 1, Morning)

### 1. Initialize Next.js 15 Project

```bash
# Create Next.js 15 app with TypeScript
npx create-next-app@latest worker-app \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd worker-app
```

### 2. Install Core Dependencies

```bash
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
pnpm add @tanstack/react-query
pnpm add zod react-hook-form @hookform/resolvers
pnpm add dexie dexie-react-hooks
pnpm add browser-image-compression exifreader
pnpm add lucide-react class-variance-authority clsx tailwind-merge

# Dev dependencies
pnpm add -D @types/node
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
pnpm add -D playwright @playwright/test
```

### 3. Install shadcn/ui

```bash
npx shadcn-ui@latest init

# Install core components
npx shadcn-ui@latest add button input form card dialog label
npx shadcn-ui@latest add select textarea checkbox badge alert
```

### 4. Setup PWA

```bash
pnpm add next-pwa
```

Create `next.config.mjs`:

```javascript
import nextPWA from 'next-pwa'

const withPWA = nextPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['oijmohlhdxoawzvctnxx.supabase.co']
  }
}

export default withPWA(nextConfig)
```

---

## Phase 2: Supabase Configuration (Day 1, Afternoon)

### 1. Create `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Setup Supabase Client

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export const createClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
}
```

### 3. Generate TypeScript Types

```bash
# Install Supabase CLI
pnpm add -D supabase

# Generate types from your database
npx supabase gen types typescript --project-id your-project-id > types/database.ts
```

### 4. Run Database Migrations

Create `supabase/migrations/001_add_work_stages.sql`:

```sql
-- See data-model.md for complete migration SQL
CREATE TABLE work_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  -- ... (full schema in data-model.md)
);

-- RLS policies
ALTER TABLE work_stages ENABLE ROW LEVEL SECURITY;
-- ... (full RLS in data-model.md)
```

Apply migrations:

```bash
npx supabase db push
```

---

## Phase 3: Offline Storage Setup (Day 2, Morning)

### 1. Create IndexedDB Schema

Create `lib/offline/db.ts`:

```typescript
import Dexie, { Table } from 'dexie'

export interface CachedProject {
  id: string
  name: string
  status: string
  updated_at: string
}

export interface CachedCabinet {
  id: string
  project_id: string
  code: string
  name: string
  updated_at: string
}

export interface CachedSegment {
  id: string
  cabinet_id: string
  code: string
  length_planned_m: number
  length_done_m: number
  status: string
  updated_at: string
}

export interface DraftEntry {
  local_id: string
  project_id: string
  segment_id?: string
  work_stage_id?: string
  data: any
  photos: any[]
  status: 'unsaved' | 'queued' | 'syncing' | 'synced'
  created_at: string
  updated_at: string
}

class WorkerAppDB extends Dexie {
  projects!: Table<CachedProject>
  cabinets!: Table<CachedCabinet>
  segments!: Table<CachedSegment>
  drafts!: Table<DraftEntry>

  constructor() {
    super('WorkerAppDB')
    this.version(1).stores({
      projects: 'id, status, updated_at',
      cabinets: 'id, project_id, code, updated_at',
      segments: 'id, cabinet_id, updated_at',
      drafts: 'local_id, status, created_at'
    })
  }
}

export const db = new WorkerAppDB()
```

### 2. Create Sync Queue Manager

Create `lib/offline/sync.ts`:

```typescript
import { db } from './db'
import { createClient } from '@/lib/supabase/client'

export class SyncQueue {
  private supabase = createClient()

  async queueEntry(entry: any) {
    await db.drafts.add({
      local_id: crypto.randomUUID(),
      ...entry,
      status: 'queued',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  async syncAll() {
    const queued = await db.drafts
      .where('status')
      .equals('queued')
      .toArray()

    const results = []

    for (const draft of queued) {
      try {
        await db.drafts.update(draft.local_id, { status: 'syncing' })

        // Upload entry to Supabase
        const { data, error } = await this.supabase
          .from('work_entries')
          .insert(draft.data)
          .select()
          .single()

        if (error) throw error

        // Mark as synced
        await db.drafts.update(draft.local_id, { status: 'synced' })
        results.push({ id: draft.local_id, success: true })
      } catch (error) {
        await db.drafts.update(draft.local_id, { status: 'queued' })
        results.push({ id: draft.local_id, success: false, error })
      }
    }

    return results
  }
}

export const syncQueue = new SyncQueue()
```

---

## Phase 4: Authentication (Day 2, Afternoon)

### 1. Create Auth Context

Create `components/auth/session-provider.tsx`:

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const AuthContext = createContext<{
  user: User | null
  loading: boolean
}>({ user: null, loading: true })

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### 2. Create Login Page

Create `app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pin // PIN acts as password
    })

    if (error) {
      alert(error.message)
    } else {
      router.push('/projects')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 p-4">
        <h1 className="text-2xl font-bold">Worker Login</h1>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="pin">PIN (4-6 digits)</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </div>
  )
}
```

---

## Phase 5: Core Features (Days 3-4)

### 1. Projects List

Create `app/(app)/projects/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/projects/project-card'

export default async function ProjectsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

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
    .eq('crews.crew_members.user_id', user?.id)
    .eq('crews.crew_members.is_active', true)

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">My Projects</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
```

### 2. Progress Entry Form

Create `app/(app)/projects/[id]/nvt/[nvtId]/segments/[segmentId]/report/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DynamicForm } from '@/components/progress/dynamic-form'
import { Checklist } from '@/components/progress/checklist'
import { PhotoCapture } from '@/components/progress/photo-capture'
import { syncQueue } from '@/lib/offline/sync'

export default function ReportPage({ params }: { params: { segmentId: string } }) {
  const [formData, setFormData] = useState({})
  const [photos, setPhotos] = useState([])
  const [checklist, setChecklist] = useState([])
  const router = useRouter()

  const handleSubmit = async (asDraft: boolean) => {
    const entry = {
      data: {
        segment_id: params.segmentId,
        ...formData,
        status: asDraft ? 'draft' : 'submitted'
      },
      photos
    }

    await syncQueue.queueEntry(entry)

    if (navigator.onLine) {
      await syncQueue.syncAll()
    }

    router.push('/entries')
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Report Progress</h1>

      <DynamicForm
        stageId={stageId}
        value={formData}
        onChange={setFormData}
      />

      <Checklist
        items={checklistItems}
        value={checklist}
        onChange={setChecklist}
      />

      <PhotoCapture
        photos={photos}
        onAdd={setPhotos}
      />

      <div className="flex gap-4 mt-6">
        <Button onClick={() => handleSubmit(true)} variant="outline">
          Save Draft
        </Button>
        <Button onClick={() => handleSubmit(false)}>
          Submit for Approval
        </Button>
      </div>
    </div>
  )
}
```

---

## Phase 6: Photo Management (Day 5)

### 1. Photo Compression

Create `lib/photo/compression.ts`:

```typescript
import imageCompression from 'browser-image-compression'

export async function compressPhoto(file: File): Promise<Blob> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    preserveExif: true
  }

  return await imageCompression(file, options)
}
```

### 2. Photo Upload

Create `lib/photo/upload.ts`:

```typescript
import { createClient } from '@/lib/supabase/client'
import { compressPhoto } from './compression'

export async function uploadPhoto(
  file: File,
  projectId: string,
  userId: string,
  entryId: string
) {
  const compressed = await compressPhoto(file)
  const photoId = crypto.randomUUID()
  const filePath = `${projectId}/${userId}/${entryId}/${photoId}.jpg`

  const supabase = createClient()

  const { error: uploadError } = await supabase.storage
    .from('work-photos')
    .upload(filePath, compressed)

  if (uploadError) throw uploadError

  return filePath
}
```

---

## Phase 7: Testing (Day 6)

### 1. Unit Tests

Create `tests/unit/compression.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { compressPhoto } from '@/lib/photo/compression'

describe('Photo Compression', () => {
  it('should compress photo to under 1MB', async () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
    const compressed = await compressPhoto(mockFile)
    expect(compressed.size).toBeLessThan(1024 * 1024)
  })
})
```

### 2. E2E Tests

Create `tests/e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('worker can login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[id=email]', 'worker@test.com')
  await page.fill('[id=pin]', '1234')
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/projects')
})
```

Run tests:

```bash
pnpm vitest  # Unit tests
pnpm playwright test  # E2E tests
```

---

## Phase 8: Deployment (Day 7)

### 1. Build and Test

```bash
pnpm build
pnpm start
```

### 2. Deploy to Vercel

```bash
pnpm add -D vercel
npx vercel --prod
```

### 3. Configure Environment Variables

In Vercel dashboard, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Verification Checklist

After completing all phases, verify:

- [ ] Can login with email + PIN
- [ ] Can view assigned projects
- [ ] Can select NVT points from list
- [ ] Can create progress entry with photos
- [ ] Photos are compressed before upload
- [ ] Forms render from work_stages configuration
- [ ] Checklists block submission when required items unchecked
- [ ] Draft auto-saves every 5 seconds
- [ ] Offline: can create entries without connectivity
- [ ] Offline: sync queue processes when back online
- [ ] Can view "My Entries" filtered by status
- [ ] Returned entries show admin feedback
- [ ] Can resubmit returned entries
- [ ] PWA installs on mobile device

---

## Common Issues & Solutions

### Issue: RLS policies blocking queries

**Solution**: Verify user is authenticated and has proper crew assignments. Check policies in Supabase dashboard.

### Issue: Photos not uploading

**Solution**: Check storage bucket exists and has correct RLS policies. Verify file path format matches bucket policies.

### Issue: Offline sync failing

**Solution**: Check IndexedDB quota. Clear old drafts. Verify network detection logic.

### Issue: Dynamic forms not rendering

**Solution**: Validate work_stages JSON schema. Check Zod schema generation logic.

---

## Next Steps

After implementing core features:

1. Add foreman crew management features
2. Implement dashboard with KPIs
3. Add appointment tracking for house connections
4. Setup Sentry for error tracking
5. Configure Web Vitals monitoring
6. Run pilot with 2-3 workers
7. Gather feedback and iterate

---

## Resources

- **Spec**: `specs/003-worker-progress-tracking/spec.md`
- **Plan**: `specs/003-worker-progress-tracking/plan.md`
- **Data Model**: `specs/003-worker-progress-tracking/data-model.md`
- **API Contracts**: `specs/003-worker-progress-tracking/contracts/README.md`
- **Research**: `specs/003-worker-progress-tracking/research.md`

For detailed implementation guidance, see the full plan and research documents.
