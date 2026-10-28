import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, LogOut, Pill, ShieldCheck } from 'lucide-react'
import LoginScreen from './components/LoginScreen'
import PatientView from './components/PatientView'
import SearchBar from './components/SearchBar'
import Toast, { type ToastKind, type ToastState } from './components/Toast'
import { getProfile } from './lib/api'
import { isDemo, supabase } from './lib/supabase'
import type { CounterDetails, Patient, Profile } from './lib/types'
import { errMsg } from './lib/util'

const IDLE_MS = 5 * 60 * 1000
const PHARMACY_KEY = 'pp.pharmacyName'

type AuthState =
  | { state: 'loading' }
  | { state: 'signedOut' }
  | { state: 'error'; message: string }
  | { state: 'ready'; profile: Profile }

function readSaved(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSaved(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // storage may be unavailable; the field simply will not be remembered
  }
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ state: 'loading' })
  const [patient, setPatient] = useState<Patient | null>(null)
  const [counter, setCounter] = useState<CounterDetails>({ pharmacyName: '', chemistName: '' })
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<number | null>(null)

  const showToast = useCallback((kind: ToastKind, message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast({ kind, message })
    toastTimer.current = window.setTimeout(() => setToast(null), 6000)
  }, [])

  // Sign-in state. Demo mode skips login entirely.
  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const profile = await getProfile()
        if (!cancelled) setAuth({ state: 'ready', profile })
      } catch (e) {
        if (!cancelled) setAuth({ state: 'error', message: errMsg(e) })
      }
    }

    if (isDemo || !supabase) {
      void loadProfile()
      return () => {
        cancelled = true
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) void loadProfile()
      else setAuth({ state: 'signedOut' })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAuth({ state: 'signedOut' })
        setPatient(null)
      } else if (event === 'SIGNED_IN') {
        void loadProfile()
      }
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  // Pre-fill the counter details once per signed-in user.
  const profileId = auth.state === 'ready' ? auth.profile.id : null
  useEffect(() => {
    if (auth.state !== 'ready') return
    setCounter({
      pharmacyName: readSaved(PHARMACY_KEY) ?? auth.profile.default_pharmacy_name ?? '',
      chemistName: auth.profile.full_name,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  const updateCounter = useCallback((next: CounterDetails) => {
    setCounter(next)
    writeSaved(PHARMACY_KEY, next.pharmacyName)
  }, [])

  // Counter screens are shared: clear the patient after a period of no activity.
  useEffect(() => {
    if (!patient) return
    let timer = window.setTimeout(clear, IDLE_MS)
    function clear() {
      setPatient(null)
      showToast('info', 'Patient cleared after 5 minutes of inactivity.')
    }
    function reset() {
      window.clearTimeout(timer)
      timer = window.setTimeout(clear, IDLE_MS)
    }
    const events = ['mousemove', 'keydown', 'click', 'touchstart'] as const
    events.forEach((ev) => window.addEventListener(ev, reset))
    return () => {
      window.clearTimeout(timer)
      events.forEach((ev) => window.removeEventListener(ev, reset))
    }
  }, [patient, showToast])

  async function signOut() {
    setPatient(null)
    await supabase?.auth.signOut()
  }

  if (auth.state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <p className="flex items-center gap-3 text-2xl font-bold text-brand-900" role="status">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" /> Loading…
        </p>
      </div>
    )
  }

  if (auth.state === 'signedOut') return <LoginScreen />

  if (auth.state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50 p-4">
        <div className="max-w-lg rounded-2xl border-4 border-red-700 bg-white p-8">
          <p role="alert" className="text-2xl font-bold text-red-950">
            {auth.message}
          </p>
          {!isDemo && (
            <button
              type="button"
              onClick={signOut}
              className="mt-6 h-14 rounded-lg bg-brand-900 px-6 text-xl font-bold text-white hover:bg-brand-700"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="bg-brand-900 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <Pill className="h-9 w-9" aria-hidden="true" />
            <p className="text-2xl font-extrabold leading-tight">Pharmacy Counter</p>
          </div>
          <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1">
            <SearchBar onSelect={setPatient} />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-lg font-semibold sm:inline">{auth.profile.full_name}</span>
            {!isDemo && (
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-white px-3 py-2 text-lg font-bold hover:bg-brand-700"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" /> Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {patient ? (
          <PatientView
            key={patient.id}
            patient={patient}
            counter={counter}
            onCounterChange={updateCounter}
            onSuccess={(message) => showToast('success', message)}
          />
        ) : (
          <div className="rounded-2xl border-4 border-dashed border-brand-600 bg-white p-10 text-center">
            <ShieldCheck className="mx-auto h-14 w-14 text-brand-600" aria-hidden="true" />
            <h1 className="mt-3 text-3xl font-extrabold text-brand-900">Find a patient to verify prescriptions</h1>
            <p className="mt-2 text-xl text-slate-800">
              Search by name or phone number. Press <kbd className="rounded border-2 border-slate-400 bg-slate-100 px-2 font-bold">Ctrl</kbd>{' '}
              + <kbd className="rounded border-2 border-slate-400 bg-slate-100 px-2 font-bold">K</kbd> or{' '}
              <kbd className="rounded border-2 border-slate-400 bg-slate-100 px-2 font-bold">/</kbd> to jump to the search bar.
            </p>
          </div>
        )}
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
