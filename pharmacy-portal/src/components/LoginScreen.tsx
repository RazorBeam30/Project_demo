import { useState, type FormEvent } from 'react'
import { Loader2, Lock, Pill } from 'lucide-react'
import { requireClient } from '../lib/supabase'
import { errMsg } from '../lib/util'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { error: signInError } = await requireClient().auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'h-14 w-full rounded-lg border-2 border-brand-900 bg-white px-4 text-xl text-slate-900'

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border-4 border-brand-600 bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3 text-brand-900">
          <Pill className="h-10 w-10" aria-hidden="true" />
          <h1 className="text-3xl font-extrabold">Pharmacy Counter</h1>
        </div>
        <p className="mb-6 flex items-center gap-2 text-lg text-slate-800">
          <Lock className="h-5 w-5" aria-hidden="true" /> Authorised chemists only.
        </p>

        <label htmlFor="login-email" className="mb-1 block text-base font-bold text-slate-900">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />

        <label htmlFor="login-password" className="mb-1 mt-4 block text-base font-bold text-slate-900">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />

        {error && (
          <p role="alert" className="mt-4 rounded-lg border-2 border-red-700 bg-red-100 p-3 text-lg font-semibold text-red-950">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-xl font-extrabold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />}
          Sign in
        </button>
      </form>
    </div>
  )
}
