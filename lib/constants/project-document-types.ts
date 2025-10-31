// Project Document Constants
// Документы проектов - read-only для workers

export const PROJECT_DOCUMENTS_BUCKET = 'project-documents'

// Storage paths в public bucket
export const PROJECT_DOCUMENT_PATHS = {
  PLANS: 'plans',
  INSTRUCTIONS: 'instructions',
  CERTIFICATES: 'certificates',
  OTHER: 'other',
} as const

// Document types (document_type field in documents table)
export const PROJECT_DOCUMENT_TYPES = {
  GENERAL: 'general',
  PLAN: 'plan',
  INSTRUCTION: 'instruction',
  CERTIFICATE: 'certificate',
  SAFETY: 'safety',
  TRAINING: 'training',
} as const

// Document roles (document_role field in project_documents table)
export const PROJECT_DOCUMENT_ROLES = {
  REFERENCE: 'reference',     // Справочный документ
  REQUIRED: 'required',       // Обязательный документ
  TEMPLATE: 'template',       // Шаблон
  REPORT: 'report',           // Отчет
} as const

// Category codes from document_categories table (16 categories from DB)
// Company documents (category_type = 'company')
export const COMPANY_DOCUMENT_CATEGORIES = {
  WORK_INSTRUCTION: 'WORK_INSTRUCTION',           // Рабочая инструкция
  SAFETY_INSTRUCTION: 'SAFETY_INSTRUCTION',       // Инструкция по ТБ
  TRAINING_MATERIAL: 'TRAINING_MATERIAL',         // Обучающий материал
  COMPANY_POLICY: 'COMPANY_POLICY',               // Политика компании
  COMPANY_CERTIFICATE: 'COMPANY_CERTIFICATE',     // Внутренний сертификат
  EMPLOYMENT_CONTRACT: 'EMPLOYMENT_CONTRACT',     // Трудовой договор
  PERSONAL_DOCUMENT: 'PERSONAL_DOCUMENT',         // Личный документ
} as const

// Legal documents (category_type = 'legal')
export const LEGAL_DOCUMENT_CATEGORIES = {
  PASSPORT: 'PASSPORT',                           // Паспорт
  VISA: 'VISA',                                   // Виза
  WORK_PERMIT: 'WORK_PERMIT',                     // Разрешение на работу
  RESIDENCE_PERMIT: 'RESIDENCE_PERMIT',           // Вид на жительство
  DRIVER_LICENSE: 'DRIVER_LICENSE',               // Водительские права
  HEALTH_INSURANCE: 'HEALTH_INSURANCE',           // Медицинская страховка
  QUALIFICATION_CERT: 'QUALIFICATION_CERT',       // Квалификационное свидетельство
  REGISTRATION_MELDEBESCHEINIGUNG: 'REGISTRATION_MELDEBESCHEINIGUNG', // Регистрационное свидетельство
  OTHER: 'OTHER',                                 // Другой документ
} as const

// All category codes combined
export const DOCUMENT_CATEGORY_CODES = {
  ...COMPANY_DOCUMENT_CATEGORIES,
  ...LEGAL_DOCUMENT_CATEGORIES,
} as const

// File size limits
export const MAX_PROJECT_DOCUMENT_SIZE = 50 * 1024 * 1024 // 50 MB (larger than worker docs)

// Supported MIME types for preview
export const PREVIEWABLE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

// Helper function to check if document can be previewed
export function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false
  return PREVIEWABLE_MIME_TYPES.includes(mimeType as any)
}

// Helper function to get file icon based on MIME type
export function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return 'file'

  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'file-text'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'file-text'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'archive'

  return 'file'
}

// Helper function to format file size
export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}
