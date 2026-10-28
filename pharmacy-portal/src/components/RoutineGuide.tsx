import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  Clock,
  Info,
  Pill,
  Printer,
  Sun,
  Sunrise,
  Sunset,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react'
import { formatDate, todayISO } from '../lib/dates'
import { FOOD_LABEL, SLOT_LABEL, SLOT_ORDER, describeDuration } from '../lib/labels'
import type { CounterDetails, Patient, Prescription, PrescriptionItem, Slot } from '../lib/types'

const SLOT_ICON: Record<Slot, LucideIcon> = {
  MORNING: Sunrise,
  AFTERNOON: Sun,
  EVENING: Sunset,
  BEDTIME: BedDouble,
}

interface Props {
  patient: Patient
  prescription: Prescription
  counter: CounterDetails
  onClose: () => void
}

/**
 * Patient-facing daily routine. Every time slot, food instruction, duration
 * and instruction comes from the authorised prescription. Nothing is
 * assumed: an empty slot says nothing is scheduled, and a missing duration
 * says it was not specified.
 */
export default function RoutineGuide({ patient, prescription, counter, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const unscheduled = prescription.items.filter((i) => i.schedule_slots.length === 0)
  const pharmacy = counter.pharmacyName.trim()
  const chemist = counter.chemistName.trim()

  return createPortal(
    <div
      className="guide-portal fixed inset-0 z-50 overflow-y-auto bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Daily medicine routine"
    >
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b-4 border-brand-900 bg-brand-900 px-4 py-3 text-white">
        <p className="text-lg font-bold">Patient routine guide</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-lg font-bold text-brand-900 hover:bg-brand-100"
          >
            <Printer className="h-5 w-5" aria-hidden="true" /> Print
          </button>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="inline-flex items-center gap-2 rounded-lg border-2 border-white px-4 py-2 text-lg font-bold hover:bg-brand-700"
          >
            <X className="h-5 w-5" aria-hidden="true" /> Close
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-8 text-slate-900 sm:px-8">
        <header className="border-b-4 border-slate-900 pb-5">
          <h1 className="text-4xl font-extrabold tracking-tight">YOUR DAILY MEDICINE ROUTINE</h1>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-xl sm:grid-cols-2">
            <HeaderRow label="Patient" value={patient.full_name} />
            <HeaderRow label="Date issued" value={formatDate(prescription.issued_on)} />
            <HeaderRow label="Prescribed by" value={prescription.prescriber_name} />
            {pharmacy && <HeaderRow label="Pharmacy" value={pharmacy} />}
            <HeaderRow label="Guide printed" value={formatDate(todayISO())} />
          </dl>
        </header>

        <p className="mt-6 flex items-start gap-3 rounded-xl border-4 border-slate-900 bg-slate-100 p-4 text-xl font-semibold">
          <Info className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
          <span>
            Always read the medicine name and strength printed on your pack. Do not identify a medicine by its colour
            or shape. If your pack does not match this guide, ask your pharmacist before taking it.
          </span>
        </p>

        <div className="mt-8 space-y-10">
          {SLOT_ORDER.map((slot) => {
            const Icon = SLOT_ICON[slot]
            const items = prescription.items.filter((i) => i.schedule_slots.includes(slot))
            return (
              <section key={slot} aria-labelledby={`slot-${slot}`}>
                <h2 id={`slot-${slot}`} className="flex items-center gap-4 text-3xl font-extrabold">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
                    <Icon className="h-8 w-8" aria-hidden="true" />
                  </span>
                  {SLOT_LABEL[slot]}
                </h2>
                <div className="mt-4 space-y-4 border-l-8 border-slate-900 pl-4 sm:pl-6">
                  {items.length === 0 ? (
                    <p className="text-xl text-slate-700">No medicines are scheduled for this time.</p>
                  ) : (
                    items.map((it) => <MedicineCard key={`${slot}-${it.id}`} item={it} />)
                  )}
                </div>
              </section>
            )
          })}

          {unscheduled.length > 0 && (
            <section aria-labelledby="slot-other">
              <h2 id="slot-other" className="flex items-center gap-4 text-3xl font-extrabold">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Clock className="h-8 w-8" aria-hidden="true" />
                </span>
                Other / as directed
              </h2>
              <div className="mt-4 space-y-4 border-l-8 border-slate-900 pl-4 sm:pl-6">
                {unscheduled.map((it) => (
                  <MedicineCard key={`other-${it.id}`} item={it} />
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="mt-10 border-t-4 border-slate-900 pt-5 text-lg">
          <p className="font-semibold">
            This guide only repeats what your doctor prescribed. It does not replace the advice of your doctor or
            pharmacist. If you have any questions, ask your pharmacist.
          </p>
          {chemist && (
            <p className="mt-3">
              Dispensed by <span className="font-bold">{chemist}</span>
              {pharmacy ? `, ${pharmacy}` : ''}
            </p>
          )}
        </footer>
      </article>
    </div>,
    document.body,
  )
}

function HeaderRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-base font-bold uppercase tracking-wide text-slate-700">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  )
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-1 h-7 w-7 shrink-0" aria-hidden="true" />
      <div>
        <dt className="text-base font-bold uppercase tracking-wide text-slate-700">{label}</dt>
        <dd className="text-xl font-semibold">{children}</dd>
      </div>
    </div>
  )
}

function MedicineCard({ item }: { item: PrescriptionItem }) {
  const duration = describeDuration(item)
  const showImage = item.product_image_verified && item.product_image_url

  return (
    <article className="break-inside-avoid rounded-2xl border-4 border-slate-900 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="shrink-0 sm:w-44">
          {showImage ? (
            <figure>
              <img
                src={item.product_image_url as string}
                alt={`Pack of ${item.medicine_name} ${item.strength}`}
                className="h-28 w-full rounded-lg border-2 border-slate-400 bg-white object-contain"
              />
              <figcaption className="mt-1 text-sm text-slate-700">
                Picture of your pack. Check the name and strength printed on it.
              </figcaption>
            </figure>
          ) : (
            <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-500 p-2 text-center text-slate-700">
              <Pill className="h-8 w-8" aria-hidden="true" />
              <span className="text-sm font-semibold">No picture. Check the name printed on your pack.</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-3xl font-extrabold leading-tight">
            {item.medicine_name} <span className="whitespace-nowrap">{item.strength}</span>
          </h3>
          <p className="text-lg text-slate-700">{item.form}</p>

          <dl className="mt-4 space-y-3">
            <Row icon={Pill} label="Dose">
              {item.dose}
            </Row>
            <Row icon={Clock} label="How often">
              {item.frequency_label}
            </Row>
            {item.food_instruction && (
              <Row icon={Utensils} label="Food">
                {FOOD_LABEL[item.food_instruction]}
              </Row>
            )}
            <Row icon={CalendarDays} label="Treatment period">
              {duration.missing ? (
                <span className="inline-flex items-start gap-2">
                  <AlertTriangle className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
                  <span>Not specified. Please ask your doctor or pharmacist how long to take this medicine.</span>
                </span>
              ) : (
                duration.text
              )}
            </Row>
            {duration.review && (
              <Row icon={CalendarDays} label="Review">
                {duration.review}
              </Row>
            )}
            {item.additional_instructions && (
              <Row icon={Info} label="Extra instructions">
                {item.additional_instructions}
              </Row>
            )}
          </dl>
        </div>
      </div>
    </article>
  )
}
