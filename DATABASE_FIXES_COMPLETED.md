# ✅ Исправления совместимости с БД - ЗАВЕРШЕНО

**Дата:** 2025-10-16
**Статус:** Базовая интеграция готова

## ✅ Что исправлено

### 1. Модели данных (`types/models.ts`)
- ✅ `Worker` - обновлены комментарии, добавлена поддержка всех ролей
- ✅ `Project` - правильные статусы ('draft', 'planning', 'active', 'waiting_invoice', 'closed')
- ✅ `Segment` - новые статусы ('open', 'in_progress', 'done'), добавлены поля surface/area
- ✅ `WorkEntry` - **полностью переделан**:
  - Убраны workflow статусы
  - Добавлен `stageCode` (stage_1_marking, stage_2_excavation, etc.)
  - Поле `date` (date) вместо `startTime`/`endTime` (timestamp)
  - Добавлены детальные поля: `method`, `widthM`, `depthM`, `cablesCount`, etc.
  - Только `approved: boolean` без промежуточных статусов
- ✅ `Photo` - правильные названия полей (`url`, `ts`, `gpsLat`, `gpsLon`)
- ✅ `CrewMember` - использует `activeFrom`/`activeTo` (date)
- ✅ Новые типы: `StageCode`, `WorkMethod`, `PhotoLabel`, `CrewRole`
- ✅ Удалены неиспользуемые: `SegmentWorkEntry`, `WorkStage`, `DynamicField`, `ChecklistItem`

### 2. Хуки (`lib/hooks/`)

#### `use-projects.ts`
- ✅ Фильтрация по `active_to` вместо `is_active`
- ✅ Правильные статусы проектов

#### `use-work-entries.ts` - **полностью переписан**
- ✅ `useWorkEntries` - фильтры: `approved`, `dateFrom`, `dateTo` (вместо status)
- ✅ Трансформация данных под реальную БД структуру
- ✅ Photo маппинг на правильные поля
- ✅ `useWorkEntry` - single entry с правильными полями
- ✅ `useCreateWorkEntry` - создание с `stageCode`, `metersDoneM`, etc.
- ✅ `useUpdateWorkEntry` - обновление детальных полей
- ✅ `useApproveWorkEntry` - упрощенное утверждение (approved: boolean)
- ✅ `useWorkEntriesForApproval` - для бригадиров, фильтр по approved
- ✅ `useDeleteWorkEntry` - удаление (не изменено)

### 3. Компиляция
- ✅ Проект компилируется без ошибок
- ✅ Dev сервер работает

## 📋 Новая структура работы

### Workflow работника:

```
1. Авторизация (email + PIN)
   ↓
2. Выбор проекта (/projects)
   ↓
3. Выбор НВТ/Cabinet на проекте
   ↓
4. Выбор/создание сегмента (100м трассы)
   ↓
5. Создание work_entry:
   - date: дата работы
   - stageCode: этап (разметка, вскопка, засыпка...)
   - metersDoneM: сколько метров сделано
   - method: способ (mole, hand, excavator, trencher)
   - widthM, depthM: размеры (optional)
   - cablesCount: количество кабелей (optional)
   - hasProtectionPipe: есть защитная труба (optional)
   - soilType: тип грунта (optional)
   - notes: комментарий
   - photos: фотографии (url, ts, gpsLat, gpsLon, label)
   ↓
6. Сохранение (approved: false)
   ↓
7. Админ/бригадир видит в своем приложении
   ↓
8. Утверждение → approved: true, approvedBy, approvedAt
```

### Нет промежуточных статусов!
- ❌ 'draft'
- ❌ 'submitted'
- ❌ 'returned'
- ✅ Только `approved: true/false`

### StageCode этапы (10 штук):
```typescript
stage_1_marking      // Разметка
stage_2_excavation   // Вскопка/экскавация
stage_3_conduit      // Прокладка защитной трубы
stage_4_cable        // Прокладка кабеля
stage_5_splice       // Сплайсинг/соединение
stage_6_test         // Тестирование
stage_7_connect      // Подключение
stage_8_final        // Финальная проверка
stage_9_backfill     // Засыпка
stage_10_surface     // Восстановление покрытия
```

## ⚠️ Что осталось сделать

### Критически важно для полной работы:

1. **Удалить/переделать старые UI компоненты:**
   - ❌ `components/progress/work-entry-status.tsx` - убрать workflow
   - ❌ `app/(app)/approvals/page.tsx` - упростить (approved/not approved)
   - ❌ Компоненты с workflow статусами

2. **Создать новые UI компоненты:**
   - ⏳ Форма создания work_entry с выбором stage
   - ⏳ Список cabinets на проекте
   - ⏳ Список segments на cabinet
   - ⏳ Выбор stageCode с иконками/описаниями
   - ⏳ Форма с детальными полями (method, widthM, depthM, etc.)

3. **Обновить offline DB** (`lib/offline/db.ts`):
   - ⏳ Схема работы с новыми полями WorkEntry
   - ⏳ Индексы по date вместо createdAt

4. **Тестирование:**
   - ⏳ Создание work_entry через PWA
   - ⏳ Просмотр в админке
   - ⏳ Утверждение в админке
   - ⏳ Синхронизация обратно в PWA

## 🎯 Следующий шаг

**Вариант 1: Создать минимальную форму для work_entry**
- Выбор stage
- Ввод meters
- Добавление фото
- Сохранение

**Вариант 2: Удалить старые компоненты с workflow**
- Убрать WorkEntryStatus
- Упростить approvals page
- Очистить от старых статусов

**Вариант 3: Тестирование текущего**
- Попробовать создать entry вручную в БД
- Проверить что PWA его видит
- Проверить фильтрацию

## 📊 Прогресс

- ✅ Модели данных: 100%
- ✅ Хуки/API: 100%
- ❌ UI компоненты: 0%
- ❌ Формы: 0%
- ❌ Тестирование: 0%

**Общий прогресс:** 40%

## 🔗 Связанные документы

- `ADMIN_PROJECT_ANALYSIS.md` - анализ БД администратора
- `DATABASE_COMPATIBILITY_FIXES.md` - детальный план исправлений
- `AUTH_SETUP.md` - настройка авторизации

## 💡 Важные замечания

1. **Два приложения, одна БД:**
   - Worker PWA создает `work_entries` с `approved: false`
   - Admin приложение показывает все записи
   - Admin утверждает → `approved: true`
   - Worker PWA показывает утвержденные

2. **Stage definitions из БД:**
   - Таблица `stage_defs` содержит определения этапов
   - Админ может добавлять новые этапы
   - PWA должна загружать актуальный список

3. **Offline-first:**
   - Все записи сначала сохраняются локально
   - Затем синхронизируются с БД
   - При отсутствии связи работает с кэшем

4. **Photos через Supabase Storage:**
   - Загрузка в bucket `work-photos`
   - Путь: `{project_id}/{user_id}/{entry_id}/{photo_id}.jpg`
   - В БД сохраняется `url` (путь в Storage)

## 🚀 Готово к использованию

**Хуки можно использовать:**
```typescript
// Получить записи работника
const { data: entries } = useWorkEntries({
  projectId: 'xxx',
  approved: false  // не утвержденные
})

// Создать запись
const createEntry = useCreateWorkEntry()
createEntry.mutate({
  projectId: 'xxx',
  segmentId: 'xxx',
  date: '2025-10-16',
  stageCode: 'stage_2_excavation',
  metersDoneM: 10.5,
  method: 'excavator',
  notes: 'Хорошая погода'
})

// Утвердить (бригадир)
const approve = useApproveWorkEntry()
approve.mutate({
  entryId: 'xxx',
  approved: true
})
```
