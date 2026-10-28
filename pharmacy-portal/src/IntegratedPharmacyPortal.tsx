import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  FileText,
  HeartPulse,
  Moon,
  Pill,
  Printer,
  ShieldAlert,
  Sun,
  Sunrise,
  Sunset,
  X,
} from 'lucide-react'

/* ==========================================================================
   1. TYPES & DATA CONTRACTS
   ========================================================================== */

export type ScheduleSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'BEDTIME'
export type FoodInstruction = 'BEFORE_FOOD' | 'WITH_FOOD' | 'AFTER_FOOD'
export type PrescriptionStatus = 'ACTIVE' | 'DISPENSED' | 'CANCELLED'

export interface PrescriptionItem {
  id: string
  prescription_id: string
  medicine_name: string
  strength: string
  form: string
  dose: string
  frequency_label: string
  schedule_slots: ScheduleSlot[]
  food_instruction: FoodInstruction | null
  duration_days: number | null
  is_long_term: boolean
  review_date: string | null
  quantity: number
  is_controlled: boolean
  product_image_url?: string | null
  product_image_verified?: boolean
}

export interface Prescription {
  id: string
  patient_id: string
  prescriber_name: string
  hospital_name: string
  issued_on: string
  refill_due_date: string
  status: PrescriptionStatus
  dispensed_at: string | null
  items: PrescriptionItem[]
}

export interface Patient {
  id: string
  full_name: string
  phone: string
  date_of_birth: string
}

export interface CounterDetails {
  pharmacyName: string
  chemistName: string
}

/* ==========================================================================
   2. UTILITIES, RULES & LABELS
   ========================================================================== */

export const SLOT_LABEL: Record<ScheduleSlot, string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
  BEDTIME: 'Night / Bedtime',
}

export const FOOD_LABEL: Record<FoodInstruction, string> = {
  BEFORE_FOOD: 'Take before food (empty stomach)',
  WITH_FOOD: 'Take with or immediately after food',
  AFTER_FOOD: 'Take after food',
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(isoDate: string): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function calculateAge(dobIso: string): number {
  const birth = new Date(dobIso)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function refillState(refillDueIso: string): 'OK' | 'SOON' | 'EXPIRED' {
  const due = new Date(refillDueIso).getTime()
  const now = new Date().setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'EXPIRED'
  if (diffDays <= 3) return 'SOON'
  return 'OK'
}

/**
 * Returns error string if prescription is blocked from dispensing, or null if allowed.
 * Controlled medicines are permitted for dispensing while remaining flagged for pharmacist review.
 */
export function getDispenseBlock(rx: Prescription): string | null {
  if (rx.status !== 'ACTIVE') {
    return `This prescription is already ${rx.status.toLowerCase()}.`
  }
  if (refillState(rx.refill_due_date) === 'EXPIRED') {
    return `Expired on ${formatDate(rx.refill_due_date)}. Expired prescriptions cannot be dispensed.`
  }
  if (rx.items.length === 0) {
    return 'This prescription has no medicines listed.'
  }
  return null
}

export function describeDuration(it: PrescriptionItem) {
  if (it.is_long_term) {
    return {
      text: 'Long term (ongoing)',
      review: it.review_date ? `Review by ${formatDate(it.review_date)}` : null,
      missing: false,
    }
  }
  if (it.duration_days && it.duration_days > 0) {
    return { text: `For ${it.duration_days} days`, review: null, missing: false }
  }
  return { text: 'Duration not specified', review: null, missing: true }
}

/* ==========================================================================
   3. SAMPLE DEMO DATA (FOR QUICK STANDALONE TESTING)
   ========================================================================== */

export const DEMO_PATIENTS: Patient[] = [
  { id: 'pt-1', full_name: 'Aarav Sharma', phone: '9876543210', date_of_birth: '1984-03-12' },
  { id: 'pt-2', full_name: 'Meera Iyer', phone: '9123456780', date_of_birth: '1958-11-02' },
  { id: 'pt-3', full_name: 'Rohan Verma (Controlled Drug)', phone: '9988776655', date_of_birth: '1992-07-21' },
  { id: 'pt-4', full_name: 'John Doe', phone: '9845123456', date_of_birth: '1979-05-18' },
]

export const DEMO_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-3001',
    patient_id: 'pt-3',
    prescriber_name: 'Dr. Demo Nair',
    hospital_name: 'Max Healthcare, Delhi',
    issued_on: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
    refill_due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    status: 'ACTIVE',
    dispensed_at: null,
    items: [
      {
        id: 'it-1',
        prescription_id: 'rx-3001',
        medicine_name: 'Controlex (Schedule H1 / Controlled)',
        strength: '5 mg',
        form: 'tablet',
        dose: '1',
        frequency_label: 'Once daily at bedtime',
        schedule_slots: ['BEDTIME'],
        food_instruction: 'AFTER_FOOD',
        duration_days: 5,
        is_long_term: false,
        review_date: null,
        quantity: 5,
        is_controlled: true,
      },
      {
        id: 'it-2',
        prescription_id: 'rx-3001',
        medicine_name: 'Metformin',
        strength: '500 mg',
        form: 'tablet',
        dose: '1',
        frequency_label: 'Twice daily',
        schedule_slots: ['MORNING', 'EVENING'],
        food_instruction: 'WITH_FOOD',
        duration_days: 30,
        is_long_term: true,
        review_date: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
        quantity: 60,
        is_controlled: false,
      },
    ],
  },
  {
    id: 'rx-4001',
    patient_id: 'pt-4',
    prescriber_name: 'Dr. Rajesh Singhania',
    hospital_name: 'Lilavati Hospital, Mumbai',
    issued_on: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    refill_due_date: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    status: 'ACTIVE',
    dispensed_at: null,
    items: [
      {
        id: 'it-41',
        prescription_id: 'rx-4001',
        medicine_name: 'Amoxilin',
        strength: '500 mg',
        form: 'capsule',
        dose: '1',
        frequency_label: 'Thrice daily',
        schedule_slots: ['MORNING', 'AFTERNOON', 'EVENING'],
        food_instruction: 'AFTER_FOOD',
        duration_days: 7,
        is_long_term: false,
        review_date: null,
        quantity: 21,
        is_controlled: false,
      },
      {
        id: 'it-42',
        prescription_id: 'rx-4001',
        medicine_name: 'Cetrizol',
        strength: '10 mg',
        form: 'tablet',
        dose: '1',
        frequency_label: 'Once daily at bedtime',
        schedule_slots: ['BEDTIME'],
        food_instruction: 'AFTER_FOOD',
        duration_days: 10,
        is_long_term: false,
        review_date: null,
        quantity: 10,
        is_controlled: false,
      },
      {
        id: 'it-43',
        prescription_id: 'rx-4001',
        medicine_name: 'Paracetamol',
        strength: '650 mg',
        form: 'tablet',
        dose: '1',
        frequency_label: 'Twice daily',
        schedule_slots: ['MORNING', 'EVENING'],
        food_instruction: 'WITH_FOOD',
        duration_days: 5,
        is_long_term: false,
        review_date: null,
        quantity: 10,
        is_controlled: false,
      },
    ],
  },
]

/* ==========================================================================
   4. ROUTINE GUIDE COMPONENT (TABULAR, 1-0-1-0 SLOTS, PRINT READY)
   ========================================================================== */

export function RoutineGuideModal({
  patient,
  prescription,
  onClose,
}: {
  patient: Patient
  prescription: Prescription
  onClose: () => void
}) {
  const SLOTS: ScheduleSlot[] = ['MORNING', 'AFTERNOON', 'EVENING', 'BEDTIME']
  const age = calculateAge(patient.date_of_birth)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="mx-auto flex max-w-5xl items-center justify-between rounded-xl bg-slate-900 px-6 py-3 text-white shadow-lg print:hidden mb-4">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-6 w-6 text-sky-400" />
          <span className="text-xl font-bold tracking-tight">MedMitra Patient Routine Guide</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-base font-bold text-white shadow hover:bg-sky-400 cursor-pointer"
          >
            <Printer className="h-5 w-5" /> Print Routine Guide
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-base font-semibold text-white hover:bg-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" /> Close
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl rounded-xl border border-slate-300 bg-white p-6 shadow-xl sm:p-8 print:max-w-none print:border-none print:p-0 print:shadow-none">
        {/* Document Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-200 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white font-black text-2xl">
              +
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 leading-tight">MedMitra</div>
              <div className="text-xs font-bold text-sky-700">Right Medicine • Right Time • Better Health</div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Your Medication Routine</h1>
            <p className="text-sm font-bold text-slate-500">Patient Checklist Guide</p>
          </div>
        </div>

        {/* Patient & Doctor Strip */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 border border-slate-200 text-sm">
          <div>
            <p className="text-slate-500 font-bold uppercase text-xs">Patient</p>
            <p className="text-lg font-extrabold text-slate-900">{patient.full_name} ({age} yrs)</p>
            <p className="text-slate-600">Phone: {patient.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 font-bold uppercase text-xs">Prescriber & Hospital</p>
            <p className="text-lg font-extrabold text-slate-900">{prescription.prescriber_name}</p>
            <p className="text-slate-600">{prescription.hospital_name} · {formatDate(prescription.issued_on)}</p>
          </div>
        </div>

        {/* Medication Schedule Table */}
        <div className="mt-6 overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse border border-slate-300 text-left">
            <thead>
              <tr className="bg-slate-800 text-white text-sm uppercase">
                <th className="border border-slate-300 p-2 text-center w-12">#</th>
                <th className="border border-slate-300 p-3">Medicine & Strength</th>
                <th className="border border-slate-300 p-2 text-center">Dose</th>
                <th className="border border-slate-300 p-3 text-center" style={{ minWidth: '200px' }}>
                  How Many Times A Day?
                </th>
                <th className="border border-slate-300 p-3">Instructions & Food</th>
                <th className="border border-slate-300 p-3">Duration</th>
                <th className="border border-slate-300 p-2 text-center w-20">Verify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {prescription.items.map((item, idx) => {
                const slots = SLOTS.map((s) => (item.schedule_slots.includes(s) ? 1 : 0))
                const d = describeDuration(item)
                return (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-300 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-slate-900">{item.medicine_name}</span>
                        {item.is_controlled && (
                          <span className="rounded border border-red-600 bg-red-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-red-800">
                            Controlled
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-slate-600">{item.strength} {item.form}</div>
                    </td>
                    <td className="border border-slate-300 p-2 text-center text-lg font-black">
                      {item.form && item.form.toLowerCase() !== 'tablet' ? `${item.dose} ${item.form}` : item.dose}
                    </td>
                    <td className="border border-slate-300 p-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex flex-col items-center">
                          <Sunrise className="h-4 w-4 text-amber-500" />
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded text-base font-black ${slots[0] ? 'border-2 border-emerald-500 bg-emerald-100 text-emerald-950' : 'border border-slate-300 bg-slate-100 text-slate-400'}`}>
                            {slots[0]}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Sun className="h-4 w-4 text-amber-500" />
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded text-base font-black ${slots[1] ? 'border-2 border-emerald-500 bg-emerald-100 text-emerald-950' : 'border border-slate-300 bg-slate-100 text-slate-400'}`}>
                            {slots[1]}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Sunset className="h-4 w-4 text-amber-600" />
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded text-base font-black ${slots[2] ? 'border-2 border-emerald-500 bg-emerald-100 text-emerald-950' : 'border border-slate-300 bg-slate-100 text-slate-400'}`}>
                            {slots[2]}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Moon className="h-4 w-4 text-indigo-500" />
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded text-base font-black ${slots[3] ? 'border-2 border-emerald-500 bg-emerald-100 text-emerald-950' : 'border border-slate-300 bg-slate-100 text-slate-400'}`}>
                            {slots[3]}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="border border-slate-300 p-3 text-sm font-semibold">
                      {item.food_instruction ? FOOD_LABEL[item.food_instruction] : 'Standard instructions'}
                    </td>
                    <td className="border border-slate-300 p-3 text-sm font-bold">{d.text}</td>
                    <td className="border border-slate-300 p-2 text-center align-middle">
                      <div className="mx-auto h-7 w-7 rounded border-2 border-dashed border-slate-400 bg-white" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   5. CONFIRMATION MODAL & DISPENSE WORKFLOW
   ========================================================================== */

export function ConfirmDispenseModal({
  patient,
  prescription,
  counter,
  onClose,
  onDispensed,
}: {
  patient: Patient
  prescription: Prescription
  counter: CounterDetails
  onClose: () => void
  onDispensed: () => void
}) {
  const [verified, setVerified] = useState(false)
  const [success, setSuccess] = useState(false)
  const hasControlled = prescription.items.some((i) => i.is_controlled)

  function handleConfirm() {
    prescription.status = 'DISPENSED'
    prescription.dispensed_at = new Date().toISOString()
    setSuccess(true)
    onDispensed()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-2xl">
        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600 mb-3" />
            <h2 className="text-3xl font-extrabold text-slate-900">Medicines Dispensed Successfully!</h2>
            <p className="mt-2 text-lg text-slate-700">
              Recorded by {counter.chemistName} at {counter.pharmacyName}.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl bg-slate-900 px-8 py-3 text-lg font-bold text-white hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Confirm Dispensing</h2>
                <p className="text-sm font-bold text-slate-600">{patient.full_name} · Rx #{prescription.id}</p>
              </div>
              <button onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X className="h-6 w-6" /></button>
            </div>

            <ul className="my-4 divide-y border rounded-xl p-2 max-h-60 overflow-y-auto">
              {prescription.items.map((it) => (
                <li key={it.id} className="py-2.5 px-3 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{it.medicine_name} {it.strength}</span>
                      {it.is_controlled && (
                        <span className="rounded bg-red-100 border border-red-600 px-1.5 py-0.5 text-xs font-black text-red-800">
                          Controlled
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-600">{it.dose} · {it.frequency_label}</span>
                  </div>
                  <span className="text-lg font-black text-slate-900">Qty: {it.quantity}</span>
                </li>
              ))}
            </ul>

            {hasControlled && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-amber-600 bg-amber-50 p-3 text-sm font-bold text-amber-950">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" />
                <span>Notice: This prescription contains controlled medicine. Please verify patient identity and register entry before dispensing.</span>
              </div>
            )}

            <label className="flex items-start gap-3 rounded-lg border-2 border-slate-300 bg-slate-50 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="mt-1 h-5 w-5 accent-emerald-600"
              />
              <span className="text-sm font-bold text-slate-800">
                I confirm that the medicines and quantities being handed over match the prescription.
              </span>
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={onClose} className="px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button
                disabled={!verified}
                onClick={handleConfirm}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 font-extrabold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                Complete & Dispense
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   6. MAIN INTEGRATED PHARMACY PORTAL COMPONENT
   ========================================================================== */

export default function IntegratedPharmacyPortal() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(DEMO_PATIENTS[2]) // defaults to Rohan Verma
  const [counter, setCounter] = useState<CounterDetails>({ pharmacyName: 'City Care Pharmacy', chemistName: 'Rajesh Kumar' })
  const [guideRx, setGuideRx] = useState<Prescription | null>(null)
  const [dispenseRx, setDispenseRx] = useState<Prescription | null>(null)
  const [, setRefreshKey] = useState(0)

  const activeRx = useMemo(() => {
    if (!selectedPatient) return null
    return DEMO_PRESCRIPTIONS.find((r) => r.patient_id === selectedPatient.id) || null
  }, [selectedPatient])

  const blockReason = activeRx ? getDispenseBlock(activeRx) : null
  const hasControlled = activeRx?.items.some((i) => i.is_controlled)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4 md:p-8">
      {/* Top Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-4 border-slate-900 bg-white p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-2xl">
            <Pill className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">MedMitra Pharmacy Portal</h1>
            <p className="text-xs font-bold text-emerald-800">Dispensing Counter & Patient Guide System</p>
          </div>
        </div>

        {/* Patient Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-500">Demo Patient:</span>
          <select
            value={selectedPatient?.id}
            onChange={(e) => setSelectedPatient(DEMO_PATIENTS.find((p) => p.id === e.target.value) || null)}
            className="rounded-lg border-2 border-slate-900 bg-white px-3 py-2 text-sm font-bold cursor-pointer"
          >
            {DEMO_PATIENTS.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name} ({p.phone})</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto space-y-6">
        {selectedPatient && activeRx ? (
          <div className="rounded-2xl border-4 border-slate-900 bg-white overflow-hidden shadow-lg">
            {/* Prescription Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-50 border-b-4 border-slate-900 p-5">
              <div>
                <span className="text-xs font-black uppercase text-slate-500">Prescribing Doctor</span>
                <h2 className="text-xl font-extrabold text-slate-900">{activeRx.prescriber_name} · {activeRx.hospital_name}</h2>
                <p className="text-sm text-slate-600">Issued: {formatDate(activeRx.issued_on)} · Refill due: {formatDate(activeRx.refill_due_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${activeRx.status === 'ACTIVE' ? 'bg-amber-200 text-amber-950' : 'bg-emerald-200 text-emerald-950'}`}>
                  {activeRx.status}
                </span>
                <button
                  type="button"
                  onClick={() => setGuideRx(activeRx)}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-white px-4 py-2 font-bold hover:bg-slate-100 cursor-pointer shadow-sm"
                >
                  <FileText className="h-5 w-5 text-emerald-700" /> Preview Routine Guide
                </button>
              </div>
            </div>

            {/* Prescribed Items Table */}
            <div className="p-5">
              <h3 className="text-lg font-black text-slate-900 mb-3">Prescribed Medicines</h3>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs uppercase">
                    <th className="p-3">Medicine</th>
                    <th className="p-3">Dose</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3">Food Instruction</th>
                    <th className="p-3 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {activeRx.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-slate-900">{it.medicine_name} {it.strength}</span>
                          {it.is_controlled && (
                            <span className="inline-flex items-center gap-1 rounded border border-red-700 bg-red-100 px-2 py-0.5 text-xs font-bold text-red-950">
                              <ShieldAlert className="h-3.5 w-3.5" /> Controlled
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{it.form}</span>
                      </td>
                      <td className="p-3 font-bold">{it.dose}</td>
                      <td className="p-3 font-semibold">{it.frequency_label}</td>
                      <td className="p-3 text-slate-600">{it.food_instruction ? FOOD_LABEL[it.food_instruction] : 'None'}</td>
                      <td className="p-3 text-right font-black text-lg">{it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dispense Panel */}
            <div className="border-t-4 border-slate-900 bg-slate-50 p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">Pharmacy Name</label>
                  <input
                    type="text"
                    value={counter.pharmacyName}
                    onChange={(e) => setCounter({ ...counter, pharmacyName: e.target.value })}
                    className="w-full rounded-lg border-2 border-slate-900 p-3 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">Chemist Name</label>
                  <input
                    type="text"
                    value={counter.chemistName}
                    onChange={(e) => setCounter({ ...counter, chemistName: e.target.value })}
                    className="w-full rounded-lg border-2 border-slate-900 p-3 font-semibold"
                  />
                </div>
                <button
                  type="button"
                  disabled={Boolean(blockReason) || !counter.pharmacyName || !counter.chemistName || activeRx.status !== 'ACTIVE'}
                  onClick={() => setDispenseRx(activeRx)}
                  className="rounded-lg bg-emerald-600 px-6 py-3.5 text-lg font-black text-white shadow hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  Fulfill & Dispense Medicines
                </button>
              </div>

              {hasControlled && activeRx.status === 'ACTIVE' && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border-2 border-amber-600 bg-amber-50 p-3 text-sm font-bold text-amber-950">
                  <ShieldAlert className="h-5 w-5 text-amber-700" />
                  <span>Controlled Medicine Notice: Prescription includes controlled drugs. Dispensing is permitted; verify patient ID and controlled-drug register entry.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border-4 border-slate-900">
            <p className="text-xl font-bold text-slate-600">No active prescription found for this patient.</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {guideRx && selectedPatient && (
        <RoutineGuideModal
          patient={selectedPatient}
          prescription={guideRx}
          onClose={() => setGuideRx(null)}
        />
      )}

      {dispenseRx && selectedPatient && (
        <ConfirmDispenseModal
          patient={selectedPatient}
          prescription={dispenseRx}
          counter={counter}
          onClose={() => setDispenseRx(null)}
          onDispensed={() => {
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}
