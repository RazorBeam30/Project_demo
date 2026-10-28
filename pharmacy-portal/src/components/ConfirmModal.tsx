import { useEffect, useId, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Pill, Printer, ShieldAlert, X } from 'lucide-react'
import { dispensePrescription } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/dates'
import { describeDuration } from '../lib/labels'
import type { CounterDetails, DispenseResult, Patient, Prescription } from '../lib/types'
import { errMsg } from '../lib/util'

interface Props {
  patient: Patient
  prescription: Prescription
  counter: CounterDetails
  onClose: () => void
  onDispensed: (result: DispenseResult) => void
  /** Called when dispensing failed, so the screen can refresh stale data. */
  onFailed: () => void
  onShowGuide: () => void
}

export default function ConfirmModal({
  patient,
  prescription,
  counter,
  onClose,
  onDispensed,
  onFailed,
  onShowGuide,
}: Props) {
  const titleId = useId()
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DispenseResult | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const missingDuration = prescription.items.filter((i) => describeDuration(i).missing)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const r = await dispensePrescription({
        prescriptionId: prescription.id,
        pharmacyName: counter.pharmacyName,
        chemistName: counter.chemistName,
        productsVerified: checked,
      })
      setResult(r)
      onDispensed(r)
    } catch (e) {
      setError(errMsg(e))
      onFailed()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-t-2xl border-4 border-brand-900 bg-white shadow-2xl sm:rounded-2xl"
      >
        {result ? (
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-14 w-14 shrink-0 text-brand-600" aria-hidden="true" />
              <div>
                <h2 id={titleId} className="text-3xl font-extrabold text-brand-900">
                  Medicines dispensed
                </h2>
                <p className="mt-1 text-xl text-slate-900">
                  {patient.full_name} · {formatDateTime(result.dispensedAt)}
                </p>
                <p className="mt-1 text-lg text-slate-700">
                  Recorded by {counter.chemistName.trim()} at {counter.pharmacyName.trim()}.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onShowGuide}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-brand-900 bg-white px-6 text-xl font-bold text-brand-900 hover:bg-brand-100"
              >
                <Printer className="h-6 w-6" aria-hidden="true" />
                Print routine guide
              </button>
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="inline-flex h-14 items-center justify-center rounded-lg bg-brand-900 px-8 text-xl font-extrabold text-white hover:bg-brand-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-3xl font-extrabold text-brand-900">
                  Confirm dispensing
                </h2>
                <p className="mt-1 text-xl text-slate-900">
                  {patient.full_name} · Prescription from {prescription.prescriber_name},{' '}
                  {formatDate(prescription.issued_on)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className="rounded-lg border-2 border-slate-400 p-2 text-slate-800 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <ul className="mt-5 divide-y-2 divide-emerald-200 rounded-xl border-2 border-brand-900">
              {prescription.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 p-4">
                  {it.product_image_verified && it.product_image_url ? (
                    <img
                      src={it.product_image_url}
                      alt={`Verified pack image of ${it.medicine_name} ${it.strength}`}
                      className="h-16 w-24 shrink-0 rounded-md border border-slate-300 bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-slate-400 text-slate-600">
                      <Pill className="h-7 w-7" aria-hidden="true" />
                      <span className="sr-only">No verified pack image</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-2xl font-extrabold text-slate-900">
                        {it.medicine_name} {it.strength}
                      </p>
                      {it.is_controlled && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-red-700 bg-red-100 px-2 py-0.5 text-sm font-bold text-red-950">
                          <ShieldAlert className="h-4 w-4 text-red-700" aria-hidden="true" /> Controlled medicine
                        </span>
                      )}
                    </div>
                    <p className="text-lg text-slate-800">
                      {it.dose} · {it.frequency_label}
                    </p>
                  </div>
                  <p className="text-right text-lg font-bold text-slate-900">
                    Qty
                    <span className="block text-3xl tabular-nums">{it.quantity}</span>
                  </p>
                </li>
              ))}
            </ul>

            {prescription.items.some((i) => i.is_controlled) && (
              <p className="mt-4 flex items-start gap-2 rounded-lg border-2 border-amber-600 bg-amber-50 p-3 text-lg font-semibold text-amber-950">
                <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
                <span>
                  <strong>Controlled Medicine:</strong> This prescription includes controlled drugs. Record the dispensing in your controlled drugs register according to regulation.
                </span>
              </p>
            )}

            {missingDuration.length > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-lg border-2 border-amber-600 bg-amber-100 p-3 text-lg font-semibold text-amber-950">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
                <span>
                  No duration is specified for {missingDuration.map((i) => i.medicine_name).join(', ')}. Clarify with
                  the prescriber if needed. The patient guide will say the duration was not specified.
                </span>
              </p>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border-2 border-brand-900 bg-brand-50 p-4">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 h-7 w-7 shrink-0 accent-emerald-700"
              />
              <span className="text-xl font-semibold text-slate-900">
                I have checked that every product I am handing over matches the name and strength listed above.
              </span>
            </label>

            {error && (
              <p role="alert" className="mt-4 rounded-lg border-2 border-red-700 bg-red-100 p-3 text-lg font-semibold text-red-950">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="h-14 rounded-lg border-2 border-slate-500 bg-white px-6 text-xl font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!checked || busy}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-brand-600 px-8 text-xl font-extrabold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
              >
                {busy ? (
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                ) : (
                  <Pill className="h-6 w-6" aria-hidden="true" />
                )}
                {busy ? 'Recording…' : 'Confirm & Dispense'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
