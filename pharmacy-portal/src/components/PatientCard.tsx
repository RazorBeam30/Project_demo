import { useState } from 'react'
import { ClipboardList, Eye, EyeOff, Phone, User } from 'lucide-react'
import { ageFromDob, formatPhone, maskPhone } from '../lib/dates'
import type { Patient } from '../lib/types'

interface Props {
  patient: Patient
  activeCount: number | null
}

export default function PatientCard({ patient, activeCount }: Props) {
  // Phone is masked by default; revealing is a deliberate action per patient.
  const [reveal, setReveal] = useState(false)

  return (
    <section
      aria-label="Patient overview"
      className="grid gap-4 rounded-2xl border-4 border-brand-900 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="flex items-start gap-3 lg:col-span-1">
        <User className="mt-1 h-8 w-8 shrink-0 text-brand-900" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-700">Patient</p>
          <p className="text-3xl font-extrabold leading-tight text-slate-900">{patient.full_name}</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Phone className="mt-1 h-8 w-8 shrink-0 text-brand-900" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-700">Phone</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {reveal ? formatPhone(patient.phone) : maskPhone(patient.phone)}
            </p>
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-pressed={reveal}
              className="inline-flex items-center gap-1 rounded-lg border-2 border-brand-900 px-2 py-1 text-sm font-bold text-brand-900 hover:bg-brand-100"
            >
              {reveal ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              {reveal ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-slate-700">Age</p>
        <p className="text-3xl font-extrabold text-slate-900">
          {ageFromDob(patient.date_of_birth)} <span className="text-xl font-bold">years</span>
        </p>
      </div>

      <div className="flex items-start gap-3">
        <ClipboardList className="mt-1 h-8 w-8 shrink-0 text-brand-900" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-700">Active prescriptions</p>
          <p className="text-3xl font-extrabold text-slate-900">{activeCount ?? '…'}</p>
        </div>
      </div>
    </section>
  )
}
