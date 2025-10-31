import Dexie, { Table } from 'dexie'
import type { Project, NVT, Segment, WorkEntry, Photo, SyncQueueItem, WorkerDocument, ProjectDocument, DocumentCategory } from '@/types/models'

export class WorkerAppDatabase extends Dexie {
  // Tables
  projects!: Table<Project, string>
  cabinets!: Table<NVT, string>
  segments!: Table<Segment, string>
  work_entries!: Table<WorkEntry, string>
  photos!: Table<Photo, string>
  sync_queue!: Table<SyncQueueItem, string>
  worker_documents!: Table<WorkerDocument, string>
  project_documents!: Table<ProjectDocument, string>
  document_categories!: Table<DocumentCategory, string>

  constructor() {
    super('WorkerAppDB')

    // Version 1: Initial schema
    this.version(1).stores({
      projects: 'id, name, status, approved',
      cabinets: 'id, projectId, code, name, status',
      segments: 'id, cabinetId, name, status',
      work_entries: 'id, projectId, userId, approved, date',
      photos: 'id, projectId, workEntryId, ts',
      sync_queue: 'id, type, status, createdAt'
    })

    // Version 2: Add segmentId index to work_entries
    this.version(2).stores({
      work_entries: 'id, projectId, userId, segmentId, approved, date'
    })

    // Version 3: Add rejectedAt index to work_entries for filtering rejected entries
    this.version(3).stores({
      work_entries: 'id, projectId, userId, segmentId, approved, rejectedAt, date'
    })

    // Version 4: Add worker_documents table for offline access
    this.version(4).stores({
      worker_documents: 'id, userId, category, createdAt'
    })

    // Version 5: Add project_documents and document_categories for offline access
    this.version(5).stores({
      project_documents: 'id, projectId, categoryCode, isRequired, createdAt',
      document_categories: 'id, code, categoryType'
    })
  }
}

// Export a singleton instance
export const db = new WorkerAppDatabase()

// Helper functions for offline operations
export async function clearExpiredCache() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Clear old projects that are no longer active
  await db.projects
    .where('status')
    .equals('completed')
    .and(item => new Date(item.startDate || '') < thirtyDaysAgo)
    .delete()
}

export async function getCacheStatus() {
  const counts = {
    projects: await db.projects.count(),
    cabinets: await db.cabinets.count(),
    segments: await db.segments.count(),
    work_entries: await db.work_entries.count(),
    photos: await db.photos.count(),
    sync_queue: await db.sync_queue.count(),
    worker_documents: await db.worker_documents.count(),
    project_documents: await db.project_documents.count(),
    document_categories: await db.document_categories.count()
  }

  return counts
}

export async function clearAllCache() {
  await db.projects.clear()
  await db.cabinets.clear()
  await db.segments.clear()
  await db.work_entries.clear()
  await db.photos.clear()
  await db.worker_documents.clear()
  await db.project_documents.clear()
  await db.document_categories.clear()
  // Don't clear sync queue - it contains unsent data
}
