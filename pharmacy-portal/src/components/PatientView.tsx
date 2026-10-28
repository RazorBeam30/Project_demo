import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, FileText, Loader2 } from 'lucide-react'
import { getPrescriptions, logPatientView } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/dates'
import type { CounterDetails, DispenseResult, Patient, Prescription } from '../lib/types'
import { errMsg } from '../lib/util'
import ConfirmModal from './ConfirmModal'
import PatientCard from './PatientCard'
import PrescriptionSection from './PrescriptionSection'
import RoutineGuide from './RoutineGuide'

interface Props {
  patient: Patient
  counter: CounterDetails
  onCounterChange: (next: CounterDetails) => void
  onSuccess: (message: string) => void
}

export default function PatientView({ patient, counter, onCounterChange, onSuccess }: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [target, setTarget] = useState<Prescription | null>(null)
  const [guide, setGuide] = useState<Prescription | null>(null)

  useEffect(() => {
    let cancelled = false
    setPrescriptions(null)
    setError(null)
    getPrescriptions(patient.id)
      .then((data) => {
        if (!cancelled) setPrescriptions(data)
      })
      .catch((e) => {
        if (!cancelled) setError(errMsg(e))
      })
    void logPatientView(patient.id)
    return () => {
      cancelled = true
    }
  }, [patient.id])

  const reload = useCallback(() => {
    getPrescriptions(patient.id)
      .then(setPrescriptions)
      .catch((e) => setError(errMsg(e)))
  }, [patient.id])

  const handleDispensed = useCallback(
    (_result: DispenseResult) => {
      onSuccess(`Dispensed to ${patient.full_name}. Recorded in the log.`)
      reload()
    },
    [onSuccess, patient.full_name, reload],
  )

  const active = (prescriptions ?? []).filter((rx) => rx.status === 'ACTIVE')
  const past = (prescriptions ?? []).filter((rx) => rx.status !== 'ACTIVE')

  return (
    <div className="space-y-6">
      <PatientCard patient={patient} activeCount={prescriptions ? active.length : null} />

      {error && (
        <p role="alert" className="rounded-xl border-4 border-red-700 bg-red-100 p-4 text-xl font-bold text-red-950">
          {error}
        </p>
      )}

      {!prescriptions && !error && (
        <p className="flex items-center gap-3 text-xl font-semibold text-slate-900" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> Loading prescriptions…
        </p>
      )}

      {prescriptions && active.length === 0 && (
        <p className="rounded-xl border-4 border-brand-900 bg-white p-6 text-xl font-semibold text-slate-900">
          This patient has no active prescriptions.
        </p>
      )}

      {active.map((rx) => (
        <PrescriptionSection
          key={rx.id}
          prescription={rx}
          counter={counter}
          onCounterChange={onCounterChange}
          onStartDispense={() => setTarget(rx)}
          onShowGuide={() => setGuide(rx)}
        />
      ))}

      {past.length > 0 && (
        <section aria-label="Earlier prescriptions" className="rounded-2xl border-4 border-slate-400 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-slate-900">
            <ClipboardList className="h-6 w-6" aria-hidden="true" /> Earlier prescriptions
          </h2>
          <ul className="divide-y-2 divide-slate-200">
            {past.map((rx) => (
              <li key={rx.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {rx.items.map((i) => `${i.medicine_name} ${i.strength}`).join(', ')}
                  </p>
                  <p className="text-base text-slate-700">
                    {rx.prescriber_name} · issued {formatDate(rx.issued_on)} ·{' '}
                    <span className="font-bold">{rx.status}</span>
                    {rx.dispensed_at ? ` on ${formatDateTime(rx.dispensed_at)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGuide(rx)}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-500 px-3 py-1.5 text-base font-bold text-slate-900 hover:bg-slate-100"
                >
                  <FileText className="h-5 w-5" aria-hidden="true" /> Routine guide
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {target && (
        <ConfirmModal
          patient={patient}
          prescription={target}
          counter={counter}
          onClose={() => setTarget(null)}
          onDispensed={handleDispensed}
          onFailed={reload}
          onShowGuide={() => setGuide(target)}
        />
      )}

      {guide && (
        <RoutineGuide patient={patient} prescription={guide} counter={counter} onClose={() => setGuide(null)} />
      )}
    </div>
  )
}
