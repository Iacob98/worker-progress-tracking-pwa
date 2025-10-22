# Feature Specification: Worker Progress Tracking Mobile App

**Feature Branch**: `003-worker-progress-tracking`
**Created**: 2025-10-16
**Status**: Draft
**Input**: User description: "Worker App for field workers to track progress, report work, and submit photos with offline support and QR code scanning. Workers authenticate via email + PIN, scan QR codes to access NVT points, track work by segments or house connections, submit progress with photos and dynamic checklists, and sync when online. System supports draft/submitted/returned/approved workflow with offline capability."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Worker Authentication and Project Access (Priority: P1)

As a field worker, I need to securely log into the mobile app using my email and PIN code so that I can access my assigned projects and begin tracking work, even when offline.

**Why this priority**: Authentication is the foundation - without it, no other features are accessible. This must work offline to support field conditions where connectivity is unreliable.

**Independent Test**: Can be fully tested by creating a test worker account, logging in with valid credentials, attempting invalid credentials, and verifying that the session persists for offline access. Delivers immediate value by allowing workers to access the app.

**Acceptance Scenarios**:

1. **Given** a worker with valid credentials, **When** they enter their email and 4-6 digit PIN, **Then** they successfully authenticate and see their assigned projects
2. **Given** a worker enters invalid credentials, **When** they attempt to log in, **Then** the system displays an error and tracks failed attempts
3. **Given** 5 consecutive failed login attempts, **When** the worker tries again, **Then** the account is temporarily locked for 15 minutes
4. **Given** a worker has previously logged in successfully, **When** they open the app offline, **Then** they can access the app using their cached session
5. **Given** a worker needs to reset their PIN, **When** they use the password reset flow, **Then** they receive instructions via email to reset their PIN

---

### User Story 2 - NVT Point Selection from List (Priority: P1)

As a field worker, I need to select NVT distribution points (cabinets) from a list of assigned locations so that I can quickly access the correct segments and work information for my current work location.

**Why this priority**: NVT selection is essential for workers to access their work locations and associated segments. This provides clear navigation through the project structure and is critical for accurate work tracking.

**Independent Test**: Can be fully tested by viewing the list of NVT points for a project, selecting an NVT, and verifying the correct cabinet information loads with segments and houses. Works independently by simply showing cabinet details - no work submission needed.

**Acceptance Scenarios**:

1. **Given** a worker selects a project, **When** they view the NVT list, **Then** the app displays all NVT points assigned to that project with their codes and names
2. **Given** a worker selects an NVT point from the list, **When** they tap on it, **Then** the app displays the cabinet details including code, name, address, segments, houses, and current progress
3. **Given** a worker is offline, **When** they select a previously cached NVT, **Then** the app displays cached cabinet information
4. **Given** a worker is offline, **When** they try to access an uncached NVT, **Then** the app displays a message requiring internet connectivity
5. **Given** a worker searches for an NVT by code or name, **When** they enter search text, **Then** the list filters to show matching NVTs only

---

### User Story 3 - Segment Progress Reporting (Priority: P1)

As a field worker, I need to report work progress on cable segments by entering completed meters, taking photos with GPS metadata, and filling required fields so that my daily work is accurately documented and approved.

**Why this priority**: This is the core value proposition - tracking actual field work. Without this, the app provides no value for progress tracking. This must work with all required validations and offline support.

**Independent Test**: Can be fully tested by selecting a segment, entering meter values, taking photos, completing required fields and checklists, and saving as draft or submitting. Delivers core value even without the approval workflow.

**Acceptance Scenarios**:

1. **Given** a worker selects a segment and work stage, **When** they enter completed meters (e.g., 50m), add photos with GPS, and fill required fields, **Then** they can save this as a draft
2. **Given** a worker has completed a draft entry, **When** they verify all required checklist items are checked and required fields are filled, **Then** they can submit the entry for approval
3. **Given** a segment has remaining approved meters of 100m and pending submitted meters of 30m, **When** a worker views the segment, **Then** they see both "Remaining (approved): 100m" and "Pending (submitted): 30m"
4. **Given** a worker enters meters that exceed the segment's planned length by less than 10%, **When** they attempt to submit, **Then** the app shows a warning but allows submission
5. **Given** a worker enters meters that exceed the segment's planned length by more than 10%, **When** they attempt to submit, **Then** the app requires a mandatory comment explaining the overage
6. **Given** a work stage requires photos and the worker hasn't added any, **When** they attempt to submit, **Then** the app blocks submission with an error message
7. **Given** required checklist items are not checked, **When** a worker attempts to submit, **Then** the app blocks submission with a red error notification
8. **Given** optional checklist items are not checked, **When** a worker attempts to submit, **Then** the app shows a yellow warning but allows submission
9. **Given** a worker is offline, **When** they submit an entry, **Then** it's queued locally and automatically syncs when connectivity is restored

---

### User Story 4 - House Connection Appointments (Priority: P2)

As a field worker, I need to track house connection appointments by marking arrival, taking before photos, marking completion, and taking after photos so that customer connections are properly documented throughout the process.

**Why this priority**: House connections are critical customer-facing work that requires careful documentation. This is lower priority than segment progress because it's a parallel workflow that doesn't block general progress tracking.

**Independent Test**: Can be fully tested by selecting a house appointment, marking arrival, taking before photos, marking completion, taking after photos, and submitting. Delivers independent value for customer connection tracking.

**Acceptance Scenarios**:

1. **Given** a worker arrives at a house for connection, **When** they mark "Arrived" and take before photos, **Then** the entry is timestamped with arrival time and photos are geo-tagged
2. **Given** a worker has marked arrival, **When** they complete the connection work and mark "Completed" with after photos, **Then** the entry status changes to "submitted" with completion timestamp
3. **Given** a worker cannot complete a connection as scheduled, **When** they add a comment and request to reschedule, **Then** the appointment is marked for rescheduling with the worker's notes
4. **Given** a list of house appointments for today, **When** a worker views their schedule, **Then** they see houses sorted by scheduled connection time with statuses (pending/in progress/completed)

---

### User Story 5 - Work Entry Review and Corrections (Priority: P2)

As a field worker, I need to view returned entries with admin feedback and make corrections by adding new photos or comments so that I can resubmit work that was initially rejected and get it approved.

**Why this priority**: The correction workflow is essential for quality control but is secondary to initial submission. Workers must be able to respond to feedback, but this happens after initial work is done.

**Independent Test**: Can be fully tested by having an admin return an entry with feedback, then having the worker view the feedback, make corrections, and resubmit. Delivers value for quality assurance.

**Acceptance Scenarios**:

1. **Given** an admin has returned a worker's entry with a reason, **When** the worker views their entries list, **Then** returned entries are clearly marked with a "Returned" status and show the admin's feedback
2. **Given** a worker opens a returned entry, **When** they add corrective photos and/or a comment addressing the feedback, **Then** they can resubmit the entry
3. **Given** a worker resubmits a corrected entry, **When** the submission is successful, **Then** the entry status changes to "submitted" and appears in the admin's review queue
4. **Given** an entry has been approved by an admin, **When** a worker views it, **Then** the entry is locked and cannot be edited (read-only with "Approved" status)
5. **Given** a worker views their "My Entries" screen, **When** the screen loads, **Then** entries are organized by status: Drafts, Submitted (pending review), Returned (needs correction), and Approved

---

### User Story 6 - Foreman Crew Management (Priority: P3)

As a foreman, I need to view and edit work entries for all members of my crew so that I can review and correct entries before submission and ensure quality control for my team.

**Why this priority**: Foreman features enhance team efficiency but are not required for basic worker functionality. This is an enhancement for crew-based work management.

**Independent Test**: Can be fully tested by logging in as a foreman, viewing all crew members' entries, editing an entry, and submitting on behalf of a crew member. Delivers value for team coordination.

**Acceptance Scenarios**:

1. **Given** a foreman logs into the app, **When** they navigate to their crew's work entries, **Then** they see all drafts and submitted entries from their crew members
2. **Given** a foreman views a crew member's draft entry, **When** they make corrections and submit it, **Then** the entry is submitted under the original worker's name with the foreman noted as the submitter
3. **Given** a foreman reviews multiple entries from the crew, **When** they bulk-submit multiple drafts, **Then** all selected entries are submitted together

---

### User Story 7 - Worker Dashboard and KPIs (Priority: P3)

As a field worker, I need to view my personal performance dashboard showing daily and weekly progress, returned entries, and remaining work so that I understand my performance and prioritize tasks.

**Why this priority**: Dashboard metrics improve worker engagement and productivity but are not essential for core work tracking. This is a "nice-to-have" that adds value but isn't blocking.

**Independent Test**: Can be fully tested by viewing the dashboard after completing various work entries and verifying that metrics accurately reflect completed work, returns, and remaining meters. Provides motivational value independently.

**Acceptance Scenarios**:

1. **Given** a worker has completed work over the past day and week, **When** they view their dashboard, **Then** they see metrics for meters completed today, meters completed this week, entries submitted, entries approved, and entries returned
2. **Given** a worker has entries awaiting correction, **When** they view the dashboard, **Then** returned entries are prominently displayed with a count and direct access link
3. **Given** a worker views segments assigned to them, **When** they check remaining work, **Then** they see total remaining meters across all their assigned segments with breakdown by segment

---

### Edge Cases

- **What happens when a worker selects an NVT point that has been decommissioned or is no longer valid?**
  System should display an error message indicating the NVT point is no longer active and suggest contacting the project manager.

- **What happens when a worker loses internet connection while submitting an entry?**
  The entry should be saved to the local queue and display a "Queued for sync" status. When connectivity returns, it auto-syncs with a notification.

- **What happens if a worker's session expires while working offline?**
  The app should maintain offline access using the cached session and only require re-authentication when back online if the refresh token has expired.

- **What happens when two workers submit progress for the same segment at the same time?**
  The system should accept both submissions (no conflict), as both entries will be reviewed independently by admins. Total progress is calculated from approved entries.

- **What happens when GPS/location services are disabled or unavailable?**
  Photos can still be taken but will lack GPS metadata. The app should warn the user and allow manual location confirmation if required by the work stage.

- **What happens when a worker tries to edit an entry that has already been approved?**
  The system blocks all edits with a message: "Approved entries cannot be modified." Only admins can make changes to approved entries.

- **What happens when a segment's completed meters exceed the planned length significantly (>10%)?**
  The system requires a mandatory comment explaining the reason (e.g., "Route change approved by PM" or "Measurement correction"). This is submitted for admin review.

- **What happens when the app is reinstalled or data is cleared?**
  User must re-authenticate, and all cached data is re-downloaded upon login. Unsynced entries stored only locally are lost (warning should be shown if unsynced data is detected before clearing).

- **What happens when a worker receives a real-time notification about an entry being returned while offline?**
  Notifications are queued and delivered when the device reconnects. The app polls for updates when coming back online.

- **What happens when photo upload fails due to file size or format issues?**
  The system should compress images automatically before upload. If compression fails or format is unsupported, display an error with specific guidance (e.g., "Photo must be under 10MB and in JPG/PNG format").

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication (FR-AUTH)

- **FR-AUTH-001**: System MUST authenticate workers using Supabase Auth with email and PIN (4-6 digits) via `signInWithPassword` method
- **FR-AUTH-002**: System MUST store PIN as bcrypt hash in Supabase Auth
- **FR-AUTH-003**: System MUST track failed login attempts and lock accounts for 15 minutes after 5 consecutive failures
- **FR-AUTH-004**: System MUST persist authentication sessions locally using JWT tokens for offline access
- **FR-AUTH-005**: System MUST support standard Supabase password/PIN reset flow
- **FR-AUTH-006**: System MUST verify user roles and only allow workers and foremen to access the mobile app

#### Project and NVT Access (FR-PROJECT)

- **FR-PROJECT-001**: System MUST display only projects assigned to the authenticated worker based on crew assignments or direct user assignments
- **FR-PROJECT-002**: System MUST display a list of NVT points (cabinets) associated with the worker's assigned projects
- **FR-PROJECT-003**: System MUST allow workers to select an NVT point from the list to view details
- **FR-PROJECT-004**: System MUST provide search/filter functionality for NVT points by code or name
- **FR-PROJECT-005**: System MUST validate that selected NVT points belong to the worker's assigned projects
- **FR-PROJECT-006**: System MUST display cabinet details including code, name, address, associated segments, houses, and current progress

#### Work Progress Tracking - Segments (FR-PROGRESS)

- **FR-PROGRESS-001**: System MUST allow workers to select a segment and work stage for progress entry
- **FR-PROGRESS-002**: System MUST capture completed meters as a decimal number for each segment progress entry
- **FR-PROGRESS-003**: System MUST allow workers to attach multiple photos to each entry without quantity limits
- **FR-PROGRESS-004**: System MUST capture GPS coordinates and timestamp metadata (EXIF) for all photos
- **FR-PROGRESS-005**: System MUST dynamically render form fields based on `work_stages.required_fields` JSON configuration
- **FR-PROGRESS-006**: System MUST support field types: number (with min/max), text, textarea (with maxLength), and select (with predefined options)
- **FR-PROGRESS-007**: System MUST validate required fields before allowing submission
- **FR-PROGRESS-008**: System MUST display dynamic checklists based on `work_stages.checklist_items` JSON configuration
- **FR-PROGRESS-009**: System MUST block submission if any required checklist items are unchecked (red error notification)
- **FR-PROGRESS-010**: System MUST show warning but allow submission if optional checklist items are unchecked (yellow warning)
- **FR-PROGRESS-011**: System MUST allow workers to save entries as drafts without validation
- **FR-PROGRESS-012**: System MUST validate all required fields, photos, and checklist items when submitting an entry
- **FR-PROGRESS-013**: System MUST display remaining meters based on approved entries and pending meters based on submitted entries
- **FR-PROGRESS-014**: System MUST allow over-completion (meters exceeding planned length) with a warning
- **FR-PROGRESS-015**: System MUST require a mandatory comment when over-completion exceeds 10% of planned length

#### House Connection Appointments (FR-APPOINTMENT)

- **FR-APPOINTMENT-001**: System MUST display a list of house connection appointments for the worker with scheduled dates and times
- **FR-APPOINTMENT-002**: System MUST allow workers to mark arrival at a house with timestamp
- **FR-APPOINTMENT-003**: System MUST require before photos when marking arrival
- **FR-APPOINTMENT-004**: System MUST allow workers to mark connection completion with timestamp
- **FR-APPOINTMENT-005**: System MUST require after photos when marking completion
- **FR-APPOINTMENT-006**: System MUST allow workers to add comments and request appointment rescheduling
- **FR-APPOINTMENT-007**: System MUST submit appointment entries with status "submitted" for admin review

#### Entry Status Workflow (FR-STATUS)

- **FR-STATUS-001**: System MUST support entry statuses: draft, submitted, returned, approved
- **FR-STATUS-002**: System MUST allow workers to view all their entries organized by status in "My Entries" screen
- **FR-STATUS-003**: System MUST display admin feedback/comments for returned entries
- **FR-STATUS-004**: System MUST allow workers to add corrective photos and comments to returned entries
- **FR-STATUS-005**: System MUST allow workers to resubmit returned entries, changing status back to "submitted"
- **FR-STATUS-006**: System MUST lock approved entries as read-only (no editing allowed)
- **FR-STATUS-007**: System MUST display clear visual indicators for each status (icons, colors, badges)

#### Offline Support (FR-OFFLINE)

- **FR-OFFLINE-001**: System MUST cache all assigned projects, NVT points, segments, and work stages for offline access
- **FR-OFFLINE-002**: System MUST store draft entries locally when offline
- **FR-OFFLINE-003**: System MUST store photos locally when offline
- **FR-OFFLINE-004**: System MUST queue submitted entries for automatic sync when connectivity is restored
- **FR-OFFLINE-005**: System MUST display sync status for each entry (local_only, pending_upload, synced)
- **FR-OFFLINE-006**: System MUST handle conflicts by checking if entries are already approved (blocking edits if approved)
- **FR-OFFLINE-007**: System MUST allow NVT selection and viewing offline using cached NVT data
- **FR-OFFLINE-008**: System MUST notify workers when attempting to access uncached data while offline

#### Foreman Capabilities (FR-FOREMAN)

- **FR-FOREMAN-001**: System MUST allow foremen to view all entries (drafts and submitted) from their assigned crew members
- **FR-FOREMAN-002**: System MUST allow foremen to edit any crew member's draft entry
- **FR-FOREMAN-003**: System MUST allow foremen to submit entries on behalf of crew members
- **FR-FOREMAN-004**: System MUST record both the original worker and the foreman when a foreman submits an entry
- **FR-FOREMAN-005**: System MUST allow foremen to bulk-submit multiple draft entries at once

#### Dashboard and Reporting (FR-DASHBOARD)

- **FR-DASHBOARD-001**: System MUST display worker KPIs including meters completed today, meters completed this week, entries submitted, entries approved, and entries returned
- **FR-DASHBOARD-002**: System MUST prominently display returned entries requiring attention with direct access links
- **FR-DASHBOARD-003**: System MUST show remaining work across all assigned segments with breakdown by segment
- **FR-DASHBOARD-004**: System MUST allow workers to filter entries by date range (today, this week, custom range)

#### Data Sync and Storage (FR-SYNC)

- **FR-SYNC-001**: System MUST upload photos to Supabase Storage buckets (work-photos)
- **FR-SYNC-002**: System MUST store work entries in the `work_entries` table
- **FR-SYNC-003**: System MUST store photo metadata in the `photos` table with references to work entries
- **FR-SYNC-004**: System MUST provide real-time updates using Supabase Realtime subscriptions for entry status changes
- **FR-SYNC-005**: System MUST handle upload failures gracefully with retry logic and error notifications
- **FR-SYNC-006**: System MUST compress photos before upload to optimize bandwidth usage

### Key Entities *(mandatory)*

- **Worker (User)**: Field worker who tracks progress and submits work entries. Attributes include email, PIN code (bcrypt hash), first name, last name, role (worker/foreman), phone, language preference, and assigned projects/crews.

- **Foreman (User)**: Crew leader with extended permissions to view and edit crew members' entries. Inherits all worker capabilities plus crew management features.

- **Project**: Construction project representing a fiber installation job. Includes name, customer, location, start/end dates, status, total length, PM assignment, and assigned workers/crews.

- **NVT Point (Cabinet)**: Network distribution point where cables are installed. Contains unique code (human-readable and UUID), name, address, geolocation, and associated segments and houses.

- **Segment**: Section of cable work within an NVT point. Includes code, planned length (meters), completed length (meters), status, and associated work stages.

- **Work Stage**: Configuration template defining required fields and checklist items for a specific type of work. Contains JSON configuration for dynamic form fields (`required_fields`) and checklist items (`checklist_items`).

- **Work Entry (Progress Entry)**: Record of work performed by a worker. Includes project, user, crew, work type, description, start/end time, GPS location, status (draft/submitted/returned/approved), photos, notes, and associated segment or appointment.

- **Photo**: Image captured during work with metadata. Includes file path, thumbnail, caption, GPS coordinates, timestamp, photo type (before/after), and quality check status.

- **House**: Residential building scheduled for fiber connection. Contains address, connection date (planned/actual), status, assigned crew, owner contact info, and connection instructions.

- **Appointment**: Scheduled event for house connection. Includes project, user, title, description, start/end time, status, location, and notes.

- **Crew**: Team of workers assigned to projects. Contains name, description, status, leader (foreman), and crew members.

- **Checklist Item**: Individual check within a work stage. Includes text description, required flag (blocking submission if unchecked), and display order.

- **Dynamic Field**: Form field configuration for work stage. Includes field name, type (number/text/textarea/select), label, validation rules (required, min/max, maxLength), and options (for select type).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Workers can authenticate and access assigned projects in under 30 seconds with or without internet connectivity
- **SC-002**: Workers can select an NVT point from the list and load details in under 3 seconds when online, and under 1 second when offline with cached data
- **SC-003**: Workers can complete a segment progress entry (meters + photos + required fields + checklist) in under 3 minutes
- **SC-004**: System successfully syncs 95% of queued offline entries within 1 minute of connectivity restoration
- **SC-005**: Photo uploads complete successfully for 98% of photos under 5MB within 30 seconds on standard 4G connection
- **SC-006**: Workers can work completely offline for an 8-hour shift and sync all entries at end of day
- **SC-007**: Zero data loss occurs during offline work and sync process (100% of queued entries and photos are successfully uploaded)
- **SC-008**: Workers can locate and correct returned entries within 1 minute of viewing their "My Entries" screen
- **SC-009**: Dashboard loads personal KPIs and remaining work within 3 seconds
- **SC-010**: System supports 100+ concurrent workers submitting progress without performance degradation
- **SC-011**: Workers report 80% or higher satisfaction with app ease of use within first month of deployment
- **SC-012**: Average time from work completion to admin approval decreases by 50% compared to paper-based process
- **SC-013**: Entry rejection rate decreases to under 10% due to clear checklist guidance and required field validation
- **SC-014**: Foremen can review and bulk-submit team entries for a full day's work in under 10 minutes

## Scope *(mandatory)*

### In Scope

- Mobile app for iOS and Android platforms
- Worker and foreman authentication via email + PIN
- NVT point selection from list with search/filter capability
- Segment progress tracking with meters, photos, dynamic fields, and checklists
- House connection appointment tracking with before/after photos
- Draft, submit, return, approve workflow for all work entries
- Offline data storage and automatic sync when online
- Photo capture with GPS and timestamp metadata
- Dynamic form field rendering based on JSON configuration
- Dynamic checklist rendering based on JSON configuration
- Validation for required fields, photos, and checklist items
- Over-completion detection and mandatory comment requirement
- "My Entries" view organized by status
- Worker dashboard with personal KPIs and remaining work
- Foreman crew management (view/edit crew entries)
- Real-time status updates via Supabase Realtime
- Photo upload to Supabase Storage
- Integration with existing Supabase database schema

### Out of Scope (Future Enhancements)

- Admin web panel for reviewing and approving entries (separate feature)
- Advanced map visualization showing segment routes and completed work
- Equipment tracking and assignment
- Material inventory and usage tracking
- Time tracking and payroll integration
- Multi-language support beyond basic language preference setting
- Push notifications for entry status changes (notification infrastructure)
- Advanced analytics and reporting dashboards for management
- Integration with third-party mapping or GIS systems
- Conditional/dependent dynamic fields (Phase 2 enhancement noted in user description)
- Biometric authentication (fingerprint, face ID)
- Voice-to-text for notes and comments
- Bulk photo upload optimization beyond basic compression
- Offline map tiles for navigation
- Integration with project scheduling/planning tools

## Assumptions *(mandatory)*

1. **Existing Infrastructure**: Supabase instance is already configured with authentication, database, storage, and realtime capabilities
2. **Database Schema**: Core tables (projects, cabinets, segments, work_entries, photos, houses, appointments, users, crews) already exist with schema as documented
3. **User Management**: Users (workers and foremen) are already created in Supabase Auth with appropriate PIN codes and role assignments
4. **Project Assignments**: Workers and crews are already assigned to projects through existing admin tools
5. **NVT Data**: NVT points are properly configured with codes, names, and addresses for easy identification in the list
6. **Mobile Devices**: Workers have smartphones (iOS or Android) with camera, GPS, and reasonable storage capacity (minimum 2GB free)
7. **Connectivity**: Field locations have intermittent 4G/5G or WiFi connectivity; complete offline capability required but sync eventually possible
8. **Photo Format**: Mobile cameras produce standard JPG/PNG photos under 10MB that can be compressed without significant quality loss
9. **Work Stages Configuration**: `work_stages` table includes JSON columns `required_fields` and `checklist_items` configured by admins before workers use the app
10. **Supabase Storage Buckets**: `work-photos` bucket is already created and configured with appropriate access policies
11. **Session Duration**: Supabase JWT tokens have reasonable expiry (e.g., 1 hour) with refresh tokens allowing extended offline sessions (e.g., 7 days)
12. **Crew Assignments**: Foremen are designated as crew leaders in the `crews` table, and crew members are properly linked
13. **Data Volume**: Individual workers generate manageable amounts of data per day (e.g., 10-50 entries, 50-200 photos) that can be synced over mobile networks
14. **Approval Process**: Admin/manager users will approve entries through a separate web interface (out of scope for this mobile app)
15. **Default Language**: System defaults to English if worker's language preference is not set or supported

## Dependencies *(optional)*

- **Supabase Platform**: App depends on Supabase availability for authentication, database, storage, and realtime features when online
- **Supabase Auth**: Authentication flow depends on Supabase Auth with bcrypt password hashing
- **Supabase Storage**: Photo upload depends on Supabase Storage `work-photos` bucket
- **Supabase Realtime**: Status update notifications depend on Supabase Realtime subscriptions
- **Mobile OS Permissions**: Camera access requires camera permission; GPS tagging requires location permission
- **Photo Library**: Photo capture and compression depend on mobile photo libraries (platform-specific)
- **Local Storage**: Offline capability depends on local storage (SQLite, Realm, or similar) for caching and queue management
- **Network Availability**: Sync functionality depends on intermittent network connectivity (4G/5G/WiFi)
- **Admin Web Panel** (future): Full workflow completion depends on a separate admin web panel for reviewing and approving/returning entries

## Risks & Mitigations *(optional)*

### Risk 1: Offline Data Conflicts
**Description**: Multiple workers might edit the same segment or entry while offline, causing conflicts when syncing.
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**: Implement append-only architecture where each worker's submission is independent. Avoid edit conflicts by only allowing edits on draft status. Once submitted, entries are locked for editing. Admins can return entries, creating a new version rather than overwriting.

### Risk 2: Photo Storage and Bandwidth Constraints
**Description**: Workers in remote areas with limited bandwidth may struggle to upload large photos, causing sync failures.
**Likelihood**: High
**Impact**: High
**Mitigation**:
- Implement aggressive photo compression before upload (target 500KB-1MB per photo)
- Queue failed uploads for retry with exponential backoff
- Allow workers to defer photo sync to WiFi-only mode
- Show clear upload progress and status indicators
- Implement resumable uploads for large photo batches

### Risk 3: GPS Inaccuracy in Urban or Forested Areas
**Description**: GPS coordinates may be inaccurate or unavailable in certain field locations, affecting photo metadata quality.
**Likelihood**: Medium
**Impact**: Low
**Mitigation**:
- Allow entries without GPS data but display warning to worker
- Use last known location as fallback if GPS is unavailable
- Enable manual location confirmation/override by worker
- Don't block submission due to missing GPS unless explicitly required by work stage

### Risk 4: Session Expiry During Extended Offline Work
**Description**: Workers on multi-day field assignments may face session expiry, requiring re-authentication without internet.
**Likelihood**: Low
**Impact**: High
**Mitigation**:
- Configure Supabase refresh tokens with extended expiry (7-14 days)
- Cache credentials securely for automatic re-authentication when online
- Design offline-first architecture where session validation is deferred until sync
- Warn workers before extended field work to ensure they're logged in

### Risk 5: Dynamic Field Configuration Errors
**Description**: Misconfigured `work_stages` JSON (invalid types, missing required properties) could break form rendering.
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Implement robust JSON schema validation on the admin side before saving work stage configurations
- Add client-side error handling to gracefully handle malformed configurations
- Display user-friendly error message if work stage can't be loaded
- Implement fallback to basic text fields if dynamic rendering fails
- Provide clear documentation and validation tools for admins configuring work stages

### Risk 6: App Performance with Large Cached Datasets
**Description**: Workers assigned to many projects with hundreds of segments may experience slow app performance due to large cached data.
**Likelihood**: Low
**Impact**: Medium
**Mitigation**:
- Implement lazy loading for cabinet and segment details (only cache active/recent projects)
- Set cache expiry to remove old project data after 30 days
- Optimize local database queries with proper indexing
- Limit initial sync to projects active within the last month
- Provide manual cache clearing option in settings

## Open Questions *(optional)*

1. **Photo Compression Quality**: What is the acceptable photo quality after compression for admin review? Target file size per photo?
   - *Suggested Answer*: Target 500KB-1MB per photo with 80-85% JPEG quality. Admins should be able to zoom and read details.

2. **Offline Duration Limits**: What is the maximum expected offline duration before workers must sync?
   - *Suggested Answer*: Workers should be able to work offline for 2-3 days (e.g., weekend work in remote areas) before requiring sync.

3. **Bulk Edit Limits for Foremen**: Should foremen have any limits on how many entries they can bulk-submit at once?
   - *Suggested Answer*: Limit to 50 entries per bulk submission to avoid timeout issues. If more, require multiple batches.

4. **Entry Deletion**: Can workers or foremen delete draft entries, or should they only be able to abandon/archive them?
   - *Suggested Answer*: Allow deletion of drafts only (not submitted/returned/approved). Deletion requires confirmation prompt.

5. **Photo Annotation**: Should workers be able to annotate photos with drawings or text overlays before submission?
   - *Suggested Answer*: Out of scope for V1. Consider for future enhancement based on user feedback.

6. **Multi-Language Support**: Which languages should be supported for the mobile app UI?
   - *Suggested Answer*: English as default. User's language preference from database can be used if future localization is added, but V1 is English-only.

7. **Work Entry Timestamps**: Should system capture both device time and server time for work entries to detect clock manipulation?
   - *Suggested Answer*: Yes, capture both. Use device time for offline entries, update with server time upon sync for audit trail.
