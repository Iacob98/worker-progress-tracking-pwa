/**
 * Integration tests for Admin Frontend compatibility
 * Tests that Worker PWA data is compatible with Admin Frontend expectations
 *
 * Run with: npx tsx __tests__/integration/admin-compatibility.test.ts
 */

import { transformWorkEntryToDb, transformWorkEntryFromDb } from '../../lib/utils/transform'
import type { WorkEntry } from '../../types/models'

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

function assertTrue(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

console.log('\n🔗 Running Admin Frontend Compatibility Tests...\n')

test('Worker PWA WorkEntry has all required fields for Admin', () => {
  const workerEntry: WorkEntry = {
    id: 'entry-123',
    projectId: 'project-123',
    segmentId: 'segment-456',
    userId: 'user-001',
    date: '2025-10-21',
    stageCode: 'stage_2_excavation',
    metersDoneM: 10.5,
    approved: false,
  }

  const dbEntry = transformWorkEntryToDb(workerEntry)

  // Check all required fields that Admin expects
  assertTrue('id' in dbEntry, 'Missing id')
  assertTrue('project_id' in dbEntry, 'Missing project_id')
  assertTrue('user_id' in dbEntry, 'Missing user_id')
  assertTrue('date' in dbEntry, 'Missing date')
  assertTrue('stage_code' in dbEntry, 'Missing stage_code')
  assertTrue('meters_done_m' in dbEntry, 'Missing meters_done_m')
  assertTrue('approved' in dbEntry, 'Missing approved')
})

test('DB field names match Admin Frontend expectations (snake_case)', () => {
  const workerEntry: WorkEntry = {
    id: 'test-id',
    projectId: 'test-project',
    cabinetId: 'test-cabinet',
    segmentId: 'test-segment',
    userId: 'test-user',
    date: '2025-10-21',
    stageCode: 'stage_1_marking',
    metersDoneM: 5.0,
    widthM: 0.5,
    depthM: 0.7,
    approved: false,
  }

  const dbEntry = transformWorkEntryToDb(workerEntry)

  // Admin expects snake_case field names
  const expectedFields = [
    'project_id',
    'cabinet_id',
    'segment_id',
    'user_id',
    'stage_code',
    'meters_done_m',
    'width_m',
    'depth_m',
  ]

  for (const field of expectedFields) {
    assertTrue(field in dbEntry, `Missing expected field: ${field}`)
  }

  // Admin should NOT receive camelCase fields
  const unexpectedFields = [
    'projectId',
    'cabinetId',
    'segmentId',
    'userId',
    'stageCode',
    'metersDoneM',
    'widthM',
    'depthM',
  ]

  for (const field of unexpectedFields) {
    assertTrue(!(field in dbEntry), `Unexpected camelCase field found: ${field}`)
  }
})

test('StageCode values match Admin Frontend enum', () => {
  const validStageCodes = [
    'stage_1_marking',
    'stage_2_excavation',
    'stage_3_conduit',
    'stage_4_cable',
    'stage_5_splice',
    'stage_6_test',
    'stage_7_connect',
    'stage_8_final',
    'stage_9_backfill',
    'stage_10_surface',
  ]

  for (const stageCode of validStageCodes) {
    const entry: WorkEntry = {
      id: 'test',
      projectId: 'test',
      userId: 'test',
      date: '2025-10-21',
      stageCode: stageCode as any,
      metersDoneM: 1,
      approved: false,
    }

    const dbEntry = transformWorkEntryToDb(entry)
    assertEquals(dbEntry.stage_code, stageCode, `StageCode should remain: ${stageCode}`)
  }
})

test('WorkMethod values match Admin Frontend enum', () => {
  const validMethods = ['mole', 'hand', 'excavator', 'trencher', 'documentation']

  for (const method of validMethods) {
    const entry: WorkEntry = {
      id: 'test',
      projectId: 'test',
      userId: 'test',
      date: '2025-10-21',
      stageCode: 'stage_2_excavation',
      metersDoneM: 1,
      method: method as any,
      approved: false,
    }

    const dbEntry = transformWorkEntryToDb(entry)
    assertEquals(dbEntry.method, method, `Method should remain: ${method}`)
  }
})

test('Numeric fields have correct precision for Admin', () => {
  const entry: WorkEntry = {
    id: 'test',
    projectId: 'test',
    userId: 'test',
    date: '2025-10-21',
    stageCode: 'stage_2_excavation',
    metersDoneM: 123.45, // numeric(10,2)
    widthM: 1.234, // numeric(6,3)
    depthM: 2.345, // numeric(6,3)
    cablesCount: 5, // integer
    approved: false,
  }

  const dbEntry = transformWorkEntryToDb(entry)

  assertEquals(dbEntry.meters_done_m, 123.45)
  assertEquals(dbEntry.width_m, 1.234)
  assertEquals(dbEntry.depth_m, 2.345)
  assertEquals(dbEntry.cables_count, 5)
})

test('Boolean fields work correctly for Admin', () => {
  const entry: WorkEntry = {
    id: 'test',
    projectId: 'test',
    userId: 'test',
    date: '2025-10-21',
    stageCode: 'stage_3_conduit',
    metersDoneM: 1,
    hasProtectionPipe: true,
    approved: false,
  }

  const dbEntry = transformWorkEntryToDb(entry)

  assertEquals(dbEntry.has_protection_pipe, true)
  assertEquals(dbEntry.approved, false)
})

test('Date format is ISO string compatible with Admin', () => {
  const entry: WorkEntry = {
    id: 'test',
    projectId: 'test',
    userId: 'test',
    date: '2025-10-21', // ISO date format
    stageCode: 'stage_1_marking',
    metersDoneM: 1,
    approved: false,
  }

  const dbEntry = transformWorkEntryToDb(entry)

  // Admin expects ISO date string YYYY-MM-DD
  assertEquals(dbEntry.date, '2025-10-21')
  assertTrue(/^\d{4}-\d{2}-\d{2}$/.test(dbEntry.date), 'Date should be ISO format YYYY-MM-DD')
})

test('Approval fields are compatible with Admin approval workflow', () => {
  // Not yet approved
  const unapprovedEntry: WorkEntry = {
    id: 'test',
    projectId: 'test',
    userId: 'test',
    date: '2025-10-21',
    stageCode: 'stage_1_marking',
    metersDoneM: 1,
    approved: false,
  }

  const unapprovedDb = transformWorkEntryToDb(unapprovedEntry)
  assertEquals(unapprovedDb.approved, false)
  assertEquals(unapprovedDb.approved_by, undefined)
  assertEquals(unapprovedDb.approved_at, undefined)

  // Approved
  const approvedEntry: WorkEntry = {
    id: 'test',
    projectId: 'test',
    userId: 'test',
    date: '2025-10-21',
    stageCode: 'stage_1_marking',
    metersDoneM: 1,
    approved: true,
    approvedBy: 'admin-user-123',
    approvedAt: '2025-10-21T15:30:00Z',
  }

  const approvedDb = transformWorkEntryToDb(approvedEntry)
  assertEquals(approvedDb.approved, true)
  assertEquals(approvedDb.approved_by, 'admin-user-123')
  assertEquals(approvedDb.approved_at, '2025-10-21T15:30:00Z')
})

test('Admin can read Worker PWA data without transformation', () => {
  // Simulate: Worker creates entry → saved to DB → Admin reads it

  const workerEntry: WorkEntry = {
    id: 'worker-entry-123',
    projectId: 'project-123',
    segmentId: 'segment-456',
    userId: 'worker-001',
    date: '2025-10-21',
    stageCode: 'stage_2_excavation',
    metersDoneM: 15.5,
    method: 'excavator',
    widthM: 0.6,
    depthM: 0.8,
    notes: 'Excavation completed',
    approved: false,
  }

  // Worker saves to DB (transforms to snake_case)
  const dbEntry = transformWorkEntryToDb(workerEntry)

  // Admin reads from DB (expects snake_case)
  // Admin TypeScript interface expects these exact field names:
  const adminExpectedFields = {
    id: 'worker-entry-123',
    project_id: 'project-123',
    segment_id: 'segment-456',
    user_id: 'worker-001',
    date: '2025-10-21',
    stage_code: 'stage_2_excavation',
    meters_done_m: 15.5,
    method: 'excavator',
    width_m: 0.6,
    depth_m: 0.8,
    notes: 'Excavation completed',
    approved: false,
  }

  // Verify all Admin expected fields are present
  for (const [key, value] of Object.entries(adminExpectedFields)) {
    assertEquals(dbEntry[key], value, `Admin expects ${key} to equal ${value}`)
  }
})

test('Round-trip: Worker → DB → Admin → DB → Worker', () => {
  // Worker creates entry
  const originalWorkerEntry: WorkEntry = {
    id: 'roundtrip-test',
    projectId: 'project-123',
    segmentId: 'segment-456',
    userId: 'worker-001',
    date: '2025-10-21',
    stageCode: 'stage_2_excavation',
    metersDoneM: 10.0,
    approved: false,
  }

  // Worker → DB (snake_case)
  const dbEntry = transformWorkEntryToDb(originalWorkerEntry)

  // Admin reads from DB (works with snake_case directly)
  // Admin approves and updates
  const adminUpdatedDbEntry = {
    ...dbEntry,
    approved: true,
    approved_by: 'admin-user-123',
    approved_at: '2025-10-21T15:00:00Z',
  }

  // Worker reads back (transforms from snake_case)
  const workerReceivedEntry = transformWorkEntryFromDb(adminUpdatedDbEntry)

  // Verify Worker received the approval
  assertEquals(workerReceivedEntry.approved, true)
  assertEquals(workerReceivedEntry.approvedBy, 'admin-user-123')
  assertEquals(workerReceivedEntry.approvedAt, '2025-10-21T15:00:00Z')

  // Verify original data is intact
  assertEquals(workerReceivedEntry.projectId, originalWorkerEntry.projectId)
  assertEquals(workerReceivedEntry.segmentId, originalWorkerEntry.segmentId)
  assertEquals(workerReceivedEntry.stageCode, originalWorkerEntry.stageCode)
  assertEquals(workerReceivedEntry.metersDoneM, originalWorkerEntry.metersDoneM)
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`\n✅ Passed: ${passedTests}`)
console.log(`❌ Failed: ${failedTests}`)
console.log(`\nTotal: ${passedTests + failedTests}`)

if (failedTests === 0) {
  console.log('\n🎉 All compatibility tests passed!')
  console.log('✅ Worker PWA data is fully compatible with Admin Frontend\n')
  process.exit(0)
} else {
  console.log('\n💥 Some compatibility tests failed!')
  console.log('⚠️  Worker PWA data may not be compatible with Admin Frontend\n')
  process.exit(1)
}
