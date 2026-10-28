import { buildDemo } from './demoData'
import { getDispenseBlock } from './rules'
import { isDemo, requireClient } from './supabase'
import type {
  DispenseInput,
  DispenseResult,
  Patient,
  Prescription,
  PrescriptionItem,
  Profile,
} from './types'

// ---------------------------------------------------------------------
// Demo mode keeps everything in memory. Real mode talks to Supabase; the
// rules that matter (expired, already dispensed, controlled, double
// dispense) are enforced by the dispense_prescription() database function.
// ---------------------------------------------------------------------
const demo = isDemo ? buildDemo() : null

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export async function getProfile(): Promise<Profile> {
  if (demo) {
    return {
      id: 'demo-user',
      full_name: 'Demo Chemist',
      role: 'CHEMIST',
      default_pharmacy_name: 'Demo Pharmacy',
    }
  }
  const sb = requireClient()
  const { data: userData, error: userError } = await sb.auth.getUser()
  if (userError || !userData.user) throw new Error('You are not signed in.')
  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, role, default_pharmacy_name')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) {
    throw new Error('Your account has not been set up as a chemist. Please contact your administrator.')
  }
  return data as Profile
}

export async function searchPatients(query: string): Promise<Patient[]> {
  const term = query.trim()
  if (term.length < 3) return []

  if (demo) {
    await delay(120)
    const lower = term.toLowerCase()
    const digits = term.replace(/\D/g, '')
    return clone(
      demo.patients
        .filter(
          (p) =>
            p.full_name.toLowerCase().includes(lower) ||
            (digits.length >= 3 && p.phone.includes(digits)),
        )
        .slice(0, 8),
    )
  }

  const { data, error } = await requireClient().rpc('search_patients', { q: term })
  if (error) throw new Error(error.message)
  return (data ?? []) as Patient[]
}

type PrescriptionRow = Omit<Prescription, 'items'> & { prescription_items: PrescriptionItem[] }

export async function getPrescriptions(patientId: string): Promise<Prescription[]> {
  if (demo) {
    await delay(150)
    return clone(
      demo.prescriptions
        .filter((rx) => rx.patient_id === patientId)
        .sort((a, b) => (a.issued_on < b.issued_on ? 1 : -1)),
    )
  }

  const { data, error } = await requireClient()
    .from('prescriptions')
    .select(
      'id, patient_id, prescriber_name, issued_on, refill_due_date, status, dispensed_at, prescription_items(*)',
    )
    .eq('patient_id', patientId)
    .order('issued_on', { ascending: false })
  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as PrescriptionRow[]).map((row) => {
    const { prescription_items, ...rest } = row
    return { ...rest, items: prescription_items ?? [] }
  })
}

export async function dispensePrescription(input: DispenseInput): Promise<DispenseResult> {
  if (demo) {
    await delay(450)
    const rx = demo.prescriptions.find((r) => r.id === input.prescriptionId)
    if (!rx) throw new Error('Prescription not found.')
    if (!input.pharmacyName.trim() || !input.chemistName.trim()) {
      throw new Error('Pharmacy name and chemist name are required.')
    }
    if (!input.productsVerified) throw new Error('Confirm that the products match before dispensing.')
    const block = getDispenseBlock(rx)
    if (block) throw new Error(block)
    rx.status = 'DISPENSED'
    rx.dispensed_at = new Date().toISOString()
    return { logId: `demo-log-${Date.now()}`, dispensedAt: rx.dispensed_at }
  }

  const { data, error } = await requireClient().rpc('dispense_prescription', {
    p_prescription_id: input.prescriptionId,
    p_pharmacy_name: input.pharmacyName.trim(),
    p_chemist_name: input.chemistName.trim(),
    p_products_verified: input.productsVerified,
  })
  if (error) throw new Error(error.message)
  return { logId: String(data), dispensedAt: new Date().toISOString() }
}

/** Best-effort audit entry: who opened which patient record. Never blocks the screen. */
export async function logPatientView(patientId: string): Promise<void> {
  if (demo) return
  try {
    await requireClient().from('patient_access_logs').insert({ patient_id: patientId })
  } catch {
    // ignore: auditing must not break the counter workflow
  }
}
