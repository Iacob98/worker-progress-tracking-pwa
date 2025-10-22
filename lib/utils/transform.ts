/**
 * Data transformation utilities for converting between camelCase (app) and snake_case (database)
 */

import type { WorkEntry, Photo } from '@/types/models'

/**
 * Transform WorkEntry from camelCase (app) to snake_case (database)
 */
export function transformWorkEntryToDb(entry: Partial<WorkEntry>): Record<string, any> {
  return {
    id: entry.id,
    project_id: entry.projectId,
    cabinet_id: entry.cabinetId,
    segment_id: entry.segmentId,
    cut_id: entry.cutId,
    house_id: entry.houseId,
    crew_id: entry.crewId,
    user_id: entry.userId,
    date: entry.date,
    stage_code: entry.stageCode,
    meters_done_m: entry.metersDoneM,
    method: entry.method,
    width_m: entry.widthM,
    depth_m: entry.depthM,
    cables_count: entry.cablesCount,
    has_protection_pipe: entry.hasProtectionPipe,
    soil_type: entry.soilType,
    notes: entry.notes,
    approved_by: entry.approvedBy,
    approved_at: entry.approvedAt,
    approved: entry.approved,
    rejection_reason: entry.rejectionReason,
    rejected_by: entry.rejectedBy,
    rejected_at: entry.rejectedAt,
  }
}

/**
 * Transform WorkEntry from snake_case (database) to camelCase (app)
 */
export function transformWorkEntryFromDb(data: Record<string, any>): WorkEntry {
  return {
    id: data.id,
    projectId: data.project_id,
    cabinetId: data.cabinet_id,
    segmentId: data.segment_id,
    cutId: data.cut_id,
    houseId: data.house_id,
    crewId: data.crew_id,
    userId: data.user_id,
    date: data.date,
    stageCode: data.stage_code,
    metersDoneM: data.meters_done_m,
    method: data.method,
    widthM: data.width_m,
    depthM: data.depth_m,
    cablesCount: data.cables_count,
    hasProtectionPipe: data.has_protection_pipe,
    soilType: data.soil_type,
    notes: data.notes,
    approvedBy: data.approved_by,
    approvedAt: data.approved_at,
    approved: data.approved || false,
    rejectionReason: data.rejection_reason,
    rejectedBy: data.rejected_by,
    rejectedAt: data.rejected_at,
    photos: data.photos ? data.photos.map((p: any) => transformPhotoFromDb(p)) : [],
  }
}

/**
 * Transform Photo from camelCase (app) to snake_case (database)
 */
export function transformPhotoToDb(photo: Partial<Photo>): Record<string, any> {
  return {
    id: photo.id,
    work_entry_id: photo.workEntryId,
    cut_stage_id: photo.cutStageId,
    url: photo.url,
    ts: photo.ts,
    gps_lat: photo.gpsLat,
    gps_lon: photo.gpsLon,
    author_user_id: photo.authorUserId,
    label: photo.label,
  }
}

/**
 * Transform Photo from snake_case (database) to camelCase (app)
 */
export function transformPhotoFromDb(data: Record<string, any>): Photo {
  return {
    id: data.id,
    workEntryId: data.work_entry_id,
    cutStageId: data.cut_stage_id,
    url: data.url,
    ts: data.ts,
    gpsLat: data.gps_lat,
    gpsLon: data.gps_lon,
    authorUserId: data.author_user_id,
    label: data.label,
  }
}

/**
 * Remove undefined values from object (for database inserts)
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {}
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  }
  return result
}
