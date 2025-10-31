# Project Documents Feature - Technical Architecture

**Дата:** 2025-10-30
**Статус:** Design Phase
**Приоритет:** HIGH

---

## 📋 Требования

**Пользовательская история:**
> Как работник (worker), я хочу иметь доступ к документам проекта (планы, инструкции, схемы, сертификаты) для просмотра и скачивания, но БЕЗ возможности редактировать или удалять.

---

## 🗄️ Существующая Структура БД (Admin)

### 1. Таблица `documents`:

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_type TEXT,
  file_size BIGINT,
  document_type TEXT DEFAULT 'general',
  category_id UUID REFERENCES document_categories(id),
  description TEXT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Таблица `project_documents` (связь многие-ко-многим):

```sql
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  document_role TEXT DEFAULT 'reference',  -- Роль документа в проекте
  is_required BOOLEAN DEFAULT false,       -- Обязательный ли документ
  due_date DATE,                           -- Срок сдачи
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Таблица `document_categories`:

```sql
CREATE TABLE document_categories (
  id UUID PRIMARY KEY,
  code TEXT,                    -- WORK_INSTRUCTION, SAFETY_INSTRUCTION, etc.
  name_ru TEXT,                 -- Русское название
  name_en TEXT,                 -- Английское название
  name_de TEXT,                 -- Немецкое название
  category_type VARCHAR,        -- 'company' или 'legal'
  created_at TIMESTAMPTZ
);
```

**Существующие категории (16 штук):**

**Company documents:**
- `COMPANY_CERTIFICATE` - Внутренний сертификат
- `COMPANY_POLICY` - Политика компании
- `EMPLOYMENT_CONTRACT` - Трудовой договор
- `PERSONAL_DOCUMENT` - Личный документ
- `SAFETY_INSTRUCTION` - Инструкция по ТБ
- `TRAINING_MATERIAL` - Обучающий материал
- `WORK_INSTRUCTION` - Рабочая инструкция

**Legal documents:**
- `DRIVER_LICENSE` - Водительские права
- `HEALTH_INSURANCE` - Медицинская страховка
- `OTHER` - Другой документ
- `PASSPORT` - Паспорт
- `QUALIFICATION_CERT` - Квалификационное свидетельство
- `REGISTRATION_MELDEBESCHEINIGUNG` - Регистрационное свидетельство
- `RESIDENCE_PERMIT` - Вид на жительство
- `VISA` - Виза
- `WORK_PERMIT` - Разрешение на работу

### 4. Storage Bucket:

**Существующий:** `project-documents` (public bucket!)

**Важно:** Bucket публичный, поэтому RLS должен контролировать доступ на уровне таблиц!

### 5. Существующие RLS Policies:

```sql
-- Слишком открытые политики!
CREATE POLICY "Enable all operations for authenticated users"
ON public.documents
FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Enable all operations for authenticated users"
ON public.project_documents
FOR ALL
TO authenticated
USING (true);
```

**⚠️ Проблема:** Любой аутентифицированный пользователь может делать ВСЁ!

**✅ Решение:** Добавим read-only политики для workers.

---

## 🏗️ Архитектура Решения

### 1. Использование существующих таблиц

**НЕ создаем новые таблицы!** Используем:
- `documents` - основная таблица документов
- `project_documents` - связь с проектами
- `document_categories` - категории
- Storage bucket: `project-documents`

### 2. Модель данных для Worker PWA

```typescript
// types/models.ts

export interface ProjectDocument {
  id: string
  projectId: string
  filename: string
  originalFilename: string | null
  fileType: string | null
  fileSize: number | null
  documentType: string                    // 'general', 'plan', 'certificate', etc.
  categoryId: string | null
  categoryCode: string | null             // Из document_categories
  categoryName: string | null             // Русское название
  description: string | null
  uploadDate: string
  uploadedBy: string | null
  isActive: boolean
  documentRole: string | null             // Из project_documents
  isRequired: boolean                     // Из project_documents
  dueDate: string | null                  // Из project_documents
  createdAt: string
  updatedAt: string
}

export interface DocumentCategory {
  id: string
  code: string
  nameRu: string
  nameEn: string | null
  nameDe: string | null
  categoryType: 'company' | 'legal'
}
```

### 3. Query для получения документов проекта

```sql
SELECT
  d.id,
  d.project_id,
  d.filename,
  d.original_filename,
  d.file_type,
  d.file_size,
  d.document_type,
  d.category_id,
  d.description,
  d.upload_date,
  d.uploaded_by,
  d.is_active,
  d.created_at,
  d.updated_at,
  -- Из document_categories
  dc.code as category_code,
  dc.name_ru as category_name,
  dc.category_type,
  -- Из project_documents
  pd.document_role,
  pd.is_required,
  pd.due_date
FROM documents d
LEFT JOIN document_categories dc ON d.category_id = dc.id
INNER JOIN project_documents pd ON d.id = pd.document_id
WHERE pd.project_id = $1
  AND d.is_active = true
ORDER BY pd.is_required DESC, dc.code, d.created_at DESC;
```

### 4. Storage Path Structure

Пути в bucket `project-documents`:
```
project-documents/
  ├── {project_id}/
  │   ├── plans/
  │   │   └── site_plan_2025.pdf
  │   ├── instructions/
  │   │   └── work_instruction.pdf
  │   ├── certificates/
  │   │   └── company_cert.pdf
  │   └── other/
  │       └── misc_document.pdf
```

**⚠️ Важно:** Bucket PUBLIC, но доступ контролируется через RLS на таблицах!

---

## 🔐 RLS Policies (Read-Only для Workers)

### Миграция: `09_project_documents_readonly_rls.sql`

```sql
-- ========================================
-- READ-ONLY RLS для Workers
-- ========================================

-- 1. Обновить политику для documents
-- Workers могут ТОЛЬКО читать активные документы своих проектов
DROP POLICY IF EXISTS "documents_read_for_project_workers" ON public.documents;

CREATE POLICY "documents_read_for_project_workers"
ON public.documents
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    -- Проверяем что работник назначен на проект через crew
    SELECT 1
    FROM project_documents pd
    INNER JOIN crews c ON c.project_id = pd.project_id
    INNER JOIN crew_members cm ON cm.crew_id = c.id
    WHERE pd.document_id = documents.id
      AND cm.user_id = auth.uid()
      AND cm.active_to IS NULL  -- Активный член бригады
  )
);

-- 2. Обновить политику для project_documents
DROP POLICY IF EXISTS "project_documents_read_for_workers" ON public.project_documents;

CREATE POLICY "project_documents_read_for_workers"
ON public.project_documents
FOR SELECT
USING (
  EXISTS (
    -- Проверяем что работник назначен на проект
    SELECT 1
    FROM crews c
    INNER JOIN crew_members cm ON cm.crew_id = c.id
    WHERE c.project_id = project_documents.project_id
      AND cm.user_id = auth.uid()
      AND cm.active_to IS NULL
  )
);

-- 3. Политика для document_categories (читать могут все)
DROP POLICY IF EXISTS "document_categories_read_all" ON public.document_categories;

CREATE POLICY "document_categories_read_all"
ON public.document_categories
FOR SELECT
USING (true);  -- Категории - справочные данные
```

---

## 📱 UI/UX Design

### Page: `/projects/[projectId]/documents`

```
┌─────────────────────────────────────┐
│  📁 Документы проекта               │
│  [Назад к проекту]                  │
├─────────────────────────────────────┤
│  🔍 Поиск документов...             │
│                                     │
│  📁 Фильтр по категориям:           │
│  [Все] [Инструкции] [Планы]        │
│  [Сертификаты] [ТБ]                 │
├─────────────────────────────────────┤
│  📌 Обязательные документы (2)      │
├─────────────────────────────────────┤
│  📄 План участка                    │
│     План • 2.5 MB • Обязательно    │
│     [Просмотр] [Скачать]           │
├─────────────────────────────────────┤
│  📋 Инструкция по ТБ               │
│     Инструкция • 1.2 MB • Обязат.  │
│     [Просмотр] [Скачать]           │
├─────────────────────────────────────┤
│  📂 Справочные документы (5)        │
├─────────────────────────────────────┤
│  📜 Сертификат компании            │
│     Сертификат • 850 KB            │
│     [Просмотр] [Скачать]           │
└─────────────────────────────────────┘
```

**Features:**
- ✅ Разделение на обязательные и справочные
- ✅ Поиск по названию
- ✅ Фильтр по категориям
- ✅ Бейджи "Обязательно"
- ✅ Просмотр PDF/изображений
- ✅ Скачивание
- ✅ Offline кэширование

---

## 📁 File Structure

```
app/
  (app)/
    projects/
      [projectId]/
        documents/
          page.tsx          # Список документов проекта

components/
  project-documents/
    project-document-list.tsx
    project-document-card.tsx
    document-category-filter.tsx

lib/
  hooks/
    use-project-documents.ts
    use-document-categories.ts
  constants/
    project-document-types.ts

types/
  models.ts               # Добавить ProjectDocument interface
```

---

## 🔄 Data Flow

### Загрузка документов (Admin Panel - уже существует):

```
Admin Panel → Upload документ
          ↓
    INSERT INTO documents (...)
          ↓
    Upload в Storage (project-documents bucket)
          ↓
    INSERT INTO project_documents (
      project_id,
      document_id,
      document_role,
      is_required
    )
```

### Просмотр документов (Worker PWA - нужно создать):

```
Worker PWA → /projects/{id}/documents
          ↓
    useProjectDocuments(projectId) hook
          ↓
    Query с JOIN:
      documents
      + document_categories
      + project_documents
    WHERE project_id = $1
      AND worker в crew проекта (RLS)
          ↓
    Отображение списка
          ↓
    Worker нажимает "Скачать"
          ↓
    Fetch из Storage (public bucket)
```

---

## 🚀 Implementation Plan

### Phase 1: Database RLS (30 мин)
1. ⏳ Создать миграцию `09_project_documents_readonly_rls.sql`
2. ⏳ Добавить read-only политики для documents
3. ⏳ Добавить read-only политики для project_documents
4. ⏳ Добавить политику для document_categories
5. ⏳ Применить миграцию через MCP

### Phase 2: TypeScript Types (30 мин)
1. ⏳ Добавить `ProjectDocument` interface
2. ⏳ Добавить `DocumentCategory` interface
3. ⏳ Создать константы для категорий

### Phase 3: React Query Hooks (1 час)
1. ⏳ Создать `useProjectDocuments(projectId)` hook
2. ⏳ Создать `useDocumentCategories()` hook
3. ⏳ Создать `useDownloadProjectDocument()` hook
4. ⏳ Добавить offline caching

### Phase 4: UI Components (2 часа)
1. ⏳ Создать страницу `/projects/[projectId]/documents`
2. ⏳ Создать `ProjectDocumentList` component
3. ⏳ Создать `ProjectDocumentCard` component
4. ⏳ Создать `DocumentCategoryFilter` component
5. ⏳ Добавить navigation link на странице проекта

### Phase 5: Testing (30 мин)
1. ⏳ Тестировать RLS policies
2. ⏳ Тестировать offline mode
3. ⏳ Проверить UI/UX

**Total Estimated Time:** 4.5 часа

---

## 🔐 Security Considerations

1. **RLS Policies:** ✅ Workers могут ТОЛЬКО читать документы своих проектов
2. **No INSERT/UPDATE/DELETE:** ✅ Только SELECT для workers
3. **Crew Membership:** ✅ Доступ только если worker в active crew проекта
4. **Public Storage:** ⚠️ Bucket публичный, но URLs не раскрываются
5. **Active Documents Only:** ✅ Показываем только is_active = true

---

## 📊 Отличия от Worker Documents

| Параметр | Worker Documents | Project Documents |
|----------|------------------|-------------------|
| **Таблица** | `files` | `documents` + `project_documents` |
| **Bucket** | `worker-documents` (private) | `project-documents` (public) |
| **Владелец** | `user_id` | `project_id` |
| **Категории** | Hardcoded в коде | Из `document_categories` table |
| **Связь** | Прямая (user_id) | Через `project_documents` (many-to-many) |
| **Доступ** | Только свои | Через crew membership |
| **Upload** | Только Admin | Уже реализовано в Admin Panel |

---

## 📝 Ключевые моменты синхронизации

1. **Admin загружает документ** → INSERT в `documents` + `project_documents`
2. **Worker открывает проект** → Query с JOIN через `project_documents`
3. **RLS фильтрует** → Только документы проектов где worker в crew
4. **React Query кэширует** → IndexedDB для offline
5. **Worker скачивает** → Direct fetch из public bucket (no signed URLs needed!)

---

## ✅ Success Criteria

- [ ] Worker видит список документов своего проекта
- [ ] Отображаются категории из БД (не hardcoded)
- [ ] Обязательные документы выделены
- [ ] Можно фильтровать по категориям
- [ ] Можно искать по названию
- [ ] Можно скачать документ
- [ ] Можно просмотреть PDF
- [ ] Offline mode работает
- [ ] RLS защищает от доступа к чужим проектам
- [ ] Worker НЕ может редактировать/удалять

---

**Ready to implement?** 🚀
