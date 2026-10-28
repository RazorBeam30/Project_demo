import { useId } from 'react'
import { Ban, Info, Pill, ShieldAlert } from 'lucide-react'
import { getDispenseBlock } from '../lib/rules'
import type { CounterDetails, Prescription } from '../lib/types'

interface Props {
  prescription: Prescription
  counter: CounterDetails
  onCounterChange: (next: CounterDetails) => void
  onStart: () => void
}

export default function DispensePanel({ prescription, counter, onCounterChange, onStart }: Props) {
  const id = useId()
  const block = getDispenseBlock(prescription)
  const hasControlled = prescription.items.some((i) => i.is_controlled)
  const namesMissing = !counter.pharmacyName.trim() || !counter.chemistName.trim()
  const disabled = Boolean(block) || namesMissing
  const helpId = `${id}-help`

  const inputCls =
    'h-14 w-full rounded-lg border-2 border-brand-900 bg-white px-4 text-xl text-slate-900 placeholder:text-slate-600'

  return (
    <div className="border-t-4 border-brand-900 bg-brand-100 p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor={`${id}-pharmacy`} className="mb-1 block text-base font-bold text-slate-900">
            Pharmacy name
          </label>
          <input
            id={`${id}-pharmacy`}
            type="text"
            value={counter.pharmacyName}
            onChange={(e) => onCounterChange({ ...counter, pharmacyName: e.target.value })}
            placeholder="e.g. City Care Pharmacy"
            autoComplete="off"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor={`${id}-chemist`} className="mb-1 block text-base font-bold text-slate-900">
            Chemist name
          </label>
          <input
            id={`${id}-chemist`}
            type="text"
            value={counter.chemistName}
            onChange={(e) => onCounterChange({ ...counter, chemistName: e.target.value })}
            placeholder="Name of the dispensing chemist"
            autoComplete="off"
            className={inputCls}
          />
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          aria-describedby={disabled ? helpId : undefined}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-xl font-extrabold text-white shadow hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:shadow-none"
        >
          <Pill className="h-6 w-6" aria-hidden="true" />
          {'Fulfill & Dispense Medicines'}
        </button>
      </div>

      {block && (
        <p
          id={helpId}
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border-2 border-red-700 bg-red-100 p-3 text-lg font-semibold text-red-950"
        >
          <Ban className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          {block}
        </p>
      )}
      {hasControlled && !block && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border-2 border-amber-600 bg-amber-50 p-3 text-lg font-bold text-amber-950">
          <ShieldAlert className="h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
          <span>Notice: This prescription contains controlled medicine. Verify patient identity and register entry before dispensing.</span>
        </p>
      )}
      {!block && namesMissing && (
        <p id={helpId} className="mt-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Info className="h-6 w-6 shrink-0" aria-hidden="true" />
          Enter the pharmacy name and chemist name to continue.
        </p>
      )}
    </div>
  )
}
