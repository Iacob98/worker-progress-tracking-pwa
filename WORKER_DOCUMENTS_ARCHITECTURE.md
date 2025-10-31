# Worker Documents Feature - Technical Architecture

**Дата:** 2025-10-30
**Статус:** Design Phase
**Приоритет:** HIGH

---

## 📋 Требования

**Пользовательская история:**
> Как работник (worker), я хочу иметь доступ к своим личным документам (договоры, инструкции, сертификаты) для просмотра и скачивания через мобильное PWA приложение.

---

## 🗄️ Существующая Структура БД

### Таблица `files` (уже существует):

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR NOT NULL,              -- Имя файла в storage
  original_filename VARCHAR NOT NULL,     -- Оригинальное имя файла
  file_size BIGINT NOT NULL,              -- Размер в байтах
  mime_type VARCHAR NOT NULL,             -- MIME тип
  bucket_name VARCHAR NOT NULL,           -- Storage bucket
  file_path TEXT NOT NULL,                -- Путь к файлу в bucket
  file_url TEXT,                          -- Public URL (если bucket публичный)
  project_id UUID REFERENCES projects(id), -- Связь с проектом (nullable)
  user_id UUID REFERENCES users(id),      -- ✅ Связь с работником
  work_entry_id UUID REFERENCES work_entries(id), -- Связь с work entry
  category VARCHAR DEFAULT 'general',     -- ✅ Категория документа
  title VARCHAR,                          -- ✅ Название документа
  description TEXT,                       -- ✅ Описание
  metadata JSONB DEFAULT '{}',            -- Доп. метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**✅ Вывод:** Таблица `files` подходит для хранения личных документов работников!

### Storage Buckets:

Существующие buckets:
- `user-avatars` (public) - Аватары пользователей
- `work-photos` (public) - Рабочие фотографии
- `project-documents` (public) - Документы проектов
- `house-documents` (public) - Документы домов
- `reports` (private) - Отчеты
- `vehicle-documents` (private) - Документы транспорта

**Рекомендация:** Создать новый bucket `worker-documents` (private)

---

## 🏗️ Архитектура Решения

### 1. Storage Bucket

**Создать:** `worker-documents` bucket
- **Visibility:** Private (доступ только через RLS)
- **Path structure:** `{user_id}/{category}/{filename}`
- **Allowed MIME types:**
  - PDF: `application/pdf`
  - Images: `image/jpeg`, `image/png`, `image/webp`
  - Documents: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Spreadsheets: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Max file size:** 10 MB

### 2. Категории Документов

```typescript
export type WorkerDocumentCategory =
  | 'contract'        // Договор
  | 'certificate'     // Сертификат
  | 'instruction'     // Инструкция
  | 'policy'          // Политика компании
  | 'safety'          // Техника безопасности
  | 'training'        // Обучающие материалы
  | 'personal'        // Личные документы
  | 'other'           // Прочее
```

### 3. TypeScript Types

```typescript
// types/models.ts

export type WorkerDocumentCategory =
  | 'contract'
  | 'certificate'
  | 'instruction'
  | 'policy'
  | 'safety'
  | 'training'
  | 'personal'
  | 'other'

export interface WorkerDocument {
  id: string
  userId: string                        // Владелец документа
  filename: string                      // worker_123_contract.pdf
  originalFilename: string              // Трудовой_договор.pdf
  fileSize: number                      // В байтах
  mimeType: string                      // application/pdf
  bucketName: string                    // worker-documents
  filePath: string                      // {user_id}/contract/file.pdf
  fileUrl?: string | null               // Public URL (если нужно)
  category: WorkerDocumentCategory      // contract
  title: string                         // Трудовой договор
  description?: string | null           // Описание документа
  metadata?: Record<string, any>        // Доп. данные (версия, дата истечения, etc.)
  createdAt: string
  updatedAt: string
}

export interface WorkerDocumentUploadRequest {
  file: File
  category: WorkerDocumentCategory
  title: string
  description?: string
}
```

### 4. Database Schema Updates

**Индекс для быстрого поиска:**

```sql
-- Создать индекс для быстрого поиска документов по user_id
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)
WHERE user_id IS NOT NULL;

-- Индекс для фильтрации по категории
CREATE INDEX IF NOT EXISTS idx_files_user_category ON files(user_id, category)
WHERE user_id IS NOT NULL;
```

### 5. RLS Policies

```sql
-- ========================================
-- RLS POLICIES FOR WORKER DOCUMENTS
-- ========================================

-- Workers can read their own documents
CREATE POLICY "files_read_own_documents"
ON public.files
FOR SELECT
USING (
  user_id = auth.uid()
  AND bucket_name = 'worker-documents'
);

-- Admin can read all worker documents
CREATE POLICY "files_read_all_worker_documents_admin"
ON public.files
FOR SELECT
USING (
  bucket_name = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'pm')
  )
);

-- Workers can download their own documents
-- (Handled by Storage RLS policies)

-- Only admin can upload/delete worker documents
CREATE POLICY "files_insert_worker_documents_admin"
ON public.files
FOR INSERT
WITH CHECK (
  bucket_name = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

CREATE POLICY "files_delete_worker_documents_admin"
ON public.files
FOR DELETE
USING (
  bucket_name = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);
```

**Storage RLS Policies:**

```sql
-- Storage: Workers can read their own documents
CREATE POLICY "worker_documents_read_own"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'worker-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage: Only admin can upload
CREATE POLICY "worker_documents_insert_admin"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);

-- Storage: Only admin can delete
CREATE POLICY "worker_documents_delete_admin"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'worker-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
);
```

---

## 🎨 UI/UX Design

### Page: `/documents`

**Layout:**
```
┌─────────────────────────────────────┐
│  📄 Мои Документы                   │
├─────────────────────────────────────┤
│  🔍 Поиск документов...             │
│                                     │
│  📁 Категории:                      │
│  [Все] [Договоры] [Сертификаты]    │
│  [Инструкции] [Безопасность]       │
├─────────────────────────────────────┤
│  📄 Трудовой договор               │
│     Договор • 1.2 MB • 15.08.2025  │
│     [Просмотр] [Скачать]           │
├─────────────────────────────────────┤
│  📜 Сертификат электрика           │
│     Сертификат • 850 KB • 10.05... │
│     [Просмотр] [Скачать]           │
├─────────────────────────────────────┤
│  📋 Инструкция по ТБ               │
│     Инструкция • 2.5 MB • 01.09... │
│     [Просмотр] [Скачать]           │
└─────────────────────────────────────┘
```

**Features:**
- ✅ Просмотр списка документов
- ✅ Фильтрация по категориям
- ✅ Поиск по названию
- ✅ Скачивание документов
- ✅ Превью для PDF (опционально)
- ✅ Offline кэширование (через Service Worker)
- ✅ Pull-to-refresh для обновления списка

---

## 📁 File Structure

```
app/
  documents/                    # Новая страница
    page.tsx                    # Список документов
    [id]/
      page.tsx                  # Детальный просмотр документа

components/
  documents/
    document-list.tsx           # Список документов
    document-card.tsx           # Карточка документа
    document-viewer.tsx         # Просмотр PDF/изображений
    document-category-filter.tsx # Фильтр по категориям

lib/
  hooks/
    use-worker-documents.ts     # React Query hooks
  constants/
    document-categories.ts      # Категории и labels

types/
  models.ts                     # Добавить WorkerDocument interface
```

---

## 🔄 Data Flow

### Загрузка документов (Admin Panel):

```
Admin Panel → Upload → Supabase Storage (worker-documents)
                    ↓
                Insert record в files table
                    ↓
              Set user_id, category, title
```

### Просмотр документов (Worker PWA):

```
Worker PWA → useWorkerDocuments() hook
                    ↓
          Supabase query: SELECT * FROM files
          WHERE user_id = current_user.id
          AND bucket_name = 'worker-documents'
                    ↓
          Display in DocumentList component
                    ↓
          User clicks "Скачать"
                    ↓
          Supabase Storage: Download file
          (RLS checks user owns document)
```

---

## 🚀 Implementation Plan

### Phase 1: Database Setup (1 час)
1. ✅ Проверить структуру `files` table
2. ⏳ Создать Storage bucket `worker-documents`
3. ⏳ Создать индексы для оптимизации
4. ⏳ Настроить RLS policies для `files` table
5. ⏳ Настроить Storage RLS policies

### Phase 2: TypeScript Types (30 мин)
1. ⏳ Добавить `WorkerDocument` interface в `types/models.ts`
2. ⏳ Добавить `WorkerDocumentCategory` type
3. ⏳ Создать константы категорий в `lib/constants/`
4. ⏳ Обновить `Database` type

### Phase 3: React Query Hooks (1 час)
1. ⏳ Создать `useWorkerDocuments()` hook
2. ⏳ Создать `useDownloadDocument()` hook
3. ⏳ Добавить offline caching через IndexedDB

### Phase 4: UI Components (2-3 часа)
1. ⏳ Создать страницу `/documents`
2. ⏳ Создать `DocumentList` component
3. ⏳ Создать `DocumentCard` component
4. ⏳ Создать `DocumentCategoryFilter` component
5. ⏳ Создать `DocumentViewer` component (optional)
6. ⏳ Добавить navigation link в sidebar

### Phase 5: Testing & Polish (1 час)
1. ⏳ Тестировать download functionality
2. ⏳ Тестировать RLS policies
3. ⏳ Проверить offline mode
4. ⏳ Оптимизация UI/UX

**Total Estimated Time:** 5.5 - 6.5 часов

---

## 🔐 Security Considerations

1. **RLS Policies:** ✅ Workers могут видеть только свои документы
2. **Storage Access:** ✅ Private bucket с RLS
3. **Admin Only Upload:** ✅ Только админ может загружать документы
4. **File Validation:** ✅ Проверка MIME type и размера
5. **Audit Log:** 💡 Рассмотреть логирование скачиваний

---

## 📊 Success Metrics

- ✅ Worker может видеть список своих документов
- ✅ Worker может скачать документы
- ✅ Документы кэшируются для offline доступа
- ✅ RLS защищает от несанкционированного доступа
- ✅ UI интуитивно понятный и быстрый

---

## 🎯 Next Steps

1. Создать Storage bucket `worker-documents`
2. Применить RLS policies через миграцию
3. Добавить TypeScript types
4. Создать React Query hooks
5. Реализовать UI компоненты
6. Тестирование

**Ready to implement?** 🚀
