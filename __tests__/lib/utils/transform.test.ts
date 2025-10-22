/**
 * Tests for data transformation utilities
 * Run with: npx tsx __tests__/lib/utils/transform.test.ts
 */

import { transformWorkEntryToDb, transformWorkEntryFromDb, transformPhotoToDb, transformPhotoFromDb, removeUndefined } from '../../../lib/utils/transform'
import type { WorkEntry, Photo } from '../../../types/models'

// Simple test framework
let passedTests = 0
let failedTests = 0

function test(description: string, fn: () => void) {
  try {
    fn()
    console.log(`✅ PASS: ${description}`)
    passedTests++
  } catch (error) {
    console.error(`❌ FAIL: ${description}`)
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    failedTests++
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  const actualStr = JSON.stringify(actual, null, 2)
  const expectedStr = JSON.stringify(expected, null, 2)

  if (actualStr !== expectedStr) {
    throw new Error(
      message || `Expected:\n${expectedStr}\n\nActual:\n${actualStr}`
    )
  }
}

// Test data
const mockWorkEntry: WorkEntry = {
  id: 'test-id-123',
  projectId: 'project-123',
  cabinetId: 'cabinet-456',
  segmentId: 'segment-789',
  userId: 'user-001',
  date: '2025-10-21',
  stageCode: 'stage_2_excavation',
  metersDoneM: 15.5,
  method: 'excavator',
  widthM: 0.6,
  depthM: 0.8,
  cablesCount: 2,
  hasProtectionPipe: true,
  soilType: 'clay',
  notes: 'Test notes',
  approved: false,
  photos: []
}

const mockDbWorkEntry = {
  id: 'test-id-123',
  project_id: 'project-123',
  cabinet_id: 'cabinet-456',
  segment_id: 'segment-789',
  user_id: 'user-001',
  date: '2025-10-21',
  stage_code: 'stage_2_excavation',
  meters_done_m: 15.5,
  method: 'excavator',
  width_m: 0.6,
  depth_m: 0.8,
  cables_count: 2,
  has_protection_pipe: true,
  soil_type: 'clay',
  notes: 'Test notes',
  approved: false
}

const mockPhoto: Photo = {
  id: 'photo-123',
  workEntryId: 'entry-456',
  url: 'https://example.com/photo.jpg',
  ts: '2025-10-21T10:00:00Z',
  gpsLat: 52.5200,
  gpsLon: 13.4050,
  authorUserId: 'user-001',
  label: 'before'
}

const mockDbPhoto = {
  id: 'photo-123',
  work_entry_id: 'entry-456',
  url: 'https://example.com/photo.jpg',
  ts: '2025-10-21T10:00:00Z',
  gps_lat: 52.5200,
  gps_lon: 13.4050,
  author_user_id: 'user-001',
  label: 'before'
}

// Tests
console.log('\n🧪 Running Data Transformation Tests...\n')

test('transformWorkEntryToDb converts camelCase to snake_case', () => {
  const result = transformWorkEntryToDb(mockWorkEntry)

  assertEquals(result.project_id, mockWorkEntry.projectId)
  assertEquals(result.cabinet_id, mockWorkEntry.cabinetId)
  assertEquals(result.segment_id, mockWorkEntry.segmentId)
  assertEquals(result.user_id, mockWorkEntry.userId)
  assertEquals(result.stage_code, mockWorkEntry.stageCode)
  assertEquals(result.meters_done_m, mockWorkEntry.metersDoneM)
  assertEquals(result.width_m, mockWorkEntry.widthM)
  assertEquals(result.depth_m, mockWorkEntry.depthM)
  assertEquals(result.cables_count, mockWorkEntry.cablesCount)
  assertEquals(result.has_protection_pipe, mockWorkEntry.hasProtectionPipe)
  assertEquals(result.soil_type, mockWorkEntry.soilType)
})

test('transformWorkEntryFromDb converts snake_case to camelCase', () => {
  const result = transformWorkEntryFromDb(mockDbWorkEntry)

  assertEquals(result.projectId, mockDbWorkEntry.project_id)
  assertEquals(result.cabinetId, mockDbWorkEntry.cabinet_id)
  assertEquals(result.segmentId, mockDbWorkEntry.segment_id)
  assertEquals(result.userId, mockDbWorkEntry.user_id)
  assertEquals(result.stageCode, mockDbWorkEntry.stage_code)
  assertEquals(result.metersDoneM, mockDbWorkEntry.meters_done_m)
  assertEquals(result.widthM, mockDbWorkEntry.width_m)
  assertEquals(result.depthM, mockDbWorkEntry.depth_m)
  assertEquals(result.cablesCount, mockDbWorkEntry.cables_count)
  assertEquals(result.hasProtectionPipe, mockDbWorkEntry.has_protection_pipe)
  assertEquals(result.soilType, mockDbWorkEntry.soil_type)
})

test('transformWorkEntryToDb and transformWorkEntryFromDb are reversible', () => {
  const toDb = transformWorkEntryToDb(mockWorkEntry)
  const fromDb = transformWorkEntryFromDb(toDb)

  // Compare key fields (excluding photos array as it gets added)
  assertEquals(fromDb.id, mockWorkEntry.id)
  assertEquals(fromDb.projectId, mockWorkEntry.projectId)
  assertEquals(fromDb.segmentId, mockWorkEntry.segmentId)
  assertEquals(fromDb.stageCode, mockWorkEntry.stageCode)
  assertEquals(fromDb.metersDoneM, mockWorkEntry.metersDoneM)
})

test('transformPhotoToDb converts camelCase to snake_case', () => {
  const result = transformPhotoToDb(mockPhoto)

  assertEquals(result.work_entry_id, mockPhoto.workEntryId)
  assertEquals(result.gps_lat, mockPhoto.gpsLat)
  assertEquals(result.gps_lon, mockPhoto.gpsLon)
  assertEquals(result.author_user_id, mockPhoto.authorUserId)
})

test('transformPhotoFromDb converts snake_case to camelCase', () => {
  const result = transformPhotoFromDb(mockDbPhoto)

  assertEquals(result.workEntryId, mockDbPhoto.work_entry_id)
  assertEquals(result.gpsLat, mockDbPhoto.gps_lat)
  assertEquals(result.gpsLon, mockDbPhoto.gps_lon)
  assertEquals(result.authorUserId, mockDbPhoto.author_user_id)
})

test('transformPhotoToDb and transformPhotoFromDb are reversible', () => {
  const toDb = transformPhotoToDb(mockPhoto)
  const fromDb = transformPhotoFromDb(toDb)

  assertEquals(fromDb.id, mockPhoto.id)
  assertEquals(fromDb.workEntryId, mockPhoto.workEntryId)
  assertEquals(fromDb.gpsLat, mockPhoto.gpsLat)
  assertEquals(fromDb.gpsLon, mockPhoto.gpsLon)
})

test('removeUndefined removes undefined values', () => {
  const obj = {
    defined: 'value',
    undefined: undefined,
    null: null,
    zero: 0,
    emptyString: '',
    false: false
  }

  const result = removeUndefined(obj)

  assertEquals('undefined' in result, false, 'undefined should be removed')
  assertEquals('defined' in result, true, 'defined values should remain')
  assertEquals('null' in result, true, 'null should remain')
  assertEquals('zero' in result, true, 'zero should remain')
  assertEquals('emptyString' in result, true, 'empty string should remain')
  assertEquals('false' in result, true, 'false should remain')
})

test('transformWorkEntryToDb handles optional fields', () => {
  const minimalEntry: Partial<WorkEntry> = {
    id: 'test-123',
    projectId: 'proj-123',
    userId: 'user-123',
    date: '2025-10-21',
    stageCode: 'stage_1_marking',
    metersDoneM: 10,
    approved: false
  }

  const result = transformWorkEntryToDb(minimalEntry)

  assertEquals(result.id, minimalEntry.id)
  assertEquals(result.project_id, minimalEntry.projectId)
  assertEquals(result.user_id, minimalEntry.userId)
  assertEquals(result.cabinet_id, undefined)
  assertEquals(result.segment_id, undefined)
})

test('transformWorkEntryFromDb handles missing photos', () => {
  const dbEntry = { ...mockDbWorkEntry }
  const result = transformWorkEntryFromDb(dbEntry)

  assertEquals(Array.isArray(result.photos), true, 'photos should be an array')
  assertEquals(result.photos?.length, 0, 'photos array should be empty')
})

test('transformWorkEntryFromDb includes photos when present', () => {
  const dbEntryWithPhotos = {
    ...mockDbWorkEntry,
    photos: [mockDbPhoto]
  }

  const result = transformWorkEntryFromDb(dbEntryWithPhotos)

  assertEquals(result.photos?.length, 1, 'should have one photo')
  assertEquals(result.photos?.[0].workEntryId, mockDbPhoto.work_entry_id)
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`\n✅ Passed: ${passedTests}`)
console.log(`❌ Failed: ${failedTests}`)
console.log(`\nTotal: ${passedTests + failedTests}`)

if (failedTests === 0) {
  console.log('\n🎉 All tests passed!\n')
  process.exit(0)
} else {
  console.log('\n💥 Some tests failed!\n')
  process.exit(1)
}
