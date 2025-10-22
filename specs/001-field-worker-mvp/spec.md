# Feature Specification: Field Worker Progress Tracking PWA

**Feature Branch**: `001-field-worker-mvp`
**Created**: 2025-10-15
**Status**: Draft
**Input**: Worker App user flow and interaction logic specification

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Worker Authentication & Project Access (Priority: P1) 🎯 MVP

**Description**: As a field worker, I need to securely log into the PWA and access my assigned projects so I can start recording my daily work progress.

**Why this priority**: Authentication is the foundational capability - without it, no other functionality is accessible. This establishes secure access and loads the worker's context (projects, cabinets, segments).

**Independent Test**: Can be fully tested by creating a worker account, logging in with email+PIN, and verifying that only assigned projects are visible. Delivers immediate value by enabling secure field access.

**Acceptance Scenarios**:

1. **Given** I am a registered worker with email and PIN (4-6 digits), **When** I open the PWA and enter valid credentials, **Then** I am authenticated via `supabase.auth.signInWithPassword()` with PIN as password, see my assigned projects list with progress indicators, and my session (JWT + refresh token) is saved locally for offline access.

2. **Given** I enter a non-numeric PIN or PIN with wrong length, **When** I attempt to login, **Then** I see client-side validation error: "PIN must be 4-6 digits" before submission.

3. **Given** I enter an incorrect PIN, **When** I attempt to login, **Then** I see a clear error message "Invalid email or PIN" and remain on the login screen with the email field pre-filled.

4. **Given** I have failed login 5 times in a row, **When** I attempt the 6th login, **Then** my account is temporarily locked for 15 minutes with message: "Too many failed attempts. Please try again in 15 minutes."

5. **Given** I need to change my PIN, **When** I use "Forgot PIN" link, **Then** I am sent a password reset email via Supabase Auth standard flow and can set a new PIN (4-6 digits).

6. **Given** I am offline and have previously logged in with valid refresh token, **When** I open the PWA, **Then** I can access the app with my cached session and see my previously loaded data without network request.

7. **Given** I have successfully logged in, **When** the app loads my data, **Then** I see projects, cabinets (NVT), segments, work stages, and my draft entries loaded from Supabase.

8. **Given** I am logged in as a worker, **When** I view projects, **Then** I only see projects assigned to me (RLS enforced).

---

### User Story 2 - Cabinet Selection & Navigation (Priority: P1) 🎯 MVP

**Description**: As a field worker, I need to quickly select the cabinet (NVT point) I'm working on via NFC/QR scan or manual search so I can start recording work without delays.

**Why this priority**: Cabinet selection is the entry point to all field work. Workers need fast access (≤15 seconds from login to cabinet screen) to meet the 2-minute reporting goal.

**Independent Test**: Can be tested by navigating to a project, scanning an NFC tag or QR code linked to a cabinet, and verifying the cabinet detail screen loads with segments and progress summary.

**Acceptance Scenarios**:

1. **Given** I have selected a project, **When** I scan a QR code containing cabinet_id UUID (format: `fieldworker://cabinet/{uuid}`), **Then** app looks up cabinet from IndexedDB cache by ID and displays cabinet detail screen within 1 second with segments, houses, stages, and progress summary.

2. **Given** I scan a QR code with cabinet_id not in my local cache and I am online, **When** the lookup fails locally, **Then** app fetches cabinet from Supabase and displays detail screen or shows error "Cabinet not found."

3. **Given** I scan a QR code for a cabinet not in my assigned projects, **When** the RLS check fails, **Then** I see error: "Cabinet not in your assigned projects. Please contact your manager."

4. **Given** I have selected a project and QR scanner is unavailable, **When** I use manual search by human-readable cabinet code (e.g., "NVT-2024-0157"), **Then** I can find and open the cabinet within 3 taps.

5. **Given** I am viewing a cabinet, **When** the detail screen loads, **Then** I see segments with two remaining meters values: "Remaining (approved)" and "Pending (submitted)", completion percentages, and current stage status for each segment.

6. **Given** I am offline and scan a QR code with cabinet_id in cache, **When** lookup succeeds, **Then** I see the cabinet detail screen with locally cached data and sync indicator shows "Offline - data may be outdated".

7. **Given** I am offline and scan a QR code not in cache, **When** lookup fails, **Then** I see error: "Cabinet not cached for offline use. Please connect to internet or search manually by code."

8. **Given** QR code is damaged or contains invalid data, **When** scan fails, **Then** I see search dialog: "Cabinet not found. Please search manually." and can report issue to admin.

---

### User Story 3 - Record Segment Progress (Priority: P1) 🎯 MVP

**Description**: As a field worker, I need to record progress on a segment (meters completed, photos, notes) for a specific work stage so management can track daily completion rates.

**Why this priority**: This is the core value proposition - capturing work progress with photo proof in under 2 minutes. Without this, the app provides no business value.

**Independent Test**: Can be tested by selecting a segment, choosing a work stage, entering meters, adding photos with EXIF/GPS, and submitting. Verify the entry appears in "My Entries" as "submitted" and photos upload to Supabase Storage.

**Acceptance Scenarios**:

1. **Given** I am viewing a cabinet, **When** I select a segment and choose a work stage (e.g., "Excavation"), **Then** I see a dynamic form generated from `work_stages.required_fields` JSON with 4 supported field types: number (meters), text (short input), textarea (notes), and select (equipment dropdown).

2. **Given** the work stage has `required_fields` configuration, **When** the form renders, **Then** I see fields with appropriate input types, labels, validation rules (required, min/max for numbers, maxLength for text), and helper text.

3. **Given** the work stage has `checklist_items` with `required: true`, **When** I attempt to submit without checking all required items, **Then** I see red error: "Please complete all required checklist items" and submission is blocked.

4. **Given** the work stage has `checklist_items` with `required: false`, **When** I attempt to submit without checking optional items, **Then** I see yellow warning banner: "Some checklist items are incomplete" but submission is allowed.

5. **Given** I am recording progress, **When** I enter meters completed (e.g., 50), add 4 photos via camera, and include a note, **Then** photos are compressed to <2MB, EXIF/GPS data is preserved, and a draft is auto-saved every 5 seconds to local storage.

6. **Given** I have completed the form with all validations passing, **When** I click "Submit", **Then** a `progress_entry` record is created with status `submitted`, photos are uploaded to Supabase Storage with signed URLs, and the entry appears in "My Entries - Submitted".

7. **Given** I am filling the form and lose internet connection, **When** I click "Submit", **Then** the entry is queued locally with status `pending_upload`, shown in sync indicator "Syncing (1 pending)", and syncs automatically when connection returns.

8. **Given** the work stage requires minimum 2 photos (`required_photos: 2`) and I add only 1, **When** I attempt to submit, **Then** I see validation error: "This stage requires at least 2 photos. You have 1." and submission is blocked.

9. **Given** I enter meters_done (55) that exceeds approved remaining meters (50) but is within 10%, **When** I submit, **Then** I see yellow warning: "You are reporting 5m more than approved remaining (50m). Pending approval: 10m. Please verify." and can submit after confirmation.

10. **Given** I enter meters_done (65) that exceeds approved remaining meters (50) by more than 10%, **When** I attempt to submit, **Then** I see orange warning: "Over-completion >10%. Please add a comment explaining the measurement difference" and comment field becomes required.

11. **Given** segment shows "Remaining (approved): 50m" and "Pending (submitted): 30m", **When** I enter 25 meters, **Then** the UI calculates and shows: "After submission: Remaining 25m (approved), Pending 55m (submitted)" for transparency.

---

### User Story 4 - Handle Returned Entries (Priority: P2)

**Description**: As a field worker, I need to view entries that were returned by admin with feedback, add missing information, and resubmit so my work can be approved.

**Why this priority**: Return/correction workflow is critical for quality control but is a reactive process - workers first need to submit entries (US3) before this scenario applies. Reduces rework time from hours to minutes.

**Independent Test**: Can be tested by having an admin return an entry with reason "Missing equipment photo", worker opens the returned entry, adds the photo, adds a correction comment, and resubmits. Verify status changes from `returned` → `submitted`.

**Acceptance Scenarios**:

1. **Given** an admin has returned my entry with reason "Photo unclear", **When** I open "My Entries - Returned", **Then** I see the entry highlighted in orange with the admin's feedback displayed prominently.

2. **Given** I am viewing a returned entry, **When** I add missing photos or update information, **Then** I must add a "Correction Comment" field (required) explaining what was fixed.

3. **Given** I have corrected a returned entry, **When** I click "Resubmit", **Then** the status changes to `submitted`, the correction comment is stored, and the entry moves to "My Entries - Submitted".

4. **Given** I am offline and viewing returned entries, **When** I make corrections, **Then** changes are saved locally and resubmitted when connection returns.

---

### User Story 5 - Record House Appointments (Priority: P2)

**Description**: As a field worker, I need to record house connection appointments (arrival, before/after photos, completion status) so home installations are documented and tracked.

**Why this priority**: House connections are a distinct workflow from segment progress. Important for customer-facing work but independent from infrastructure progress tracking (US3).

**Independent Test**: Can be tested by selecting a house appointment from a cabinet, marking "Arrived", taking before photo, marking "Completed", taking after photo, and submitting. Verify appointment status updates and photos are stored.

**Acceptance Scenarios**:

1. **Given** I am viewing a cabinet with house appointments, **When** I open the "Appointments" tab, **Then** I see a list of houses with addresses, scheduled time windows, and current status.

2. **Given** I have arrived at a house, **When** I mark "Arrived" and take a "before" photo, **Then** the appointment status updates to `in_progress` and the photo is uploaded.

3. **Given** I have completed the installation, **When** I mark "Completed" and take an "after" photo, **Then** the appointment status updates to `completed` and both photos are linked to the appointment record.

4. **Given** I cannot complete the appointment, **When** I select "Reschedule" and add a reason, **Then** the appointment status updates to `rescheduled` with my note and the admin is notified.

5. **Given** I am offline, **When** I record appointment progress, **Then** all status changes and photos are queued and synced when online.

---

### User Story 6 - View Personal Dashboard (Priority: P3)

**Description**: As a field worker, I need to see my daily/weekly KPIs (meters completed, entries submitted, returns) so I can track my performance and identify issues.

**Why this priority**: Dashboard provides valuable insights but is not required for core workflow (auth, navigate, record, submit). Nice-to-have for worker engagement and self-service performance tracking.

**Independent Test**: Can be tested by logging in after submitting several entries and viewing the dashboard. Verify metrics show correct counts for today/this week, including meters done, entries by status, and return rate.

**Acceptance Scenarios**:

1. **Given** I have submitted entries today, **When** I open the Dashboard, **Then** I see total meters completed today, number of entries (draft/submitted/returned/approved), and any pending actions.

2. **Given** I am viewing the Dashboard, **When** I toggle between "Today" and "This Week", **Then** metrics update to show the selected time period.

3. **Given** I have returned entries, **When** I view the Dashboard, **Then** returned entries are highlighted with a red badge showing the count and a quick link to "My Entries - Returned".

4. **Given** I am offline, **When** I open the Dashboard, **Then** I see metrics calculated from locally cached data with a note "Offline - data may be outdated".

---

### User Story 7 - Brigade Leader Entry Management (Priority: P3)

**Description**: As a brigade leader (foreman), I need to view and edit entries from all my team members so I can verify quality before submission and correct errors on behalf of workers.

**Why this priority**: Brigade leader capabilities extend the worker role but are not required for individual workers (majority of users) to function. Adds team management value but is not MVP-blocking.

**Independent Test**: Can be tested by logging in as a brigade leader, viewing "Team Entries", editing another worker's draft entry, and submitting it. Verify RLS allows foreman to see team data and audit log records the foreman's action.

**Acceptance Scenarios**:

1. **Given** I am logged in as a brigade leader, **When** I open "Team Entries", **Then** I see all entries from my team members grouped by worker name with status filters.

2. **Given** I am viewing a team member's draft entry, **When** I click "Edit", **Then** I can modify meters, add photos, or update notes and the audit log records my user ID as the editor.

3. **Given** I am viewing a team member's returned entry, **When** I make corrections and resubmit, **Then** the entry status changes to `submitted` and the correction is attributed to me in the audit log.

4. **Given** I am offline, **When** I edit team entries, **Then** changes are saved locally and synced when connection returns, maintaining audit trail integrity.

---

### Edge Cases

- **What happens when a worker tries to submit an entry for a segment that was just marked complete by another worker?** System shows a warning: "This segment was recently marked complete. Please verify remaining meters." Allows submission after confirmation to handle race conditions.

- **How does the system handle photo upload failures?** Photos are queued with retry logic (exponential backoff: 5s, 15s, 45s). Worker sees progress indicator "Uploading 3 of 5 photos" and can continue working. Failed uploads persist across app restarts.

- **What happens if the worker's device runs out of storage during photo capture?** System detects storage error, shows alert: "Insufficient storage. Please free up space." Entry remains as draft with photos captured so far.

- **How does the system handle concurrent edits to the same draft entry on multiple devices?** Last-write-wins with timestamp comparison. If worker edits on phone then tablet, tablet changes overwrite phone changes. Warning shown: "Draft was updated on another device".

- **What happens when GPS is unavailable or disabled?** System captures photo without GPS coordinates, stores null values for lat/long. Warning shown: "Location unavailable - enable GPS for accurate records." Entry can still be submitted.

- **How does the system handle a returned entry that was already corrected by another team member?** Worker sees banner: "This entry was corrected by [Name] on [Date]". Current user can view but cannot edit. Only latest corrector can resubmit.

- **What happens if a worker is removed from a project while offline with unsent entries?** On next sync, entries upload successfully (created before access revoked). Worker then loses access to project and sees message: "You no longer have access to this project."

- **How does the system handle NFC tags that are damaged or misassigned?** If NFC data doesn't match any cabinet in local cache, show search dialog: "Cabinet not found. Please search manually." Allow worker to report issue to admin.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST authenticate users via Supabase Auth using `supabase.auth.signInWithPassword()` with email + PIN (4-6 digits) where PIN is stored as bcrypt-hashed password in Supabase Auth
- **FR-001a**: System MUST validate PIN client-side before submission: numeric characters only, length 4-6 digits, show error "PIN must be 4-6 digits" if validation fails
- **FR-001b**: System MUST implement account lockout: after 5 consecutive failed login attempts, lock account for 15 minutes with message "Too many failed attempts. Please try again in 15 minutes"
- **FR-001c**: System MUST support PIN reset via Supabase Auth password reset flow: "Forgot PIN" link sends email with reset link, user sets new 4-6 digit PIN
- **FR-001d**: System MUST NOT store PIN in separate user profile table (users.pin_code) to avoid duplication and security risk
- **FR-002**: System MUST store JWT access token (15min TTL) and refresh token (7day TTL) locally for offline access
- **FR-003**: System MUST enforce role-based access: Worker (read assigned projects, write own entries), Brigade Leader (read/write team entries), Admin (read/write all, approve/return)
- **FR-004**: System MUST implement RLS policies ensuring workers see only assigned projects and own/team entries
- **FR-005**: System MUST load user context on login: projects, cabinets, segments, work stages, draft entries

#### Project & Cabinet Navigation

- **FR-006**: System MUST display projects list with completion percentage and last updated timestamp
- **FR-007**: System MUST support QR code scanning with payload format `fieldworker://cabinet/{cabinet_id}` where cabinet_id is UUID to auto-navigate to cabinet detail screen
- **FR-007a**: System MUST lookup scanned cabinet_id from IndexedDB cache first (offline-first), then fallback to Supabase query if online and not cached
- **FR-007b**: System MUST display cabinet detail screen within 1 second if cabinet is in cache, otherwise show loading indicator during network fetch
- **FR-007c**: System MUST show error "Cabinet not in your assigned projects" if RLS check fails for scanned cabinet
- **FR-007d**: System MUST show error "Cabinet not cached for offline use. Please connect to internet or search manually by code" if offline and cabinet not in cache
- **FR-008**: System MUST print human-readable cabinet code (e.g., "NVT-2024-0157") on QR code stickers for manual verification and search fallback
- **FR-009**: System MUST provide manual cabinet search by human-readable code (exact match or autocomplete), address (fuzzy search), or status filter
- **FR-010**: System MUST display cabinet detail with segments showing two meters values per segment: "Remaining (approved)" counts only approved entries, "Pending (submitted)" shows sum of submitted entries awaiting approval
- **FR-010a**: System MUST show completion percentage calculated from approved meters only: `(total_meters - remaining_approved) / total_meters * 100`
- **FR-010b**: System MUST show current stage status for each segment: last approved stage or "Not started"
- **FR-011**: System MUST cache projects, cabinets (with codes and IDs), segments, and work stages in IndexedDB for offline access during login data load

#### Progress Entry Recording

- **FR-012**: System MUST generate dynamic forms based on `work_stages.required_fields` JSON configuration supporting 4 field types for V1: `number`, `text`, `textarea`, `select`
- **FR-012a**: System MUST support `required_fields` JSON schema with structure: `{"fields": [{"name": "field_name", "type": "number|text|textarea|select", "label": "Display Label", "required": true|false, "min": num, "max": num, "maxLength": num, "options": ["opt1", "opt2"]}]}`
- **FR-012b**: System MUST validate field inputs: `required` blocks submission if empty, `min/max` for number type, `maxLength` for text/textarea, `options` restricts select to configured values
- **FR-012c**: System MUST highlight invalid fields in red with error messages and block submission until all validations pass
- **FR-012d**: System MUST defer conditional fields (show field B only if field A = value) to V2; V1 supports static field lists only
- **FR-013**: System MUST validate minimum photos based on `work_stages.required_photos` count before submission, show error "This stage requires at least {count} photos. You have {actual}." if validation fails
- **FR-013a**: System MUST support `checklist_items` JSON schema: `{"checklist": [{"text": "Checklist item description", "required": true|false, "order": num}]}`
- **FR-013b**: System MUST enforce hybrid checklist validation: items with `required: true` block submission with red error "Please complete all required checklist items", items with `required: false` show yellow warning "Some checklist items are incomplete" but allow submission
- **FR-014**: System MUST compress photos client-side to max 2MB while preserving EXIF/GPS data
- **FR-015**: System MUST auto-save progress entry drafts every 5 seconds to local storage (IndexedDB)
- **FR-016**: System MUST create `progress_entry` record with status `draft` on form start
- **FR-017**: System MUST upload photos to Supabase Storage at path `/projects/{project_id}/entries/{entry_id}/photo_{timestamp}.jpg`
- **FR-018**: System MUST generate signed URLs (1-hour expiry) for photo access
- **FR-019**: System MUST update `progress_entry.status` to `submitted` and set `submitted_at` timestamp on submission
- **FR-020**: System MUST validate `meters_done` is positive number
- **FR-020a**: System MUST calculate and display two meters values: "Remaining (approved)" = segment.total_meters - SUM(approved entries.meters_done), "Pending (submitted)" = SUM(submitted entries.meters_done)
- **FR-020b**: System MUST show yellow warning if `meters_done` exceeds approved remaining by ≤10%: "You are reporting {diff}m more than approved remaining ({remaining}m). Pending approval: {pending}m. Please verify." and allow submission after confirmation
- **FR-020c**: System MUST show orange warning if `meters_done` exceeds approved remaining by >10%: "Over-completion >{threshold}%. Please add a comment explaining the measurement difference" and make comment field required before allowing submission
- **FR-020d**: System MUST show preview after meters input: "After submission: Remaining {new_remaining}m (approved), Pending {new_pending}m (submitted)" for transparency
- **FR-020e**: System MUST allow over-completion (approved + submitted > total_meters) to handle field measurement adjustments and corrections
- **FR-021**: System MUST capture photo metadata: timestamp, GPS coordinates (lat/long), device info
- **FR-022**: System MUST allow unlimited photos per entry (within storage limits)

#### Offline Functionality

- **FR-023**: System MUST queue unsent entries with status `pending_upload` when offline
- **FR-024**: System MUST auto-sync queued entries on connection restore with retry logic (5s, 15s, 45s exponential backoff)
- **FR-025**: System MUST allow workers to create, edit, and view entries while offline using cached data
- **FR-026**: System MUST show sync status indicator: "Online", "Offline", "Syncing (3 pending)"
- **FR-027**: System MUST persist offline queue across app restarts
- **FR-028**: System MUST handle sync conflicts by prioritizing server state for approved entries and client state for drafts

#### Entry Status Workflow

- **FR-029**: System MUST support entry status transitions: `draft` → `submitted` → `returned` OR `approved`
- **FR-030**: System MUST allow workers to edit and resubmit entries with status `draft` or `returned`
- **FR-031**: System MUST prevent editing entries with status `approved`
- **FR-032**: System MUST display returned entries with admin's `returned_reason` prominently
- **FR-033**: System MUST require "Correction Comment" field when resubmitting returned entries
- **FR-034**: System MUST lock entries for editing once status is `approved` or another user has started corrections

#### House Appointments

- **FR-035**: System MUST display appointments list with address, scheduled time window, and current status
- **FR-036**: System MUST allow marking appointment status: `scheduled` → `in_progress` → `completed` OR `rescheduled`
- **FR-037**: System MUST capture "before" photo on "Arrived" and "after" photo on "Completed"
- **FR-038**: System MUST allow workers to reschedule appointments with required reason field
- **FR-039**: System MUST link appointment photos to appointment record in database

#### My Entries & Dashboard

- **FR-040**: System MUST display "My Entries" screen with tabs: Draft, Submitted, Returned, Approved
- **FR-041**: System MUST show entry cards with segment name, stage, meters, photo count, date, and status badge
- **FR-042**: System MUST display dashboard with KPIs: meters done (today/week), entries by status, return count
- **FR-043**: System MUST allow filtering dashboard by date range: Today, This Week, This Month

#### Brigade Leader Features

- **FR-044**: System MUST allow brigade leaders to view "Team Entries" from all team members
- **FR-045**: System MUST allow brigade leaders to edit team member entries with audit log recording editor user ID
- **FR-046**: System MUST show team member name and timestamp on entries edited by brigade leader
- **FR-047**: System MUST enforce RLS to show brigade leaders only their assigned team members' data

#### Audit & Observability

- **FR-048**: System MUST log all entry create/update/submit actions to `audit_log` table with user_id, action, timestamp
- **FR-049**: System MUST track photo upload failures and retry attempts
- **FR-050**: System MUST send error events to Sentry for client-side exceptions
- **FR-051**: System MUST track Web Vitals (LCP, FID, CLS) and send to monitoring backend

---

### Key Entities

- **User** — Field worker or brigade leader; has email, PIN hash, role, assigned projects/teams
- **Project** — Top-level container; has name, description, start/end dates, assigned users
- **Cabinet (NVT)** — Physical node point; has code, address, GPS coordinates, NFC/QR tag ID, parent project
- **Segment** — Route section within a cabinet; has name, total meters, remaining meters, parent cabinet
- **Cut** — Subdivision of segment (future); has length, parent segment
- **Work Stage** — Configurable phase (e.g., Excavation, Laying, Testing); has name, required_fields JSON, required_photos count, checklist_items JSON
- **Progress Entry** — Work record; has segment, stage, worker, meters_done, notes, status (draft/submitted/returned/approved), submitted_at, returned_reason, correction_comment
- **Progress Photo** — Photo attachment; has entry_id, storage_path, signed_url, EXIF data (timestamp, GPS lat/long), uploaded_at
- **Appointment** — House connection; has address, scheduled_time, status (scheduled/in_progress/completed/rescheduled), before_photo, after_photo, reschedule_reason

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Workers can complete entry submission (login → select cabinet → record progress → submit) in under 2 minutes (measured via user session analytics)

- **SC-002**: System maintains ≥99.5% API uptime measured over 30-day rolling window (Supabase monitoring + uptime checks)

- **SC-003**: Photo upload success rate ≥98% within 3 retry attempts (measured via upload telemetry and error tracking)

- **SC-004**: ≥95% of field devices can operate fully offline for minimum 8-hour work shift (validated through pilot testing)

- **SC-005**: Entry return rate ≤15% after 30 days of deployment (measured via `returned` status count / total `submitted` count)

- **SC-006**: Time-to-first-valid (TTFV): average time from entry `submitted` to `approved` ≤24 hours (measured via `approved_at - submitted_at` timestamp delta)

- **SC-007**: Lighthouse mobile score ≥90 for Performance, Accessibility, Best Practices (measured on 3G throttled connection)

- **SC-008**: LCP (Largest Contentful Paint) <2.5 seconds on 3G connection for critical paths: login, cabinet detail, entry form (measured via Web Vitals)

- **SC-009**: ≥90% of workers successfully complete first entry submission on first attempt without support intervention (measured during pilot via task completion rate)

- **SC-010**: Zero data loss incidents: 100% of entries created by users are successfully synced or recoverable from local storage (measured via sync queue monitoring and incident reports)

---

## Constitution Compliance Check

This feature specification complies with the Field Worker App Constitution v1.0.0:

✅ **I. Next.js 15 App Router Architecture** — PWA built with Next.js 15, TypeScript strict mode, Server Components for data fetching
✅ **II. Supabase-First Data Layer** — All data operations via Supabase client, RLS enabled on all tables
✅ **III. Offline-First Design** — IndexedDB cache, service worker, queue with retry logic, full offline core workflows
✅ **IV. Photo Management Standards** — Client-side compression (<2MB), EXIF preservation, Supabase Storage, signed URLs, progress indicators, retry logic
✅ **V. Progressive Web App Standards** — Manifest, service worker, responsive mobile-first design, camera access, iOS Safari compatible
✅ **VI. Row Level Security Enforcement** — RLS policies on progress_entries, progress_photos, cabinets, segments, cuts; Storage path-based policies
✅ **VII. Auto-Save & Data Loss Prevention** — 5-second auto-save, local draft persistence, recovery prompts, unsaved change indicators
✅ **VIII. Dynamic Forms from Configuration** — Forms generated from `work_stages.required_fields` JSON, no hardcoded stage forms
✅ **IX. Observability & Error Tracking** — Sentry for errors, Web Vitals tracking, audit log for all actions, business metrics (submit/approve/return rates)
✅ **X. Accessibility & Internationalization** — WCAG 2.1 AA standards, keyboard navigation, ARIA labels, i18n support (en/de/ru via next-intl)

**No constitution violations or exceptions required.**

---

## Open Questions & Clarifications Needed

1. **PIN vs OTP**: Constitution specifies "email + OTP/PIN". Spec uses PIN. Should we support both OTP (sent via email) and PIN (stored in DB)? Or PIN only for V1?

2. **Photo retention policy**: How long should photos be stored in Supabase Storage? Constitution mentions GDPR retention policies. Need specific retention period (e.g., 2 years after project completion)?

3. **NFC/QR tag assignment**: Who manages NFC/QR tag to cabinet mapping? Is this done in admin panel or during project setup? Need clarification on tag lifecycle.

4. **Team assignment logic**: How are workers assigned to projects and brigade leaders assigned to teams? Via admin panel? Need to understand user provisioning workflow.

5. **Realtime updates**: Spec mentions "Client periodically polls or uses Realtime (listen)". Should we implement Supabase Realtime subscriptions for entry status changes or use polling? Realtime adds complexity but provides instant feedback.

6. **Work stage checklist enforcement**: Constitution mentions "checklists per-stage". Should checklist items be blocking (entry cannot be submitted until all checked) or advisory (warnings only)?

7. **Cut (subdivision) handling**: Cuts are mentioned in data model but not prominently in user flows. Are cuts required for V1 or can they be deferred to V2?

8. **Admin panel scope**: Admin approval/return workflow is critical to this spec but admin panel is "separate site". Do we need to define admin panel specs now or only worker PWA APIs/data model?
