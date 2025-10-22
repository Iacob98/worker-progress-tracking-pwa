# Offline-First PWA Research Findings
## Comprehensive Best Practices for Next.js 15 + Supabase

---

## 1. Offline-First Architecture with Next.js 15 + Supabase

### 1.1 Offline-First Data Sync with Supabase PostgreSQL

#### **Decision: Use RxDB with Supabase Replication Plugin**

**Rationale:**
- RxDB provides a mature, battle-tested client-side database built specifically for offline-first applications
- Native support for Supabase replication with two-way sync
- Flexible conflict resolution strategies (customizable per use case)
- Strong TypeScript support and reactive query patterns
- IndexedDB-backed storage with automatic persistence

**Alternatives Considered:**

1. **PowerSync**
   - **Pros:**
     - Plug-and-play solution specifically designed for Supabase
     - Reads from Postgres Write Ahead Log (WAL) for robust consistency
     - Built-in conflict resolution with strong consistency guarantees
   - **Cons:**
     - Third-party service dependency (additional vendor lock-in)
     - Additional cost beyond Supabase
     - Less flexibility for custom conflict resolution

2. **TanStack Query + IndexedDB Manual Implementation**
   - **Pros:**
     - Full control over sync logic
     - Already familiar to React developers
     - Lightweight approach
   - **Cons:**
     - Requires building sync infrastructure from scratch
     - No built-in conflict resolution
     - Mutation persistence across page reloads is problematic (mutationFn cannot be serialized)

3. **Direct IndexedDB with Custom Sync Logic**
   - **Pros:**
     - Complete control
     - No dependencies
   - **Cons:**
     - High development complexity
     - Requires implementing replication protocols
     - Prone to edge case bugs

**Implementation Notes:**

```typescript
// Install dependencies
// npm install rxdb rxdb-supabase dexie

import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateSupabase } from 'rxdb-supabase';

// Create RxDB database
const db = await createRxDatabase({
  name: 'workportaldb',
  storage: getRxStorageDexie(),
});

// Define schema for hierarchical data
const projectSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    _modified: { type: 'number' } // For conflict resolution
  },
  required: ['id', 'name', 'created_at', '_modified'],
  indexes: ['_modified']
};

await db.addCollections({
  projects: { schema: projectSchema },
  cabinets: { schema: cabinetSchema },
  segments: { schema: segmentSchema },
  entries: { schema: entrySchema }
});

// Setup Supabase replication
const replicationState = replicateSupabase({
  collection: db.projects,
  supabaseClient: supabaseClient,
  tableName: 'projects',
  pull: {
    batchSize: 50,
    modifier: (doc) => doc // Optional transform
  },
  push: {
    batchSize: 10,
    modifier: (doc) => doc
  },
  live: true, // Enable realtime sync
  retryTime: 5000,
  autoStart: true,
});

// Handle sync errors
replicationState.error$.subscribe(error => {
  console.error('Replication error:', error);
});
```

**Key Database Schema Requirements:**

```sql
-- Add required fields to all tables
ALTER TABLE projects ADD COLUMN _modified TIMESTAMP DEFAULT NOW();
ALTER TABLE projects ADD COLUMN _deleted BOOLEAN DEFAULT FALSE;

-- Create trigger to auto-update _modified
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW._modified = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_modified
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- Use soft deletes (never hard delete rows)
-- Clients miss deletions if they're offline during hard delete
```

**Potential Pitfalls:**
- **Hard deletes break sync:** Use soft deletes (boolean `_deleted` field) so offline clients can receive deletion events
- **Missing _modified field:** Required for timestamp-based conflict resolution
- **Schema changes require migrations:** Both client and server schemas must stay in sync
- **Large initial sync:** Implement pagination/chunking for large datasets
- **Memory constraints on mobile:** Monitor IndexedDB storage usage

---

### 1.2 IndexedDB Strategies for Caching Relational Data

#### **Decision: Use Dexie.js for IndexedDB Management**

**Rationale:**
- **Performance:** Significantly faster than localForage for indexed queries and large datasets
- **Efficient indexing:** Unlike localForage, Dexie indexes keys and enables efficient querying/sorting
- **Bulk operations:** Optimized for batch inserts/updates critical for sync
- **Fluent API:** More intuitive than raw IndexedDB API
- **Better support for relationships:** Easier to manage hierarchical data structures

**Alternatives Considered:**

1. **localForage**
   - **Pros:**
     - Simple localStorage-like API
     - Automatic fallback between IndexedDB/WebSQL/localStorage
   - **Cons:**
     - No indexing support (must iterate through all keys)
     - Slower performance on complex queries
     - Limited relationship modeling

2. **Raw IndexedDB API**
   - **Pros:**
     - No dependencies
     - Maximum control
   - **Cons:**
     - Verbose, callback-heavy API
     - Error-prone transaction management
     - Difficult to manage relationships

3. **idb-keyval**
   - **Pros:**
     - Tiny bundle size (~600B)
     - Simple key-value API
   - **Cons:**
     - Too simplistic for relational data
     - No querying capabilities

**Implementation Notes:**

```typescript
// Install: npm install dexie

import Dexie, { Table } from 'dexie';

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  _modified: number;
  _deleted: boolean;
}

interface Cabinet {
  id: string;
  project_id: string;
  name: string;
  _modified: number;
  _deleted: boolean;
}

interface Segment {
  id: string;
  cabinet_id: string;
  name: string;
  _modified: number;
  _deleted: boolean;
}

interface Entry {
  id: string;
  segment_id: string;
  data: any;
  photos: string[]; // Array of local blob URLs or object URLs
  _modified: number;
  _deleted: boolean;
  _synced: boolean; // Track if entry has been uploaded
}

class WorkPortalDB extends Dexie {
  projects!: Table<Project>;
  cabinets!: Table<Cabinet>;
  segments!: Table<Segment>;
  entries!: Table<Entry>;

  constructor() {
    super('WorkPortalDB');

    this.version(1).stores({
      // Define indexes for efficient querying
      projects: 'id, _modified, _deleted',
      cabinets: 'id, project_id, _modified, _deleted',
      segments: 'id, cabinet_id, _modified, _deleted',
      entries: 'id, segment_id, _modified, _deleted, _synced',
    });
  }
}

const db = new WorkPortalDB();

// Efficient hierarchical queries with Dexie
async function getProjectWithChildren(projectId: string) {
  const project = await db.projects.get(projectId);
  const cabinets = await db.cabinets
    .where('project_id')
    .equals(projectId)
    .and(c => !c._deleted)
    .toArray();

  const cabinetIds = cabinets.map(c => c.id);
  const segments = await db.segments
    .where('cabinet_id')
    .anyOf(cabinetIds)
    .and(s => !s._deleted)
    .toArray();

  return { project, cabinets, segments };
}

// Efficient bulk operations for sync
async function bulkSyncEntries(entries: Entry[]) {
  await db.entries.bulkPut(entries);
}

// Query unsynced entries
async function getUnsyncedEntries() {
  return db.entries
    .where('_synced')
    .equals(false)
    .and(e => !e._deleted)
    .toArray();
}

// Optimize with compound indexes for complex queries
// In version 2, add compound indexes
db.version(2).stores({
  entries: 'id, segment_id, [_synced+_deleted], _modified',
});
```

**Storage Optimization Patterns:**

```typescript
// Monitor IndexedDB usage
async function checkStorageUsage() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const percentUsed = (estimate.usage! / estimate.quota!) * 100;

    console.log(`Storage used: ${estimate.usage} bytes`);
    console.log(`Storage quota: ${estimate.quota} bytes`);
    console.log(`Percent used: ${percentUsed.toFixed(2)}%`);

    // Warn user if approaching limit
    if (percentUsed > 80) {
      // Trigger cleanup or warn user
    }
  }
}

// Implement cleanup strategy for old data
async function cleanupOldEntries(daysToKeep: number = 30) {
  const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

  const deleted = await db.entries
    .where('_modified')
    .below(cutoffDate)
    .and(e => e._synced && e._deleted)
    .delete();

  console.log(`Cleaned up ${deleted} old entries`);
}
```

**Potential Pitfalls:**
- **iOS Storage Limits:** Safari imposes 50MB cache storage limit for PWAs
- **Storage Eviction:** Browser may evict data under storage pressure; use `navigator.storage.persist()` to request persistent storage
- **Schema Migrations:** Dexie version upgrades require careful migration handling
- **Transaction Deadlocks:** Be careful with long-running transactions
- **Index Selection:** Over-indexing slows writes; under-indexing slows reads

---

### 1.3 Service Worker Patterns for Next.js 15 App Router

#### **Decision: Manual Service Worker Implementation (next-pwa compatibility issues)**

**Rationale:**
- **next-pwa Turbopack incompatibility:** next-pwa uses webpack which conflicts with Next.js 15's Turbopack
- **App Router requirements:** Need custom implementation for App Router's RSC patterns
- **Full control:** Manual implementation provides better control over caching strategies
- **Future-proof:** Not dependent on third-party plugin updates

**Alternatives Considered:**

1. **next-pwa**
   - **Pros:**
     - Zero-config setup
     - Automatic manifest generation
     - Built-in Workbox strategies
   - **Cons:**
     - Incompatible with Turbopack (Next.js 15 default)
     - Limited App Router support
     - Webpack dependency

2. **Workbox CLI**
   - **Pros:**
     - Official Google tool
     - Flexible configuration
   - **Cons:**
     - Separate build step
     - Not integrated with Next.js

3. **vite-plugin-pwa (not applicable)**
   - Only works with Vite projects

**Implementation Notes:**

```typescript
// public/sw.ts
/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets during build
precacheAndRoute(self.__WB_MANIFEST);

// Strategy 1: Cache-first for static assets
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Strategy 2: Network-first for HTML (App Router pages)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  })
);

// Strategy 3: Stale-while-revalidate for API data
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-data',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Strategy 4: Background sync for POST/PUT/DELETE
const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60, // Retry for 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while (entry = await queue.shiftRequest()) {
      try {
        const response = await fetch(entry.request.clone());
        console.log('Replay successful:', entry.request.url);
      } catch (error) {
        console.error('Replay failed:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'PUT'
);

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'DELETE'
);

// Handle offline page
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline').then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```

**Service Worker Registration:**

```typescript
// app/providers.tsx (or layout.tsx)
'use client';

import { useEffect } from 'react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                if (confirm('New version available! Reload?')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch((err) => console.error('SW registration failed:', err));
    }
  }, []);

  return <>{children}</>;
}
```

**Build Configuration:**

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack if using next-pwa (not recommended)
  // For manual SW, Turbopack is fine

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Compile service worker with webpack
      config.entry = {
        ...config.entry,
        sw: './public/sw.ts',
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

**Manifest Configuration:**

```typescript
// app/manifest.ts (Next.js 15 App Router)
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Work Portal',
    short_name: 'WorkPortal',
    description: 'Offline-first work inspection portal',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
```

**Potential Pitfalls:**
- **Service Worker Scope:** Must be served from root or use `Service-Worker-Allowed` header
- **HTTPS Requirement:** Service workers only work on HTTPS (except localhost)
- **Caching Strategies Complexity:** Wrong strategy can cause stale data or poor offline UX
- **Update Detection:** Users may not see updates without forced refresh
- **iOS Safari Limitations:** Service worker support is limited (no Background Sync API)

---

### 1.4 Conflict Resolution Strategies

#### **Decision: Last-Write-Wins (LWW) with Timestamp-Based Resolution**

**Rationale:**
- **Simplicity:** Easiest to implement and understand
- **Predictable:** Users understand "most recent change wins"
- **Low overhead:** Minimal performance impact
- **Supabase native:** Works well with Postgres timestamp columns
- **Good enough for single-user-per-device scenarios:** Most field work involves one inspector per device

**Alternatives Considered:**

1. **Conflict-Free Replicated Data Types (CRDTs)**
   - **Pros:**
     - Automatic conflict resolution without data loss
     - Perfect for collaborative editing
     - Works peer-to-peer without server coordination
   - **Cons:**
     - Complex to implement
     - Larger data overhead (operation history)
     - Overkill for single-user-per-device scenarios
     - Requires CRDT-specific data structures

2. **Operational Transformation (OT)**
   - **Pros:**
     - Great for real-time collaborative text editing
     - Lower latency than CRDTs
   - **Cons:**
     - Requires central server
     - Complex transformation functions
     - Not suitable for offline-first

3. **Manual Conflict Resolution (User Decides)**
   - **Pros:**
     - No data loss
     - User has control
   - **Cons:**
     - Poor UX (interrupts workflow)
     - Requires complex UI
     - Frustrating for users

**Implementation Notes:**

```typescript
// 1. Database schema with timestamp tracking
interface SyncableEntity {
  id: string;
  _modified: number; // Unix timestamp in milliseconds
  _deleted: boolean;
  _synced: boolean;
}

// 2. Conflict detection and resolution
async function syncWithServer(localEntity: SyncableEntity) {
  try {
    // Fetch server version
    const { data: serverEntity, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', localEntity.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    // Case 1: Entity doesn't exist on server (new entity)
    if (!serverEntity) {
      const { error: insertError } = await supabase
        .from('entries')
        .insert(localEntity);

      if (insertError) throw insertError;
      return { action: 'inserted', winner: 'local' };
    }

    // Case 2: Server version is newer (server wins)
    if (serverEntity._modified > localEntity._modified) {
      // Update local with server data
      await db.entries.put(serverEntity);
      return { action: 'pulled', winner: 'server' };
    }

    // Case 3: Local version is newer (local wins)
    if (localEntity._modified > serverEntity._modified) {
      const { error: updateError } = await supabase
        .from('entries')
        .update(localEntity)
        .eq('id', localEntity.id);

      if (updateError) throw updateError;
      return { action: 'pushed', winner: 'local' };
    }

    // Case 4: Same timestamp (no conflict)
    return { action: 'no-op', winner: 'none' };

  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}

// 3. Bulk sync with conflict tracking
interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: number;
}

async function fullSync(): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    conflicts: 0,
    errors: 0,
  };

  // Get all unsynced local entities
  const localEntities = await db.entries
    .where('_synced')
    .equals(false)
    .toArray();

  for (const entity of localEntities) {
    try {
      const syncResult = await syncWithServer(entity);

      if (syncResult.winner === 'local') {
        result.pushed++;
        // Mark as synced
        await db.entries.update(entity.id, { _synced: true });
      } else if (syncResult.winner === 'server') {
        result.pulled++;
        result.conflicts++;
      }
    } catch (error) {
      result.errors++;
      console.error(`Failed to sync entity ${entity.id}:`, error);
    }
  }

  // Pull any server changes we don't have locally
  const lastSyncTime = await getLastSyncTimestamp();
  const { data: serverChanges } = await supabase
    .from('entries')
    .select('*')
    .gt('_modified', lastSyncTime);

  if (serverChanges) {
    await db.entries.bulkPut(serverChanges);
    result.pulled += serverChanges.length;
  }

  await saveLastSyncTimestamp(Date.now());

  return result;
}

// 4. Automatic timestamp updates on modification
async function updateEntry(id: string, changes: Partial<Entry>) {
  await db.entries.update(id, {
    ...changes,
    _modified: Date.now(), // Always update timestamp
    _synced: false, // Mark as needing sync
  });
}

// 5. Postgres trigger for server-side timestamp
/*
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW._modified = EXTRACT(EPOCH FROM NOW()) * 1000; -- Milliseconds
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_update_modified
  BEFORE INSERT OR UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_timestamp();
*/
```

**Advanced: User-Visible Conflict Warnings**

```typescript
// For critical data, warn user of conflicts
interface ConflictInfo {
  entityId: string;
  localVersion: any;
  serverVersion: any;
  conflictedFields: string[];
}

async function detectFieldLevelConflicts(
  local: Entry,
  server: Entry
): Promise<ConflictInfo | null> {
  if (local._modified === server._modified) return null;

  const conflictedFields = Object.keys(local).filter(key => {
    if (key.startsWith('_')) return false; // Skip metadata
    return JSON.stringify(local[key]) !== JSON.stringify(server[key]);
  });

  if (conflictedFields.length === 0) return null;

  return {
    entityId: local.id,
    localVersion: local,
    serverVersion: server,
    conflictedFields,
  };
}

// UI component to show conflicts
function ConflictResolver({ conflict }: { conflict: ConflictInfo }) {
  return (
    <div className="conflict-warning">
      <h3>Data Conflict Detected</h3>
      <p>This entry was modified on another device. Which version do you want to keep?</p>

      <div className="conflict-options">
        <button onClick={() => resolveConflict(conflict, 'local')}>
          Keep My Changes
        </button>
        <button onClick={() => resolveConflict(conflict, 'server')}>
          Use Server Version
        </button>
      </div>
    </div>
  );
}
```

**Potential Pitfalls:**
- **Clock Skew:** Device clocks may be wrong; consider using server-generated timestamps
- **Simultaneous Edits:** Two devices editing at exact same millisecond (rare but possible)
- **Data Loss:** LWW can lose data if newer change overwrites important older change
- **User Confusion:** Users may not understand why their changes disappeared
- **Timezone Issues:** Use Unix timestamps (UTC) to avoid timezone confusion

---

## 2. Photo Management in PWAs

### 2.1 Client-Side Photo Compression

#### **Decision: Use browser-image-compression with EXIF Preservation**

**Rationale:**
- **Most popular:** 234 projects use it, well-maintained
- **EXIF preservation:** Critical for preserving GPS metadata
- **Configurable:** Flexible size targets and quality settings
- **Small bundle:** ~35KB gzipped
- **Privacy-friendly:** All processing happens client-side

**Alternatives Considered:**

1. **compressorjs**
   - **Pros:**
     - Also supports EXIF preservation
     - Similar API
   - **Cons:**
     - Less actively maintained
     - Slightly larger bundle

2. **Canvas API (manual)**
   - **Pros:**
     - No dependencies
     - Maximum control
   - **Cons:**
     - Loses EXIF data by default
     - Complex to implement correctly
     - Browser compatibility issues

**Implementation Notes:**

```typescript
// Install: npm install browser-image-compression exifreader

import imageCompression from 'browser-image-compression';
import ExifReader from 'exifreader';

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  exifData?: any;
}

async function compressPhoto(
  file: File,
  targetSizeKB: number = 800 // Target 500KB-1MB
): Promise<CompressionResult> {
  const originalSize = file.size;

  // Extract EXIF data before compression
  let exifData;
  try {
    const tags = await ExifReader.load(file);
    exifData = {
      gps: {
        latitude: tags.GPSLatitude?.description,
        longitude: tags.GPSLongitude?.description,
        altitude: tags.GPSAltitude?.description,
      },
      camera: {
        make: tags.Make?.description,
        model: tags.Model?.description,
      },
      capture: {
        dateTime: tags.DateTime?.description,
        orientation: tags.Orientation?.value,
      },
    };
  } catch (error) {
    console.warn('Failed to extract EXIF:', error);
  }

  // Compression options
  const options = {
    maxSizeMB: targetSizeKB / 1024, // Convert KB to MB
    maxWidthOrHeight: 1920, // Limit dimensions for reasonable size
    useWebWorker: true, // Use web worker for better performance
    preserveExif: true, // CRITICAL: Preserve EXIF metadata
    fileType: 'image/jpeg', // JPEG for photos
    initialQuality: 0.8, // Start with high quality
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const compressedSize = compressedFile.size;

    // If still too large, reduce quality further
    if (compressedSize > targetSizeKB * 1024 * 1.2) { // Allow 20% margin
      options.initialQuality = 0.6;
      options.maxWidthOrHeight = 1280;
      const secondPass = await imageCompression(compressedFile, options);

      return {
        file: secondPass,
        originalSize,
        compressedSize: secondPass.size,
        compressionRatio: originalSize / secondPass.size,
        exifData,
      };
    }

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
      exifData,
    };
  } catch (error) {
    console.error('Compression error:', error);
    throw error;
  }
}

// Batch compression with progress tracking
interface CompressionProgress {
  current: number;
  total: number;
  currentFile: string;
}

async function compressMultiplePhotos(
  files: File[],
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.({
      current: i + 1,
      total: files.length,
      currentFile: files[i].name,
    });

    const result = await compressPhoto(files[i]);
    results.push(result);
  }

  return results;
}

// Usage in a component
function PhotoUploader() {
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState<CompressionProgress | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCompressing(true);

    try {
      const results = await compressMultiplePhotos(files, setProgress);

      // Store compressed images in IndexedDB
      for (const result of results) {
        await storePhotoLocally(result);
      }

      // Queue for upload
      await queueForUpload(results.map(r => r.file));

    } catch (error) {
      console.error('Compression failed:', error);
    } finally {
      setCompressing(false);
      setProgress(null);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        capture="environment" // Use rear camera on mobile
        onChange={handleFileSelect}
      />

      {compressing && progress && (
        <div className="compression-progress">
          <p>Compressing {progress.currentFile}...</p>
          <progress value={progress.current} max={progress.total} />
          <p>{progress.current} of {progress.total}</p>
        </div>
      )}
    </div>
  );
}
```

**Storage Strategy:**

```typescript
// Store photos as blobs in IndexedDB
interface StoredPhoto {
  id: string;
  entryId: string;
  blob: Blob;
  filename: string;
  size: number;
  mimeType: string;
  exifData?: any;
  uploaded: boolean;
  uploadedUrl?: string;
  createdAt: number;
}

async function storePhotoLocally(result: CompressionResult): Promise<string> {
  const photoId = crypto.randomUUID();

  const storedPhoto: StoredPhoto = {
    id: photoId,
    entryId: '', // Set later when attached to entry
    blob: result.file,
    filename: result.file.name,
    size: result.compressedSize,
    mimeType: result.file.type,
    exifData: result.exifData,
    uploaded: false,
    createdAt: Date.now(),
  };

  await db.photos.add(storedPhoto);

  return photoId;
}

// Retrieve photo as object URL for display
async function getPhotoUrl(photoId: string): Promise<string> {
  const photo = await db.photos.get(photoId);
  if (!photo) throw new Error('Photo not found');

  return URL.createObjectURL(photo.blob);
}

// Clean up object URLs when component unmounts
useEffect(() => {
  const urls: string[] = [];

  photos.forEach(async (photoId) => {
    const url = await getPhotoUrl(photoId);
    urls.push(url);
  });

  return () => {
    urls.forEach(url => URL.revokeObjectURL(url));
  };
}, [photos]);
```

**Potential Pitfalls:**
- **EXIF Orientation:** iOS photos may have orientation in EXIF; canvas rendering must respect this
- **Browser Compatibility:** Some older browsers don't support all EXIF tags
- **Memory Leaks:** Always revoke object URLs with `URL.revokeObjectURL()`
- **Privacy Concerns:** GPS data may be sensitive; consider asking user before preserving
- **File Type Limitations:** Only JPEG properly supports EXIF; PNG/WebP support is limited

---

### 2.2 EXIF Data Extraction and GPS Metadata

#### **Decision: Use ExifReader for metadata extraction**

**Rationale:**
- **Comprehensive:** Supports JPEG, TIFF, PNG, HEIC, WebP, GIF
- **Configurable bundles:** Can build tiny bundles (~4KB) for just GPS/date extraction
- **Client-side:** Privacy-friendly, no server required
- **Well-maintained:** Active development

**Implementation Notes:**

```typescript
// Install: npm install exifreader

import ExifReader from 'exifreader';

interface PhotoMetadata {
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    timestamp?: string;
  };
  camera?: {
    make?: string;
    model?: string;
    software?: string;
  };
  capture?: {
    dateTime: string;
    orientation: number;
    exposureTime?: string;
    fNumber?: string;
    iso?: number;
  };
}

async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  try {
    const tags = await ExifReader.load(file);

    const metadata: PhotoMetadata = {
      capture: {
        dateTime: tags.DateTime?.description || new Date().toISOString(),
        orientation: tags.Orientation?.value || 1,
        exposureTime: tags.ExposureTime?.description,
        fNumber: tags.FNumber?.description,
        iso: tags.ISOSpeedRatings?.value,
      },
    };

    // Extract GPS data if available
    if (tags.GPSLatitude && tags.GPSLongitude) {
      metadata.gps = {
        latitude: parseGPSCoordinate(
          tags.GPSLatitude.description,
          tags.GPSLatitudeRef?.value
        ),
        longitude: parseGPSCoordinate(
          tags.GPSLongitude.description,
          tags.GPSLongitudeRef?.value
        ),
        altitude: tags.GPSAltitude?.description,
        timestamp: tags.GPSDateStamp?.description,
      };
    }

    // Extract camera info
    if (tags.Make || tags.Model) {
      metadata.camera = {
        make: tags.Make?.description,
        model: tags.Model?.description,
        software: tags.Software?.description,
      };
    }

    return metadata;

  } catch (error) {
    console.error('Failed to extract EXIF data:', error);
    throw error;
  }
}

// Parse GPS coordinates from EXIF format
function parseGPSCoordinate(
  coordinate: string,
  ref: string | undefined
): number {
  // Example: "37° 46' 29.66" N" -> 37.774905
  const parts = coordinate.match(/(\d+)° (\d+)' ([\d.]+)"/);
  if (!parts) return 0;

  const degrees = parseFloat(parts[1]);
  const minutes = parseFloat(parts[2]);
  const seconds = parseFloat(parts[3]);

  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Apply hemisphere reference
  if (ref === 'S' || ref === 'W') {
    decimal *= -1;
  }

  return decimal;
}

// Display GPS location on a map
function PhotoMapPreview({ gps }: { gps: PhotoMetadata['gps'] }) {
  if (!gps) return null;

  const { latitude, longitude } = gps;

  return (
    <div className="photo-map">
      <img
        src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${longitude},${latitude})/${longitude},${latitude},14,0/300x200?access_token=YOUR_TOKEN`}
        alt="Photo location"
      />
      <p>
        Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </p>
    </div>
  );
}

// Privacy: Strip EXIF before sharing
async function stripEXIF(file: File): Promise<File> {
  // Create canvas and draw image
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0);

  // Convert back to blob (no EXIF)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }
    }, 'image/jpeg', 0.9);
  });
}
```

**Potential Pitfalls:**
- **Privacy Leaks:** GPS data can reveal home/work addresses
- **Timezone Confusion:** EXIF timestamps may be in local time, not UTC
- **Missing Data:** Not all photos have GPS (especially from cameras without GPS)
- **Accuracy:** GPS accuracy varies; may be off by 10-50 meters

---

### 2.3 Upload Queue with Retry Logic

#### **Decision: Use Workbox Background Sync with Custom Queue Manager**

**Rationale:**
- **Automatic retries:** Workbox handles retry logic automatically
- **Offline-first:** Queues requests when offline, uploads when online
- **Battle-tested:** Used by Google, production-ready
- **Extensible:** Can customize with onSync handler

**Implementation Notes:**

```typescript
// Service Worker: public/sw.ts
import { Queue } from 'workbox-background-sync';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Create upload queue
const uploadQueue = new Queue('photo-uploads', {
  maxRetentionTime: 24 * 60, // 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while (entry = await queue.shiftRequest()) {
      try {
        const formData = await entry.request.formData();
        const response = await fetch(entry.request.clone());

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }

        // Notify client of successful upload
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'UPLOAD_SUCCESS',
            url: entry.request.url,
          });
        });

        console.log('Upload successful:', entry.request.url);
      } catch (error) {
        console.error('Upload failed:', error);

        // Return to queue for retry
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Client-side: Upload manager
interface UploadQueueItem {
  id: string;
  file: File;
  entryId: string;
  retries: number;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  error?: string;
  uploadedUrl?: string;
}

class PhotoUploadManager {
  private queue: UploadQueueItem[] = [];
  private maxRetries = 3;
  private retryDelays = [3000, 5000, 10000]; // Incremental backoff

  async addToQueue(file: File, entryId: string): Promise<string> {
    const id = crypto.randomUUID();

    const item: UploadQueueItem = {
      id,
      file,
      entryId,
      retries: 0,
      status: 'pending',
    };

    this.queue.push(item);
    await this.persistQueue();

    // Start upload attempt
    this.processQueue();

    return id;
  }

  private async processQueue() {
    const pending = this.queue.filter(
      item => item.status === 'pending' || item.status === 'failed'
    );

    for (const item of pending) {
      if (item.retries >= this.maxRetries) {
        console.error(`Max retries exceeded for ${item.id}`);
        continue;
      }

      try {
        item.status = 'uploading';
        await this.persistQueue();

        const result = await this.uploadPhoto(item);

        item.status = 'success';
        item.uploadedUrl = result.url;

        // Update entry with uploaded URL
        await this.updateEntryWithPhotoUrl(item.entryId, result.url);

        // Remove from queue after success
        this.queue = this.queue.filter(i => i.id !== item.id);

      } catch (error) {
        item.status = 'failed';
        item.retries++;
        item.error = error instanceof Error ? error.message : 'Unknown error';

        console.error(`Upload failed for ${item.id}:`, error);

        // Schedule retry with backoff
        const delay = this.retryDelays[Math.min(item.retries - 1, this.retryDelays.length - 1)];
        setTimeout(() => this.processQueue(), delay);
      } finally {
        await this.persistQueue();
      }
    }
  }

  private async uploadPhoto(item: UploadQueueItem): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('entryId', item.entryId);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      // Service worker will intercept and queue if offline
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  private async persistQueue() {
    // Store queue in IndexedDB
    await db.uploadQueue.clear();
    await db.uploadQueue.bulkAdd(
      this.queue.map(item => ({
        ...item,
        // Convert File to blob for storage
        fileBlob: item.file,
      }))
    );
  }

  async restoreQueue() {
    const stored = await db.uploadQueue.toArray();
    this.queue = stored.map(item => ({
      ...item,
      file: new File([item.fileBlob], item.file.name, { type: item.file.type }),
    }));

    // Resume processing
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
      uploading: this.queue.filter(i => i.status === 'uploading').length,
      failed: this.queue.filter(i => i.status === 'failed').length,
    };
  }

  private async updateEntryWithPhotoUrl(entryId: string, photoUrl: string) {
    await db.entries.update(entryId, entry => {
      return {
        ...entry,
        photos: [...(entry.photos || []), photoUrl],
        _modified: Date.now(),
        _synced: false,
      };
    });
  }
}

// Singleton instance
export const uploadManager = new PhotoUploadManager();

// React hook for upload status
function useUploadQueue() {
  const [status, setStatus] = useState(uploadManager.getQueueStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(uploadManager.getQueueStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

// UI component showing upload progress
function UploadStatus() {
  const status = useUploadQueue();

  if (status.total === 0) return null;

  return (
    <div className="upload-status">
      <div className="status-bar">
        <div
          className="progress"
          style={{
            width: `${((status.total - status.pending - status.failed) / status.total) * 100}%`
          }}
        />
      </div>
      <p>
        Uploading photos: {status.uploading} in progress, {status.pending} queued
        {status.failed > 0 && `, ${status.failed} failed`}
      </p>
    </div>
  );
}
```

**Potential Pitfalls:**
- **iOS No Background Sync:** iOS Safari doesn't support Background Sync API; must rely on explicit retries
- **Battery Drain:** Frequent upload attempts can drain battery
- **Queue Overflow:** Large number of failed uploads can consume storage
- **Duplicate Uploads:** Network errors may cause duplicate upload attempts

---

### 2.4 Resumable Uploads for Large Photo Batches

#### **Decision: TUS Protocol with tus-js-client**

**Rationale:**
- **Industry standard:** TUS is the standard protocol for resumable uploads
- **Fault-tolerant:** Can resume after network failures, browser crashes
- **Efficient:** Only uploads missing chunks, not entire file
- **Widely supported:** Supabase Storage supports TUS protocol

**Implementation Notes:**

```typescript
// Install: npm install tus-js-client

import * as tus from 'tus-js-client';

interface ResumableUploadOptions {
  file: File;
  endpoint: string;
  metadata?: Record<string, string>;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

async function uploadWithResume(options: ResumableUploadOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(options.file, {
      endpoint: options.endpoint,

      // Retry configuration
      retryDelays: [0, 3000, 5000, 10000, 20000], // Incremental backoff

      // Metadata
      metadata: {
        filename: options.file.name,
        filetype: options.file.type,
        ...options.metadata,
      },

      // Chunk size (5MB chunks)
      chunkSize: 5 * 1024 * 1024,

      // Store upload URL in IndexedDB for resumability
      storeFingerprintForResuming: true,

      // Callbacks
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        console.log(`Upload progress: ${percentage}%`);
        options.onProgress?.(bytesUploaded, bytesTotal);
      },

      onSuccess: () => {
        console.log('Upload finished:', upload.url);
        options.onSuccess?.(upload.url!);
        resolve(upload.url!);
      },

      onError: (error) => {
        console.error('Upload error:', error);
        options.onError?.(error);
        reject(error);
      },

      // Enable resuming from previous attempts
      onShouldRetry: (err, retryAttempt, options) => {
        const status = err?.originalResponse?.getStatus();

        // Retry on network errors or server errors (5xx)
        if (!status || status >= 500) {
          return true;
        }

        // Don't retry on client errors (4xx)
        if (status >= 400 && status < 500) {
          return false;
        }

        return retryAttempt < 5;
      },
    });

    // Start upload
    upload.start();

    // Store upload instance for potential pause/resume
    storeUploadInstance(options.file.name, upload);
  });
}

// Upload manager with pause/resume
class ResumableUploadManager {
  private uploads = new Map<string, tus.Upload>();

  async startUpload(file: File, metadata?: Record<string, string>): Promise<string> {
    const uploadId = crypto.randomUUID();

    try {
      const url = await uploadWithResume({
        file,
        endpoint: await this.getUploadEndpoint(),
        metadata: {
          uploadId,
          ...metadata,
        },
        onProgress: (uploaded, total) => {
          this.updateProgress(uploadId, uploaded, total);
        },
        onSuccess: (url) => {
          this.markComplete(uploadId, url);
        },
        onError: (error) => {
          this.markFailed(uploadId, error);
        },
      });

      return url;
    } catch (error) {
      throw error;
    }
  }

  pauseUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      upload.abort();
    }
  }

  resumeUpload(uploadId: string) {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      upload.start();
    }
  }

  private async getUploadEndpoint(): Promise<string> {
    // For Supabase Storage
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      throw new Error('Not authenticated');
    }

    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;
  }

  private updateProgress(uploadId: string, uploaded: number, total: number) {
    // Update UI or store in IndexedDB
    db.uploadProgress.put({
      id: uploadId,
      uploaded,
      total,
      percentage: (uploaded / total) * 100,
      updatedAt: Date.now(),
    });
  }

  private markComplete(uploadId: string, url: string) {
    this.uploads.delete(uploadId);
    db.uploadProgress.delete(uploadId);
  }

  private markFailed(uploadId: string, error: Error) {
    db.uploadProgress.update(uploadId, {
      status: 'failed',
      error: error.message,
    });
  }
}

// Batch upload with concurrency limit
async function batchUploadWithResume(
  files: File[],
  concurrency: number = 3
): Promise<string[]> {
  const results: string[] = [];
  const queue = [...files];
  const active: Promise<string>[] = [];

  while (queue.length > 0 || active.length > 0) {
    // Fill up to concurrency limit
    while (active.length < concurrency && queue.length > 0) {
      const file = queue.shift()!;
      const promise = uploadWithResume({
        file,
        endpoint: await getUploadEndpoint(),
      });
      active.push(promise);
    }

    // Wait for one to complete
    const url = await Promise.race(active);
    results.push(url);

    // Remove completed from active
    const index = active.findIndex(p => p === url);
    active.splice(index, 1);
  }

  return results;
}

// React component with resumable upload UI
function ResumablePhotoUploader() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    for (const file of files) {
      const uploadId = crypto.randomUUID();

      setUploads(prev => new Map(prev).set(uploadId, {
        id: uploadId,
        filename: file.name,
        uploaded: 0,
        total: file.size,
        status: 'uploading',
      }));

      try {
        await uploadWithResume({
          file,
          endpoint: await getUploadEndpoint(),
          onProgress: (uploaded, total) => {
            setUploads(prev => {
              const next = new Map(prev);
              const upload = next.get(uploadId);
              if (upload) {
                upload.uploaded = uploaded;
                upload.total = total;
              }
              return next;
            });
          },
          onSuccess: (url) => {
            setUploads(prev => {
              const next = new Map(prev);
              const upload = next.get(uploadId);
              if (upload) {
                upload.status = 'success';
                upload.url = url;
              }
              return next;
            });
          },
          onError: (error) => {
            setUploads(prev => {
              const next = new Map(prev);
              const upload = next.get(uploadId);
              if (upload) {
                upload.status = 'failed';
                upload.error = error.message;
              }
              return next;
            });
          },
        });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />

      {Array.from(uploads.values()).map(upload => (
        <div key={upload.id} className="upload-item">
          <p>{upload.filename}</p>
          <progress value={upload.uploaded} max={upload.total} />
          <span>
            {((upload.uploaded / upload.total) * 100).toFixed(0)}%
          </span>
          {upload.status === 'failed' && (
            <button onClick={() => resumeUpload(upload.id)}>
              Retry
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Potential Pitfalls:**
- **Server Support Required:** Backend must implement TUS protocol
- **Storage Overhead:** Partial uploads consume server storage
- **Cleanup:** Old/abandoned uploads need garbage collection
- **Complexity:** More complex than simple multipart uploads

---

## 3. Dynamic Form Generation

### 3.1 Generating Forms from JSON Schema

#### **Decision: React Hook Form + json-schema-to-zod (runtime) + Custom Field Mapper**

**Rationale:**
- **Type Safety:** Zod provides runtime validation + TypeScript inference
- **Performance:** React Hook Form minimizes re-renders with uncontrolled components
- **Flexibility:** Custom field mapper allows UI library integration (Shadcn, MUI, etc.)
- **Runtime Validation:** JSON schemas stored in database can be validated at runtime

**Alternatives Considered:**

1. **@rjsf/core (React JSON Schema Form)**
   - **Pros:**
     - Mature, feature-complete
     - Built-in widgets for all field types
   - **Cons:**
     - Heavy (large bundle)
     - Difficult to customize UI
     - Uses controlled components (performance issues with large forms)

2. **Formik + Yup**
   - **Pros:**
     - Popular, well-documented
   - **Cons:**
     - Yup less powerful than Zod
     - Formik has performance issues with large forms
     - No direct JSON Schema support

**Implementation Notes:**

```typescript
// Install dependencies
// npm install react-hook-form @hookform/resolvers zod @dmitryrechkin/json-schema-to-zod

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { JSONSchemaToZod } from '@dmitryrechkin/json-schema-to-zod';

// Example: Checklist configuration stored in database
interface ChecklistConfig {
  id: string;
  name: string;
  jsonSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Convert JSON Schema to Zod schema at runtime
function jsonSchemaToZod(jsonSchema: any): z.ZodSchema {
  const converter = new JSONSchemaToZod();
  return converter.convert(jsonSchema);
}

// Field type mapping
type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'textarea'
  | 'file';

interface FieldConfig {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Map JSON Schema to field configs
function mapSchemaToFields(jsonSchema: any): FieldConfig[] {
  const fields: FieldConfig[] = [];

  for (const [name, schema] of Object.entries(jsonSchema.properties || {})) {
    const s = schema as any;

    const field: FieldConfig = {
      name,
      type: getFieldType(s),
      label: s.title || name,
      placeholder: s.description,
      validation: {
        required: jsonSchema.required?.includes(name),
        min: s.minimum,
        max: s.maximum,
        pattern: s.pattern,
      },
    };

    // Handle enum (select/radio)
    if (s.enum) {
      field.options = s.enum.map((value: string) => ({
        value,
        label: value,
      }));
    }

    fields.push(field);
  }

  return fields;
}

function getFieldType(schema: any): FieldType {
  if (schema.enum) {
    return schema.enum.length <= 5 ? 'radio' : 'select';
  }

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date') return 'date';
      if (schema.maxLength && schema.maxLength > 100) return 'textarea';
      return 'text';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'checkbox';
    default:
      return 'text';
  }
}

// Dynamic form component
interface DynamicFormProps {
  config: ChecklistConfig;
  onSubmit: (data: any) => void;
  defaultValues?: any;
}

function DynamicForm({ config, onSubmit, defaultValues }: DynamicFormProps) {
  // Convert JSON Schema to Zod
  const zodSchema = useMemo(
    () => jsonSchemaToZod(config.jsonSchema),
    [config.jsonSchema]
  );

  // Extract field configs
  const fields = useMemo(
    () => mapSchemaToFields(config.jsonSchema),
    [config.jsonSchema]
  );

  // Setup React Hook Form
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaultValues || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map(field => (
        <Controller
          key={field.name}
          name={field.name}
          control={control}
          render={({ field: { onChange, value } }) => (
            <FieldRenderer
              field={field}
              value={value}
              onChange={onChange}
              error={errors[field.name]?.message as string}
            />
          )}
        />
      ))}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}

// Field renderer component
function FieldRenderer({ field, value, onChange, error }: any) {
  switch (field.type) {
    case 'text':
    case 'number':
      return (
        <div className="field">
          <label htmlFor={field.name}>{field.label}</label>
          <input
            id={field.name}
            type={field.type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {error && <span className="error">{error}</span>}
        </div>
      );

    case 'textarea':
      return (
        <div className="field">
          <label htmlFor={field.name}>{field.label}</label>
          <textarea
            id={field.name}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {error && <span className="error">{error}</span>}
        </div>
      );

    case 'select':
      return (
        <div className="field">
          <label htmlFor={field.name}>{field.label}</label>
          <select
            id={field.name}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <span className="error">{error}</span>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={value || false}
              onChange={e => onChange(e.target.checked)}
            />
            {field.label}
          </label>
          {error && <span className="error">{error}</span>}
        </div>
      );

    case 'radio':
      return (
        <div className="field">
          <label>{field.label}</label>
          {field.options?.map(opt => (
            <label key={opt.value}>
              <input
                type="radio"
                value={opt.value}
                checked={value === opt.value}
                onChange={e => onChange(e.target.value)}
              />
              {opt.label}
            </label>
          ))}
          {error && <span className="error">{error}</span>}
        </div>
      );

    case 'date':
      return (
        <div className="field">
          <label htmlFor={field.name}>{field.label}</label>
          <input
            id={field.name}
            type="date"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
          {error && <span className="error">{error}</span>}
        </div>
      );

    default:
      return null;
  }
}

// Usage example
function ChecklistPage({ checklistId }: { checklistId: string }) {
  const [config, setConfig] = useState<ChecklistConfig | null>(null);

  useEffect(() => {
    // Fetch checklist config from database
    async function loadConfig() {
      const { data } = await supabase
        .from('checklist_configs')
        .select('*')
        .eq('id', checklistId)
        .single();

      setConfig(data);
    }

    loadConfig();
  }, [checklistId]);

  const handleSubmit = async (data: any) => {
    // Save to IndexedDB (offline)
    await db.entries.add({
      id: crypto.randomUUID(),
      checklist_id: checklistId,
      data,
      created_at: new Date().toISOString(),
      _synced: false,
    });

    // Queue for sync
    // ...
  };

  if (!config) return <div>Loading...</div>;

  return (
    <div>
      <h1>{config.name}</h1>
      <DynamicForm config={config} onSubmit={handleSubmit} />
    </div>
  );
}
```

**Advanced: Conditional Fields**

```typescript
// JSON Schema with conditional logic
const advancedSchema = {
  type: 'object',
  properties: {
    has_defect: {
      type: 'boolean',
      title: 'Defect Found?',
    },
    defect_type: {
      type: 'string',
      title: 'Defect Type',
      enum: ['crack', 'corrosion', 'deformation'],
    },
    defect_severity: {
      type: 'string',
      title: 'Severity',
      enum: ['low', 'medium', 'high'],
    },
  },
  required: ['has_defect'],
  // Conditional requirement
  if: {
    properties: { has_defect: { const: true } },
  },
  then: {
    required: ['defect_type', 'defect_severity'],
  },
};

// Implement conditional rendering
function DynamicFormWithConditionals({ config }: { config: ChecklistConfig }) {
  const { watch, control } = useForm();

  // Watch for conditional field values
  const hasDefect = watch('has_defect');

  return (
    <form>
      <Controller name="has_defect" control={control} render={...} />

      {/* Conditionally render based on watched value */}
      {hasDefect && (
        <>
          <Controller name="defect_type" control={control} render={...} />
          <Controller name="defect_severity" control={control} render={...} />
        </>
      )}
    </form>
  );
}
```

**Potential Pitfalls:**
- **Performance with watch():** `watch()` triggers re-renders; use `useWatch` for better performance
- **Zod Conversion Limitations:** Some JSON Schema features may not map to Zod
- **Validation Errors:** Runtime schema conversion can fail; wrap in try-catch
- **Type Safety:** TypeScript can't infer types from runtime JSON schemas

---

### 3.2 React Hook Form Performance Optimization

#### **Decision: Use getValues for reads, useWatch for isolated re-renders**

**Rationale:**
- **getValues:** Fast reads without triggering re-renders (ideal for submit handlers)
- **useWatch:** Isolates re-renders to specific components (better than watch)
- **useFieldArray:** Optimized for dynamic arrays (add/remove fields)

**Implementation Notes:**

```typescript
// GOOD: Use getValues in callbacks (no re-render)
function MyForm() {
  const { getValues, handleSubmit } = useForm();

  const handleSave = () => {
    const data = getValues(); // Fast, no re-render
    console.log('Current values:', data);
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}

// GOOD: Use useWatch for isolated component re-renders
function ConditionalField() {
  const hasDefect = useWatch({ name: 'has_defect' }); // Only this component re-renders

  if (!hasDefect) return null;
  return <input name="defect_details" />;
}

// BAD: watch() triggers re-render of entire form
function MyFormBad() {
  const { watch } = useForm();
  const hasDefect = watch('has_defect'); // Entire form re-renders!

  return <form>...</form>;
}

// GOOD: useFieldArray for dynamic arrays
function DynamicChecklistItems() {
  const { control } = useForm();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  return (
    <div>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`items.${index}.value`)} />
          <button onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button onClick={() => append({ value: '' })}>Add Item</button>
    </div>
  );
}
```

**Potential Pitfalls:**
- **watch() Overuse:** Causes unnecessary re-renders
- **Nested Fields:** Deep nesting can impact performance; flatten when possible
- **Validation on Change:** Validate on blur instead of on change for better UX

---

## 4. Supabase Row Level Security Patterns

### 4.1 RLS Policies for Project-Based Access Control

#### **Decision: Team/Project-Based RLS with JWT Claims + Indexed Columns**

**Rationale:**
- **Security:** RLS enforces access control at database level (can't be bypassed)
- **Performance:** Proper indexing and query optimization prevent slowdowns
- **Scalability:** Works for multi-tenant applications
- **Supabase Native:** Integrates with Supabase Auth JWT tokens

**Implementation Notes:**

```sql
-- 1. Add user access tracking tables
CREATE TABLE user_projects (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);

-- CRITICAL: Index for RLS performance
CREATE INDEX idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX idx_user_projects_project_id ON user_projects(project_id);

-- 2. Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- 3. Create optimized RLS policies

-- Projects: User can only see projects they have access to
CREATE POLICY "Users can view their projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM user_projects
      WHERE user_id = (SELECT auth.uid()) -- Wrapped in SELECT for initPlan optimization
    )
  );

-- Projects: Only admins can insert/update/delete
CREATE POLICY "Admins can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM user_projects
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id
      FROM user_projects
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Cabinets: Inherit access from parent project
CREATE POLICY "Users can view cabinets in their projects"
  ON cabinets
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id
      FROM user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Entries: Editors can create/update, viewers can only read
CREATE POLICY "Users can view entries in their projects"
  ON entries
  FOR SELECT
  TO authenticated
  USING (
    segment_id IN (
      SELECT s.id
      FROM segments s
      JOIN cabinets c ON s.cabinet_id = c.id
      JOIN user_projects up ON c.project_id = up.project_id
      WHERE up.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Editors can create entries"
  ON entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    segment_id IN (
      SELECT s.id
      FROM segments s
      JOIN cabinets c ON s.cabinet_id = c.id
      JOIN user_projects up ON c.project_id = up.project_id
      WHERE up.user_id = (SELECT auth.uid())
        AND up.role IN ('editor', 'admin')
    )
  );

-- 4. Performance optimization: Security definer functions
CREATE OR REPLACE FUNCTION user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_projects
    WHERE user_id = auth.uid()
      AND project_id = p_project_id
  );
END;
$$;

-- Use function in policy (wrap in SELECT for initPlan)
CREATE POLICY "Users can view their projects (optimized)"
  ON projects
  FOR SELECT
  TO authenticated
  USING ((SELECT user_has_project_access(project_id)));

-- 5. Add indexes on columns used in RLS policies
CREATE INDEX idx_cabinets_project_id ON cabinets(project_id);
CREATE INDEX idx_segments_cabinet_id ON segments(cabinet_id);
CREATE INDEX idx_entries_segment_id ON entries(segment_id);

-- 6. Index on _modified for sync queries
CREATE INDEX idx_entries_modified ON entries(_modified);
CREATE INDEX idx_entries_synced ON entries(_synced) WHERE _synced = false;
```

**Using JWT Claims for Performance:**

```typescript
// Server-side: Add custom claims to JWT
// In Supabase Edge Function or Auth Hook

interface CustomClaims {
  project_ids: string[];
  role: 'viewer' | 'editor' | 'admin';
}

// Add claims during sign-in
supabase.auth.admin.updateUserById(userId, {
  app_metadata: {
    project_ids: ['proj-1', 'proj-2'],
    role: 'editor',
  },
});

// In RLS policy, use JWT claims (faster than subquery)
CREATE POLICY "Users can view projects (JWT claims)"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    project_id = ANY(
      COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'project_ids')::uuid[],
        '{}'::uuid[]
      )
    )
  );
```

**Potential Pitfalls:**
- **Performance Impact:** Complex joins in RLS policies can slow queries significantly
- **Index Everything:** Columns used in RLS policies MUST be indexed
- **Use initPlan Pattern:** Always wrap auth.uid() and auth.jwt() in SELECT
- **Avoid Correlated Subqueries:** Rewrite as IN or ANY queries
- **Specify Roles:** Always use TO authenticated, never TO public
- **Test Performance:** Use EXPLAIN ANALYZE to measure query performance

---

### 4.2 Service Role vs Anon Key Usage

#### **Decision: Anon Key for Client, Service Role for Admin Operations Only**

**Rationale:**
- **Security:** Anon key subject to RLS; service role bypasses RLS
- **Principle of Least Privilege:** Client should never have service role key
- **Audit Trail:** RLS policies track user actions; service role bypasses this

**Implementation Notes:**

```typescript
// CLIENT SIDE: Always use anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Safe to expose
);

// SERVER SIDE: Use service role only when necessary
// app/api/admin/route.ts
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Verify user is admin (your auth logic)
  const session = await getSession(request);
  if (!session?.user?.role === 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Use service role for admin operations
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER expose to client
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Perform admin operation (bypasses RLS)
  const { data, error } = await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', projectId);

  return Response.json({ data, error });
}
```

**Storage Bucket Policies:**

```sql
-- Storage bucket access control
CREATE POLICY "Users can upload photos to their projects"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] IN (
      SELECT project_id::text
      FROM user_projects
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Users can view photos from their projects"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] IN (
      SELECT project_id::text
      FROM user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Folder structure: photos/{project_id}/{entry_id}/{filename}
```

**Potential Pitfalls:**
- **Service Role Exposure:** NEVER send service role key to client (even accidentally in env vars)
- **Bypass RLS Accidentally:** Service role bypasses all RLS; be careful with bulk operations
- **Storage Bucket Paths:** Ensure folder structure matches RLS policies

---

## 5. PWA Installation & Service Workers

### 5.1 Add to Home Screen Prompts

#### **Decision: Custom Install Button with Platform Detection**

**Rationale:**
- **Better UX:** Custom prompt provides context, not just browser default
- **Cross-platform:** Works on Android (Chrome), iOS (manual instructions)
- **Timing:** Show prompt at appropriate time (after user engagement)

**Implementation Notes:**

```typescript
// hooks/useInstallPrompt.ts
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt (Android)
    const handler = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app was successfully installed
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    // Show install prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;

    // Reset prompt
    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === 'accepted';
  };

  return {
    isInstallable,
    isIOS,
    isStandalone,
    promptInstall,
  };
}

// components/InstallPrompt.tsx
import { useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function InstallPrompt() {
  const { isInstallable, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already installed or user dismissed
  if (isStandalone || dismissed) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else if (isInstallable) {
      const accepted = await promptInstall();
      if (!accepted) {
        setDismissed(true);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  };

  return (
    <div className="install-prompt">
      {!showIOSInstructions ? (
        <>
          <h3>Install Work Portal</h3>
          <p>Install this app for offline access and a better experience.</p>
          <button onClick={handleInstall}>
            {isIOS ? 'Install Instructions' : 'Install App'}
          </button>
          <button onClick={handleDismiss} className="dismiss">
            Not Now
          </button>
        </>
      ) : (
        <div className="ios-instructions">
          <h3>Install on iOS</h3>
          <ol>
            <li>
              Tap the <strong>Share</strong> button
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
              </svg>
            </li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
            <li>Tap <strong>Add</strong> to confirm</li>
          </ol>
          <button onClick={() => setShowIOSInstructions(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// Show prompt at appropriate time
function App() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if user has dismissed recently
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return; // Don't show again for 7 days
    }

    // Show after 30 seconds of engagement
    const timer = setTimeout(() => {
      setShowInstallPrompt(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showInstallPrompt && <InstallPrompt />}
      {/* Rest of app */}
    </>
  );
}
```

**iOS-Specific Considerations:**

```typescript
// Detect iOS Safari specifically
function isIOSSafari(): boolean {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const isSafari = iOS && webkit && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  return isSafari;
}

// Check if running in standalone mode (installed)
function isIOSStandalone(): boolean {
  return (window.navigator as any).standalone === true;
}

// Apple touch icon for home screen
// In app/layout.tsx or _document.tsx
export const metadata = {
  icons: {
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};
```

**Potential Pitfalls:**
- **iOS No beforeinstallprompt:** Must provide manual instructions
- **Timing:** Showing prompt too early annoys users; wait for engagement
- **Persistence:** Remember user's dismissal choice
- **Browser Restrictions:** Only works in Safari on iOS

---

### 5.2 iOS Safari Limitations and Workarounds

#### **Decision: Progressive Enhancement with Fallbacks**

**Rationale:**
- **Accept Limitations:** Some features simply don't work on iOS Safari
- **Graceful Degradation:** Provide alternative UX when features unavailable
- **User Education:** Inform users about iOS limitations upfront

**Known Limitations & Workarounds:**

```typescript
// 1. No Background Sync API
// WORKAROUND: Manual sync triggers

function usePeriodicSync() {
  useEffect(() => {
    // iOS: Trigger sync when app comes to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App foregrounded, triggering sync');
        triggerSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

// 2. 50MB Storage Limit
// WORKAROUND: Aggressive cleanup + user warnings

async function checkStorageQuota() {
  if (!navigator.storage?.estimate) return;

  const estimate = await navigator.storage.estimate();
  const percentUsed = (estimate.usage! / estimate.quota!) * 100;

  // iOS Safari typically gives ~50MB
  if (estimate.quota && estimate.quota < 100 * 1024 * 1024) {
    console.warn('Limited storage quota detected (likely iOS)');

    if (percentUsed > 70) {
      // Warn user and trigger cleanup
      showStorageWarning();
      await cleanupOldData();
    }
  }
}

async function cleanupOldData() {
  // Keep only last 30 days of synced data
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  await db.entries
    .where('_modified')
    .below(cutoff)
    .and(e => e._synced && !e._deleted)
    .delete();

  // Compress photos more aggressively
  await compressStoredPhotos();
}

// 3. No Push Notifications (before iOS 16.4)
// WORKAROUND: In-app notifications + email fallback

function useNotificationFallback() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const sendNotification = (message: string) => {
    if (permission === 'granted' && 'Notification' in window) {
      new Notification('Work Portal', { body: message });
    } else {
      // Fallback: In-app toast notification
      showToast(message);
    }
  };

  return { sendNotification, hasNotifications: permission === 'granted' };
}

// 4. Service Worker Limitations
// WORKAROUND: Feature detection

function detectServiceWorkerCapabilities() {
  const capabilities = {
    serviceWorker: 'serviceWorker' in navigator,
    backgroundSync: 'sync' in ServiceWorkerRegistration.prototype,
    periodicSync: 'periodicSync' in ServiceWorkerRegistration.prototype,
    pushManager: 'PushManager' in window,
  };

  console.log('PWA capabilities:', capabilities);
  return capabilities;
}

// 5. Cache Strategy Adjustments for iOS
// Use more aggressive caching since background sync doesn't work

// In service worker
const isIOS = /iPad|iPhone|iPod/.test(self.navigator.userAgent);

if (isIOS) {
  // More aggressive caching for iOS
  registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
      cacheName: 'images',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50, // Lower limit due to 50MB storage
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    })
  );
}

// 6. Viewport and Safe Areas
// Handle iOS notch and home indicator

// In global CSS
html {
  /* iOS safe areas */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

// In manifest.json
{
  "display": "standalone",
  "viewport": "width=device-width, initial-scale=1, viewport-fit=cover"
}

// 7. Camera Access in PWA
// iOS Safari restricts camera access in standalone mode

function useCameraWorkaround() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = (window.navigator as any).standalone ||
                       window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
  }, []);

  const openCamera = () => {
    if (isStandalone) {
      // Workaround: Open in Safari to access camera
      alert('Please open in Safari to use camera');
      window.location.href = window.location.href.replace('standalone', '');
    } else {
      // Normal camera access
      document.getElementById('camera-input')?.click();
    }
  };

  return { openCamera, cameraRestricted: isStandalone };
}
```

**User Education Component:**

```typescript
function IOSLimitationsWarning() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setShowWarning(isIOS);
  }, []);

  if (!showWarning) return null;

  return (
    <div className="ios-warning">
      <h3>iOS Limitations</h3>
      <ul>
        <li>Photos sync only when app is open</li>
        <li>Storage limited to ~50MB (use WiFi for large uploads)</li>
        <li>Camera access requires using Safari browser</li>
      </ul>
      <button onClick={() => setShowWarning(false)}>Got it</button>
    </div>
  );
}
```

**Potential Pitfalls:**
- **Assuming Features Work:** Always feature-detect, never assume
- **Storage Eviction:** iOS may evict PWA storage without warning
- **Standalone Mode Issues:** Some APIs don't work in standalone mode
- **Update Mechanism:** iOS PWAs don't auto-update; user must manually refresh

---

## 6. Auto-Save & Draft Recovery

### 6.1 Auto-Save Debouncing Strategies

#### **Decision: 5-Second Debounce + onBlur Save + Visibility Change Save**

**Rationale:**
- **Balance:** 5 seconds provides good balance between data loss prevention and performance
- **User Experience:** onBlur ensures data is saved when user leaves field
- **Battery Efficiency:** Debouncing reduces write frequency
- **Crash Recovery:** Visibility change listener catches browser crashes

**Implementation Notes:**

```typescript
// hooks/useAutoSave.ts
import { useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { debounce } from 'lodash-es';

interface AutoSaveOptions {
  entryId: string;
  onSave: (data: any) => Promise<void>;
  delay?: number; // Default: 5000ms
}

export function useAutoSave({ entryId, onSave, delay = 5000 }: AutoSaveOptions) {
  const { watch, getValues } = useForm();
  const lastSavedRef = useRef<any>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (data: any) => {
      // Skip if data hasn't changed
      if (JSON.stringify(data) === JSON.stringify(lastSavedRef.current)) {
        return;
      }

      setIsSaving(true);

      try {
        await onSave(data);
        lastSavedRef.current = data;
        setLastSavedTime(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay),
    [onSave, delay]
  );

  // Watch form changes
  useEffect(() => {
    const subscription = watch((data) => {
      debouncedSave(data);
    });

    return () => subscription.unsubscribe();
  }, [watch, debouncedSave]);

  // Save on blur (immediate, not debounced)
  const saveImmediately = useCallback(async () => {
    debouncedSave.cancel(); // Cancel pending debounced save
    const data = getValues();

    if (JSON.stringify(data) === JSON.stringify(lastSavedRef.current)) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(data);
      lastSavedRef.current = data;
      setLastSavedTime(new Date());
    } catch (error) {
      console.error('Immediate save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [getValues, onSave, debouncedSave]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const data = getValues();

      if (JSON.stringify(data) !== JSON.stringify(lastSavedRef.current)) {
        // Try to save synchronously (may not complete)
        onSave(data).catch(console.error);

        // Show browser warning
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [getValues, onSave]);

  // Save when tab becomes hidden (user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveImmediately();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveImmediately]);

  // Force save (for manual save button)
  const forceSave = useCallback(async () => {
    await saveImmediately();
  }, [saveImmediately]);

  return {
    lastSavedTime,
    isSaving,
    forceSave,
  };
}

// Usage in form component
function EntryForm({ entryId }: { entryId: string }) {
  const { register, watch, getValues } = useForm({
    defaultValues: async () => {
      // Load from IndexedDB
      const entry = await db.entries.get(entryId);
      return entry?.data || {};
    },
  });

  const handleSave = async (data: any) => {
    // Save to IndexedDB
    await db.entries.update(entryId, {
      data,
      _modified: Date.now(),
      _synced: false,
    });
  };

  const { lastSavedTime, isSaving, forceSave } = useAutoSave({
    entryId,
    onSave: handleSave,
    delay: 5000,
  });

  return (
    <form>
      <input {...register('field1')} onBlur={forceSave} />
      <input {...register('field2')} onBlur={forceSave} />

      <div className="save-status">
        {isSaving ? (
          <span>Saving...</span>
        ) : lastSavedTime ? (
          <span>Last saved: {formatTimeAgo(lastSavedTime)}</span>
        ) : null}
      </div>

      <button type="button" onClick={forceSave}>
        Save Now
      </button>
    </form>
  );
}

// Utility: Format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return date.toLocaleString();
}
```

**Alternative: IndexedDB Direct Writes (Faster)**

```typescript
// For even faster auto-save, write directly to IndexedDB
// without debouncing (IndexedDB is async and non-blocking)

function useInstantAutoSave({ entryId }: { entryId: string }) {
  const { watch } = useForm();

  useEffect(() => {
    const subscription = watch((data) => {
      // Write immediately to IndexedDB (non-blocking)
      db.drafts.put({
        id: entryId,
        data,
        timestamp: Date.now(),
      }).catch(console.error);
    });

    return () => subscription.unsubscribe();
  }, [watch, entryId]);
}
```

**Potential Pitfalls:**
- **Over-Saving:** Too frequent saves can drain battery and slow down app
- **Race Conditions:** Multiple saves in flight can cause data inconsistency
- **Network Failures:** Auto-save to server should queue failed attempts
- **User Confusion:** Users may not understand "Last saved" vs "Synced to server"

---

### 6.2 Draft Recovery UX Patterns

#### **Decision: Automatic Draft Restoration with Manual Conflict Resolution**

**Rationale:**
- **Data Loss Prevention:** Automatically restore drafts on crash/reload
- **User Control:** Allow users to discard drafts if intentional
- **Conflict Awareness:** Show warning when draft conflicts with server data

**Implementation Notes:**

```typescript
// components/DraftRecoveryModal.tsx
interface Draft {
  id: string;
  entryId: string;
  data: any;
  timestamp: number;
}

interface DraftRecoveryModalProps {
  draft: Draft;
  serverData?: any;
  onRestore: (data: any) => void;
  onDiscard: () => void;
}

function DraftRecoveryModal({
  draft,
  serverData,
  onRestore,
  onDiscard
}: DraftRecoveryModalProps) {
  const hasConflict = serverData &&
    JSON.stringify(draft.data) !== JSON.stringify(serverData);

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Draft Found</h2>

        {hasConflict ? (
          <>
            <p>
              You have unsaved changes from {formatTimeAgo(new Date(draft.timestamp))}.
              However, this entry has been updated on the server.
            </p>

            <div className="comparison">
              <div>
                <h3>Your Draft</h3>
                <pre>{JSON.stringify(draft.data, null, 2)}</pre>
              </div>
              <div>
                <h3>Server Version</h3>
                <pre>{JSON.stringify(serverData, null, 2)}</pre>
              </div>
            </div>

            <div className="actions">
              <button onClick={() => onRestore(draft.data)}>
                Use My Draft
              </button>
              <button onClick={() => onRestore(serverData)}>
                Use Server Version
              </button>
              <button onClick={onDiscard} className="secondary">
                Discard Both
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              You have unsaved changes from {formatTimeAgo(new Date(draft.timestamp))}.
              Would you like to restore them?
            </p>

            <div className="actions">
              <button onClick={() => onRestore(draft.data)}>
                Restore Draft
              </button>
              <button onClick={onDiscard} className="secondary">
                Discard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// hooks/useDraftRecovery.ts
function useDraftRecovery(entryId: string) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    async function checkForDraft() {
      // Look for draft in IndexedDB
      const savedDraft = await db.drafts.get(entryId);

      if (!savedDraft) return;

      // Check age of draft (older than 7 days = auto-discard)
      const ageInDays = (Date.now() - savedDraft.timestamp) / (1000 * 60 * 60 * 24);
      if (ageInDays > 7) {
        await db.drafts.delete(entryId);
        return;
      }

      // Fetch server data
      const { data: serverEntry } = await supabase
        .from('entries')
        .select('data')
        .eq('id', entryId)
        .single();

      // Check if draft differs from server
      const isDifferent = !serverEntry ||
        JSON.stringify(savedDraft.data) !== JSON.stringify(serverEntry.data);

      if (isDifferent) {
        setDraft(savedDraft);
        setShowRecovery(true);
      } else {
        // Draft matches server, delete it
        await db.drafts.delete(entryId);
      }
    }

    checkForDraft();
  }, [entryId]);

  const restoreDraft = (data: any) => {
    setShowRecovery(false);
    setDraft(null);
    db.drafts.delete(entryId);
    return data;
  };

  const discardDraft = () => {
    setShowRecovery(false);
    setDraft(null);
    db.drafts.delete(entryId);
  };

  return {
    draft,
    showRecovery,
    restoreDraft,
    discardDraft,
  };
}

// Usage in form page
function EntryFormPage({ entryId }: { entryId: string }) {
  const { draft, showRecovery, restoreDraft, discardDraft } = useDraftRecovery(entryId);
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    async function loadEntry() {
      const { data } = await supabase
        .from('entries')
        .select('*')
        .eq('id', entryId)
        .single();

      setInitialData(data);
    }

    loadEntry();
  }, [entryId]);

  if (showRecovery && draft) {
    return (
      <DraftRecoveryModal
        draft={draft}
        serverData={initialData?.data}
        onRestore={(data) => {
          const restored = restoreDraft(data);
          setInitialData({ ...initialData, data: restored });
        }}
        onDiscard={discardDraft}
      />
    );
  }

  if (!initialData) return <div>Loading...</div>;

  return <EntryForm entryId={entryId} initialData={initialData} />;
}

// Automatic draft cleanup (garbage collection)
async function cleanupOldDrafts() {
  const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

  const oldDrafts = await db.drafts
    .where('timestamp')
    .below(cutoffTime)
    .toArray();

  console.log(`Deleting ${oldDrafts.length} old drafts`);

  await db.drafts
    .where('timestamp')
    .below(cutoffTime)
    .delete();
}

// Run cleanup periodically
useEffect(() => {
  cleanupOldDrafts();

  const interval = setInterval(cleanupOldDrafts, 24 * 60 * 60 * 1000); // Daily

  return () => clearInterval(interval);
}, []);
```

**Potential Pitfalls:**
- **Confusing UX:** Users may not understand difference between draft and server version
- **Draft Bloat:** Old drafts consume storage; implement aggressive cleanup
- **Conflict Resolution:** Field-level diff is better than full document diff
- **Lost Drafts:** Clearing browser data deletes drafts; warn users

---

## Summary of Key Decisions

| Topic | Decision | Key Rationale |
|-------|----------|---------------|
| Offline Sync | RxDB + Supabase Replication | Mature, built-in conflict resolution, TypeScript support |
| IndexedDB Wrapper | Dexie.js | Faster than localForage, better querying, relationships |
| Service Worker | Manual implementation (next-pwa incompatible) | Turbopack incompatibility, full control |
| Conflict Resolution | Last-Write-Wins with timestamps | Simple, predictable, low overhead |
| Photo Compression | browser-image-compression with EXIF | EXIF preservation, configurable, privacy-friendly |
| Upload Queue | Workbox Background Sync + Custom Manager | Automatic retries, battle-tested, extensible |
| Resumable Uploads | TUS Protocol (tus-js-client) | Industry standard, fault-tolerant, Supabase compatible |
| Dynamic Forms | React Hook Form + json-schema-to-zod | Type-safe, performant, runtime validation |
| RLS Strategy | Project-based with JWT claims + indexes | Secure, performant with proper optimization |
| PWA Install | Custom button with platform detection | Better UX, cross-platform, proper timing |
| iOS Workarounds | Progressive enhancement with fallbacks | Accept limitations, graceful degradation |
| Auto-Save | 5-second debounce + onBlur + visibility change | Balance between data loss prevention and performance |
| Draft Recovery | Automatic with conflict resolution UI | Prevent data loss, user control |

---

## Critical Performance Optimizations

### 1. RLS Performance
- ✅ Wrap `auth.uid()` in `SELECT` for initPlan
- ✅ Index all columns used in RLS policies
- ✅ Use security definer functions
- ✅ Avoid correlated subqueries
- ✅ Specify roles (TO authenticated)

### 2. IndexedDB Performance
- ✅ Use Dexie for efficient indexing
- ✅ Implement compound indexes for complex queries
- ✅ Use bulk operations for sync
- ✅ Monitor storage quota
- ✅ Implement cleanup strategies

### 3. React Hook Form Performance
- ✅ Use `getValues` instead of `watch` for reads
- ✅ Use `useWatch` for isolated re-renders
- ✅ Use `useFieldArray` for dynamic arrays
- ✅ Validate on blur, not on change

### 4. Service Worker Caching
- ✅ Cache-first for static assets
- ✅ Network-first for HTML
- ✅ Stale-while-revalidate for API data
- ✅ Background sync for mutations
- ✅ Adjust strategies for iOS (more aggressive caching)

---

## Common Pitfalls to Avoid

1. **Hard Deletes:** Always use soft deletes (_deleted flag) for offline sync
2. **Missing Timestamps:** Required for conflict resolution (_modified field)
3. **No Indexes:** RLS policies without indexes destroy performance
4. **Service Role Exposure:** Never send service role key to client
5. **watch() Overuse:** Causes unnecessary re-renders in React Hook Form
6. **EXIF Loss:** Canvas operations strip EXIF; use preserveExif option
7. **Object URL Leaks:** Always revoke with URL.revokeObjectURL()
8. **iOS Background Sync:** Doesn't exist; implement manual triggers
9. **Storage Eviction:** iOS may evict PWA storage without warning
10. **Auto-Save Overload:** Balance frequency with battery/performance

---

## Recommended Libraries

```json
{
  "dependencies": {
    "rxdb": "^15.0.0",
    "rxdb-supabase": "^1.0.0",
    "dexie": "^4.0.0",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "@dmitryrechkin/json-schema-to-zod": "^1.0.0",
    "browser-image-compression": "^2.0.2",
    "exifreader": "^4.21.0",
    "tus-js-client": "^4.0.0",
    "workbox-background-sync": "^7.0.0",
    "workbox-strategies": "^7.0.0",
    "workbox-routing": "^7.0.0",
    "workbox-precaching": "^7.0.0",
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

---

**Document Generated:** 2025-10-16
**Research Sources:** Web search results from 2025, official documentation, community best practices
