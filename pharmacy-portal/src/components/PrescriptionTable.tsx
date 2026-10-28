import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { FOOD_LABEL, SLOT_LABEL, describeDuration } from '../lib/labels'
import type { PrescriptionItem } from '../lib/types'

export default function PrescriptionTable({ items }: { items: PrescriptionItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <caption className="sr-only">Medicines on this prescription</caption>
        <thead>
          <tr className="bg-brand-900 text-base uppercase tracking-wide text-white">
            <th scope="col" className="px-4 py-3 font-bold">Medicine</th>
            <th scope="col" className="px-4 py-3 font-bold">Dose</th>
            <th scope="col" className="px-4 py-3 font-bold">How often</th>
            <th scope="col" className="px-4 py-3 font-bold">Food</th>
            <th scope="col" className="px-4 py-3 font-bold">Duration</th>
            <th scope="col" className="px-4 py-3 text-right font-bold">Qty</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-emerald-200 bg-white">
          {items.map((it) => {
            const d = describeDuration(it)
            const showImage = it.product_image_verified && it.product_image_url
            return (
              <tr key={it.id} className="align-top">
                <td className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    {showImage && (
                      <img
                        src={it.product_image_url as string}
                        alt={`Verified pack image of ${it.medicine_name} ${it.strength}`}
                        className="h-16 w-24 shrink-0 rounded-md border border-slate-300 bg-white object-contain"
                      />
                    )}
                    <div>
                      <p className="text-2xl font-extrabold leading-tight text-slate-900">
                        {it.medicine_name} <span className="whitespace-nowrap">{it.strength}</span>
                      </p>
                      <p className="text-lg text-slate-700">{it.form}</p>
                      {it.is_controlled && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-md border-2 border-red-700 bg-red-100 px-2 py-0.5 text-base font-bold text-red-950">
                          <ShieldAlert className="h-5 w-5" aria-hidden="true" /> Controlled medicine
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-xl font-semibold text-slate-900">{it.dose}</td>
                <td className="px-4 py-4">
                  <p className="text-xl font-semibold text-slate-900">{it.frequency_label}</p>
                  {it.schedule_slots.length > 0 && (
                    <p className="text-base text-slate-700">
                      {it.schedule_slots.map((s) => SLOT_LABEL[s]).join(' · ')}
                    </p>
                  )}
                </td>
                <td className="px-4 py-4 text-xl text-slate-900">
                  {it.food_instruction ? FOOD_LABEL[it.food_instruction] : <span className="text-slate-600">None given</span>}
                </td>
                <td className="px-4 py-4">
                  {d.missing ? (
                    <p className="inline-flex items-center gap-1 rounded-md border-2 border-amber-600 bg-amber-100 px-2 py-0.5 text-lg font-bold text-amber-950">
                      <AlertTriangle className="h-5 w-5" aria-hidden="true" /> Duration missing
                    </p>
                  ) : (
                    <p className="text-xl font-semibold text-slate-900">{d.text}</p>
                  )}
                  {d.review && <p className="text-base text-slate-700">{d.review}</p>}
                </td>
                <td className="px-4 py-4 text-right text-2xl font-extrabold tabular-nums text-slate-900">{it.quantity}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
