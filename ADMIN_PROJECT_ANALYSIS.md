# Анализ администраторского проекта Cometa

**Источник:** `/Volumes/T7/cometa/cometa-separated-projects/cometa-frontend-nextjs`
**Дата:** 2025-10-16

## 🔍 Основные выводы

### 1. Структура базы данных

#### Таблица `users`
```sql
CREATE TABLE public.users (
    id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    email text,
    lang_pref text,
    role text NOT NULL CHECK (role IN ('admin', 'pm', 'foreman', 'crew', 'viewer', 'worker')),
    is_active boolean NOT NULL,
    skills jsonb,
    pin_code text
);
```

**Роли:** `admin`, `pm`, `foreman`, `crew`, `viewer`, `worker`
✅ Роль `crew` существует и используется
✅ Поле `pin_code` есть в схеме

#### Таблица `crews`
```sql
CREATE TABLE public.crews (
    id uuid NOT NULL,
    project_id uuid,
    name text NOT NULL,
    foreman_user_id uuid,
    status text DEFAULT 'active',
    description text
);
```

**Важно:** `project_id` может быть NULL (глобальные бригады)

#### Таблица `crew_members`
```sql
CREATE TABLE public.crew_members (
    crew_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_in_crew text NOT NULL CHECK (role_in_crew IN ('foreman', 'operator', 'worker')),
    active_from date,
    active_to date
);
```

**Отличия от нашей модели:**
- ❌ Нет поля `is_active` (BOOLEAN)
- ✅ Вместо этого используются `active_from` и `active_to` (DATE)
- ✅ Есть `role_in_crew` (foreman | operator | worker)

#### Таблица `work_entries`
```sql
CREATE TABLE public.work_entries (
    id uuid NOT NULL,
    project_id uuid NOT NULL,
    cabinet_id uuid,
    segment_id uuid,
    cut_id uuid,
    house_id uuid,
    crew_id uuid,
    user_id uuid,
    date date NOT NULL,
    stage_code text NOT NULL,
    meters_done_m numeric(10,2) NOT NULL,
    method text CHECK (method IN ('mole', 'hand', 'excavator', 'trencher', 'documentation')),
    width_m numeric(6,3),
    depth_m numeric(6,3),
    cables_count integer,
    has_protection_pipe boolean,
    soil_type text,
    notes text,
    approved_by uuid,
    approved_at timestamp,
    approved boolean DEFAULT false
);
```

**Критические отличия:**
- ❌ Нет полей `status`, `start_time`, `end_time`
- ❌ Нет workflow статусов ('draft', 'submitted', 'returned', 'approved')
- ✅ Есть только `approved` (boolean) и `approved_by`/`approved_at`
- ✅ Используется `stage_code` вместо `work_type`
- ✅ Есть детальные поля: `method`, `width_m`, `depth_m`, `cables_count`, etc.

#### Таблица `photos`
```sql
CREATE TABLE public.photos (
    id uuid NOT NULL,
    work_entry_id uuid,
    cut_stage_id uuid,
    url text NOT NULL,
    ts timestamp NOT NULL,
    gps_lat numeric(10,6),
    gps_lon numeric(10,6),
    author_user_id uuid,
    label text CHECK (label IN ('before', 'during', 'after', 'instrument', 'other'))
);
```

**Отличия:**
- ✅ `url` вместо `file_path`
- ✅ `ts` вместо `taken_at`
- ✅ `gps_lat`/`gps_lon` вместо `latitude`/`longitude`
- ❌ Нет `thumbnail_path`, `filename`, `photo_type`

#### Таблица `segments`
```sql
CREATE TABLE public.segments (
    id uuid NOT NULL,
    cabinet_id uuid NOT NULL,
    name text,
    length_planned_m numeric(10,2) NOT NULL,
    surface text NOT NULL CHECK (surface IN ('asphalt', 'concrete', 'pavers', 'green')),
    area text NOT NULL CHECK (area IN ('roadway', 'sidewalk', 'driveway', 'green')),
    depth_req_m numeric(6,3),
    width_req_m numeric(6,3),
    geom_line jsonb,
    status text NOT NULL CHECK (status IN ('open', 'in_progress', 'done'))
);
```

**Отличия:**
- ❌ Нет полей `code`, `length_done_m`
- ❌ Статусы отличаются: 'open', 'in_progress', 'done' (вместо 'pending', 'in_progress', 'completed')
- ✅ Есть детальные поля `surface`, `area`, `depth_req_m`, `width_req_m`

#### Таблица `projects`
```sql
CREATE TABLE public.projects (
    id uuid NOT NULL,
    name text NOT NULL,
    customer text,
    city text,
    address text,
    contact_24h text,
    start_date date,
    end_date_plan date,
    status text NOT NULL CHECK (status IN ('draft', 'planning', 'active', 'waiting_invoice', 'closed')),
    total_length_m numeric(10,2) NOT NULL,
    base_rate_per_m numeric(12,2) NOT NULL,
    pm_user_id uuid,
    language_default text,
    approved boolean DEFAULT false
);
```

**Отличия:**
- ✅ Статусы более подробные: 'draft', 'planning', 'active', 'waiting_invoice', 'closed'
- ❌ Нет `completed_length_m`, `end_date`, `description`

### 2. Типы данных TypeScript (Admin)

```typescript
export type UserRole = 'admin' | 'pm' | 'foreman' | 'crew' | 'viewer' | 'worker';

export type StageCode =
  | 'stage_1_marking'
  | 'stage_2_excavation'
  | 'stage_3_conduit'
  | 'stage_4_cable'
  | 'stage_5_splice'
  | 'stage_6_test'
  | 'stage_7_connect'
  | 'stage_8_final'
  | 'stage_9_backfill'
  | 'stage_10_surface';

export type WorkMethod = 'mole' | 'hand' | 'excavator' | 'trencher' | 'documentation';
export type PhotoLabel = 'before' | 'during' | 'after' | 'instrument' | 'other';
export type SegmentSurface = 'asphalt' | 'concrete' | 'pavers' | 'green';
export type SegmentArea = 'roadway' | 'sidewalk' | 'driveway' | 'green';
export type SegmentStatus = 'open' | 'in_progress' | 'done';
```

## ⚠️ Критические несовместимости

### 1. Work Entries - Workflow статусы
**Проблема:** Worker PWA использует workflow ('draft', 'submitted', 'returned', 'approved'), но БД его не поддерживает.

**Решение:** Нужно добавить колонку `status` в `work_entries`:
```sql
ALTER TABLE work_entries
ADD COLUMN status text DEFAULT 'draft'
CHECK (status IN ('draft', 'submitted', 'returned', 'approved'));
```

### 2. Work Entries - Временные метки
**Проблема:** PWA использует `start_time` и `end_time` (timestamp), но в БД только `date`.

**Решение:** Добавить колонки:
```sql
ALTER TABLE work_entries
ADD COLUMN start_time timestamp,
ADD COLUMN end_time timestamp;
```

### 3. Crew Members - Active status
**Проблема:** PWA ищет `is_active` (boolean), но БД использует `active_from`/`active_to` (date).

**Решение:** Либо добавить `is_active`, либо изменить логику в PWA:
```typescript
// Вместо: .eq('crews.crew_members.is_active', true)
// Использовать:
.filter('crews.crew_members.active_to', 'is', null)
.or('crews.crew_members.active_to.gte', new Date().toISOString())
```

### 4. Segments - Status values
**Проблема:** Разные значения статусов:
- БД: 'open', 'in_progress', 'done'
- PWA: 'pending', 'in_progress', 'completed'

**Решение:** Унифицировать либо в PWA мапить значения

### 5. Photos - Field names
**Проблема:** Разные названия полей:
- БД: `url`, `ts`, `gps_lat`, `gps_lon`
- PWA: `file_path`, `taken_at`, `latitude`, `longitude`

**Решение:** Изменить PWA модели и трансформацию данных

## ✅ Рекомендации

### Немедленные изменения в Worker PWA:

1. **Обновить типы данных** в `/types/models.ts`:
   ```typescript
   export type SegmentStatus = 'open' | 'in_progress' | 'done' // вместо pending/completed
   export type WorkMethod = 'mole' | 'hand' | 'excavator' | 'trencher' | 'documentation'
   ```

2. **Изменить Photo модель**:
   ```typescript
   export interface Photo {
     id: string
     work_entry_id?: string
     url: string // вместо file_path
     ts: string // вместо taken_at
     gps_lat?: number // вместо latitude
     gps_lon?: number // вместо longitude
     author_user_id?: string
     label?: 'before' | 'during' | 'after' | 'instrument' | 'other'
   }
   ```

3. **Добавить маппинг для crew_members**:
   ```typescript
   // Проверять активность через даты
   const isActive = !member.active_to || new Date(member.active_to) >= new Date()
   ```

4. **Использовать stage_code вместо work_type**:
   ```typescript
   export type StageCode =
     | 'stage_1_marking'
     | 'stage_2_excavation'
     // ... и т.д.
   ```

### SQL миграции для БД (если можно менять):

```sql
-- 1. Добавить workflow статусы
ALTER TABLE work_entries
ADD COLUMN status text DEFAULT 'draft',
ADD CONSTRAINT check_work_entry_status
CHECK (status IN ('draft', 'submitted', 'returned', 'approved'));

-- 2. Добавить временные метки
ALTER TABLE work_entries
ADD COLUMN start_time timestamp,
ADD COLUMN end_time timestamp;

-- 3. Добавить is_active для упрощения
ALTER TABLE crew_members
ADD COLUMN is_active boolean GENERATED ALWAYS AS (
  active_to IS NULL OR active_to >= CURRENT_DATE
) STORED;

-- 4. Индексы для производительности
CREATE INDEX idx_crew_members_active ON crew_members(user_id)
WHERE active_to IS NULL OR active_to >= CURRENT_DATE;
```

## 📊 Совместимость с текущей реализацией

| Функция | Статус | Требует изменений |
|---------|--------|-------------------|
| Авторизация по PIN | ✅ Совместимо | Нет |
| Роль 'crew' | ✅ Совместимо | Нет |
| Фильтрация проектов по crew | ⚠️ Частично | Да (active_to вместо is_active) |
| Work entries workflow | ❌ Не совместимо | Да (нужна колонка status) |
| Segment статусы | ⚠️ Частично | Да (маппинг значений) |
| Photos | ⚠️ Частично | Да (названия полей) |
| Stage codes | ✅ Совместимо | Нет (но нужно использовать) |

## 🎯 План действий

1. **Фаза 1 - Критические изменения (сейчас):**
   - ✅ Исправить фильтрацию crew_members (использовать active_to)
   - ✅ Изменить Photo модель (url, ts, gps_lat/lon)
   - ✅ Изменить Segment статусы (open/in_progress/done)

2. **Фаза 2 - SQL миграции (координировать с админом):**
   - Добавить `status` в work_entries
   - Добавить `start_time`, `end_time` в work_entries
   - Опционально: добавить `is_active` в crew_members

3. **Фаза 3 - Улучшения:**
   - Использовать StageCode вместо simple work_type
   - Добавить WorkMethod в форму
   - Добавить детальные поля (width_m, depth_m, cables_count)

## 🔗 Файлы для изучения в админском проекте

- `/schema_full.sql` - Полная схема БД
- `/src/types/index.ts` - TypeScript типы
- `/src/lib/migrations/crew-assignment-constraints.sql` - Миграции crew
