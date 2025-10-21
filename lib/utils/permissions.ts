import type { Worker } from '@/types/models'

export function isWorker(user: Worker | null): boolean {
  return user?.role === 'worker'
}

export function isForeman(user: Worker | null): boolean {
  return user?.role === 'foreman'
}

export function canEditEntry(
  user: Worker | null,
  entryUserId: string,
  entryStatus: 'draft' | 'submitted' | 'returned' | 'approved',
  crewMemberIds?: string[]
): boolean {
  if (!user) return false

  // Approved entries cannot be edited by anyone
  if (entryStatus === 'approved') return false

  // Worker can edit own drafts and returned entries
  if (user.id === entryUserId && (entryStatus === 'draft' || entryStatus === 'returned')) {
    return true
  }

  // Foreman can edit crew member drafts
  if (isForeman(user) && entryStatus === 'draft' && crewMemberIds?.includes(entryUserId)) {
    return true
  }

  return false
}

export function canViewEntry(
  user: Worker | null,
  entryUserId: string,
  crewMemberIds?: string[]
): boolean {
  if (!user) return false

  // User can view own entries
  if (user.id === entryUserId) return true

  // Foreman can view crew member entries
  if (isForeman(user) && crewMemberIds?.includes(entryUserId)) {
    return true
  }

  return false
}

export function canSubmitOnBehalf(
  user: Worker | null,
  targetUserId: string,
  crewMemberIds?: string[]
): boolean {
  if (!user) return false

  // Only foremen can submit on behalf of others
  if (!isForeman(user)) return false

  // Must be a crew member
  return crewMemberIds?.includes(targetUserId) ?? false
}
