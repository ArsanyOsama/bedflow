// ── STEP 3: src/types/index.ts
// Updated: added 'discharging' to BedStatus

export type BedStatus =
  | 'available'
  | 'discharging'   // ← NEW: patient about to leave, ~30min
  | 'occupied'
  | 'cleaning'
  | 'reserved'
  | 'maintenance'

export interface Bed {
  id: string
  ward_id: string
  bed_number: string
  current_status: BedStatus
  last_updated_at: string
  last_updated_by?: string
}

export interface Ward {
  id: string
  hospital_id: string
  name_ar: string
  name_en: string
  specialty: string
  floor: number
  total_beds: number
  active: boolean
  beds?: Bed[]
}

export interface HospitalSummary {
  hospital_id: string
  name_ar: string
  name_en: string
  lat: number
  lng: number
  governorate: string
  address: string
  total_beds: number
  available_beds: number
  occupied_beds: number
  cleaning_beds: number
  maintenance_beds: number
  discharging_beds: number   // ← NEW
  reserved_beds: number
  occupancy_rate: number
}

export interface UserProfile {
  id: string
  hospital_id: string
  org_id: string
  role: 'nurse' | 'ops_director' | 'admin' | 'bedflow_admin'
  name_ar: string
  name_en: string
  phone?: string
}

export interface BedStatusLog {
  id: string
  bed_id: string
  old_status: BedStatus | null
  new_status: BedStatus
  changed_by: string | null
  changed_at: string
}

export interface WeeklyMetrics {
  hospital_id: string
  hospital_name_ar: string
  hospital_name_en: string
  period_days: number
  generated_at: string
  snapshot: {
    total_beds: number
    available_beds: number
    occupied_beds: number
    occupancy_rate: number
  }
  weekly_metrics: {
    total_status_changes: number
    beds_made_available: number
    estimated_egp_recovered: number
    note: string
  }
}