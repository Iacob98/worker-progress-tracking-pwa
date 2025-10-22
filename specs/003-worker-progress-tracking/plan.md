# Implementation Plan: Worker Progress Tracking Mobile App

**Branch**: `003-worker-progress-tracking` | **Date**: 2025-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-worker-progress-tracking/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a Progressive Web App (PWA) for field workers to track fiber installation progress with full offline support. Workers authenticate via email + PIN, select NVT points (cabinets) from project lists, report segment progress with photos and dynamic checklists, track house connection appointments, and sync data when connectivity is restored. The system implements a draft → submitted → returned/approved workflow with data-loss prevention and real-time updates.

**Core Technical Approach:**
- Next.js 15 App Router PWA with React Server Components
- Supabase for auth, database, storage, and realtime
- IndexedDB for offline data caching with sync queue
- Dynamic form generation from work_stages JSON configuration
- Client-side photo compression before upload
- Row Level Security for data isolation

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) with Next.js 15 (App Router)
**Primary Dependencies**:
- `next` (15.x) - React framework with App Router
- `@supabase/supabase-js` (2.x) - Supabase client
- `@supabase/auth-helpers-nextjs` - Next.js auth integration
- `@tanstack/react-query` (5.x) - Data fetching and caching
- `zod` (3.x) - Schema validation
- `react-hook-form` (7.x) - Form management
- `tailwindcss` (3.x) - Styling
- `shadcn/ui` - UI components
- `dexie` (3.x) - IndexedDB wrapper for offline storage
- `workbox-*` - Service worker and PWA support
- `next-pwa` - Next.js PWA plugin
- `browser-image-compression` - Client-side photo compression
- `lucide-react` - Icons

**Storage**:
- Supabase PostgreSQL (existing schema: projects, cabinets, segments, work_entries, photos, houses, appointments, users, crews)
- Supabase Storage (work-photos bucket for photo files)
- IndexedDB (client-side cache for offline data)
- LocalStorage (session persistence, draft auto-save)

**Testing**:
- Vitest (unit tests for utilities, hooks, validation)
- React Testing Library (component tests)
- Playwright (E2E tests for critical flows)
- Manual UAT on real iOS/Android devices

**Target Platform**:
- PWA installable on iOS 15+, Android 10+, desktop browsers
- Mobile-first responsive design (320px → 1920px)
- Service worker for offline capability
- Camera API for photo capture
- Geolocation API for GPS metadata

**Project Type**: Web application (PWA) - single codebase serving all platforms

**Performance Goals**:
- Lighthouse score ≥ 90 (mobile)
- LCP < 2.5s on 3G connection
- Photo upload: 500KB-1MB compressed, <30s on 4G
- Offline data sync: 95% success rate within 1min of connectivity restoration
- Support 100+ concurrent workers without degradation

**Constraints**:
- **Offline-first (NON-NEGOTIABLE)**: Full CRUD operations must work offline
- **No data loss**: Auto-save drafts every 5s, queue unsent submissions
- **Photo requirements**: GPS + timestamp EXIF, client compression before upload
- **Security**: Row Level Security on all tables, JWT 15min/7day tokens
- **Dynamic forms**: Zero hardcoded stage forms, all from work_stages JSON config
- **Bundle size**: ≤ 200KB gzipped for critical path

**Scale/Scope**:
- ~50-100 workers per deployment
- 10-50 entries per worker per day
- 50-200 photos per worker per day
- 5-10 active projects per worker
- Data retention: photos for 2 years, entries indefinitely

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ PASS: Next.js 15 App Router Architecture (Principle I)
**Status**: COMPLIANT
**Evidence**: Plan specifies Next.js 15 App Router with TypeScript strict mode. PWA structure uses React Server Components by default with Client Components only for interactive features (camera, forms, offline sync).

### ✅ PASS: Supabase-First Data Layer (Principle II)
**Status**: COMPLIANT
**Evidence**: All data operations through Supabase client. No direct SQL from client. Row Level Security enforced on projects, cabinets, segments, work_entries, photos, appointments. Service role key only in Edge Functions (if needed).

### ✅ PASS: Offline-First Design (Principle III)
**Status**: COMPLIANT
**Evidence**: IndexedDB (Dexie) for structured cache, service worker for asset caching. Full offline CRUD for projects, cabinets, segments, entries, photos. Sync queue with retry logic. Server-authoritative conflict resolution.

### ✅ PASS: Photo Management Standards (Principle IV)
**Status**: COMPLIANT
**Evidence**: Client-side compression (browser-image-compression) targeting 500KB-1MB. EXIF data (timestamp, GPS) captured. Upload to Supabase Storage with signed URLs. No base64 in database. Progress indicators and retry on failure.

### ✅ PASS: Progressive Web App Standards (Principle V)
**Status**: COMPLIANT
**Evidence**: next-pwa plugin for manifest + service worker. Mobile-first responsive design. Camera access via Web APIs. Add to Home Screen. iOS Safari compatibility tested.

### ✅ PASS: Row Level Security Enforcement (Principle VI)
**Status**: COMPLIANT
**Evidence**: RLS policies for progress_entries (users see own + assigned projects), progress_photos (inherit entry permissions), cabinets/segments/cuts (read via project assignments), storage buckets (path-based policies). Workers see own+team, Foremen see team, Admins use service role.

### ✅ PASS: Auto-Save & Data Loss Prevention (Principle VII)
**Status**: COMPLIANT
**Evidence**: Auto-save drafts every 5s to LocalStorage. Photos queued locally before upload. Clear unsaved/unsent indicators. Recovery prompts for abandoned drafts. Sync queue persists across sessions.

### ✅ PASS: Dynamic Forms from Configuration (Principle VIII)
**Status**: COMPLIANT
**Evidence**: Forms generated from work_stages.required_fields (number/text/textarea/select) and work_stages.checklist_items. Zero hardcoded stage forms. Zod schemas generated from server config for client validation.

### ✅ PASS: Observability & Error Tracking (Principle IX)
**Status**: COMPLIANT
**Evidence**: Sentry for client error tracking + Web Vitals. OpenTelemetry for server tracing. Business metrics (submitted/approved counts, return rates, approval times). Audit log for critical operations.

### ✅ PASS: Accessibility & Internationalization (Principle X)
**Status**: COMPLIANT
**Evidence**: WCAG 2.1 AA standards (keyboard nav, ARIA labels, 4.5:1 contrast, visible focus). Initial English only (constitution allows future i18n via next-intl). Date/number formatting per locale.

### 🔍 Constitution Compliance Summary
**Result**: ✅ ALL GATES PASSED
**Violations**: 0
**Justifications Required**: 0

This feature is fully compliant with all constitutional principles. Proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```
specs/003-worker-progress-tracking/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── auth.openapi.yaml
│   ├── projects.openapi.yaml
│   ├── progress.openapi.yaml
│   └── sync.openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This is a **Web Application (PWA)** with frontend + backend structure:

```
app/                              # Next.js 15 App Router
├── (auth)/                       # Auth route group
│   ├── login/
│   │   └── page.tsx             # Login with email + PIN
│   └── reset-password/
│       └── page.tsx             # PIN reset flow
├── (app)/                        # Protected app routes
│   ├── layout.tsx               # App shell with nav, offline indicator
│   ├── projects/
│   │   ├── page.tsx             # Projects list (Server Component)
│   │   └── [id]/
│   │       ├── page.tsx         # Project detail with NVT list
│   │       └── nvt/
│   │           └── [nvtId]/
│   │               ├── page.tsx # NVT detail (segments, houses, progress)
│   │               └── segments/
│   │                   └── [segmentId]/
│   │                       └── report/
│   │                           └── page.tsx  # Progress entry form
│   ├── appointments/
│   │   ├── page.tsx             # Appointments list
│   │   └── [id]/
│   │       └── page.tsx         # Appointment detail with photos
│   ├── entries/
│   │   ├── page.tsx             # My Entries (drafts/submitted/returned/approved)
│   │   └── [id]/
│   │       ├── page.tsx         # Entry detail/edit
│   │       └── resubmit/
│   │           └── page.tsx     # Resubmit returned entry
│   └── dashboard/
│       └── page.tsx             # Worker KPIs and remaining work
├── api/                          # API routes (if needed beyond Supabase)
│   └── sync/
│       └── route.ts             # Manual sync trigger endpoint
└── layout.tsx                    # Root layout with providers

components/
├── ui/                           # shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   ├── form.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── auth/
│   ├── login-form.tsx           # Client Component for auth
│   └── session-provider.tsx
├── projects/
│   ├── project-card.tsx
│   └── nvt-list.tsx
├── progress/
│   ├── dynamic-form.tsx         # Render work_stages.required_fields
│   ├── checklist.tsx            # Render work_stages.checklist_items
│   ├── photo-capture.tsx        # Camera access + compression
│   ├── progress-form.tsx        # Main entry form
│   └── draft-recovery.tsx       # Recover abandoned drafts
├── appointments/
│   └── appointment-card.tsx
└── shared/
    ├── offline-indicator.tsx    # Connection status
    ├── sync-status.tsx          # Queue status
    └── photo-upload-progress.tsx

lib/
├── supabase/
│   ├── client.ts                # Supabase client (browser)
│   ├── server.ts                # Supabase client (server)
│   ├── middleware.ts            # Auth middleware
│   └── types.ts                 # Generated DB types
├── offline/
│   ├── db.ts                    # Dexie IndexedDB schema
│   ├── sync.ts                  # Sync queue manager
│   ├── cache.ts                 # Cache strategies
│   └── conflict-resolver.ts    # Conflict resolution
├── validation/
│   ├── schemas.ts               # Zod schemas for forms
│   └── dynamic-schema.ts        # Generate schemas from work_stages JSON
├── photo/
│   ├── compression.ts           # Client-side compression
│   ├── exif.ts                  # EXIF data extraction
│   └── upload.ts                # Upload with retry
├── utils/
│   ├── format.ts                # Date, number formatting
│   ├── permissions.ts           # Check user permissions
│   └── calculations.ts          # Remaining meters, progress %
└── hooks/
    ├── use-auth.ts              # Auth context hook
    ├── use-offline.ts           # Online/offline detection
    ├── use-sync.ts              # Sync queue hook
    ├── use-draft-autosave.ts   # Auto-save hook
    └── use-camera.ts            # Camera access hook

types/
├── database.ts                   # Supabase generated types
├── models.ts                     # Domain models
└── work-stages.ts                # Dynamic form field types

public/
├── manifest.json                 # PWA manifest
├── service-worker.js             # Service worker (generated by next-pwa)
└── icons/                        # App icons (various sizes)

tests/
├── e2e/
│   ├── auth.spec.ts             # Login, logout, session persistence
│   ├── offline.spec.ts          # Offline CRUD, sync
│   ├── progress-entry.spec.ts   # Create entry, photos, validation
│   └── appointments.spec.ts     # House connections
├── integration/
│   ├── supabase-client.test.ts
│   ├── sync-queue.test.ts
│   └── photo-upload.test.ts
└── unit/
    ├── validation.test.ts       # Zod schema tests
    ├── compression.test.ts      # Photo compression
    ├── calculations.test.ts     # Business logic
    └── dynamic-form.test.ts     # Form generation from JSON

supabase/
├── migrations/                   # Database migrations (if new tables needed)
├── functions/                    # Edge Functions (if needed for complex ops)
└── config.toml                   # Supabase config
```

**Structure Decision**:
This is a **Web Application (PWA)** structure because:
1. Frontend: Next.js 15 App Router serves the PWA (installed on mobile devices)
2. Backend: Supabase handles auth, database, storage, realtime
3. No separate backend codebase needed - Supabase + Next.js API routes (if needed) handle all backend logic
4. Service worker + IndexedDB enable full offline capability
5. Single deployment to Vercel serves all platforms (iOS, Android, desktop)

The `app/` directory uses Next.js 15 App Router with route groups for clean separation of authenticated and unauthenticated flows. Components are organized by feature domain. The `lib/` directory contains all business logic, offline sync, and Supabase integration code.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations found** - this section is not applicable.

All constitution principles are met without requiring complexity justifications. The feature uses the prescribed tech stack (Next.js 15 + Supabase) and follows all architectural patterns (offline-first, RLS, dynamic forms, photo management) as defined in the constitution.
