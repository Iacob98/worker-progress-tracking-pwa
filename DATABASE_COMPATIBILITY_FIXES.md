# Исправления совместимости с БД администратора

**Дата:** 2025-10-16
**Статус:** ✅ Базовые модели обновлены

## ✅ Выполненные изменения

### 1. Модели данных (`types/models.ts`)

#### Worker
- ✅ Добавлена роль `'crew'` (уже была)
- ✅ Обновлены комментарии с названиями полей в БД
- ✅ `skills` теперь `string[]` вместо `Record<string, any>`

#### Project
- ✅ Статусы: `'draft' | 'planning' | 'active' | 'waiting_invoice' | 'closed'`
- ✅ Удалены несуществующие поля (`completed_length_m`, `end_date`, `description`)
- ✅ Добавлены комментарии с названиями полей БД

#### Segment
- ✅ Статусы: `'open' | 'in_progress' | 'done'` (вместо pending/completed)
- ✅ Добавлены поля: `surface`, `area`, `depthReqM`, `widthReqM`, `geomLine`
- ✅ Удалены несуществующие: `code`, `lengthDoneM`, `createdAt`, `updatedAt`

#### WorkEntry - **КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ**
- ✅ **Удален workflow `status`** ('draft', 'submitted', etc.)
- ✅ Оставлен только `approved: boolean`
- ✅ Добавлен `stageCode: StageCode` вместо простого `workType`
- ✅ Поле `date` (date) вместо `startTime`/`endTime` (timestamp)
- ✅ Добавлены детальные поля:
  - `method: WorkMethod`
  - `widthM`, `depthM`, `cablesCount`
  - `hasProtectionPipe`, `soilType`
- ✅ Добавлены `cabinetId`, `cutId`, `houseId` для разных типов работ

#### Photo
- ✅ **Изменены названия полей**:
  - `url` вместо `filePath`
  - `ts` вместо `takenAt`
  - `gpsLat`/`gpsLon` вместо `latitude`/`longitude`
  - `authorUserId` вместо `takenBy`
- ✅ Добавлен `label: PhotoLabel` ('before' | 'during' | 'after' | 'instrument' | 'other')
- ✅ Удалены: `filename`, `thumbnailPath`, `photoType`, `locationPoint`

#### Crew & CrewMember
- ✅ `CrewMember` теперь использует `activeFrom`/`activeTo` (date) вместо `is_active` (boolean)
- ✅ Добавлен `roleInCrew: 'foreman' | 'operator' | 'worker'`
- ✅ `Crew.foremanUserId` вместо `leaderUserId`

#### Новые типы
- ✅ `StageCode` - 10 этапов работ (stage_1_marking, stage_2_excavation, etc.)
- ✅ `WorkMethod` - методы работы (mole, hand, excavator, trencher, documentation)
- ✅ `PhotoLabel` - метки фото
- ✅ `CrewRole` - роли в бригаде
- ✅ `StageDef` - определения этапов из БД

#### Удаленные модели
- ❌ `SegmentWorkEntry` - не используется в реальной БД
- ❌ `WorkStage` - заменен на `StageDef` из БД
- ❌ `DynamicField`, `ChecklistItem` - не используются в текущей схеме

### 2. Хуки (`lib/hooks/use-projects.ts`)

#### useProjects
- ✅ Фильтрация `crew_members` по `active_to` вместо `is_active`:
  ```typescript
  .or(`active_to.is.null,active_to.gte.${today}`, { foreignTable: 'crews.crew_members' })
  ```
- ✅ Статусы проектов: `['draft', 'planning', 'active']`

## ⚠️ Следующие шаги

### Критически важно для работы:

1. **Обновить хуки работы с work_entries** (`lib/hooks/use-work-entries.ts`):
   - ❌ Убрать все упоминания `status` workflow
   - ❌ Использовать только `approved` boolean
   - ❌ Изменить `startTime`/`endTime` на `date`
   - ❌ Добавить поддержку `stageCode`

2. **Обновить компоненты UI**:
   - ❌ `WorkEntryStatus` - убрать workflow, оставить только approve/reject
   - ❌ `WorkEntryList` - убрать статусы draft/submitted/returned
   - ❌ `WorkEntryDetail` - адаптировать под новые поля
   - ❌ `ProgressEntryForm` - форма для нового WorkEntry
   - ❌ `PhotoUpload` - использовать новые названия полей

3. **Обновить страницы**:
   - ❌ `/approvals` - упростить (только approved/not approved)
   - ❌ Удалить компоненты с workflow статусами

4. **Обновить offline DB** (`lib/offline/db.ts`):
   - ❌ Схема IndexedDB должна соответствовать новым моделям

## 📋 Новая логика работы

### Workflow работника:
1. **Выбор проекта** → `/projects`
2. **Выбор НВТ (Cabinet)** → `/projects/{id}` → список кабинетов
3. **Выбор/создание сегмента** → на НВТ список сегментов
4. **Создание work_entry по этапу**:
   - Выбрать `stageCode` (разметка, вскопка, и т.д.)
   - Указать `metersDoneM` - сколько метров сделано
   - Опционально: `method`, `widthM`, `depthM`, `cablesCount`, etc.
   - Приложить фото
   - Сохранить (не отправлять!)
5. **"Отправка" = просто approved: false**
   - Админ увидит все записи с `approved: false`
   - Утвердит → `approved: true`, `approvedBy`, `approvedAt`

### Нет промежуточных статусов!
- ❌ Нет 'draft'
- ❌ Нет 'submitted'
- ❌ Нет 'returned'
- ✅ Только `approved: boolean`

## 🎯 StageCode этапы (расширяемые)

```typescript
stage_1_marking      // Разметка
stage_2_excavation   // Вскопка
stage_3_conduit      // Прокладка трубы
stage_4_cable        // Прокладка кабеля
stage_5_splice       // Сплайсинг
stage_6_test         // Тестирование
stage_7_connect      // Подключение
stage_8_final        // Финальная проверка
stage_9_backfill     // Засыпка
stage_10_surface     // Восстановление покрытия
```

Эти этапы настраиваются администратором в таблице `stage_defs`.

## 📊 Связи в БД

```
Project (проект)
  ↓
Cabinet/NVТ (шкаф, точка раздачи)
  ↓
Segment (сегмент кабельной трассы, 100м)
  ↓
WorkEntry (запись о работе: 10м, stage_1_marking)
  ↓
Photo (фото работы)
```

## 🔗 Интеграция с админ приложением

### Через Supabase Realtime (будущее):
- Админ утверждает → worker получает уведомление
- Worker создает запись → админ видит в реальном времени

### Пока что:
- Worker создает `work_entry` с `approved: false`
- Админ видит в своем приложении
- Админ меняет `approved: true` + `approved_by` + `approved_at`
- Worker перезагружает → видит утвержденные записи

## ✅ Проверка совместимости

| Фича | Worker PWA | Admin DB | Статус |
|------|-----------|----------|--------|
| User role 'crew' | ✅ | ✅ | Совместимо |
| PIN авторизация | ✅ | ✅ | Совместимо |
| Crew members active dates | ✅ | ✅ | Исправлено |
| Project statuses | ✅ | ✅ | Исправлено |
| Segment statuses | ✅ | ✅ | Исправлено |
| WorkEntry approved | ✅ | ✅ | Исправлено |
| StageCode | ✅ | ✅ | Добавлено |
| Photo fields | ✅ | ✅ | Исправлено |
| Workflow status | ❌ | ❌ | Удален |

## 🚧 TODO

- [ ] Обновить `use-work-entries.ts`
- [ ] Удалить/переделать `WorkEntryStatus` компонент
- [ ] Упростить `/approvals` страницу
- [ ] Создать форму для нового WorkEntry с stageCode
- [ ] Обновить offline DB схему
- [ ] Добавить выбор Cabinet/Segment в UI
- [ ] Протестировать создание work_entry
- [ ] Протестировать утверждение в админке
