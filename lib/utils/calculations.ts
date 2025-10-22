export function calculateRemaining(
  lengthPlannedM: number,
  lengthApprovedM: number
): number {
  return Math.max(0, lengthPlannedM - lengthApprovedM)
}

export function calculatePending(
  segmentId: string,
  submittedEntries: Array<{ segmentId: string; metersCompleted: number }>
): number {
  return submittedEntries
    .filter(entry => entry.segmentId === segmentId)
    .reduce((sum, entry) => sum + entry.metersCompleted, 0)
}

export function calculateProgress(
  lengthDoneM: number,
  lengthPlannedM: number
): number {
  if (lengthPlannedM === 0) return 0
  return Math.min(100, (lengthDoneM / lengthPlannedM) * 100)
}
