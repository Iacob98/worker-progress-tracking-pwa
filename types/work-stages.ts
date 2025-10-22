// Work stage configuration types for dynamic forms

export type FieldType = 'number' | 'text' | 'textarea' | 'select'

export interface DynamicField {
  name: string
  type: FieldType
  label: string
  required: boolean
  min?: number // For number type
  max?: number // For number type
  maxLength?: number // For text/textarea
  options?: string[] // For select type
  placeholder?: string
  helpText?: string
}

export interface ChecklistItem {
  text: string
  required: boolean
  order: number
  checked?: boolean
}

export interface WorkStageConfig {
  id: string
  projectId?: string
  name: string
  requiredFields: DynamicField[]
  checklistItems: ChecklistItem[]
  requiredPhotos: number
  isActive: boolean
  order: number
}

export interface FormValues {
  [key: string]: string | number | boolean | undefined
}

export interface ChecklistState {
  [key: string]: boolean
}

export interface ValidationError {
  field: string
  message: string
}
