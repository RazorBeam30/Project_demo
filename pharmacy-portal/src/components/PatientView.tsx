import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  Stethoscope,
} from 'lucide-react'
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

interface DoctorGroup {
  doctorKey: string
  doctorName: string
  hospitalName: string
  visits: Prescription[] // Sorted latest to oldest
  latestVisitDate: string
}

export default function PatientView({ patient, counter, onCounterChange, onSuccess }: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDoctorKey, setSelectedDoctorKey] = useState<string | null>(null)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [target, setTarget] = useState<Prescription | null>(null)
  const [guide, setGuide] = useState<Prescription | null>(null)

  // Group prescriptions by Doctor Name + Hospital Name, sorted latest visit to oldest
  const doctorGroups = useMemo<DoctorGroup[]>(() => {
    if (!prescriptions || prescriptions.length === 0) return []

    const map = new Map<string, { doctorName: string; hospitalName: string; visits: Prescription[] }>()

    for (const rx of prescriptions) {
      const doc = rx.prescriber_name || 'Unknown Doctor'
      const hosp = rx.hospital_name || 'Hospital / Clinic not specified'
      const key = `${doc}__${hosp}`

      if (!map.has(key)) {
        map.set(key, { doctorName: doc, hospitalName: hosp, visits: [] })
      }
      map.get(key)!.visits.push(rx)
    }

    const groups: DoctorGroup[] = []
    for (const [key, val] of map.entries()) {
      // Sort visits latest to oldest
      const sortedVisits = [...val.visits].sort((a, b) => (a.issued_on < b.issued_on ? 1 : -1))
      groups.push({
        doctorKey: key,
        doctorName: val.doctorName,
        hospitalName: val.hospitalName,
        visits: sortedVisits,
        latestVisitDate: sortedVisits[0]?.issued_on ?? '',
      })
    }

    // Sort doctor groups by the date of their latest visit (newest first)
    groups.sort((a, b) => (a.latestVisitDate < b.latestVisitDate ? 1 : -1))
    return groups
  }, [prescriptions])

  useEffect(() => {
    let cancelled = false
    setPrescriptions(null)
    setSelectedDoctorKey(null)
    setSelectedVisitId(null)
    setError(null)

    getPrescriptions(patient.id)
      .then((data) => {
        if (!cancelled) {
          const sorted = [...data].sort((a, b) => (a.issued_on < b.issued_on ? 1 : -1))
          setPrescriptions(sorted)
          // Keep dropdowns initially closed
          setSelectedDoctorKey(null)
          setSelectedVisitId(null)
        }
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
      .then((data) => {
        const sorted = [...data].sort((a, b) => (a.issued_on < b.issued_on ? 1 : -1))
        setPrescriptions(sorted)
      })
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
  const selectedRx = (prescriptions ?? []).find((rx) => rx.id === selectedVisitId) ?? null

  const handleSelectDoctor = (group: DoctorGroup) => {
    if (selectedDoctorKey === group.doctorKey) {
      // Toggle collapse/close when clicked again
      setSelectedDoctorKey(null)
      setSelectedVisitId(null)
      return
    }
    setSelectedDoctorKey(group.doctorKey)
    if (group.visits.length > 0) {
      setSelectedVisitId(group.visits[0].id)
    }
  }

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
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> Loading doctor visits…
        </p>
      )}

      {prescriptions && prescriptions.length === 0 && (
        <p className="rounded-xl border-4 border-brand-900 bg-white p-6 text-xl font-semibold text-slate-900">
          This patient has no recorded visits or prescriptions.
        </p>
      )}

      {/* Main Doctors & Visits Interface */}
      {prescriptions && prescriptions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Consulting Doctors & Clinics</h2>
              <p className="text-sm font-semibold text-slate-500">
                Select a doctor below to see all visit dates, then click a date to view the full prescription details.
              </p>
            </div>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-black text-brand-900">
              {doctorGroups.length} {doctorGroups.length === 1 ? 'Doctor' : 'Doctors'}
            </span>
          </div>

          {/* Doctor tabs stacked one below the other */}
          <div className="space-y-4">
            {doctorGroups.map((group) => {
              const isDoctorSelected = selectedDoctorKey === group.doctorKey

              return (
                <div
                  key={group.doctorKey}
                  className={`overflow-hidden rounded-2xl border-4 transition-all ${
                    isDoctorSelected
                      ? 'border-brand-900 bg-white shadow-lg ring-2 ring-brand-900/30'
                      : 'border-slate-300 bg-white hover:border-brand-500'
                  }`}
                >
                  {/* Doctor & Hospital Row (Clickable) */}
                  <button
                    type="button"
                    onClick={() => handleSelectDoctor(group)}
                    aria-expanded={isDoctorSelected}
                    className={`flex w-full items-center justify-between p-5 text-left transition-colors cursor-pointer ${
                      isDoctorSelected ? 'bg-brand-50/70 border-b-2 border-brand-200' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-xl p-2.5 ${isDoctorSelected ? 'bg-brand-900 text-white' : 'bg-brand-100 text-brand-900'}`}>
                          <Stethoscope className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Doctor</p>
                          <h3 className="text-xl font-extrabold text-slate-900">{group.doctorName}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-700 pl-1 sm:pl-0 sm:border-l-2 sm:border-slate-300 sm:pl-6">
                        <Building2 className="h-5 w-5 text-slate-500 shrink-0" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Hospital / Clinic</p>
                          <p className="text-base font-bold text-slate-800">{group.hospitalName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-800">
                          {group.visits.length} {group.visits.length === 1 ? 'Visit recorded' : 'Visits recorded'}
                        </span>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Latest: {formatDate(group.latestVisitDate)}
                        </p>
                      </div>

                      <div className={`rounded-full p-1.5 transition-transform ${isDoctorSelected ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {isDoctorSelected ? (
                          <ChevronDown className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* If doctor is selected: Show list of visit dates (latest to first) */}
                  {isDoctorSelected && (
                    <div className="p-5 bg-slate-50/60 border-t-2 border-slate-100">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-brand-900" aria-hidden="true" />
                          Select Visit Date (Newest to Oldest)
                        </h4>
                        <span className="text-xs font-bold text-slate-500">Click a visit date to view full prescription</span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {group.visits.map((visit, vIdx) => {
                          const isVisitActive = visit.id === selectedVisitId
                          const isLatestVisit = vIdx === 0

                          return (
                            <button
                              key={visit.id}
                              type="button"
                              onClick={() => setSelectedVisitId(visit.id)}
                              className={`flex items-center gap-3 rounded-xl border-3 px-4 py-2.5 text-left font-bold transition-all cursor-pointer ${
                                isVisitActive
                                  ? 'border-brand-900 bg-brand-900 text-white shadow-md ring-2 ring-brand-900/40'
                                  : 'border-slate-300 bg-white text-slate-900 hover:border-brand-500 hover:bg-slate-100'
                              }`}
                            >
                              <CalendarDays className={`h-4 w-4 ${isVisitActive ? 'text-white' : 'text-brand-900'}`} aria-hidden="true" />
                              <div className="flex flex-col">
                                <span className="text-base font-extrabold leading-tight">
                                  {formatDate(visit.issued_on)}
                                </span>
                                <span className={`text-xs ${isVisitActive ? 'text-brand-100' : 'text-slate-500'}`}>
                                  {visit.items.length} {visit.items.length === 1 ? 'item' : 'items'} · {visit.status}
                                </span>
                              </div>

                              {isLatestVisit && (
                                <span className={`ml-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase ${
                                  isVisitActive ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  Latest
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Full Prescription description & details for the chosen visit date */}
                      {selectedRx && group.visits.some((v) => v.id === selectedRx.id) && (
                        <div className="mt-6 pt-5 border-t-2 border-slate-200">
                          <div className="mb-4 flex items-center justify-between rounded-xl bg-white border-2 border-slate-300 p-4 shadow-sm">
                            <div className="space-y-0.5">
                              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                                Entire Description for Visit
                              </span>
                              <p className="text-lg font-black text-slate-900">
                                📅 Visit Date: {formatDate(selectedRx.issued_on)} · 🩺 {selectedRx.prescriber_name} ({group.hospitalName})
                              </p>
                              <p className="text-sm font-semibold text-slate-600">
                                Prescription ID: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">{selectedRx.id}</code> · Refill due: <strong>{formatDate(selectedRx.refill_due_date)}</strong>
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                              selectedRx.status === 'ACTIVE'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-200 text-slate-800'
                            }`}>
                              {selectedRx.status}
                            </span>
                          </div>

                          {selectedRx.status === 'ACTIVE' ? (
                            <PrescriptionSection
                              prescription={selectedRx}
                              counter={counter}
                              onCounterChange={onCounterChange}
                              onStartDispense={() => setTarget(selectedRx)}
                              onShowGuide={() => setGuide(selectedRx)}
                            />
                          ) : (
                            <section
                              aria-label="Prescription visit details"
                              className="rounded-2xl border-4 border-slate-400 bg-white p-5"
                            >
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
                                <div>
                                  <div className="flex items-center gap-3">
                                    <h4 className="text-2xl font-black text-slate-900">
                                      {selectedRx.prescriber_name}
                                    </h4>
                                    <span className="rounded-full bg-slate-200 px-3 py-0.5 text-sm font-bold text-slate-800">
                                      {selectedRx.status}
                                    </span>
                                  </div>
                                  <p className="text-base text-slate-700 mt-1">
                                    {group.hospitalName} · Issued on <strong>{formatDate(selectedRx.issued_on)}</strong>
                                    {selectedRx.dispensed_at ? ` · Dispensed on ${formatDateTime(selectedRx.dispensed_at)}` : ''}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setGuide(selectedRx)}
                                  className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-900 bg-brand-50 px-4 py-2 text-base font-bold text-brand-900 hover:bg-brand-100 cursor-pointer shadow-sm transition"
                                >
                                  <FileText className="h-5 w-5" aria-hidden="true" /> Preview routine guide
                                </button>
                              </div>

                              <div>
                                <h5 className="mb-3 text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                  <ClipboardList className="h-5 w-5 text-brand-900" aria-hidden="true" />
                                  Prescription Medicines ({selectedRx.items.length})
                                </h5>
                                <div className="overflow-x-auto rounded-xl border-2 border-slate-200">
                                  <table className="w-full text-left text-base text-slate-900">
                                    <thead className="bg-slate-100 text-sm font-extrabold uppercase text-slate-700 border-b-2 border-slate-200">
                                      <tr>
                                        <th scope="col" className="p-3">Medicine</th>
                                        <th scope="col" className="p-3">Dose</th>
                                        <th scope="col" className="p-3">Frequency</th>
                                        <th scope="col" className="p-3">Duration / Instructions</th>
                                        <th scope="col" className="p-3">Qty</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                      {selectedRx.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                          <td className="p-3 font-bold">
                                            {item.medicine_name} <span className="text-slate-600 font-medium">({item.strength})</span>
                                          </td>
                                          <td className="p-3">{item.dose}</td>
                                          <td className="p-3">{item.frequency_label}</td>
                                          <td className="p-3 text-sm text-slate-700">
                                            {item.duration_days ? `${item.duration_days} days` : item.is_long_term ? 'Long term' : 'As directed'}
                                            {item.food_instruction ? ` · ${item.food_instruction.replace('_', ' ')}` : ''}
                                            {item.additional_instructions ? ` · ${item.additional_instructions}` : ''}
                                          </td>
                                          <td className="p-3 font-semibold">{item.quantity}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </section>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
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
