# Быстрое исправление RLS проблемы

## Проблема

Worker PWA не может получить данные из таблиц:
- ❌ `houses` - "Error fetching houses: {}"
- ❌ `segments` - вероятно та же проблема
- ❌ `work_entries` - не сможет создать/прочитать отчеты
- ✅ `cabinets` - работает (уже есть политика)

## Причина

Row Level Security (RLS) включен на таблицах, но нет политик, разрешающих доступ работникам.

## Решение

### ⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ

Откройте **Supabase Dashboard → SQL Editor** и выполните весь файл:

📁 **`database/migrations/01_quick_fix_rls_existing_tables.sql`**

Или скопируйте этот SQL:

```sql
-- HOUSES TABLE
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "houses_allow_all_temp" ON public.houses;
CREATE POLICY "houses_allow_all_temp"
ON public.houses FOR ALL USING (true) WITH CHECK (true);

-- SEGMENTS TABLE
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "segments_allow_all_temp" ON public.segments;
CREATE POLICY "segments_allow_all_temp"
ON public.segments FOR ALL USING (true) WITH CHECK (true);

-- WORK_ENTRIES TABLE
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_entries_allow_all_temp" ON public.work_entries;
CREATE POLICY "work_entries_allow_all_temp"
ON public.work_entries FOR ALL USING (true) WITH CHECK (true);

-- PHOTOS TABLE
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "photos_allow_all_temp" ON public.photos;
CREATE POLICY "photos_allow_all_temp"
ON public.photos FOR ALL USING (true) WITH CHECK (true);
```

**После этого перезагрузите страницу в Worker PWA** - ошибка должна исчезнуть!

### 📋 Опционально: Создать таблицу stage_defs

Если хотите хранить определения этапов работы в БД (вместо hardcode в коде):

📁 **`database/migrations/02_create_stage_defs_table.sql`**

Это создаст таблицу со всеми 10 этапами работы и их настройками.

### 🔒 Для продакшена (БЕЗОПАСНО)

⚠️ **Внимание:** Полный скрипт `setup_rls_policies.sql` содержит безопасные политики на основе crew membership, но может потребовать доработки под вашу структуру данных.

Для продакшена рекомендуется:
1. Использовать временные политики для тестирования
2. Настроить правильную аутентификацию
3. Затем заменить на безопасные политики на основе ролей

## Проверка работы

После применения политик, проверьте в Worker PWA:

```javascript
// Откройте Console в браузере
// Должны увидеть данные вместо ошибок

// Дома для НВТ
const { data: houses } = useHouses(nvtId)
console.log('Houses:', houses)  // Должны быть данные

// Сегменты
const { data: segments } = useSegments(nvtId)
console.log('Segments:', segments)  // Должны быть данные

// Отчеты о работе
const { data: entries } = useWorkEntries({ projectId })
console.log('Work entries:', entries)  // Должны быть данные
```

## ⚠️ Важные замечания

### Про таблицу stage_defs

Если у вас **НЕТ** таблицы `stage_defs`:
- Это нормально! Этапы работы можно хранить в коде (как сейчас в `types/models.ts`)
- Опционально можете создать таблицу используя миграцию `02_create_stage_defs_table.sql`

### Удаление временных политик (в будущем)

Когда настроите безопасную аутентификацию:

```sql
-- Удалить временные политики
DROP POLICY IF EXISTS "houses_allow_all_temp" ON public.houses;
DROP POLICY IF EXISTS "segments_allow_all_temp" ON public.segments;
DROP POLICY IF EXISTS "work_entries_allow_all_temp" ON public.work_entries;
DROP POLICY IF EXISTS "photos_allow_all_temp" ON public.photos;

-- Создать безопасные политики на основе crew membership
-- (см. setup_rls_policies.sql для примеров)
```

## Что дальше?

После исправления RLS:

1. ✅ Проверить, что Worker PWA видит все данные
2. ✅ Проверить, что можно создавать work_entries
3. ✅ Проверить, что можно загружать фотографии
4. ⏳ Создать UI для работы с сегментами
5. ⏳ Создать UI для работы с домами
6. ⏳ Создать формы отчетности

См. подробности в: `docs/WORKER_REPORTING_WORKFLOW.md`
