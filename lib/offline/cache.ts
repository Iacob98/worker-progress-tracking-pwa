import { db } from './db'
import type { Project, NVT, Segment } from '@/types/models'

/**
 * Cache project data for offline access
 */
export async function cacheProject(project: Project) {
  try {
    await db.projects.put({
      ...project,
      totalLengthM: project.totalLengthM ?? 0
    })
  } catch (error) {
    console.error('Error caching project:', error)
    throw error
  }
}

/**
 * Cache multiple projects
 */
export async function cacheProjects(projects: Project[]) {
  try {
    await db.projects.bulkPut(
      projects.map(p => ({
        ...p,
        totalLengthM: p.totalLengthM ?? 0
      }))
    )
  } catch (error) {
    console.error('Error caching projects:', error)
    throw error
  }
}

/**
 * Cache NVT (cabinet) data for offline access
 */
export async function cacheNVT(nvt: NVT) {
  try {
    await db.cabinets.put(nvt)
  } catch (error) {
    console.error('Error caching NVT:', error)
    throw error
  }
}

/**
 * Cache multiple NVTs for a project
 */
export async function cacheNVTs(nvts: NVT[]) {
  try {
    await db.cabinets.bulkPut(nvts)
  } catch (error) {
    console.error('Error caching NVTs:', error)
    throw error
  }
}

/**
 * Cache segment data for offline access
 */
export async function cacheSegment(segment: Segment) {
  try {
    await db.segments.put(segment)
  } catch (error) {
    console.error('Error caching segment:', error)
    throw error
  }
}

/**
 * Cache multiple segments for a cabinet
 */
export async function cacheSegments(segments: Segment[]) {
  try {
    await db.segments.bulkPut(segments)
  } catch (error) {
    console.error('Error caching segments:', error)
    throw error
  }
}

/**
 * Get cached project data
 */
export async function getCachedProject(projectId: string): Promise<Project | null> {
  try {
    const project = await db.projects.get(projectId)
    return project || null
  } catch (error) {
    console.error('Error getting cached project:', error)
    return null
  }
}

/**
 * Get all cached projects
 */
export async function getCachedProjects(): Promise<Project[]> {
  try {
    return await db.projects.toArray()
  } catch (error) {
    console.error('Error getting cached projects:', error)
    return []
  }
}

/**
 * Get cached NVT data
 */
export async function getCachedNVT(nvtId: string): Promise<NVT | null> {
  try {
    const nvt = await db.cabinets.get(nvtId)
    return nvt || null
  } catch (error) {
    console.error('Error getting cached NVT:', error)
    return null
  }
}

/**
 * Get all cached NVTs for a project
 */
export async function getCachedNVTsForProject(projectId: string): Promise<NVT[]> {
  try {
    return await db.cabinets.where('projectId').equals(projectId).toArray()
  } catch (error) {
    console.error('Error getting cached NVTs:', error)
    return []
  }
}

/**
 * Get cached segments for a cabinet
 */
export async function getCachedSegmentsForCabinet(cabinetId: string): Promise<Segment[]> {
  try {
    return await db.segments.where('cabinetId').equals(cabinetId).toArray()
  } catch (error) {
    console.error('Error getting cached segments:', error)
    return []
  }
}

/**
 * Clear expired cache (older than 30 days)
 */
export async function clearExpiredCache() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  try {
    // Clear old completed projects
    await db.projects
      .where('status')
      .equals('completed')
      .and(p => p.startDate ? new Date(p.startDate) < thirtyDaysAgo : false)
      .delete()

    console.log('Expired cache cleared')
  } catch (error) {
    console.error('Error clearing expired cache:', error)
  }
}

/**
 * Check if data is cached
 */
export async function isCached(type: 'project' | 'nvt' | 'segment', id: string): Promise<boolean> {
  try {
    switch (type) {
      case 'project':
        return !!(await db.projects.get(id))
      case 'nvt':
        return !!(await db.cabinets.get(id))
      case 'segment':
        return !!(await db.segments.get(id))
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking cache:', error)
    return false
  }
}
