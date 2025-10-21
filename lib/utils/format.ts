export function formatDate(date: Date | string | null | undefined, locale: string = 'ru-RU'): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj)
}

export function formatDateTime(date: Date | string | null | undefined, locale: string = 'ru-RU'): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

export function formatMeters(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return '0 м'

  return `${meters.toFixed(1)} м`
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0%'

  return `${value.toFixed(1)}%`
}

export function formatNumber(value: number | null | undefined, locale: string = 'ru-RU'): string {
  if (value === null || value === undefined) return '0'

  return new Intl.NumberFormat(locale).format(value)
}

export function formatDuration(hours: number | null | undefined): string {
  if (!hours || hours === 0) return '-'

  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)

  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`

  return `${h} ч ${m} мин`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'Черновик',
    'submitted': 'Отправлено',
    'returned': 'Возвращено',
    'approved': 'Утверждено',
    'pending': 'Ожидает',
    'in_progress': 'В процессе',
    'completed': 'Завершено',
    'cancelled': 'Отменено',
    'active': 'Активно',
    'paused': 'Приостановлено'
  }

  return statusMap[status] || status
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'draft': 'text-gray-500',
    'submitted': 'text-blue-500',
    'returned': 'text-yellow-500',
    'approved': 'text-green-500',
    'pending': 'text-gray-500',
    'in_progress': 'text-blue-500',
    'completed': 'text-green-500',
    'cancelled': 'text-red-500',
    'active': 'text-green-500',
    'paused': 'text-yellow-500'
  }

  return colorMap[status] || 'text-gray-500'
}
