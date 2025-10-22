// Domain models for the Worker Progress Tracking app
// Aligned with Cometa admin database schema

export interface Worker {
  id: string
  email: string | null
  firstName: string // first_name in DB
  lastName: string // last_name in DB
  role: 'admin' | 'pm' | 'foreman' | 'crew' | 'viewer' | 'worker'
  phone: string | null
  isActive: boolean // is_active in DB
  languagePreference: string | null // lang_pref in DB
  skills: string[] | null // jsonb in DB
  pinCode?: string // pin_code in DB
}

export interface Project {
  id: string
  name: string
  customer?: string | null
  city?: string | null
  address?: string | null
  contact24h?: string | null // contact_24h in DB
  startDate: string | null // start_date (date) in DB
  endDatePlan?: string | null // end_date_plan (date) in DB
  status: 'draft' | 'planning' | 'active' | 'waiting_invoice' | 'closed'
  totalLengthM: number // total_length_m in DB
  cabinetCount: number // computed from cabinets count
  baseRatePerM?: number | null // base_rate_per_m in DB
  pmUserId?: string | null // pm_user_id in DB
  languageDefault?: string | null // language_default in DB
  approved?: boolean
}

export interface NVT {
  id: string
  projectId: string
  code: string
  name: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  status: 'pending' | 'in_progress' | 'completed'
  totalLengthM: number
  completedLengthM: number
  segmentCount: number
  segments?: Segment[]
  houses?: House[]
  createdAt: string
  updatedAt: string
}

export interface Segment {
  id: string
  cabinetId: string // cabinet_id in DB
  name?: string | null
  lengthPlannedM: number // length_planned_m in DB
  surface: 'asphalt' | 'concrete' | 'pavers' | 'green'
  area: 'roadway' | 'sidewalk' | 'driveway' | 'green'
  depthReqM?: number | null // depth_req_m in DB
  widthReqM?: number | null // width_req_m in DB
  geomLine?: { coordinates: [number, number][] } | null // geom_line jsonb in DB
  status: 'open' | 'in_progress' | 'done'
}

// Stage codes from admin DB - expandable in future
export type StageCode =
  | 'stage_1_marking'
  | 'stage_2_excavation'
  | 'stage_3_conduit'
  | 'stage_4_cable'
  | 'stage_5_splice'
  | 'stage_6_test'
  | 'stage_7_connect'
  | 'stage_8_final'
  | 'stage_9_backfill'
  | 'stage_10_surface'

export type WorkMethod = 'mole' | 'hand' | 'excavator' | 'trencher' | 'documentation'

export interface WorkEntry {
  id: string
  projectId: string // project_id in DB
  cabinetId?: string | null // cabinet_id in DB
  segmentId?: string | null // segment_id in DB
  cutId?: string | null // cut_id in DB (for future)
  houseId?: string | null // house_id in DB (for house connections)
  crewId?: string | null // crew_id in DB
  userId: string // user_id in DB
  date: string // date (date) in DB - NOT timestamp
  stageCode: StageCode // stage_code in DB
  metersDoneM: number // meters_done_m in DB
  method?: WorkMethod | null
  widthM?: number | null // width_m in DB
  depthM?: number | null // depth_m in DB
  cablesCount?: number | null // cables_count in DB
  hasProtectionPipe?: boolean | null // has_protection_pipe in DB
  soilType?: string | null // soil_type in DB
  notes?: string | null
  approvedBy?: string | null // approved_by in DB
  approvedAt?: string | null // approved_at in DB
  approved: boolean // approved in DB (not workflow status!)
  rejectionReason?: string | null // rejection_reason in DB
  rejectedBy?: string | null // rejected_by in DB
  rejectedAt?: string | null // rejected_at in DB
  photos?: Photo[]
  // Populated from joins
  cabinet?: {
    id: string
    code: string
    name: string | null
  } | null
  segment?: {
    id: string
    name: string | null
  } | null
}

export type PhotoLabel = 'before' | 'during' | 'after' | 'instrument' | 'other'
export type PhotoType = 'general' | 'progress' | 'quality' | 'safety' | 'problem' | 'completion'

export interface Photo {
  id: string
  workEntryId?: string | null // work_entry_id in DB
  cutStageId?: string | null // cut_stage_id in DB (for future cut stages)
  url: string // url in DB - Supabase storage path
  ts: string // ts in DB - timestamp when photo was taken
  gpsLat?: number | null // gps_lat in DB
  gpsLon?: number | null // gps_lon in DB
  authorUserId?: string | null // author_user_id in DB
  label?: PhotoLabel | null // label in DB
  photoType?: PhotoType | null // photo_type in DB - from Admin system
  filename?: string | null // filename in DB - from Admin system
  filePath?: string | null // file_path in DB - Admin format path
  created_at?: string // created_at in DB - when photo record was created
}

export interface House {
  id: string
  projectId?: string
  cabinetId: string
  address: string
  entranceCount: number
  apartmentCount: number
  connectionStatus: 'pending' | 'in_progress' | 'connected'
  plannedConnectionDate?: Date
  actualConnectionDate?: Date
  status?: string
  createdAt: string
  updatedAt: string
}

export interface Appointment {
  id: string
  projectId: string
  userId: string
  houseId?: string
  title: string
  description?: string
  startTime: Date
  endTime?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  location?: string
  notes?: string
}

export interface Crew {
  id: string
  projectId?: string | null // project_id in DB
  name: string
  foremanUserId?: string | null // foreman_user_id in DB
  status: string // default 'active' in DB
  description?: string | null
}

export type CrewRole = 'foreman' | 'operator' | 'worker'

export interface CrewMember {
  crewId: string // crew_id in DB - composite PK
  userId: string // user_id in DB - composite PK
  roleInCrew: CrewRole // role_in_crew in DB
  activeFrom?: string | null // active_from (date) in DB
  activeTo?: string | null // active_to (date) in DB
}

// Stage definitions from DB - configured by admin
export interface StageDef {
  id: string
  code: StageCode
  nameRu: string // name_ru in DB
  nameDe?: string | null // name_de in DB
  requiresPhotosMin: number // requires_photos_min in DB
  requiresMeasurements: boolean // requires_measurements in DB
  requiresDensity: boolean // requires_density in DB
}

export interface SyncQueueItem {
  id: string
  type: 'work_entry' | 'photo' | 'appointment'
  data: any
  status: 'pending' | 'in_progress' | 'failed' | 'completed'
  retryCount: number
  lastError?: string
  createdAt: Date
  updatedAt: Date
}
