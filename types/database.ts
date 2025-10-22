export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          pin_code: string
          first_name: string | null
          last_name: string | null
          role: string
          phone: string | null
          is_active: boolean
          language_preference: string | null
          skills: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      projects: {
        Row: {
          id: string
          name: string
          customer: string | null
          city: string | null
          address: string | null
          contact_24h: string | null
          start_date: string | null
          end_date_plan: string | null
          status: string
          total_length_m: number | null
          base_rate_per_m: number | null
          pm_user_id: string | null
          language_default: string | null
          approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      cabinets: {
        Row: {
          id: string
          project_id: string
          code: string
          name: string | null
          address: string | null
          latitude: number | null
          longitude: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cabinets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cabinets']['Insert']>
      }
      segments: {
        Row: {
          id: string
          cabinet_id: string
          code: string
          length_planned_m: number
          length_done_m: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['segments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['segments']['Insert']>
      }
      work_entries: {
        Row: {
          id: string
          project_id: string
          user_id: string
          crew_id: string | null
          cabinet_id: string | null
          segment_id: string | null
          cut_id: string | null
          house_id: string | null
          date: string // date field (YYYY-MM-DD)
          stage_code: string
          meters_done_m: number
          method: string | null
          width_m: number | null
          depth_m: number | null
          cables_count: number | null
          has_protection_pipe: boolean | null
          soil_type: string | null
          approved: boolean
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          rejected_by: string | null
          rejected_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['work_entries']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['work_entries']['Insert']>
      }
      photos: {
        Row: {
          id: string
          project_id: string
          work_entry_id: string | null
          filename: string
          file_path: string
          thumbnail_path: string | null
          taken_at: string | null
          taken_by: string | null
          photo_type: string | null
          location_point: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['photos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['photos']['Insert']>
      }
      work_stages: {
        Row: {
          id: string
          project_id: string | null
          name: string
          required_fields: Json
          checklist_items: Json
          required_photos: number
          is_active: boolean
          order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['work_stages']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['work_stages']['Insert']>
      }
      segment_work_entries: {
        Row: {
          id: string
          segment_id: string
          work_entry_id: string
          work_stage_id: string | null
          meters_completed: number
          stage_data: Json | null
          checklist_completed: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['segment_work_entries']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['segment_work_entries']['Insert']>
      }
      crews: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string
          leader_user_id: string | null
          project_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['crews']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['crews']['Insert']>
      }
      crew_members: {
        Row: {
          id: string
          crew_id: string
          user_id: string
          is_active: boolean
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['crew_members']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['crew_members']['Insert']>
      }
      houses: {
        Row: {
          id: string
          project_id: string
          cabinet_id: string | null
          address: string
          planned_connection_date: string | null
          actual_connection_date: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['houses']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['houses']['Insert']>
      }
      appointments: {
        Row: {
          id: string
          project_id: string
          user_id: string
          house_id: string | null
          title: string
          description: string | null
          start_time: string
          end_time: string | null
          status: string
          location: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
      }
    }
    Views: {
      v_segment_progress: {
        Row: {
          segment_id: string
          cabinet_id: string
          segment_code: string
          length_planned_m: number
          length_approved_m: number
          length_pending_m: number
          length_remaining_m: number
          progress_percentage: number
        }
      }
    }
    Functions: {}
    Enums: {}
  }
}
