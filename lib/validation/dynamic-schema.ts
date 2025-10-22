import { z } from 'zod'
import type { DynamicField } from '@/types/work-stages'

/**
 * Generates Zod schema from work_stages.required_fields JSON configuration
 * Supports: number, text, textarea, select field types
 */
export function generateDynamicSchema(fields: DynamicField[]) {
  const schemaShape: Record<string, z.ZodTypeAny> = {}

  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny

    switch (field.type) {
      case 'number':
        fieldSchema = z.coerce.number({
          required_error: `${field.label} обязательно для заполнения`,
          invalid_type_error: `${field.label} должно быть числом`
        })

        if (field.min !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).min(field.min, `Минимум: ${field.min}`)
        }
        if (field.max !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).max(field.max, `Максимум: ${field.max}`)
        }
        break

      case 'text':
        fieldSchema = z.string({
          required_error: `${field.label} обязательно для заполнения`
        }).min(1, `${field.label} не может быть пустым`)

        if (field.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(
            field.maxLength,
            `Максимум ${field.maxLength} символов`
          )
        }
        break

      case 'textarea':
        fieldSchema = z.string({
          required_error: `${field.label} обязательно для заполнения`
        }).min(1, `${field.label} не может быть пустым`)

        if (field.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(
            field.maxLength,
            `Максимум ${field.maxLength} символов`
          )
        }
        break

      case 'select':
        if (!field.options || field.options.length === 0) {
          throw new Error(`Field ${field.name} of type 'select' must have options`)
        }

        fieldSchema = z.enum(field.options as [string, ...string[]], {
          required_error: `${field.label} обязательно для заполнения`,
          invalid_type_error: `Выберите значение из списка`
        })
        break

      default:
        // Fallback to string for unknown types
        fieldSchema = z.string()
    }

    // Make field optional if not required
    if (!field.required) {
      fieldSchema = fieldSchema.optional()
    }

    schemaShape[field.name] = fieldSchema
  })

  return z.object(schemaShape)
}

/**
 * Validates form data against dynamic fields with type checking
 * Used for draft validation - checks required fields and types only
 */
export function validateDraftData(
  data: Record<string, any>,
  fields: DynamicField[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  fields.forEach((field) => {
    const value = data[field.name]

    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors[field.name] = `${field.label} обязательно для заполнения`
      return
    }

    // Skip validation for optional empty fields
    if (!field.required && (value === undefined || value === null || value === '')) {
      return
    }

    // Type validation
    switch (field.type) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors[field.name] = `${field.label} должно быть числом`
        } else {
          const numValue = Number(value)
          if (field.min !== undefined && numValue < field.min) {
            errors[field.name] = `Минимум: ${field.min}`
          }
          if (field.max !== undefined && numValue > field.max) {
            errors[field.name] = `Максимум: ${field.max}`
          }
        }
        break

      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors[field.name] = `${field.label} должно быть текстом`
        } else {
          if (field.maxLength && value.length > field.maxLength) {
            errors[field.name] = `Максимум ${field.maxLength} символов`
          }
        }
        break

      case 'select':
        if (field.options && !field.options.includes(String(value))) {
          errors[field.name] = `Выберите значение из списка`
        }
        break
    }
  })

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validates checklist completion
 * For draft: no validation
 * For submit: checks required items
 */
export function validateChecklist(
  checklist: Array<{ checked: boolean; required: boolean; text: string }>,
  isDraft: boolean = false
): { valid: boolean; errors: string[] } {
  if (isDraft) {
    return { valid: true, errors: [] }
  }

  const errors: string[] = []

  checklist.forEach((item) => {
    if (item.required && !item.checked) {
      errors.push(`Обязательный пункт не отмечен: ${item.text}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}
