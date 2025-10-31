import type { WorkerDocumentCategory } from '@/types/models'

// Labels для категорий документов работников (на русском)
export const DOCUMENT_CATEGORY_LABELS: Record<WorkerDocumentCategory, string> = {
  contract: 'Договор',
  certificate: 'Сертификат',
  instruction: 'Инструкция',
  policy: 'Политика компании',
  safety: 'Техника безопасности',
  training: 'Обучающие материалы',
  personal: 'Личные документы',
  other: 'Прочее',
}

// Icons для категорий (используя lucide-react icons)
export const DOCUMENT_CATEGORY_ICONS: Record<WorkerDocumentCategory, string> = {
  contract: 'FileText',
  certificate: 'Award',
  instruction: 'BookOpen',
  policy: 'Shield',
  safety: 'AlertTriangle',
  training: 'GraduationCap',
  personal: 'User',
  other: 'File',
}

// Список категорий для фильтров
export const DOCUMENT_CATEGORIES: Array<{
  value: WorkerDocumentCategory
  label: string
  icon: string
}> = [
  { value: 'contract', label: 'Договор', icon: 'FileText' },
  { value: 'certificate', label: 'Сертификат', icon: 'Award' },
  { value: 'instruction', label: 'Инструкция', icon: 'BookOpen' },
  { value: 'policy', label: 'Политика компании', icon: 'Shield' },
  { value: 'safety', label: 'Техника безопасности', icon: 'AlertTriangle' },
  { value: 'training', label: 'Обучающие материалы', icon: 'GraduationCap' },
  { value: 'personal', label: 'Личные документы', icon: 'User' },
  { value: 'other', label: 'Прочее', icon: 'File' },
]

// Допустимые MIME типы для загрузки документов
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

// Максимальный размер файла (10 MB)
export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// Bucket name для хранения документов работников
export const WORKER_DOCUMENTS_BUCKET = 'worker-documents'
