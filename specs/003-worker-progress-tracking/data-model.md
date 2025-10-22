# Data Model: Worker Progress Tracking Mobile App

**Feature**: Worker Progress Tracking
**Date**: 2025-10-16
**Status**: Phase 1 Design

## Overview

This document defines the data model for the Worker Progress Tracking PWA. The model leverages the **existing Supabase database schema** and defines any new tables, views, or modifications required for this feature.

## Existing Schema (No Changes Required)

The following tables already exist in the Supabase database and will be used as-is:

### Core Tables

#### `users`
Field workers and foremen who use the mobile app.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | User ID (Supabase Auth) |
| email | varchar | NOT NULL, UNIQUE | Login email |
| pin_code | varchar | NOT NULL | bcrypt hash of PIN (4-6 digits) |
| first_name | varchar | | Worker first name |
| last_name | varchar | | Worker last name |
| role | varchar | | 'worker' or 'foreman' |
| phone | varchar | | Contact phone |
| is_active | boolean | DEFAULT true | Account active status |
| language_preference | varchar | | UI language (e.g., 'en', 'ru') |
| skills | jsonb | | Worker skills/certifications |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `users_pkey` on (id)
- `users_email_unique` on (email)

**RLS**: Users can read own profile; admins can read all.

---

#### `projects`
Construction projects for fiber installation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Project ID |
| name | text | NOT NULL | Project name |
| customer | text | | Customer/client name |
| city | text | | Project location city |
| address | text | | Project address |
| contact_24h | text | | 24h emergency contact |
| start_date | date | | Project start date |
| end_date_plan | date | | Planned completion date |
| status | text | DEFAULT 'active' | 'active', 'completed', 'paused' |
| total_length_m | numeric | | Total cable length (meters) |
| base_rate_per_m | numeric | | Base payment rate per meter |
| pm_user_id | uuid | FK → users | Project manager |
| language_default | text | | Default language for project |
| approved | boolean | DEFAULT false | Project approved for work |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `projects_pkey` on (id)
- `projects_pm_user_id_idx` on (pm_user_id)

**RLS**: Workers see only assigned projects via crews or direct assignment.

---

#### `crews`
Teams of workers assigned to projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Crew ID |
| name | varchar | NOT NULL | Crew name |
| description | text | | Crew description |
| status | varchar | DEFAULT 'active' | 'active', 'inactive' |
| leader_user_id | uuid | FK → users | Foreman (crew leader) |
| project_id | uuid | FK → projects | Assigned project |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `crews_pkey` on (id)
- `crews_leader_user_id_idx` on (leader_user_id)
- `crews_project_id_idx` on (project_id)

**RLS**: Workers see crews they belong to; foremen see crews they lead.

---

#### `crew_members`
Workers assigned to crews.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Membership ID |
| crew_id | uuid | NOT NULL, FK → crews | Crew |
| user_id | uuid | NOT NULL, FK → users | Worker |
| role | varchar | | Role within crew |
| joined_at | timestamptz | DEFAULT now() | Date joined crew |
| left_at | timestamptz | | Date left crew (null if active) |
| is_active | boolean | DEFAULT true | Currently active in crew |

**Indexes**:
- `crew_members_pkey` on (id)
- `crew_members_crew_id_idx` on (crew_id)
- `crew_members_user_id_idx` on (user_id)
- `crew_members_crew_user_unique` on (crew_id, user_id) WHERE is_active = true

**RLS**: Users can read own memberships; foremen can read crew memberships.

---

#### `cabinets`
NVT distribution points (network nodes).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Cabinet ID |
| project_id | uuid | NOT NULL, FK → projects | Parent project |
| code | text | UNIQUE | Human-readable code (e.g., 'NVT-2024-0157') |
| name | text | | Cabinet name/description |
| address | text | | Physical address |
| geom_point | jsonb | | GeoJSON point {lat, lng} |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `cabinets_pkey` on (id)
- `cabinets_project_id_idx` on (project_id)
- `cabinets_code_unique` on (code)

**RLS**: Workers see cabinets in assigned projects.

---

#### `segments`
Cable route segments within cabinets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Segment ID |
| cabinet_id | uuid | NOT NULL, FK → cabinets | Parent cabinet |
| code | text | | Segment code |
| length_planned_m | numeric | NOT NULL | Planned length (meters) |
| length_done_m | numeric | NOT NULL, DEFAULT 0 | Completed length (meters) |
| status | text | NOT NULL, DEFAULT 'pending' | 'pending', 'in_progress', 'completed' |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `segments_pkey` on (id)
- `segments_cabinet_id_idx` on (cabinet_id)

**RLS**: Workers see segments in assigned projects (via cabinet → project).

---

#### `houses`
Residential buildings for fiber connections.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | House ID |
| project_id | uuid | NOT NULL, FK → projects | Parent project |
| cabinet_id | uuid | FK → cabinets | Associated cabinet/NVT |
| house_number | text | | House/building number |
| street | text | | Street name |
| city | text | | City |
| postal_code | text | | Postal/ZIP code |
| latitude | numeric | | GPS latitude |
| longitude | numeric | | GPS longitude |
| status | text | DEFAULT 'pending' | Connection status |
| planned_connection_date | date | | Scheduled connection date |
| actual_connection_date | date | | Actual connection date |
| assigned_crew_id | uuid | FK → crews | Assigned crew |
| work_started_at | timestamptz | | Work start timestamp |
| work_completed_at | timestamptz | | Work completion timestamp |
| notes | text | | Notes about house connection |
| owner_first_name | text | | Owner first name |
| owner_last_name | text | | Owner last name |
| owner_phone | text | | Owner contact phone |
| connection_type | text | | Type of connection |
| method | text | | Installation method |
| house_type | text | | Residential/commercial/etc |
| contact_email | text | | Contact email |
| apartment_count | integer | | Number of apartments |
| floor_count | integer | | Number of floors |
| planned_connection_time | varchar | | Planned time slot |
| connection_instructions_document | text | | Path to instructions doc |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `houses_pkey` on (id)
- `houses_project_id_idx` on (project_id)
- `houses_cabinet_id_idx` on (cabinet_id)
- `houses_assigned_crew_id_idx` on (assigned_crew_id)

**RLS**: Workers see houses in assigned projects.

---

#### `appointments`
Scheduled house connection appointments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Appointment ID |
| project_id | uuid | FK → projects | Parent project |
| user_id | uuid | FK → users | Assigned worker |
| title | text | NOT NULL | Appointment title |
| description | text | | Appointment details |
| start_time | timestamptz | NOT NULL | Scheduled start |
| end_time | timestamptz | NOT NULL | Scheduled end |
| status | text | DEFAULT 'pending' | 'pending', 'in_progress', 'completed', 'rescheduled' |
| location | text | | Location/address |
| notes | text | | Notes |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `appointments_pkey` on (id)
- `appointments_project_id_idx` on (project_id)
- `appointments_user_id_idx` on (user_id)
- `appointments_start_time_idx` on (start_time)

**RLS**: Users see own appointments; foremen see crew appointments.

---

#### `work_entries`
Progress entries submitted by workers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Entry ID |
| project_id | uuid | NOT NULL, FK → projects | Parent project |
| user_id | uuid | NOT NULL, FK → users | Worker who created entry |
| crew_id | uuid | FK → crews | Worker's crew |
| work_type | varchar | NOT NULL | Type of work performed |
| description | text | | Work description |
| start_time | timestamptz | NOT NULL | Work start time |
| end_time | timestamptz | | Work end time |
| duration_hours | numeric | | Calculated duration |
| latitude | numeric | | GPS latitude |
| longitude | numeric | | GPS longitude |
| location_accuracy | numeric | | GPS accuracy (meters) |
| status | varchar | DEFAULT 'draft' | 'draft', 'submitted', 'returned', 'approved' |
| approved | boolean | DEFAULT false | Approval flag |
| approved_by | uuid | FK → users | Admin who approved |
| approved_at | timestamptz | | Approval timestamp |
| photos | jsonb | | Legacy photo references (deprecated, use progress_photos) |
| notes | text | | Additional notes |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `work_entries_pkey` on (id)
- `work_entries_project_id_idx` on (project_id)
- `work_entries_user_id_idx` on (user_id)
- `work_entries_status_idx` on (status)

**RLS**: Users see own entries; foremen see crew entries; admins see all (via service role).

---

#### `photos`
Photo attachments for work entries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Photo ID |
| project_id | uuid | FK → projects | Parent project |
| work_entry_id | uuid | FK → work_entries | Associated entry |
| filename | text | NOT NULL | Original filename |
| file_path | text | NOT NULL | Supabase Storage path |
| thumbnail_path | text | | Thumbnail path |
| caption | text | | Photo caption |
| location_point | jsonb | | GeoJSON point {lat, lng} |
| taken_at | timestamptz | | Photo timestamp (from EXIF) |
| taken_by | uuid | FK → users | User who took photo |
| photo_type | text | | 'before', 'after', 'progress', 'issue' |
| is_before_photo | boolean | DEFAULT false | Before photo flag |
| is_after_photo | boolean | DEFAULT false | After photo flag |
| quality_check_status | text | | Quality check status |
| created_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `photos_pkey` on (id)
- `photos_work_entry_id_idx` on (work_entry_id)
- `photos_project_id_idx` on (project_id)

**RLS**: Users see photos for entries they can access.

---

#### `activities`
Audit log for user actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Activity ID |
| user_id | uuid | NOT NULL, FK → users | User who performed action |
| project_id | uuid | FK → projects | Related project |
| activity_type | text | NOT NULL | Type of activity |
| object_type | text | | Type of object affected |
| object_id | uuid | | ID of affected object |
| action | text | NOT NULL | Action performed ('create', 'update', 'delete') |
| description | text | | Human-readable description |
| metadata | jsonb | | Additional context |
| ip_address | inet | | IP address |
| user_agent | text | | User agent string |
| created_at | timestamptz | DEFAULT now() | |

**Indexes**:
- `activities_pkey` on (id)
- `activities_user_id_idx` on (user_id)
- `activities_project_id_idx` on (project_id)
- `activities_created_at_idx` on (created_at)

**RLS**: Users cannot read audit log directly (admin-only via service role).

---

## New Tables Required

### `work_stages`
Configuration for work stage types with dynamic fields and checklists.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Stage ID |
| project_id | uuid | FK → projects | Parent project (null = global) |
| name | text | NOT NULL | Stage name (e.g., 'Trenching', 'Cable Installation') |
| description | text | | Stage description |
| order | integer | NOT NULL, DEFAULT 0 | Display order |
| is_active | boolean | NOT NULL, DEFAULT true | Stage active flag |
| required_fields | jsonb | NOT NULL, DEFAULT '[]' | Dynamic form fields (JSON array) |
| checklist_items | jsonb | NOT NULL, DEFAULT '[]' | Checklist items (JSON array) |
| required_photos | integer | NOT NULL, DEFAULT 0 | Minimum number of photos required |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**JSON Schema for `required_fields`**:
```json
[
  {
    "name": "meters_done",
    "type": "number",
    "label": "Meters Completed",
    "required": true,
    "min": 0.1,
    "max": 10000
  },
  {
    "name": "equipment_type",
    "type": "select",
    "label": "Equipment Used",
    "required": true,
    "options": ["Excavator", "Trencher", "Manual"]
  },
  {
    "name": "notes",
    "type": "textarea",
    "label": "Notes",
    "required": false,
    "maxLength": 500
  }
]
```

**JSON Schema for `checklist_items`**:
```json
[
  {
    "text": "Safety cones placed at both ends",
    "required": true,
    "order": 1
  },
  {
    "text": "Utility lines marked and verified",
    "required": true,
    "order": 2
  },
  {
    "text": "Weather conditions documented",
    "required": false,
    "order": 3
  }
]
```

**Indexes**:
- `work_stages_pkey` on (id)
- `work_stages_project_id_idx` on (project_id)
- `work_stages_order_idx` on (order)

**RLS**: Workers can read stages for assigned projects; admins can create/update.

**Migration SQL**:
```sql
CREATE TABLE work_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_photos integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX work_stages_project_id_idx ON work_stages(project_id);
CREATE INDEX work_stages_order_idx ON work_stages("order");

-- RLS Policies
ALTER TABLE work_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can read stages for assigned projects"
  ON work_stages FOR SELECT
  USING (
    project_id IS NULL OR
    project_id IN (
      SELECT p.id FROM projects p
      JOIN crews c ON c.project_id = p.id
      JOIN crew_members cm ON cm.crew_id = c.id
      WHERE cm.user_id = auth.uid() AND cm.is_active = true
    )
  );

CREATE POLICY "Admins can manage stages"
  ON work_stages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### `segment_work_entries`
Link table between segments and work_entries (many-to-many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Link ID |
| segment_id | uuid | NOT NULL, FK → segments | Segment |
| work_entry_id | uuid | NOT NULL, FK → work_entries | Work entry |
| work_stage_id | uuid | FK → work_stages | Work stage |
| meters_completed | numeric | NOT NULL, DEFAULT 0 | Meters completed in this entry |
| stage_data | jsonb | DEFAULT '{}' | Dynamic field values |
| checklist_completed | jsonb | DEFAULT '[]' | Checklist completion status |
| created_at | timestamptz | DEFAULT now() | |

**JSON Schema for `stage_data`**:
```json
{
  "meters_done": 50.5,
  "equipment_type": "Excavator",
  "notes": "Good weather conditions"
}
```

**JSON Schema for `checklist_completed`**:
```json
[
  {"order": 1, "checked": true},
  {"order": 2, "checked": true},
  {"order": 3, "checked": false}
]
```

**Indexes**:
- `segment_work_entries_pkey` on (id)
- `segment_work_entries_segment_id_idx` on (segment_id)
- `segment_work_entries_work_entry_id_idx` on (work_entry_id)
- `segment_work_entries_work_stage_id_idx` on (work_stage_id)

**RLS**: Users see links for work_entries they can access.

**Migration SQL**:
```sql
CREATE TABLE segment_work_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment_id uuid NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  work_entry_id uuid NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  work_stage_id uuid REFERENCES work_stages(id) ON DELETE SET NULL,
  meters_completed numeric NOT NULL DEFAULT 0,
  stage_data jsonb DEFAULT '{}'::jsonb,
  checklist_completed jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX segment_work_entries_segment_id_idx ON segment_work_entries(segment_id);
CREATE INDEX segment_work_entries_work_entry_id_idx ON segment_work_entries(work_entry_id);
CREATE INDEX segment_work_entries_work_stage_id_idx ON segment_work_entries(work_stage_id);

ALTER TABLE segment_work_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read segment work entries for accessible entries"
  ON segment_work_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_entries we
      WHERE we.id = work_entry_id AND we.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create segment work entries for own entries"
  ON segment_work_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_entries we
      WHERE we.id = work_entry_id AND we.user_id = auth.uid()
    )
  );
```

---

## Views

### `v_segment_progress`
Aggregated segment completion view.

```sql
CREATE OR REPLACE VIEW v_segment_progress AS
SELECT
  s.id AS segment_id,
  s.cabinet_id,
  s.code AS segment_code,
  s.length_planned_m,
  s.length_done_m AS length_completed_approved,
  COALESCE(SUM(swe.meters_completed) FILTER (WHERE we.status = 'submitted'), 0) AS length_pending_submitted,
  COALESCE(SUM(swe.meters_completed) FILTER (WHERE we.status = 'approved'), 0) AS length_approved,
  s.length_planned_m - COALESCE(SUM(swe.meters_completed) FILTER (WHERE we.status = 'approved'), 0) AS length_remaining,
  s.status,
  COUNT(DISTINCT we.id) FILTER (WHERE we.status = 'submitted') AS entries_pending,
  COUNT(DISTINCT we.id) FILTER (WHERE we.status = 'approved') AS entries_approved,
  COUNT(DISTINCT we.id) FILTER (WHERE we.status = 'returned') AS entries_returned
FROM segments s
LEFT JOIN segment_work_entries swe ON swe.segment_id = s.id
LEFT JOIN work_entries we ON we.id = swe.work_entry_id
GROUP BY s.id, s.cabinet_id, s.code, s.length_planned_m, s.length_done_m, s.status;
```

---

### `v_cabinet_progress`
Aggregated cabinet completion view.

```sql
CREATE OR REPLACE VIEW v_cabinet_progress AS
SELECT
  c.id AS cabinet_id,
  c.project_id,
  c.code AS cabinet_code,
  c.name,
  COUNT(DISTINCT s.id) AS total_segments,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') AS segments_completed,
  SUM(s.length_planned_m) AS total_length_planned,
  SUM(COALESCE(vsp.length_approved, 0)) AS total_length_approved,
  SUM(COALESCE(vsp.length_pending_submitted, 0)) AS total_length_pending,
  SUM(COALESCE(vsp.length_remaining, 0)) AS total_length_remaining,
  ROUND(
    (SUM(COALESCE(vsp.length_approved, 0)) / NULLIF(SUM(s.length_planned_m), 0) * 100)::numeric,
    2
  ) AS completion_percentage
FROM cabinets c
LEFT JOIN segments s ON s.cabinet_id = c.id
LEFT JOIN v_segment_progress vsp ON vsp.segment_id = s.id
GROUP BY c.id, c.project_id, c.code, c.name;
```

---

## Indexes for Performance

### Critical RLS Optimization Indexes

Based on research findings, these indexes are **critical** for RLS performance:

```sql
-- Index on users.id for auth.uid() lookups
CREATE INDEX IF NOT EXISTS users_id_idx ON users(id);

-- Index on crew_members for project assignment checks
CREATE INDEX IF NOT EXISTS crew_members_user_active_idx
  ON crew_members(user_id, crew_id) WHERE is_active = true;

-- Index on crews for project relationships
CREATE INDEX IF NOT EXISTS crews_project_leader_idx
  ON crews(project_id, leader_user_id);

-- Compound index for work_entries queries
CREATE INDEX IF NOT EXISTS work_entries_user_status_idx
  ON work_entries(user_id, status, created_at DESC);
```

---

## Storage Buckets

### `work-photos`
Bucket for storing work entry photos.

**Path Structure**: `{project_id}/{user_id}/{entry_id}/{photo_id}.jpg`

**RLS Policies**:
```sql
-- Users can upload photos to own entries
CREATE POLICY "Users can upload to own entries"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'work-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      JOIN crews c ON c.project_id = p.id
      JOIN crew_members cm ON cm.crew_id = c.id
      WHERE cm.user_id = auth.uid() AND cm.is_active = true
    )
  );

-- Users can read photos from own entries
CREATE POLICY "Users can read photos from accessible entries"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'work-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      JOIN crews c ON c.project_id = p.id
      JOIN crew_members cm ON cm.crew_id = c.id
      WHERE cm.user_id = auth.uid() AND cm.is_active = true
    )
  );
```

---

## Offline Sync Considerations

### Required for Offline-First

1. **Timestamp Columns**: All tables must have `updated_at` for Last-Write-Wins conflict resolution
2. **Soft Deletes**: Add `deleted_at timestamptz` to enable offline sync of deletions
3. **Sync Metadata**: Add `_modified` column for change tracking (handled by RxDB/PowerSync)

### Modifications for Existing Tables

```sql
-- Add soft delete support
ALTER TABLE work_entries ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Indexes for sync queries
CREATE INDEX work_entries_updated_at_idx ON work_entries(updated_at DESC);
CREATE INDEX photos_updated_at_idx ON photos(updated_at DESC);
```

---

## State Transitions

### Work Entry Status Flow

```
draft → submitted → { returned | approved }
          ↓              ↓
          ↓         [resubmit]
          ↓              ↓
          └──────────────┘
```

**State Rules**:
- `draft`: Worker can edit, not visible to admins
- `submitted`: Locked for editing, visible to admins
- `returned`: Worker can add corrections and resubmit
- `approved`: Permanently locked, read-only

---

## Summary

This data model:
- **Leverages existing schema** (11 tables used as-is)
- **Adds 2 new tables** (`work_stages`, `segment_work_entries`)
- **Creates 2 views** for progress aggregation
- **Implements RLS** on all user-facing tables
- **Supports offline sync** with proper timestamps
- **Optimizes for performance** with strategic indexes
- **Enables dynamic forms** via JSON configuration

All design decisions align with constitutional principles (offline-first, RLS enforcement, dynamic configuration).
