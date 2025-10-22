# Implementation Tasks: Worker Progress Tracking Mobile App

**Feature Branch**: `003-worker-progress-tracking`
**Created**: 2025-10-16
**Status**: Ready for Implementation
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Task Legend

- **Format**: `- [ ] T### [P] [US#] Description in file/path.tsx`
- **[P]**: Parallel-eligible (can run concurrently with same-phase tasks)
- **[US#]**: User Story reference (US1-US7 from spec.md)
- **Priority**: P1 = MVP (US1-US3), P2 = Post-MVP, P3 = Enhancement

## Dependency Graph

```
Phase 1 (Setup) → Phase 2 (Foundation) → Phase 3-9 (Features) → Phase 10 (Polish)

Critical Path (MVP):
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3)

Parallel Paths (Post-MVP):
- Phase 6 (US4) can start after Phase 5
- Phase 7 (US5) can start after Phase 5
- Phase 8 (US6) can start after Phase 3
- Phase 9 (US7) can start after Phase 5

Phase 10 (Polish) requires all feature phases complete
```

## Phase 1: Project Setup & Configuration (12 tasks)

**Dependencies**: None
**Estimated Duration**: 4-6 hours
**Deliverables**: Initialized Next.js 15 project with all dependencies, Supabase configured, PWA manifest

- [X] T001 [P] [US1] Initialize Next.js 15 project with TypeScript strict mode in project root
- [X] T002 [P] [US1] Install core dependencies (next, react, typescript, @supabase/supabase-js, @supabase/auth-helpers-nextjs) via package.json
- [X] T003 [P] [US1] Install UI dependencies (tailwindcss, shadcn/ui, lucide-react) via package.json
- [X] T004 [P] [US1] Install offline/PWA dependencies (dexie, next-pwa, workbox-*) via package.json
- [X] T005 [P] [US1] Install data/form dependencies (@tanstack/react-query, zod, react-hook-form, browser-image-compression) via package.json
- [X] T006 [US1] Configure Supabase environment variables in .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [X] T007 [P] [US1] Initialize shadcn/ui with default configuration in components/ui/
- [X] T008 [P] [US1] Configure next-pwa plugin in next.config.js for service worker generation
- [X] T009 [P] [US1] Create PWA manifest.json in public/ with app name, icons, theme colors, display mode
- [X] T010 [P] [US1] Configure Tailwind CSS with mobile-first breakpoints in tailwind.config.ts
- [X] T011 [P] [US1] Create tsconfig.json with strict mode, path aliases (@/, @/components, @/lib, @/types)
- [X] T012 [US1] Create app/layout.tsx root layout with metadata, viewport config, and Tailwind imports

---

## Phase 2: Foundational Layer (18 tasks)

**Dependencies**: Phase 1 complete
**Estimated Duration**: 8-12 hours
**Deliverables**: Supabase clients, IndexedDB schema, type definitions, auth context, base utilities

- [X] T013 [P] [US1] Generate Supabase TypeScript types in types/database.ts using Supabase CLI
- [X] T014 [P] [US1] Create Supabase browser client in lib/supabase/client.ts with session handling
- [X] T015 [P] [US1] Create Supabase server client in lib/supabase/server.ts for Server Components
- [X] T016 [P] [US1] Create Supabase middleware in lib/supabase/middleware.ts for auth refresh
- [X] T017 [US2] Define Dexie IndexedDB schema in lib/offline/db.ts (projects, cabinets, segments, work_entries, photos, sync_queue tables)
- [X] T018 [P] [US1] Create domain models in types/models.ts (Worker, Project, NVT, Segment, WorkEntry, Photo, Appointment)
- [X] T019 [P] [US3] Create work stage types in types/work-stages.ts (DynamicField, ChecklistItem, WorkStageConfig)
- [X] T020 [P] [US1] Create base Zod schemas in lib/validation/schemas.ts (LoginSchema, WorkerSchema, ProjectSchema)
- [X] T021 [P] [US3] Create dynamic schema generator in lib/validation/dynamic-schema.ts to convert work_stages JSON to Zod schemas
- [X] T022 [US1] Create AuthContext in components/auth/session-provider.tsx with user state, login, logout methods
- [X] T023 [P] [US1] Create useAuth hook in lib/hooks/use-auth.ts wrapping AuthContext
- [X] T024 [P] [US2] Create useOffline hook in lib/hooks/use-offline.ts for online/offline detection
- [X] T025 [P] [US3] Create useSync hook in lib/hooks/use-sync.ts for sync queue status
- [X] T026 [P] [US1] Create permission utilities in lib/utils/permissions.ts (isWorker, isForeman, canEditEntry)
- [X] T027 [P] [US3] Create calculation utilities in lib/utils/calculations.ts (calculateRemaining, calculatePending, calculateProgress)
- [X] T028 [P] [US1] Create format utilities in lib/utils/format.ts (formatDate, formatMeters, formatPercentage)
- [X] T029 [US2] Create cache strategies in lib/offline/cache.ts (cacheProject, cacheNVT, getCachedData, clearExpiredCache)
- [X] T030 [US3] Create sync queue manager in lib/offline/sync.ts (queueEntry, queuePhoto, processSyncQueue, retryFailed)

---

## Phase 3: Authentication & Session (US1 - P1 MVP) (12 tasks)

**Dependencies**: Phase 2 complete
**Estimated Duration**: 6-8 hours
**Deliverables**: Login page, PIN authentication, session persistence, protected routes

- [X] T031 [US1] Create login page in app/(auth)/login/page.tsx with email + PIN form
- [X] T032 [US1] Create LoginForm component in components/auth/login-form.tsx with react-hook-form + Zod validation
- [X] T033 [US1] Implement signInWithPassword in login-form.tsx using Supabase Auth
- [X] T034 [P] [US1] Add failed login attempt tracking in login-form.tsx (5 attempts → 15min lockout)
- [X] T035 [P] [US1] Create password reset page in app/(auth)/reset-password/page.tsx
- [X] T036 [P] [US1] Implement Supabase password reset flow in reset-password/page.tsx
- [X] T037 [US1] Create protected app layout in app/(app)/layout.tsx with auth check and navigation
- [X] T038 [P] [US1] Add offline session persistence in components/auth/session-provider.tsx using LocalStorage
- [X] T039 [P] [US1] Create OfflineIndicator component in components/shared/offline-indicator.tsx
- [X] T040 [P] [US1] Add logout functionality in app/(app)/layout.tsx with session cleanup
- [X] T041 [US1] Create middleware in middleware.ts to redirect unauthenticated users to /login
- [X] T042 [P] [US1] Add role verification (worker/foreman only) in middleware.ts

---

## Phase 4: Projects & NVT Selection (US2 - P1 MVP) (14 tasks)

**Dependencies**: Phase 3 complete
**Estimated Duration**: 8-10 hours
**Deliverables**: Projects list, NVT list with search, offline caching, cabinet details

- [ ] T043 [US2] Create projects list page in app/(app)/projects/page.tsx fetching assigned projects
- [ ] T044 [P] [US2] Create ProjectCard component in components/projects/project-card.tsx with progress indicators
- [ ] T045 [US2] Implement TanStack Query hook for fetching projects in lib/hooks/use-projects.ts
- [ ] T046 [US2] Add offline project caching in use-projects.ts using lib/offline/cache.ts
- [ ] T047 [US2] Create project detail page in app/(app)/projects/[id]/page.tsx with NVT list
- [ ] T048 [US2] Create NVTList component in components/projects/nvt-list.tsx with search/filter
- [ ] T049 [P] [US2] Add search input in NVTList component filtering by code/name
- [ ] T050 [P] [US2] Create NVTCard component displaying cabinet code, name, address, progress
- [ ] T051 [US2] Implement TanStack Query hook for fetching NVT points in lib/hooks/use-nvt.ts
- [ ] T052 [US2] Add offline NVT caching in use-nvt.ts using lib/offline/cache.ts
- [ ] T053 [US2] Create NVT detail page in app/(app)/projects/[id]/nvt/[nvtId]/page.tsx
- [ ] T054 [P] [US2] Display cabinet details (code, name, address, coordinates) in NVT detail page
- [ ] T055 [P] [US2] Display segments list with remaining/pending meters in NVT detail page
- [ ] T056 [P] [US2] Display houses list with connection status in NVT detail page

---

## Phase 5: Segment Progress Reporting (US3 - P1 MVP) (22 tasks)

**Dependencies**: Phase 4 complete
**Estimated Duration**: 12-16 hours
**Deliverables**: Dynamic forms, photo capture, progress submission, validation, draft auto-save

- [ ] T057 [US3] Create progress entry page in app/(app)/projects/[id]/nvt/[nvtId]/segments/[segmentId]/report/page.tsx
- [ ] T058 [US3] Fetch segment and work_stages data in progress entry page using TanStack Query
- [ ] T059 [US3] Create ProgressForm component in components/progress/progress-form.tsx with react-hook-form
- [ ] T060 [US3] Add work stage selection dropdown in ProgressForm component
- [ ] T061 [US3] Add completed meters input with validation (min: 0, max: segment length + 10%) in ProgressForm
- [ ] T062 [US3] Create DynamicForm component in components/progress/dynamic-form.tsx rendering work_stages.required_fields JSON
- [ ] T063 [US3] Implement field type renderers in DynamicForm: number (with min/max), text, textarea (maxLength), select (options)
- [ ] T064 [US3] Generate Zod validation schema from work_stages.required_fields using lib/validation/dynamic-schema.ts
- [ ] T065 [US3] Create Checklist component in components/progress/checklist.tsx rendering work_stages.checklist_items JSON
- [ ] T066 [US3] Implement required checklist validation (block submit if unchecked) in Checklist component
- [ ] T067 [P] [US3] Implement optional checklist warning (yellow alert) in Checklist component
- [ ] T068 [US3] Create PhotoCapture component in components/progress/photo-capture.tsx with camera access
- [ ] T069 [US3] Request camera permission in PhotoCapture using navigator.mediaDevices.getUserMedia
- [ ] T070 [US3] Capture photo from camera or file upload in PhotoCapture component
- [ ] T071 [US3] Extract EXIF data (GPS, timestamp) in lib/photo/exif.ts using exif-js or custom parser
- [ ] T072 [US3] Compress photos in lib/photo/compression.ts using browser-image-compression (target: 500KB-1MB)
- [ ] T073 [US3] Store photos locally in IndexedDB in PhotoCapture component
- [ ] T074 [P] [US3] Display photo thumbnails with delete option in PhotoCapture component
- [ ] T075 [US3] Create useDraftAutosave hook in lib/hooks/use-draft-autosave.ts saving to LocalStorage every 5s
- [ ] T076 [US3] Implement "Save Draft" button in ProgressForm saving to IndexedDB without validation
- [ ] T077 [US3] Implement "Submit" button in ProgressForm validating all fields + photos + checklist
- [ ] T078 [US3] Add over-completion warning (>100%) and mandatory comment requirement (>110%) in ProgressForm validation
- [ ] T079 [US3] Queue submitted entry in sync queue using lib/offline/sync.ts
- [ ] T080 [US3] Upload photos to Supabase Storage in lib/photo/upload.ts with retry logic
- [ ] T081 [US3] Insert work_entry record to Supabase in sync.ts processSyncQueue function
- [ ] T082 [P] [US3] Show sync status (local_only, pending_upload, synced) in ProgressForm using SyncStatus component
- [ ] T083 [P] [US3] Create DraftRecovery component in components/progress/draft-recovery.tsx for abandoned drafts
- [ ] T084 [P] [US3] Add toast notifications for save/submit success/failure using shadcn/ui toast

---

## Phase 6: House Connection Appointments (US4 - P2) (10 tasks)

**Dependencies**: Phase 5 complete (can run parallel with Phase 7)
**Estimated Duration**: 6-8 hours
**Deliverables**: Appointments list, arrival/completion tracking, before/after photos

- [ ] T085 [US4] Create appointments list page in app/(app)/appointments/page.tsx
- [ ] T086 [P] [US4] Fetch house appointments from Supabase in appointments/page.tsx using TanStack Query
- [ ] T087 [P] [US4] Create AppointmentCard component in components/appointments/appointment-card.tsx with status badges
- [ ] T088 [P] [US4] Sort appointments by scheduled time with status indicators (pending/in progress/completed)
- [ ] T089 [US4] Create appointment detail page in app/(app)/appointments/[id]/page.tsx
- [ ] T090 [US4] Add "Mark Arrived" button with timestamp capture in appointment detail page
- [ ] T091 [US4] Add before photos section using PhotoCapture component in appointment detail page
- [ ] T092 [US4] Add "Mark Completed" button with timestamp capture in appointment detail page
- [ ] T093 [US4] Add after photos section using PhotoCapture component in appointment detail page
- [ ] T094 [P] [US4] Add reschedule request with comment field in appointment detail page
- [ ] T095 [US4] Submit appointment entry to Supabase with status "submitted" using sync queue

---

## Phase 7: Work Entry Review & Corrections (US5 - P2) (10 tasks)

**Dependencies**: Phase 5 complete (can run parallel with Phase 6)
**Estimated Duration**: 6-8 hours
**Deliverables**: My Entries screen, returned entry handling, resubmit flow

- [ ] T096 [US5] Create My Entries page in app/(app)/entries/page.tsx
- [ ] T097 [US5] Fetch all user's entries from Supabase grouped by status (draft/submitted/returned/approved)
- [ ] T098 [P] [US5] Create status tabs/filters in My Entries page (Drafts, Submitted, Returned, Approved)
- [ ] T099 [P] [US5] Display entry cards with status badges and admin feedback for returned entries
- [ ] T100 [US5] Create entry detail page in app/(app)/entries/[id]/page.tsx
- [ ] T101 [P] [US5] Display full entry details (read-only for approved, editable for drafts)
- [ ] T102 [P] [US5] Display admin feedback/comments for returned entries in entry detail page
- [ ] T103 [US5] Create resubmit page in app/(app)/entries/[id]/resubmit/page.tsx
- [ ] T104 [US5] Allow adding corrective photos and comments in resubmit page
- [ ] T105 [US5] Implement resubmit action changing status to "submitted" and queueing for sync
- [ ] T106 [P] [US5] Lock approved entries as read-only with "Approved" badge

---

## Phase 8: Foreman Crew Management (US6 - P3) (8 tasks)

**Dependencies**: Phase 3 complete (can run parallel with Phases 4-7)
**Estimated Duration**: 5-6 hours
**Deliverables**: Crew entries view, edit permissions, bulk submit

- [ ] T107 [US6] Add crew entries tab in app/(app)/entries/page.tsx (visible only for foremen)
- [ ] T108 [US6] Fetch all crew members' entries in entries/page.tsx filtered by foreman's crew
- [ ] T109 [P] [US6] Display crew member name with each entry in crew entries tab
- [ ] T110 [US6] Allow foreman to open and edit crew member's draft entries in app/(app)/entries/[id]/page.tsx
- [ ] T111 [US6] Record foreman as submitter (metadata) when submitting on behalf of crew member
- [ ] T112 [P] [US6] Add bulk selection checkboxes in crew entries tab
- [ ] T113 [P] [US6] Implement bulk submit action for multiple draft entries
- [ ] T114 [US6] Queue all bulk-submitted entries in sync queue with foreman metadata

---

## Phase 9: Worker Dashboard & KPIs (US7 - P3) (10 tasks)

**Dependencies**: Phase 5 complete (can run parallel with Phases 6-8)
**Estimated Duration**: 6-8 hours
**Deliverables**: Dashboard with metrics, remaining work, performance tracking

- [ ] T115 [US7] Create dashboard page in app/(app)/dashboard/page.tsx
- [ ] T116 [US7] Fetch worker KPIs from Supabase (meters today/week, entries submitted/approved/returned)
- [ ] T117 [P] [US7] Create KPI card component displaying metric with icon and label
- [ ] T118 [P] [US7] Display meters completed today in dashboard
- [ ] T119 [P] [US7] Display meters completed this week in dashboard
- [ ] T120 [P] [US7] Display entries submitted, approved, returned counts in dashboard
- [ ] T121 [P] [US7] Create prominent "Returned Entries" section with count and direct links
- [ ] T122 [US7] Fetch remaining work across all assigned segments
- [ ] T123 [P] [US7] Display total remaining meters with breakdown by segment in dashboard
- [ ] T124 [P] [US7] Add date range filter (today/this week/custom) for metrics in dashboard

---

## Phase 10: Polish & Production Ready (14 tasks)

**Dependencies**: All feature phases (3-9) complete
**Estimated Duration**: 8-10 hours
**Deliverables**: Error tracking, performance optimization, PWA polish, final testing

- [ ] T125 [P] [US1] Configure Sentry for client-side error tracking in app/layout.tsx
- [ ] T126 [P] [US1] Add Web Vitals monitoring in app/layout.tsx using next/web-vitals
- [ ] T127 [P] [US3] Implement conflict resolver in lib/offline/conflict-resolver.ts for server-authoritative resolution
- [ ] T128 [P] [US3] Add real-time status updates using Supabase Realtime subscriptions in components/shared/sync-status.tsx
- [ ] T129 [P] [US3] Create PhotoUploadProgress component in components/shared/photo-upload-progress.tsx with progress bars
- [ ] T130 [P] [US1] Add app icons (192x192, 512x512) in public/icons/
- [ ] T131 [P] [US1] Test PWA installation on iOS Safari (Add to Home Screen)
- [ ] T132 [P] [US1] Test PWA installation on Android Chrome (Add to Home Screen)
- [ ] T133 [P] [US2] Optimize bundle size with Next.js dynamic imports for large components
- [ ] T134 [P] [US3] Test offline CRUD: create draft offline → sync online → verify in Supabase
- [ ] T135 [P] [US3] Test photo upload: capture → compress → queue → upload → verify in Storage
- [ ] T136 [P] [US1] Test session persistence: login → close browser → reopen → verify still logged in
- [ ] T137 [P] [US3] Run Lighthouse audit targeting ≥90 score on mobile
- [ ] T138 [P] [US1] Create quickstart.md guide for local development setup

---

## Task Summary

**Total Tasks**: 138
**MVP Tasks (P1 - US1, US2, US3)**: 84 tasks (Phases 1-5)
**Post-MVP Tasks (P2 - US4, US5)**: 20 tasks (Phases 6-7)
**Enhancement Tasks (P3 - US6, US7)**: 18 tasks (Phases 8-9)
**Polish Tasks**: 14 tasks (Phase 10)

**Parallel Execution Examples**:
- Phase 1: T001-T005, T007, T009-T011 can run concurrently (dependency installation, configs)
- Phase 2: T013-T016, T018-T021, T023-T028 can run concurrently (type definitions, utilities)
- Phase 5: T067, T074, T082-T084 can run concurrently (UI polish tasks)
- Phase 6-8: Can start in parallel after Phase 5 complete (independent features)
- Phase 10: T125-T132 can run concurrently (monitoring, icons, testing)

**Critical Path (Minimum Viable Product)**:
```
T001-T012 → T013-T030 → T031-T042 → T043-T056 → T057-T084
(Setup)   → (Foundation) → (Auth)   → (Projects) → (Progress)
```

**Estimated Total Time**:
- **MVP (Phases 1-5)**: 38-52 hours (1 week with 2 developers or 1.5 weeks solo)
- **Full Feature (Phases 1-10)**: 57-76 hours (2 weeks with 2 developers or 3 weeks solo)

## Next Steps

1. **Review & Prioritize**: Confirm task breakdown aligns with team capacity
2. **Assign Tasks**: Distribute tasks across developers (parallel tasks to different devs)
3. **Setup Branch**: Create feature branch `003-worker-progress-tracking` from main
4. **Begin Phase 1**: Start with setup tasks (can parallelize T001-T005, T007, T009-T011)
5. **Daily Standups**: Track progress against phases, address blockers
6. **Phase Gates**: Review deliverables at end of each phase before proceeding
7. **MVP Checkpoint**: Demo US1-US3 after Phase 5 before proceeding to Phases 6-9
8. **UAT**: Test on real devices after Phase 10 complete

## Testing Strategy

**Per-Phase Testing**:
- **Phase 3**: Test login, logout, session persistence, failed attempts, offline session
- **Phase 4**: Test project list, NVT search/filter, offline caching, cabinet details
- **Phase 5**: Test dynamic forms, photo capture/compression, draft save, submit validation, sync queue
- **Phase 6**: Test appointment arrival/completion, before/after photos
- **Phase 7**: Test My Entries filters, returned entry corrections, resubmit flow
- **Phase 8**: Test foreman view crew entries, edit permissions, bulk submit
- **Phase 9**: Test dashboard metrics, remaining work calculations

**E2E Critical Flows**:
1. Login → Select Project → Select NVT → Report Segment Progress (offline) → Sync Online
2. Login → Select Appointment → Mark Arrived (before photos) → Mark Completed (after photos)
3. Login → View My Entries → Open Returned Entry → Add Corrections → Resubmit
4. Login as Foreman → View Crew Entries → Edit Draft → Bulk Submit Multiple Entries

**Device Testing Matrix**:
- iOS Safari (iPhone 12+, iOS 15+)
- Android Chrome (Pixel, Samsung, Android 10+)
- Desktop Chrome (for admin testing)
- Offline mode: Airplane mode for 8 hours → Restore connectivity → Verify sync

## Risk Mitigation

**Risk 1: Offline Sync Conflicts**
- **Mitigation**: Server-authoritative resolution (T127), append-only draft architecture, lock approved entries (T106)

**Risk 2: Photo Upload Failures**
- **Mitigation**: Aggressive compression (T072), retry logic (T080), resumable uploads, WiFi-only option

**Risk 3: GPS Inaccuracy**
- **Mitigation**: Allow entries without GPS (T071), use last known location, manual location override

**Risk 4: Session Expiry Offline**
- **Mitigation**: Extended refresh tokens (7-14 days), cached credentials for auto re-auth (T038)

**Risk 5: Dynamic Form Config Errors**
- **Mitigation**: Robust JSON validation (T064), error boundaries, fallback to basic text fields (T063)

---

**Generated**: 2025-10-16
**Last Updated**: 2025-10-16
**Template Version**: 1.0 (Specify Template)
