# Типы грунта / Surface Types Reference

## Overview

Система поддерживает два уровня классификации грунта:

1. **Project Soil Types** (`project_soil_types`) - типы грунта на уровне проекта с ценообразованием
2. **Work Entry Soil Type** (`work_entries.soil_type`) - тип грунта для конкретного отчета о работе
3. **Segment Surface** (`segments.surface`) - тип покрытия сегмента (планируется)

---

## 1. Project Soil Types (Типы грунта проекта)

**Таблица**: `project_soil_types`
**Назначение**: Определение типов грунта для проекта с ценами и количеством

### Поля:
- `soil_type_name` - название типа грунта (текст, произвольный)
- `price_per_meter` - цена за метр
- `quantity_meters` - количество метров
- `notes` - примечания

### Существующие значения:
- `Asphalt (Асфальт)` - 3 проекта
- `Soil (Земля)` - 2 проекта
- `Paving Stone (Брусчатка)` - 1 проект

### API Endpoints:
```
GET    /api/projects/[id]/soil-types
POST   /api/projects/[id]/soil-types
PUT    /api/projects/[id]/soil-types?soil_type_id=...
DELETE /api/projects/[id]/soil-types?soil_type_id=...
```

---

## 2. Work Entry Soil Type (Тип грунта в отчете)

**Таблица**: `work_entries`
**Поле**: `soil_type` (TEXT, optional)

### Назначение:
Тип грунта, с которым работала бригада при выполнении конкретного этапа работ.

### Текущее состояние:
⚠️ **Поле существует в БД, но UI для выбора НЕ реализован**

### Рекомендуемые значения (код):
```typescript
export const SOIL_TYPE_OPTIONS = [
  { value: 'asphalt', label: 'Асфальт', labelRu: 'Асфальт', labelEn: 'Asphalt' },
  { value: 'concrete', label: 'Бетон', labelRu: 'Бетон', labelEn: 'Concrete' },
  { value: 'pavers', label: 'Брусчатка', labelRu: 'Брусчатка', labelEn: 'Paving Stones' },
  { value: 'gravel', label: 'Щебень', labelRu: 'Щебень', labelEn: 'Gravel' },
  { value: 'sand', label: 'Песок', labelRu: 'Песок', labelEn: 'Sand' },
  { value: 'clay', label: 'Глина', labelRu: 'Глина', labelEn: 'Clay' },
  { value: 'soil', label: 'Земля/Грунт', labelRu: 'Земля/Грунт', labelEn: 'Soil' },
  { value: 'mixed', label: 'Смешанный', labelRu: 'Смешанный', labelEn: 'Mixed' },
] as const;

export type SoilType = typeof SOIL_TYPE_OPTIONS[number]['value'];
```

---

## 3. Segment Surface (Тип покрытия сегмента)

**Таблица**: `segments`
**Поле**: `surface` (планируется добавить)

### Назначение:
Тип покрытия участка, который влияет на метод работы и сложность.

### Рекомендуемые значения:
- `asphalt` - Асфальт (дорожное покрытие)
- `concrete` - Бетон (твердое покрытие)
- `pavers` - Брусчатка (плитка, камень)
- `green` - Грунт/земля (мягкая поверхность)

### Текущий код (Worker PWA):
```typescript
const getSurfaceText = (surface: string) => {
  switch (surface) {
    case 'asphalt':
      return 'Асфальт'
    case 'concrete':
      return 'Бетон'
    case 'pavers':
      return 'Брусчатка'
    case 'green':
      return 'Грунт'
    default:
      return surface
  }
}
```

---

## 4. Рекомендации по внедрению

### 4.1. Добавить константы в Worker PWA

**Файл**: `/lib/constants/soil-types.ts`

```typescript
export const SOIL_TYPE_OPTIONS = [
  { value: 'asphalt', label: 'Асфальт' },
  { value: 'concrete', label: 'Бетон' },
  { value: 'pavers', label: 'Брусчатка' },
  { value: 'gravel', label: 'Щебень' },
  { value: 'sand', label: 'Песок' },
  { value: 'clay', label: 'Глина' },
  { value: 'soil', label: 'Земля/Грунт' },
  { value: 'mixed', label: 'Смешанный' },
] as const;
```

### 4.2. Добавить UI в форму отчета

**Файл**: `/components/work-entries/work-entry-form.tsx`

Добавить после поля `hasProtectionPipe`:

```tsx
{/* Soil Type */}
{(selectedStage === 'stage_2_excavation' || selectedStage === 'stage_3_conduit') && (
  <div className="space-y-2">
    <Label htmlFor="soilType">Тип грунта</Label>
    <Select
      value={watch('soilType') || ''}
      onValueChange={(value) => setValue('soilType', value)}
    >
      <SelectTrigger id="soilType">
        <SelectValue placeholder="Выберите тип грунта" />
      </SelectTrigger>
      <SelectContent>
        {SOIL_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

### 4.3. Добавить поля в таблицу segments

```sql
-- Add surface, area, depth_req_m, width_req_m to segments table
ALTER TABLE segments
ADD COLUMN IF NOT EXISTS surface TEXT DEFAULT 'asphalt',
ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'roadway',
ADD COLUMN IF NOT EXISTS depth_req_m NUMERIC(5,2) DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS width_req_m NUMERIC(5,2) DEFAULT 0.3;

-- Create check constraint for surface
ALTER TABLE segments
ADD CONSTRAINT check_segment_surface
CHECK (surface IN ('asphalt', 'concrete', 'pavers', 'green'));

-- Create check constraint for area
ALTER TABLE segments
ADD CONSTRAINT check_segment_area
CHECK (area IN ('roadway', 'sidewalk', 'driveway', 'green'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_segments_surface ON segments(surface);
CREATE INDEX IF NOT EXISTS idx_segments_area ON segments(area);
```

---

## 5. Словарь терминов

| Английский | Русский | Немецкий | Описание |
|------------|---------|----------|----------|
| Asphalt | Асфальт | Asphalt | Дорожное асфальтовое покрытие |
| Concrete | Бетон | Beton | Бетонное покрытие |
| Pavers | Брусчатка | Pflastersteine | Тротуарная плитка, камень |
| Gravel | Щебень | Schotter | Щебеночное покрытие |
| Sand | Песок | Sand | Песчаный грунт |
| Clay | Глина | Ton | Глинистый грунт |
| Soil | Земля/Грунт | Erde/Boden | Обычный грунт, земля |
| Mixed | Смешанный | Gemischt | Смешанный тип грунта |

---

## 6. Связь между типами

```
Project
  └─ project_soil_types (ценообразование на уровне проекта)
      ├─ Asphalt (Асфальт) - 5.50 EUR/m
      ├─ Concrete (Бетон) - 7.00 EUR/m
      └─ Soil (Земля) - 3.50 EUR/m

  └─ segments (участки работы)
      ├─ surface: asphalt (тип покрытия сегмента)
      └─ area: roadway (зона работы)

  └─ work_entries (отчеты о работе)
      ├─ soil_type: asphalt (фактический тип грунта при работе)
      ├─ depth_m: 0.8 (фактическая глубина)
      └─ width_m: 0.3 (фактическая ширина)
```

---

## 7. Статус реализации

| Компонент | Таблица/Поле | Статус | Действие |
|-----------|--------------|--------|----------|
| Project soil types | `project_soil_types` | ✅ Реализовано | API готов, используется |
| Work entry soil type | `work_entries.soil_type` | ⚠️ Поле есть, UI нет | Добавить Select в форму |
| Segment surface | `segments.surface` | ❌ Не реализовано | Добавить колонки в БД |
| Segment area | `segments.area` | ❌ Не реализовано | Добавить колонки в БД |
| Depth/width requirements | `segments.depth_req_m/width_req_m` | ❌ Не реализовано | Добавить колонки в БД |

---

**Последнее обновление**: 2025-10-22
**Создано**: Claude Code Assistant
