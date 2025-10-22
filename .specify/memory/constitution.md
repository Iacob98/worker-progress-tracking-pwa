<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Modified principles: Complete initial constitution
Added sections:
  - Project Charter (Vision, Goals, KPIs, Stakeholders)
  - Technical Architecture (Next.js + Supabase Web App)
  - 10 Core Principles
  - Security & Quality Standards
  - Governance & Change Management
Removed sections: Template placeholders
Templates requiring updates:
  ✅ .specify/memory/constitution.md (this file)
  ⚠ .specify/templates/plan-template.md (pending validation)
  ⚠ .specify/templates/spec-template.md (pending validation)
  ⚠ .specify/templates/tasks-template.md (pending validation)
Follow-up TODOs: Validate all templates align with new principles
-->

# Field Worker App Constitution

## Project Charter

**Name:** Field Worker App — Cabinets/NVT, Segments/Cuts, Progress & Photo Documentation

### Vision

Transparent, fast, and provable field work tracking for line installation/maintenance: from planning meters to confirmed facts with photos, geo-tags, and clear audit trails.

### Goals (V1)

1. Simplify daily brigade reporting: ≤ 2 minutes to record progress with photos
2. Provide management with reliable facts (meters/stages) on the day of completion, without manual consolidation
3. Reduce photo rejection rate by 50% through per-stage checklists
4. Support offline mode with secure synchronization

### Non-Goals (V1 Exclusions)

* Payroll/labor hours with bonus calculations (data only for calculations)
* Complex GIS construction site maps (minimum: NVT point and bindings)
* Smart routes/shift scheduler (simple term list)

### Key Performance Indicators (KPIs)

* TTFV (time-to-first-valid): average time from "created" to "approved" ≤ 24h
* % entries with return ≤ 15% after 1 month of launch
* Completeness: ≥ 95% objects with daily fact tracking (when work occurred)
* API uptime ≥ 99.5%

### Stakeholders

* **Customer/Business Owner** — approves goals, budget, priorities
* **Production/Project Manager** — defines stage rules, accepts releases
* **Tech Lead/Architect** — responsible for architecture, security, code quality
* **Development Team** — design, FE/PWA, BE/API, mobile wrapper
* **QA/Testing** — scenarios, regression, field pilots
* **Foreman/Workers** — primary users, pilot feedback
* **Admin Panel (separate site)** — verification/approvals, quality control

### Scope (V1 Delivery)

**Included:**

* Email + PIN authentication, Worker/Foreman roles
* Projects → Cabinets(NVT) → Segments → Cuts
* 10 configurable work stages, checklists and mandatory photos
* Progress recording (meters, photos, notes, geo), statuses: draft → submitted → returned/approved
* House appointments — view and fix visit status
* Offline mode, sync, audit

**Excluded:** complex accounting reports, external DMS/ERP integrations, mobile push notifications

### Deliverables

* PWA client (iOS/Android/desktop) + responsive layout
* REST API + DB migrations (Work Stages, Progress Entries, Photos, Ledger)
* Documentation: ER diagram, OpenAPI, User Guide

### High-Level Architecture

* **Client:** PWA (Next.js/React) with offline cache (IndexedDB/SQLite), camera, NFC/QR
* **Server:** API (FastAPI/Nest/etc), JWT, S3-compatible photo storage, Webhooks to admin panel
* **Data:** PostgreSQL (tables from cabinets/segments/cuts + progress_* schema)
* **Integrations:** admin site reads same tables; event bus for approvals (as needed)

### Security & Privacy

* Minimal privileges: separation of read-only/writer DB roles
* Short-lived JWT + refresh, time-limited file URLs, encryption at rest/in transit
* GDPR: protection of personal data (house addresses, worker geo), photo retention policy

### Quality & Standards

* Code review 2 pairs of eyes, linters/typecheck, 70% coverage of critical modules
* Field acceptance on 1-2 sites (pilot) before scaling

### Environments & Releases

* Dev, Staging, Prod; migrations via CI/CD
* Release cadence: 2 weeks (minor), hotfixes as needed

### Rollout Plan (Guidance)

1. **Weeks 1-2:** DB and API V1, auth, reference data, stages
2. **Weeks 3-4:** Progress + photos + statuses, offline core, NVT list/card
3. **Weeks 5-6:** House appointments, dashboard, return/approval loops
4. **Weeks 7-8:** Pilot, metrics, checklist refinement, stabilization

### Risks & Mitigations

* Poor field connectivity → offline by design, upload queue, retries
* Photo inconsistency → per-stage checklists + examples, auto EXIF/geo validation
* DB photo overload → S3 storage, size limits, background workers
* Data inconsistency → single source of truth (one DB), audit log

### Communication

* Channels: Slack/Telegram project chat, weekly sync (30 min), monthly Steering
* Express support channel for foremen (on-call during business hours)

### Glossary

* **Cabinet (NVT/NFC Point)** — node point to which segments/houses are bound
* **Segment** — route section, contains one or more cuts
* **Cut** — minimum unit of field meterage accounting
* **Stage** — technology step (Marking…Quality Check)
* **Entry** — progress record + photos going for approval

---

## Core Principles

### I. Next.js 15 App Router Architecture

**MUST** use Next.js 15 with App Router and React Server Components. TypeScript MUST be strict mode. No Pages Router patterns allowed. Server Components by default; Client Components only when interactive state or browser APIs required.

**Rationale:** App Router provides superior performance through server-first rendering, automatic code splitting, and better data fetching patterns. Strict TypeScript catches errors at build time.

### II. Supabase-First Data Layer

**MUST** use Supabase for all data operations: Auth, Database (PostgreSQL), Storage. No direct SQL from client; all queries through Supabase client or Edge Functions. Row Level Security (RLS) MUST be enabled on all tables containing user data.

**Rationale:** Supabase provides integrated auth + data + storage with built-in security. RLS enforces access control at database level, preventing data leaks even if client logic fails.

### III. Offline-First Design (NON-NEGOTIABLE)

**MUST** support full offline operation for core workflows:
* Reading projects, cabinets, segments, cuts, stages
* Creating progress entries with photos
* Queue unsent data with retry logic

IndexedDB for structured data cache, service worker for asset caching. Sync conflicts MUST be resolved server-authoritative with user notification.

**Rationale:** Field workers operate in areas with unreliable connectivity. Data loss is unacceptable; offline capability is a fundamental requirement, not a feature.

### IV. Photo Management Standards

Photos MUST:
* Be compressed client-side before upload (max 2MB per photo)
* Include EXIF data (timestamp, GPS if available)
* Be uploaded to Supabase Storage with signed URLs
* Never be base64-encoded in database
* Have progress indicators during upload
* Support retry on failure

**Rationale:** Photos are critical proof of work. Poor photo handling leads to data loss, slow performance, and storage bloat. Compression and streaming uploads ensure reliability even on slow connections.

### V. Progressive Web App Standards

PWA MUST include:
* Web app manifest with install prompts
* Service worker for offline caching
* Responsive design (mobile-first, works on tablet/desktop)
* Camera access via Web APIs
* Add to Home Screen capability
* iOS Safari compatibility

**Rationale:** PWA avoids app store complexity while providing native-like experience. Single codebase serves all platforms with full device capability access.

### VI. Row Level Security (RLS) Enforcement

RLS policies MUST be implemented for:
* `progress_entries` — users see only entries for their assigned projects
* `progress_photos` — linked to parent entry permissions
* `cabinets`, `segments`, `cuts` — read access based on project assignments
* Storage buckets — path-based policies matching project/entry structure

Workers see own + team data; Foremen see team data; Admins see all via service role.

**Rationale:** Security at database level prevents data breaches. Even if client code has bugs, RLS ensures users cannot access unauthorized data.

### VII. Auto-Save & Data Loss Prevention

Forms MUST auto-save to local storage:
* Progress entry drafts saved every 5 seconds
* Photos queued locally before upload begins
* Clear indication of unsaved/unsent changes
* Recovery prompts if user returns to abandoned draft

**MUST NOT** lose user data under any circumstances.

**Rationale:** Field workers have limited time and may be interrupted. Auto-save respects their time and ensures work is never lost.

### VIII. Dynamic Forms from Configuration

Work stage forms MUST be generated from `work_stages` table configuration:
* `required_fields` JSON defines form fields
* `checklist_items` JSON defines validation rules
* No hardcoded stage forms; all dynamic
* Client validates against server schema

**Rationale:** Work processes evolve. Dynamic forms allow business users to modify workflows without code changes, reducing deployment cycles and technical debt.

### IX. Observability & Error Tracking

**MUST** implement:
* Client: Sentry for error tracking + Web Vitals for performance
* Server: OpenTelemetry for tracing + structured logging
* Business metrics: submitted/approved counts, return rates, approval times
* User actions logged for audit (who/what/when)

**Rationale:** Field operations are mission-critical. Observability enables rapid issue detection and resolution. Audit logs ensure accountability and compliance.

### X. Accessibility & Internationalization

**MUST** meet WCAG 2.1 AA standards:
* Keyboard navigation for all functions
* Proper ARIA labels and roles
* Sufficient color contrast (4.5:1 minimum)
* Focus indicators visible

**MUST** support internationalization:
* English, German, Russian via next-intl
* Date/number formatting per locale
* RTL layout support (future)

**Rationale:** Inclusive design serves all users. I18n enables deployment across regions. Accessibility is legal requirement in many jurisdictions.

---

## Technology Stack (Fixed)

### Frontend

* **Framework:** Next.js 15 (App Router only)
* **Language:** TypeScript (strict mode)
* **UI Library:** shadcn/ui + Tailwind CSS
* **Icons:** lucide-react
* **State Management:** TanStack Query (React Query)
* **Validation:** Zod schemas
* **Forms:** React Hook Form + Zod

### Backend

* **Database:** Supabase PostgreSQL
* **Auth:** Supabase Auth (email + OTP/PIN, JWT)
* **Storage:** Supabase Storage (S3-compatible)
* **API:** Supabase client + Edge Functions (Deno)
* **Security:** Row Level Security (RLS) policies

### PWA

* **Service Worker:** Workbox or custom
* **Cache:** IndexedDB (Dexie.js)
* **Manifest:** Next.js PWA plugin

### DevOps

* **Hosting:** Vercel (frontend), Supabase (backend)
* **CI/CD:** GitHub Actions
* **Testing:** Vitest (unit), Playwright (E2E)
* **Monitoring:** Sentry (client), OpenTelemetry (server)

---

## Data Model (V1 Minimum)

### Core Tables

* `projects` — project master
* `cabinets` — NVT/cabinet nodes
* `segments` — route segments within cabinets
* `cuts` — individual cut sections within segments
* `work_stages` — configurable stage definitions
* `progress_entries` — work progress records
* `progress_photos` — photo attachments for entries
* `appointments` — house connection appointments

### Required Views

* `v_segment_progress` — aggregated segment completion
* `v_cabinet_progress` — aggregated cabinet completion

### Audit

* `audit_log` — who/what/when for all critical operations

---

## Security Requirements

### Authentication

* Email + PIN/OTP via Supabase Auth
* JWT tokens: 15min access, 7day refresh
* Role-based access: Worker, Foreman, Admin

### Authorization

* RLS policies on all tables
* Service role key ONLY on server (Edge Functions)
* Client uses anon key with RLS enforcement

### Data Protection

* HTTPS/TLS for all traffic
* Encryption at rest (Supabase managed)
* Signed URLs for photos (1-hour expiry)
* No secrets in client bundle
* GDPR compliance: data retention policies, right to erasure

### Input Validation

* Server-side validation (Zod schemas)
* SQL injection prevention (parameterized queries via Supabase)
* File upload limits (size, type, count)
* Rate limiting on API endpoints

---

## Quality Standards

### Code Quality

* ESLint + Prettier (enforced)
* TypeScript strict mode (no `any`)
* Code review required (2 approvers)
* 70% test coverage on critical paths

### Performance

* Lighthouse score ≥ 90 (mobile)
* LCP < 2.5s on 3G
* Bundle size ≤ 200KB gzipped (critical path)
* Image optimization (Next/Image)

### Testing

* Unit tests (Vitest) for utilities/hooks
* Integration tests for API routes
* E2E tests (Playwright) for critical flows
* Manual UAT on real devices before release

### Documentation

* OpenAPI spec for Edge Functions
* Storybook for UI components (optional V2)
* README with setup instructions
* User guide for field workers

---

## Development Workflow

### Branching

* `main` — production
* `dev` — integration
* Feature branches: `feature/<name>`
* Hotfix branches: `hotfix/<name>`

### Pull Requests

* Template with checklist (tests, docs, migrations)
* Required: 2 approvals, passing CI
* No merge until preview deploy verified

### Database Changes

* All schema changes via migrations (`supabase db diff`)
* Migration review required before merge
* Rollback plan documented

### Deployments

* Staging: auto-deploy from `dev`
* Production: manual promotion from staging
* Rollback: revert commit + redeploy

---

## Governance

### Constitution Authority

This Constitution supersedes all other practices, guidelines, and conventions. All code, reviews, and decisions MUST comply with these principles.

### Amendment Process

1. Propose change via GitHub issue with rationale
2. Team discussion (async or sync)
3. Approval requires: Tech Lead + 2 developers
4. Update constitution with version bump:
   * MAJOR: Breaking principle changes (e.g., removing offline support)
   * MINOR: New principles or major additions
   * PATCH: Clarifications, typos, non-semantic fixes
5. Propagate changes to dependent templates
6. Commit with message: `docs: amend constitution to vX.Y.Z (<summary>)`

### Compliance Review

* Every PR MUST include constitution compliance check
* Quarterly constitution review for relevance
* Violations logged and addressed immediately

### Complexity Justification

All complexity MUST be justified:
* Why is this abstraction necessary?
* What problem does it solve?
* What is the cost of NOT doing this?

Unjustified complexity is a violation and will be rejected.

### Guidance Files

For runtime development guidance, see:
* `.specify/templates/plan-template.md` — planning structure
* `.specify/templates/spec-template.md` — specification format
* `.specify/templates/tasks-template.md` — task breakdown format

---

**Version**: 1.0.0 | **Ratified**: 2025-10-15 | **Last Amended**: 2025-10-15
