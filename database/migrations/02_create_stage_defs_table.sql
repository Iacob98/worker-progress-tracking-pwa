-- ========================================
-- CREATE STAGE_DEFS TABLE (OPTIONAL)
-- ========================================
-- This table stores stage definitions (работы этапы)
-- Run this only if you want to store stage configurations in DB
-- Otherwise, stages can be hardcoded in the application

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stage_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name_ru VARCHAR(255) NOT NULL,
  name_de VARCHAR(255),
  name_en VARCHAR(255),
  requires_photos_min INTEGER DEFAULT 0,
  requires_measurements BOOLEAN DEFAULT false,
  requires_density BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.stage_defs IS 'Definitions of work stages (этапы работ)';

-- Enable RLS
ALTER TABLE public.stage_defs ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read stage definitions
CREATE POLICY "stage_defs_read_all"
ON public.stage_defs
FOR SELECT
USING (true);

-- Insert default stages
INSERT INTO public.stage_defs (code, name_ru, name_de, name_en, display_order, requires_photos_min, requires_measurements)
VALUES
  ('stage_1_marking', 'Разметка', 'Markierung', 'Marking', 1, 2, false),
  ('stage_2_excavation', 'Вскопка/Экскавация', 'Aushub', 'Excavation', 2, 3, true),
  ('stage_3_conduit', 'Прокладка защитной трубы', 'Schutzrohr verlegen', 'Conduit laying', 3, 2, true),
  ('stage_4_cable', 'Прокладка кабеля', 'Kabelverlegung', 'Cable laying', 4, 2, true),
  ('stage_5_splice', 'Сплайсинг/Соединение', 'Spleißen', 'Splicing', 5, 3, false),
  ('stage_6_test', 'Тестирование', 'Prüfung', 'Testing', 6, 2, false),
  ('stage_7_connect', 'Подключение', 'Anschluss', 'Connection', 7, 3, false),
  ('stage_8_final', 'Финальная проверка', 'Endabnahme', 'Final inspection', 8, 2, false),
  ('stage_9_backfill', 'Засыпка', 'Verfüllung', 'Backfill', 9, 2, true),
  ('stage_10_surface', 'Восстановление покрытия', 'Oberflächenwiederherstellung', 'Surface restoration', 10, 3, true)
ON CONFLICT (code) DO NOTHING;

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_stage_defs_code ON public.stage_defs(code);
CREATE INDEX IF NOT EXISTS idx_stage_defs_active ON public.stage_defs(is_active);

-- ========================================
-- VERIFICATION
-- ========================================

-- Show all stages
-- SELECT code, name_ru, name_en, requires_photos_min, requires_measurements
-- FROM public.stage_defs
-- ORDER BY display_order;
