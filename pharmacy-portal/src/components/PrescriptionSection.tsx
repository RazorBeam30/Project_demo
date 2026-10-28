import { CalendarDays, FileText, Stethoscope } from 'lucide-react'
import { formatDate } from '../lib/dates'
import type { CounterDetails, Prescription } from '../lib/types'
import DispensePanel from './DispensePanel'
import PrescriptionTable from './PrescriptionTable'
import RefillBadge from './RefillBadge'

interface Props {
  prescription: Prescription
  counter: CounterDetails
  onCounterChange: (next: CounterDetails) => void
  onStartDispense: () => void
  onShowGuide: () => void
}

export default function PrescriptionSection({
  prescription,
  counter,
  onCounterChange,
  onStartDispense,
  onShowGuide,
}: Props) {
  return (
    <section
      aria-label={`Prescription from ${prescription.prescriber_name}, issued ${formatDate(prescription.issued_on)}`}
      className="overflow-hidden rounded-2xl border-4 border-brand-900 bg-white"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-brand-900 bg-brand-50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-lg text-slate-900">
          <span className="inline-flex items-center gap-2 font-bold">
            <Stethoscope className="h-6 w-6 text-brand-900" aria-hidden="true" />
            {prescription.prescriber_name}
          </span>
          {prescription.hospital_name && (
            <span className="inline-flex items-center gap-2 font-medium text-slate-700">
              <span className="text-brand-900 font-bold">🏥</span>
              {prescription.hospital_name}
            </span>
          )}
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-brand-900" aria-hidden="true" />
            Issued {formatDate(prescription.issued_on)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RefillBadge due={prescription.refill_due_date} />
          <button
            type="button"
            onClick={onShowGuide}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-900 bg-white px-4 py-2 text-lg font-bold text-brand-900 hover:bg-brand-100"
          >
            <FileText className="h-5 w-5" aria-hidden="true" />
            Preview routine guide
          </button>
        </div>
      </header>

      <PrescriptionTable items={prescription.items} />

      <DispensePanel
        prescription={prescription}
        counter={counter}
        onCounterChange={onCounterChange}
        onStart={onStartDispense}
      />
    </section>
  )
}
