import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Calendar,
  CalendarCheck,
  Clock,
  HeartPulse,
  Info,
  Moon,
  PhoneCall,
  Printer,
  Sun,
  Sunrise,
  Sunset,
  User,
  Utensils,
  X,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { formatDate } from '../lib/dates'
import { FOOD_LABEL, describeDuration } from '../lib/labels'
import type { CounterDetails, Patient, Prescription, PrescriptionItem, Slot } from '../lib/types'

interface Props {
  patient: Patient
  prescription: Prescription
  counter: CounterDetails
  onClose: () => void
}

const SLOTS: Slot[] = ['MORNING', 'AFTERNOON', 'EVENING', 'BEDTIME']

function calculateAge(dob: string): string {
  if (!dob) return '–'
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age > 0 ? `${age} years` : '–'
}

function PackMiniSvg({ name, strength }: { name: string; strength: string }) {
  return (
    <svg viewBox="0 0 100 68" className="h-full w-full" role="img" aria-label={`${name} ${strength}`}>
      <rect x="3" y="3" width="94" height="62" rx="6" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2" />
      <rect x="3" y="3" width="94" height="18" rx="5" fill="#0284C7" />
      <circle cx="16" cy="12" r="4" fill="#FFFFFF" />
      <text x="50" y="15" textAnchor="middle" fontSize="9" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="bold">
        Rx MEDICINE
      </text>
      <text
        x="50"
        y="38"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#0F172A"
        fontFamily="sans-serif"
      >
        {name.length > 9 ? name.substring(0, 9) : name}
      </text>
      <text x="50" y="53" textAnchor="middle" fontSize="9" fill="#0284C7" fontWeight="700" fontFamily="sans-serif">
        {strength}
      </text>
    </svg>
  )
}

function formatDurationText(item: PrescriptionItem, issuedOn: string): ReactNode {
  const dur = describeDuration(item)
  if (item.duration_days) {
    const end = item.end_date ? formatDate(item.end_date) : null
    return (
      <div>
        <div className="font-bold">{dur.text}</div>
        {end && <div className="text-xs text-slate-500 font-medium">({formatDate(issuedOn)} – {end})</div>}
      </div>
    )
  }
  if (item.is_long_term) {
    return (
      <div>
        <div className="font-bold">Long term</div>
        {dur.review && <div className="text-xs text-slate-500 font-medium">({dur.review})</div>}
      </div>
    )
  }
  return <div>{dur.text}</div>
}

export default function RoutineGuide({ patient, prescription, counter, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pharmacy = counter.pharmacyName.trim() || prescription.hospital_name || 'MedMitra Pharmacy (Central Branch)'

  return createPortal(
    <div
      className="guide-portal fixed inset-0 z-50 overflow-y-auto bg-slate-100"
      role="dialog"
      aria-modal="true"
      aria-label="Daily medicine routine"
    >
      {/* Top action bar (hidden during print) */}
      <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b-2 border-slate-700 bg-slate-900 px-6 py-3.5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-white">
            <HeartPulse className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">MedMitra Patient Routine Guide</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-base font-bold text-white shadow transition hover:bg-sky-400 active:scale-95"
          >
            <Printer className="h-5 w-5" aria-hidden="true" /> Print Routine Guide
          </button>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-400 bg-slate-800 px-4 py-2 text-base font-semibold text-white hover:bg-slate-700 active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden="true" /> Close
          </button>
        </div>
      </div>

      {/* Routine Guide Paper Document */}
      <div className="mx-auto my-6 max-w-5xl rounded-xl border border-slate-300 bg-white p-6 shadow-xl sm:p-8 print:my-0 print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none">
        {/* Header matching user reference image */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-200 pb-5">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white shadow-sm">
                <HeartPulse className="h-7 w-7" />
              </div>
              <div>
                <div className="text-2xl font-black leading-tight text-slate-900">MedMitra</div>
                <div className="text-xs font-bold tracking-wide text-sky-600">
                  Right Medicine • Right Time • Better Health
                </div>
              </div>
            </div>
            <div className="hidden h-10 w-0.5 bg-slate-300 sm:block" />
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">Your Medication Routine</h1>
              <p className="text-base font-bold text-slate-600">Patient Checklist Guide</p>
            </div>
          </div>
          <div className="max-w-xs rounded-lg border-l-4 border-sky-600 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
            <strong className="text-slate-900">Dear Patient,</strong> This guide shows you what medicines to take,
            when to take them, and for how long. Please keep it safe and refer to it daily.
          </div>
        </div>

        {/* Patient Details Banner */}
        <div className="my-5 grid grid-cols-1 gap-3 rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Patient Name</div>
              <div className="text-base font-extrabold text-slate-900">{patient.full_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Age</div>
              <div className="text-base font-extrabold text-slate-900">{calculateAge(patient.date_of_birth)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Prescription Issued On</div>
              <div className="text-base font-extrabold text-slate-900">{formatDate(prescription.issued_on)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Pharmacy</div>
              <div className="text-base font-extrabold text-slate-900">{pharmacy}</div>
            </div>
          </div>
        </div>

        {/* Tabular Medication Routine with 1-0-1-0 format and Manual pen verification */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-slate-900 print:w-full print:table-auto">
            <thead>
              <tr className="border border-[#0B3A60] bg-[#0F3B66] text-white">
                <th className="border border-[#0B3A60] px-2 py-3 text-center text-xs font-black uppercase tracking-wider print:px-1 print:py-1.5 print:text-[11px]" style={{ width: '38px' }}>
                  #
                </th>
                <th className="border border-[#0B3A60] px-3 py-3 text-left text-xs font-black uppercase tracking-wider print:px-2 print:py-1.5 print:text-[11px]">
                  Medicine & Image
                </th>
                <th className="border border-[#0B3A60] px-2 py-3 text-center text-xs font-black uppercase tracking-wider print:px-1 print:py-1.5 print:text-[11px]" style={{ width: '75px' }}>
                  Dose
                </th>
                <th className="border border-[#0B3A60] px-3 py-3 text-center text-xs font-black uppercase tracking-wider print:px-2 print:py-1.5 print:text-[11px]" style={{ minWidth: '190px' }}>
                  How Many Times a Day<br /><span className="text-[10px] print:text-[9px] font-bold normal-case opacity-90">(1-0-1-0)</span>
                </th>
                <th className="border border-[#0B3A60] px-2 py-3 text-center text-xs font-black uppercase tracking-wider print:px-1 print:py-1.5 print:text-[11px]" style={{ minWidth: '120px' }}>
                  Food Instruction
                </th>
                <th className="border border-[#0B3A60] px-2 py-3 text-center text-xs font-black uppercase tracking-wider print:px-1 print:py-1.5 print:text-[11px]" style={{ minWidth: '120px' }}>
                  Duration
                </th>
                <th className="border border-[#0B3A60] px-3 py-3 text-left text-xs font-black uppercase tracking-wider print:px-2 print:py-1.5 print:text-[11px]" style={{ minWidth: '130px' }}>
                  Special Instructions
                </th>
                <th className="border border-[#0B3A60] px-2 py-3 text-center text-xs font-black uppercase tracking-wider print:px-1 print:py-1.5 print:text-[11px]" style={{ width: '80px' }}>
                  Manual Checklist<br /><span className="text-[10px] print:text-[9px] font-bold normal-case opacity-90">(Check with pen)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {prescription.items.map((item, idx) => {
                const slots = SLOTS.map((s) => (item.schedule_slots.includes(s) ? 1 : 0))
                return (
                  <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} print:bg-white`}>
                    <td className="border border-slate-300 px-2 py-3 text-center align-middle print:px-1 print:py-2">
                      <span className="inline-flex h-8 w-8 print:h-7 print:w-7 items-center justify-center rounded-full bg-emerald-600 font-extrabold text-white shadow-sm print:text-sm">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="border border-slate-300 px-3 py-3 align-middle print:px-2 print:py-2">
                      <div className="flex items-center gap-3 print:gap-2">
                        <div className="flex h-12 w-16 print:h-10 print:w-14 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 p-0.5">
                          {item.product_image_url ? (
                            <img
                              src={item.product_image_url}
                              alt={item.medicine_name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <PackMiniSvg name={item.medicine_name} strength={item.strength} />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xl print:text-base font-black text-slate-950 leading-tight tracking-tight">{item.medicine_name}</span>
                            {item.is_controlled && (
                              <span className="inline-flex items-center rounded border border-red-600 bg-red-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-800 print:border-slate-500 print:bg-slate-100 print:text-slate-800">
                                Controlled
                              </span>
                            )}
                          </div>
                          <div className="text-sm print:text-xs font-bold text-slate-700">
                            {item.strength} {item.form}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2 py-3 text-center align-middle font-black text-slate-950 text-base print:px-1 print:py-2 print:text-sm">
                      {item.form && item.form.toLowerCase() !== 'tablet' ? `${item.dose} ${item.form}` : item.dose}
                    </td>
                    <td className="border border-slate-300 px-3 py-3 text-center align-middle print:px-2 print:py-2" style={{ minWidth: '190px' }}>
                      <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 print:gap-2 text-center">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <Sunrise className="h-4 w-4 print:h-4 print:w-4 text-amber-500" />
                          <span
                            className={`inline-flex h-8 w-8 print:h-7 print:w-7 shrink-0 items-center justify-center rounded-md text-base print:text-sm font-black ${
                              slots[0]
                                ? 'border-2 border-emerald-500 bg-emerald-100 text-emerald-900 font-black'
                                : 'border border-slate-300 bg-slate-100 text-slate-400 font-bold'
                            }`}
                          >
                            {slots[0]}
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <Sun className="h-4 w-4 print:h-4 print:w-4 text-amber-500" />
                          <span
                            className={`inline-flex h-8 w-8 print:h-7 print:w-7 shrink-0 items-center justify-center rounded-md text-base print:text-sm font-black ${
                              slots[1]
                                ? 'border-2 border-emerald-500 bg-emerald-100 text-emerald-900 font-black'
                                : 'border border-slate-300 bg-slate-100 text-slate-400 font-bold'
                            }`}
                          >
                            {slots[1]}
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <Sunset className="h-4 w-4 print:h-4 print:w-4 text-amber-600" />
                          <span
                            className={`inline-flex h-8 w-8 print:h-7 print:w-7 shrink-0 items-center justify-center rounded-md text-base print:text-sm font-black ${
                              slots[2]
                                ? 'border-2 border-emerald-500 bg-emerald-100 text-emerald-900 font-black'
                                : 'border border-slate-300 bg-slate-100 text-slate-400 font-bold'
                            }`}
                          >
                            {slots[2]}
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <Moon className="h-4 w-4 print:h-4 print:w-4 text-indigo-600" />
                          <span
                            className={`inline-flex h-8 w-8 print:h-7 print:w-7 shrink-0 items-center justify-center rounded-md text-base print:text-sm font-black ${
                              slots[3]
                                ? 'border-2 border-emerald-500 bg-emerald-100 text-emerald-900 font-black'
                                : 'border border-slate-300 bg-slate-100 text-slate-400 font-bold'
                            }`}
                          >
                            {slots[3]}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2 py-3 text-center align-middle font-bold text-slate-900 text-sm print:px-1 print:py-2 print:text-xs">
                      <div className="flex items-center justify-center gap-1">
                        <Utensils className="h-4 w-4 print:h-3.5 print:w-3.5 text-sky-600 shrink-0" />
                        <span className="font-bold">{item.food_instruction ? FOOD_LABEL[item.food_instruction] : '–'}</span>
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2 py-3 text-center align-middle text-sm print:px-1 print:py-2 print:text-xs font-bold text-slate-900">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="h-4 w-4 print:h-3.5 print:w-3.5 text-sky-600 shrink-0" />
                        <div>{formatDurationText(item, prescription.issued_on)}</div>
                      </div>
                    </td>
                    <td className="border border-slate-300 px-3 py-3 align-middle text-sm print:px-2 print:py-2 print:text-xs">
                      {item.additional_instructions ? (
                        <div className="flex items-start gap-1 font-semibold text-slate-900">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
                          <span>{item.additional_instructions}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">–</span>
                      )}
                    </td>
                    {/* Manual checklist empty space for human verification with pen */}
                    <td className="border border-slate-300 px-2 py-3 text-center align-middle print:px-1 print:py-2">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div
                          className="h-8 w-8 print:h-7 print:w-7 rounded border-2 border-slate-900 bg-white shadow-inner"
                          title="Empty space for manual verification with pen"
                        />
                        <span className="text-[10px] print:text-[8px] font-black uppercase tracking-wider text-slate-700">
                          Tick / Date
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Support Cards matching the design */}
        <div className="mt-6 print:mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          {/* Medicine Timing Guide */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-800">
              <Clock className="h-4 w-4 text-sky-600" /> Medicine Timing Guide
            </h3>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between border-b border-dashed border-slate-300 pb-1">
                <span className="font-bold text-amber-600">Morning</span>
                <span className="font-semibold text-slate-700">6:00 AM – 10:00 AM</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-slate-300 pb-1">
                <span className="font-bold text-amber-600">Afternoon</span>
                <span className="font-semibold text-slate-700">11:00 AM – 3:00 PM</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-slate-300 pb-1">
                <span className="font-bold text-amber-600">Evening</span>
                <span className="font-semibold text-slate-700">4:00 PM – 9:00 PM</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-slate-300 pb-1">
                <span className="font-bold text-indigo-600">Night</span>
                <span className="font-semibold text-slate-700">9:00 PM – 12:00 AM</span>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-center text-[11px] font-extrabold text-emerald-800">
              1 - 0 - 1 - 0 = Morning - Afternoon - Evening - Night
            </div>
          </div>

          {/* Refill Reminder */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-800">
              <CalendarCheck className="h-4 w-4 text-emerald-600" /> Refill Reminder
            </h3>
            <p className="mt-2 text-xs text-slate-600">Your next refill is due around:</p>
            <div className="my-2 rounded-lg bg-sky-100 px-3 py-1.5 text-center text-lg font-black text-sky-800">
              {formatDate(prescription.refill_due_date)}
            </div>
            <p className="text-[11px] leading-tight text-slate-500">
              Please contact the pharmacy 3 days before this date to avoid running out of essential medicines.
            </p>
          </div>

          {/* Important Notes */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-800">
              <AlertCircle className="h-4 w-4 text-rose-600" /> Important Notes
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-snug text-slate-700">
              <li>Do not stop any medicine without consulting your doctor.</li>
              <li>If you miss a dose, take it as soon as you remember unless close to next dose.</li>
              <li>Do not double the dose.</li>
              <li>Keep this guide with you at all times.</li>
            </ul>
          </div>

          {/* Need Help */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-800">
              <PhoneCall className="h-4 w-4 text-sky-600" /> Need Help?
            </h3>
            <div className="mt-2 text-xs leading-normal text-slate-700">
              <div className="font-semibold text-slate-500">Pharmacy Helpline:</div>
              <div className="text-base font-black text-sky-700">1800 123 4567</div>
              <div className="mt-1 font-semibold text-slate-500">Doctor:</div>
              <div className="font-bold text-slate-900">{prescription.prescriber_name}</div>
              <div className="mt-2 text-xs font-bold italic text-teal-700">Take care! ♡</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-slate-200 pt-3 text-center text-xs font-bold text-slate-500">
          MedMitra — Your Health, Our Priority
        </div>
      </div>
    </div>,
    document.body,
  )
}
