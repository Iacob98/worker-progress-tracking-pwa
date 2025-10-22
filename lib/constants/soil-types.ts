/**
 * Soil Type Constants for Work Entries
 * Used when workers report the actual soil type they encountered during work
 */

export const SOIL_TYPE_OPTIONS = [
  { value: 'asphalt', label: 'Асфальт' },
  { value: 'concrete', label: 'Бетон' },
  { value: 'pavers', label: 'Брусчатка' },
  { value: 'gravel', label: 'Щебень' },
  { value: 'sand', label: 'Песок' },
  { value: 'clay', label: 'Глина' },
  { value: 'soil', label: 'Земля/Грунт' },
  { value: 'mixed', label: 'Смешанный' },
] as const

export type SoilType = typeof SOIL_TYPE_OPTIONS[number]['value']

/**
 * Get Russian label for soil type
 */
export function getSoilTypeLabel(soilType: string | null | undefined): string {
  if (!soilType) return 'Не указан'
  const option = SOIL_TYPE_OPTIONS.find(opt => opt.value === soilType)
  return option?.label || soilType
}
