import type { StageCode } from '@/types/models'

export const STAGE_LABELS: Record<StageCode, string> = {
  stage_1_marking: '1. Разметка',
  stage_2_excavation: '2. Копка',
  stage_3_conduit: '3. Установка труб',
  stage_4_cable: '4. Прокладка кабеля',
  stage_5_splice: '5. Сварка',
  stage_6_test: '6. Тестирование',
  stage_7_connect: '7. Подключение',
  stage_8_final: '8. Финальная проверка',
  stage_9_backfill: '9. Засыпка',
  stage_10_surface: '10. Восстановление покрытия',
}

export const STAGE_OPTIONS: Array<{ value: StageCode; label: string }> = [
  { value: 'stage_1_marking', label: '1. Разметка' },
  { value: 'stage_2_excavation', label: '2. Копка' },
  { value: 'stage_3_conduit', label: '3. Установка труб' },
  { value: 'stage_4_cable', label: '4. Прокладка кабеля' },
  { value: 'stage_5_splice', label: '5. Сварка' },
  { value: 'stage_6_test', label: '6. Тестирование' },
  { value: 'stage_7_connect', label: '7. Подключение' },
  { value: 'stage_8_final', label: '8. Финальная проверка' },
  { value: 'stage_9_backfill', label: '9. Засыпка' },
  { value: 'stage_10_surface', label: '10. Восстановление покрытия' },
]

export const METHOD_LABELS: Record<string, string> = {
  mole: 'Прокол',
  hand: 'Вручную',
  excavator: 'Экскаватор',
  trencher: 'Траншеекопатель',
  documentation: 'Документация',
}

export const METHOD_OPTIONS = [
  { value: 'mole', label: 'Прокол' },
  { value: 'hand', label: 'Вручную' },
  { value: 'excavator', label: 'Экскаватор' },
  { value: 'trencher', label: 'Траншеекопатель' },
  { value: 'documentation', label: 'Документация' },
]

export const PHOTO_LABEL_OPTIONS = [
  { value: 'before', label: 'До работ' },
  { value: 'during', label: 'В процессе' },
  { value: 'after', label: 'После работ' },
  { value: 'instrument', label: 'Измерения' },
  { value: 'other', label: 'Другое' },
]
