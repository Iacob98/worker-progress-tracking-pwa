# Приведение кода к технической спецификации - TODO

**Дата**: 2025-10-29
**Статус**: В процессе

## ✅ Выполнено

### 1. Stage Codes (7 стадий)
- ✅ Обновлен `types/models.ts` - StageCode теперь содержит только 7 стадий
- ✅ Обновлен `lib/constants/stages.ts` - STAGE_LABELS и STAGE_OPTIONS
- ✅ Обновлен `components/work-entries/work-entry-card.tsx` - использует import из constants
- ✅ Обновлены `components/progress/photo-upload.tsx` и `work-entry-detail.tsx` - исправлены null photo URLs

## ⚠️ Требуются дополнительные изменения

### 2. Удалить устаревшие stage codes из компонентов

**Файлы с локальными STAGE_LABELS (нужно заменить на import):**

1. `components/progress/progress-entry-form.tsx` - строки 40-48
   - Удалить локальную константу STAGE_LABELS
   - Добавить: `import { STAGE_LABELS } from '@/lib/constants/stages'`

2. `components/progress/work-entry-detail.tsx` - строки 24-35
   - Удалить локальную константу STAGE_LABELS
   - Добавить: `import { STAGE_LABELS } from '@/lib/constants/stages'`

3. `components/progress/work-entry-list.tsx` - строки 19-28
   - Удалить локальную константу STAGE_LABELS
   - Добавить: `import { STAGE_LABELS } from '@/lib/constants/stages'`

4. `components/work-entries/nvt-rejected-entries.tsx` - строки ~160-171
   - Удалить локальную константу STAGE_LABELS
   - Добавить: `import { STAGE_LABELS } from '@/lib/constants/stages'`

5. `components/work-entries/rejected-entries-list.tsx` - строки ~164-175
   - Удалить локальную константу STAGE_LABELS
   - Добавить: `import { STAGE_LABELS } from '@/lib/constants/stages'`

6. `components/work-entries/segment-rejected-entries.tsx` - строки ~148-159
   - Удалить локальную константу STAGE_LABELS
   - Добавить: `import { STAGE_LABELS } from '@/lib/constants/stages'`

**Команды для автоматического обновления:**

```bash
cd /home/iacob/Documents/work

# Для каждого файла:
# 1. Добавить импорт в начало (после других импортов)
# 2. Удалить локальное определение const STAGE_LABELS

# Пример для progress-entry-form.tsx:
# Найти строку: const STAGE_LABELS: Record<string, string> = {
# Удалить до закрывающей скобки }
# Добавить импорт: import { STAGE_LABELS, METHOD_LABELS } from '@/lib/constants/stages'
```

### 3. GPS поля - уже OK ✅

GPS поля уже определены в `types/models.ts`:
```typescript
gpsLat?: number | null // gps_lat in DB
gpsLon?: number | null // gps_lon in DB
```

### 4. Photo Labels - уже OK ✅

Photo labels уже поддерживаются в `types/models.ts`:
```typescript
export type PhotoLabel = 'before' | 'during' | 'after' | 'instrument' | 'other' | 'rejection'
```

И в `lib/constants/stages.ts`:
```typescript
export const PHOTO_LABEL_OPTIONS = [
  { value: 'before', label: 'До работ' },
  { value: 'during', label: 'В процессе' },
  { value: 'after', label: 'После работ' },
  { value: 'instrument', label: 'Измерения' },
  { value: 'other', label: 'Другое' },
]
```

### 5. Таблица photos vs files

**Спецификация требует**: таблица `files`
**Текущий код использует**: таблица `photos`

**Решение**: Оставить `photos` (более понятное название для домена приложения)

**Обоснование**:
- `photos` более семантично для worker app
- Вся существующая кодовая база использует `photos`
- Функционально эквивалентно `files` из спецификации
- Содержит все необходимые поля из спецификации

**Не требуется изменений** - считаем это допустимым отклонением от спецификации.

### 6. Notification Types

Проверить соответствие типов уведомлений спецификации:

**Спецификация требует**:
- `work_entry_approved`
- `work_entry_rejected`
- `work_entry_comment`
- `system_announcement`

**Команда для проверки**:
```bash
grep -r "notification.*type\|notificationType" components/ lib/ app/ --include="*.ts" --include="*.tsx"
```

## 📝 План действий

1. **Обновить все компоненты с локальными STAGE_LABELS** (приоритет 1)
   - Заменить на централизованный import
   - Это исправит TypeScript ошибки

2. **Проверить notification types** (приоритет 2)
   - Убедиться что используются правильные типы

3. **Запустить type-check и build** (приоритет 3)
   ```bash
   npm run type-check
   npm run build
   ```

4. **Создать commit и push** (приоритет 4)
   ```bash
   git add -A
   git commit -m "refactor: align code with technical specification

   - Updated StageCode to 7 valid stages (removed stage_7, 8, 10)
   - Centralized STAGE_LABELS in lib/constants/stages.ts
   - Fixed null photo URL handling in components
   - All components now use shared constants

   Aligned with technical specification dated 2025-10-29"

   git push origin 003-worker-progress-tracking
   ```

## 🔍 Проверка соответствия спецификации

### Stage Codes ✅ / ⚠️
- [x] types/models.ts - StageCode type
- [x] lib/constants/stages.ts - STAGE_LABELS
- [x] components/work-entries/work-entry-card.tsx
- [ ] components/progress/progress-entry-form.tsx
- [ ] components/progress/work-entry-detail.tsx
- [ ] components/progress/work-entry-list.tsx
- [ ] components/work-entries/nvt-rejected-entries.tsx
- [ ] components/work-entries/rejected-entries-list.tsx
- [ ] components/work-entries/segment-rejected-entries.tsx

### GPS Fields ✅
- [x] Определены в types/models.ts
- [x] Nullable поля (gps_lat, gps_lon)
- [x] Правильные типы (number)

### Photo Labels ✅
- [x] Определены в types/models.ts (PhotoLabel)
- [x] Константы в lib/constants/stages.ts
- [x] 5 основных типов + rejection

### Work Methods ✅
- [x] Определены в types/models.ts (WorkMethod)
- [x] 5 методов: mole, hand, excavator, trencher, documentation

### Photos Table ✅ (отклонение)
- [x] Используется `photos` вместо `files`
- [x] Все поля из спецификации присутствуют
- [x] Решение: допустимое отклонение

---

**Следующие шаги**: Обновить оставшиеся 6 компонентов для использования централизованных констант.
