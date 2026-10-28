export type PrescriptionStatus = 'ACTIVE' | 'DISPENSED' | 'CANCELLED'
export type Slot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'BEDTIME'
export type FoodInstruction = 'BEFORE_FOOD' | 'AFTER_FOOD' | 'WITH_FOOD' | 'EMPTY_STOMACH'

export interface Profile {
  id: string
  full_name: string
  role: 'CHEMIST' | 'ADMIN'
  default_pharmacy_name: string | null
}

export interface Patient {
  id: string
  full_name: string
  phone: string
  date_of_birth: string // YYYY-MM-DD
}

export interface PrescriptionItem {
  id: string
  prescription_id: string
  medicine_name: string
  strength: string
  form: string
  dose: string
  frequency_label: string
  schedule_slots: Slot[]
  food_instruction: FoodInstruction | null
  duration_days: number | null
  end_date: string | null
  is_long_term: boolean
  review_date: string | null
  additional_instructions: string | null
  quantity: number
  is_controlled: boolean
  product_image_url: string | null
  product_image_verified: boolean
}

export interface Prescription {
  id: string
  patient_id: string
  prescriber_name: string
  hospital_name?: string | null
  issued_on: string
  refill_due_date: string
  status: PrescriptionStatus
  dispensed_at: string | null
  items: PrescriptionItem[]
}

export interface DispenseInput {
  prescriptionId: string
  pharmacyName: string
  chemistName: string
  productsVerified: boolean
}

export interface DispenseResult {
  logId: string
  dispensedAt: string
}

export interface CounterDetails {
  pharmacyName: string
  chemistName: string
}
