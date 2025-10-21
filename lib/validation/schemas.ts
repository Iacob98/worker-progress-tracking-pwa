import { z } from 'zod'

// Authentication schemas
export const LoginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  pin: z.string().min(4, 'PIN должен содержать минимум 4 цифры').max(6, 'PIN должен содержать максимум 6 цифр').regex(/^\d+$/, 'PIN должен содержать только цифры')
})

export type LoginFormData = z.infer<typeof LoginSchema>

// Worker schema
export const WorkerSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  role: z.enum(['worker', 'foreman']),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  languagePreference: z.string().nullable()
})

// Project schema
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Название проекта обязательно'),
  customer: z.string().nullable(),
  city: z.string().nullable(),
  status: z.enum(['active', 'completed', 'paused']),
  totalLengthM: z.number().positive().nullable(),
  approved: z.boolean()
})

// NVT (Cabinet) schema
export const NVTSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  code: z.string().min(1, 'Код NVT обязателен'),
  name: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  status: z.string()
})

// Segment schema
export const SegmentSchema = z.object({
  id: z.string().uuid(),
  cabinetId: z.string().uuid(),
  code: z.string().min(1, 'Код сегмента обязателен'),
  lengthPlannedM: z.number().positive('Плановая длина должна быть положительной'),
  lengthDoneM: z.number().min(0),
  status: z.string()
})

// Work entry base schema
export const WorkEntryBaseSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  crewId: z.string().uuid().optional(),
  workType: z.string(),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().optional()
})

// Progress entry schema (for segment work)
export const ProgressEntrySchema = WorkEntryBaseSchema.extend({
  segmentId: z.string().uuid(),
  workStageId: z.string().uuid().optional(),
  metersCompleted: z.number().positive('Выполненные метры должны быть положительными'),
  stageData: z.record(z.any()).optional(),
  checklistCompleted: z.array(z.boolean()).optional()
})

export type ProgressEntryFormData = z.infer<typeof ProgressEntrySchema>

// Photo upload schema
export const PhotoSchema = z.object({
  filename: z.string().min(1),
  file: z.instanceof(File).refine(
    (file) => file.size <= 10 * 1024 * 1024,
    'Размер файла не должен превышать 10MB'
  ).refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'Только JPG, PNG или WebP форматы'
  ),
  photoType: z.enum(['progress', 'before', 'after']).optional(),
  takenAt: z.date().optional()
})

// Appointment schema
export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  houseId: z.string().uuid().optional(),
  title: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  location: z.string().optional(),
  notes: z.string().optional()
})

// Over-completion validation
export const validateMetersCompleted = (
  metersCompleted: number,
  lengthPlannedM: number,
  comment?: string
) => {
  const percentage = (metersCompleted / lengthPlannedM) * 100

  if (percentage > 110 && !comment) {
    return {
      valid: false,
      error: 'Превышение более 10% требует обязательного комментария'
    }
  }

  if (percentage > 100 && percentage <= 110) {
    return {
      valid: true,
      warning: 'Внимание: выполнение превышает плановую длину'
    }
  }

  return { valid: true }
}
