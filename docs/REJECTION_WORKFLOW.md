# Workflow отклонения работ (Rejection Workflow)

**Дата:** 2025-10-21
**Статус:** ✅ Реализовано

---

## 📋 Обзор

Добавлен функционал отклонения работ менеджером/администратором с возможностью исправления и повторной отправки работником.

---

## 🗄️ База данных

### Новые поля в `work_entries`:

```sql
ALTER TABLE work_entries ADD COLUMN rejection_reason TEXT;
ALTER TABLE work_entries ADD COLUMN rejected_by UUID REFERENCES users(id);
ALTER TABLE work_entries ADD COLUMN rejected_at TIMESTAMPTZ;
```

**Миграция:** [database/migrations/04_add_rejection_fields.sql](../database/migrations/04_add_rejection_fields.sql)

### Индексы:

```sql
CREATE INDEX idx_work_entries_rejected_at ON work_entries(rejected_at)
  WHERE rejected_at IS NOT NULL;

CREATE INDEX idx_work_entries_rejected_by ON work_entries(rejected_by)
  WHERE rejected_by IS NOT NULL;
```

---

## 🔄 Workflow

### 1. Работник создает работу

```
Worker PWA → work_entry создается с:
  approved: false
  rejected_at: null
  rejection_reason: null
```

### 2. Менеджер отклоняет работу (Admin Frontend)

```
Admin Frontend → POST /api/work-entries/[id]/reject
Body: { rejectionReason: "Причина отклонения (минимум 10 символов)" }

Database UPDATE:
  approved: false
  rejected_at: NOW()
  rejected_by: current_user_id
  rejection_reason: "Причина..."
```

### 3. Работник видит отклонение (Worker PWA)

**Красный alert вверху страницы:**
```tsx
<RejectedEntriesList projectId={projectId} userId={userId} />
```

Показывает:
- ❌ Красная карточка с причиной отклонения
- 📅 Дата и время отклонения
- ✏️ Кнопка "Исправить"

### 4. Работник исправляет и переотправляет

```
Worker PWA → /work-entries/[id]/edit
  - Редактирование полей
  - Добавление/удаление фото
  - Изменение notes

При сохранении:
  rejected_at: null
  rejection_reason: null
  approved: false (ожидает повторного утверждения)
```

### 5. Менеджер утверждает (Admin Frontend)

```
Admin Frontend → POST /api/work-entries/[id]/approve

Database UPDATE:
  approved: true
  approved_at: NOW()
  approved_by: current_user_id
  rejected_at: null (очищается)
  rejection_reason: null (очищается)
```

---

## 🎨 UI Компоненты

### 1. `<RejectionAlert />`

**Файл:** [components/work-entries/rejection-alert.tsx](../components/work-entries/rejection-alert.tsx)

Красный alert с причиной отклонения на странице деталей работы:

```tsx
import { RejectionAlert } from '@/components/work-entries/rejection-alert'

<RejectionAlert entry={workEntry} />
```

**Отображение:**
```
┌─────────────────────────────────────────┐
│ ❌ Работа отклонена                     │
│                                          │
│ Причина: Недостаточно фотографий        │
│ Отклонено: 21.10.2025 14:30            │
│                                          │
│ Пожалуйста, исправьте замечания и       │
│ отправьте работу повторно.              │
└─────────────────────────────────────────┘
```

### 2. `<RejectedEntriesList />`

**Файл:** [components/work-entries/rejected-entries-list.tsx](../components/work-entries/rejected-entries-list.tsx)

Список отклоненных работ вверху страницы проекта:

```tsx
import { RejectedEntriesList } from '@/components/work-entries/rejected-entries-list'

<RejectedEntriesList projectId={projectId} userId={userId} />
```

**Отображение:**
```
┌───────────────────────────────────────────────────┐
│ ❌ Отклоненные работы (3)                        │
│ Требуется исправление и повторная отправка        │
├───────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐    │
│ │ ОТКЛОНЕНО  21.10 14:30                    │    │
│ │ 📅 20.10.2025  📏 15 м                   │    │
│ │ Вскопка/Экскавация                        │    │
│ │                                           │ ✏️ │
│ │ Причина отклонения:                       │    │
│ │ Недостаточно фотографий процесса работы   │    │
│ └───────────────────────────────────────────┘    │
└───────────────────────────────────────────────────┘
```

---

## 🔧 API Hooks

### `useRejectedEntries()`

**Файл:** [lib/hooks/use-rejected-entries.ts](../lib/hooks/use-rejected-entries.ts)

Hook для получения списка отклоненных работ:

```typescript
import { useRejectedEntries } from '@/lib/hooks/use-rejected-entries'

const { data: rejectedEntries, isLoading } = useRejectedEntries({
  projectId: 'project-123',
  userId: 'user-456' // optional
})
```

**Возвращает:**
- `WorkEntry[]` отсортированные по `rejectedAt` (новые первые)
- Работает offline (IndexedDB cache)
- Auto-refresh каждые 5 минут

---

## 📊 TypeScript Types

### WorkEntry с полями отклонения:

```typescript
export interface WorkEntry {
  // ... existing fields ...

  // Approval fields
  approved: boolean
  approvedBy?: string | null
  approvedAt?: string | null

  // Rejection fields (NEW)
  rejectionReason?: string | null
  rejectedBy?: string | null
  rejectedAt?: string | null
}
```

### Database types:

```typescript
work_entries: {
  Row: {
    // ... existing fields ...

    approved: boolean
    approved_by: string | null
    approved_at: string | null

    rejection_reason: string | null  // NEW
    rejected_by: string | null       // NEW
    rejected_at: string | null       // NEW
  }
}
```

---

## 🔄 Data Transformation

### camelCase ↔ snake_case

**Файл:** [lib/utils/transform.ts](../lib/utils/transform.ts)

```typescript
// Worker PWA (camelCase) → Database (snake_case)
transformWorkEntryToDb(entry) {
  return {
    // ... existing fields ...
    rejection_reason: entry.rejectionReason,
    rejected_by: entry.rejectedBy,
    rejected_at: entry.rejectedAt,
  }
}

// Database (snake_case) → Worker PWA (camelCase)
transformWorkEntryFromDb(data) {
  return {
    // ... existing fields ...
    rejectionReason: data.rejection_reason,
    rejectedBy: data.rejected_by,
    rejectedAt: data.rejected_at,
  }
}
```

---

## 💾 Offline Support (IndexedDB)

### Dexie DB Version 3:

**Файл:** [lib/offline/db.ts](../lib/offline/db.ts)

```typescript
this.version(3).stores({
  work_entries: 'id, projectId, userId, segmentId, approved, rejectedAt, date'
})
```

**Новый индекс:** `rejectedAt` для быстрой фильтрации отклоненных работ offline.

---

## 📝 Статусы работы

### Возможные комбинации:

| approved | rejectedAt | Статус                        | Описание                                    |
|----------|------------|-------------------------------|---------------------------------------------|
| false    | null       | ⏳ Ожидает утверждения       | Новая работа, еще не проверена              |
| false    | NOT NULL   | ❌ Отклонено                  | Работа отклонена, требует исправления       |
| true     | null       | ✅ Утверждено                 | Работа утверждена менеджером                |

**Примечание:** `approved = true` и `rejectedAt != null` невозможно по логике.

---

## 🎯 Примеры использования

### Показать список отклоненных работ на главной странице проекта:

```tsx
// app/(app)/projects/[projectId]/page.tsx
import { RejectedEntriesList } from '@/components/work-entries/rejected-entries-list'

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const { worker } = useAuth()

  return (
    <div>
      {/* Отклоненные работы вверху (красные) */}
      <RejectedEntriesList
        projectId={params.projectId}
        userId={worker?.id!}
      />

      {/* Остальной контент проекта */}
      {/* ... */}
    </div>
  )
}
```

### Показать alert на странице деталей работы:

```tsx
// app/(app)/work-entries/[id]/page.tsx
import { RejectionAlert } from '@/components/work-entries/rejection-alert'

export default function WorkEntryDetailPage({ params }: { params: { id: string } }) {
  const { data: entry } = useWorkEntry(params.id)

  if (!entry) return <div>Loading...</div>

  return (
    <div>
      {/* Красный alert если работа отклонена */}
      <RejectionAlert entry={entry} />

      {/* Детали работы */}
      {/* ... */}
    </div>
  )
}
```

### Фильтр только отклоненных работ:

```tsx
import { useRejectedEntries } from '@/lib/hooks/use-rejected-entries'

const { data: rejectedEntries } = useRejectedEntries({
  projectId: 'project-123'
})

// rejectedEntries содержит только записи с rejectedAt != null
```

---

## 🔗 Интеграция с Admin Frontend

Admin Frontend должен реализовать API endpoints:

### POST `/api/work-entries/[id]/reject`

```typescript
// Request
{
  rejectionReason: string // минимум 10 символов
}

// Response
{
  success: true,
  entry: {
    id: string,
    rejected_at: string,
    rejected_by: string,
    rejection_reason: string
  }
}
```

### POST `/api/work-entries/[id]/approve`

```typescript
// Response
{
  success: true,
  entry: {
    id: string,
    approved: true,
    approved_at: string,
    approved_by: string,
    rejected_at: null,        // очищается
    rejection_reason: null    // очищается
  }
}
```

---

## ✅ Checklist реализации

- [x] Миграция БД: добавлены поля `rejection_reason`, `rejected_by`, `rejected_at`
- [x] TypeScript типы: обновлены `Database` и `WorkEntry`
- [x] Трансформация данных: добавлены rejection поля в `transform.ts`
- [x] IndexedDB: добавлен индекс `rejectedAt` (version 3)
- [x] UI компонент: `<RejectionAlert />` (красный alert)
- [x] UI компонент: `<RejectedEntriesList />` (список отклоненных работ)
- [x] Hook: `useRejectedEntries()` для получения отклоненных работ
- [ ] Форма редактирования: `/work-entries/[id]/edit` (требуется создание)
- [ ] Admin Frontend: API endpoints `/reject` и `/approve`

---

## 📸 Screenshots (примеры)

### Красный alert с причиной отклонения:
```
┌─────────────────────────────────────────┐
│ ⚠️  Работа отклонена                    │
│                                          │
│ Причина: Фотографии нечеткие, сделайте  │
│ повторно в хорошем освещении            │
│                                          │
│ Отклонено: 21.10.2025 14:30            │
│                                          │
│ Пожалуйста, исправьте замечания и       │
│ отправьте работу повторно.              │
└─────────────────────────────────────────┘
```

### Список отклоненных работ:
```
┌───────────────────────────────────────────┐
│ ❌ Отклоненные работы (2)                │
│ Требуется исправление                     │
├───────────────────────────────────────────┤
│ [ОТКЛОНЕНО] 20.10 | 15м | Вскопка   [✏️] │
│ Причина: Недостаточно фотографий          │
├───────────────────────────────────────────┤
│ [ОТКЛОНЕНО] 19.10 | 8м | Разметка    [✏️] │
│ Причина: Неправильная глубина траншеи     │
└───────────────────────────────────────────┘
```

---

## 🚀 Готово к использованию

**Реализовано:**
- ✅ База данных с полями отклонения
- ✅ TypeScript типы
- ✅ Трансформация данных (camelCase ↔ snake_case)
- ✅ Offline поддержка (IndexedDB)
- ✅ UI компоненты (RejectionAlert, RejectedEntriesList)
- ✅ React hooks (useRejectedEntries)

**Требуется от Admin Frontend:**
- ⏳ API endpoint: `POST /api/work-entries/[id]/reject`
- ⏳ API endpoint: `POST /api/work-entries/[id]/approve`
- ⏳ UI: Кнопки Approve/Reject на странице деталей работы
- ⏳ UI: Диалог с формой для ввода причины отклонения

**Требуется от Worker PWA:**
- ⏳ Форма редактирования работы: `/work-entries/[id]/edit`
- ⏳ Интеграция `<RejectedEntriesList />` на главную страницу проекта
- ⏳ Интеграция `<RejectionAlert />` на страницу деталей работы

---

**Документация обновлена:** 2025-10-21
**Версия:** 1.0
