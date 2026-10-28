import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Loader2, Search } from 'lucide-react'
import { searchPatients } from '../lib/api'
import { ageFromDob, maskPhone } from '../lib/dates'
import type { Patient } from '../lib/types'
import { errMsg } from '../lib/util'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

interface Props {
  onSelect: (patient: Patient) => void
}

export default function SearchBar({ onSelect }: Props) {
  const inputId = useId()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  // Hotkeys: Ctrl/Cmd + K anywhere, or "/" when not typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      const isCtrlK = e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)
      if (isCtrlK || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Debounced search; stale responses are ignored.
  useEffect(() => {
    const term = query.trim()
    const id = ++requestId.current
    if (term.length < 3) {
      setResults([])
      setLoading(false)
      setError(null)
      setActive(-1)
      return
    }
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchPatients(term)
        if (id !== requestId.current) return
        setResults(found)
        setActive(found.length ? 0 : -1)
        setError(null)
      } catch (e) {
        if (id !== requestId.current) return
        setResults([])
        setError(errMsg(e))
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [query])

  function choose(patient: Patient) {
    onSelect(patient)
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.blur()
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (results.length ? (i + 1) % results.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (results.length ? (i <= 0 ? results.length - 1 : i - 1) : -1))
    } else if (e.key === 'Enter') {
      const picked = results[active]
      if (picked) {
        e.preventDefault()
        choose(picked)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  const term = query.trim()
  const showPanel = open && term.length > 0

  return (
    <div className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        Search patient by name or phone number
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-brand-900"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder="Search patient by name or phone number"
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showPanel && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
        className="h-14 w-full rounded-xl border-2 border-white bg-white pl-14 pr-28 text-xl text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-300"
      />
      <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-brand-900" aria-label="Searching" />}
        <kbd className="hidden rounded-md border-2 border-slate-400 bg-slate-100 px-2 py-0.5 text-sm font-bold text-slate-800 sm:inline">
          {isMac ? '⌘ K' : 'Ctrl K'}
        </kbd>
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border-2 border-brand-900 bg-white shadow-2xl">
          {term.length < 3 && (
            <p className="px-5 py-4 text-lg text-slate-800" role="status">
              Type at least 3 characters of the name or phone number.
            </p>
          )}
          {term.length >= 3 && error && (
            <p className="px-5 py-4 text-lg font-semibold text-red-800" role="alert">
              {error}
            </p>
          )}
          {term.length >= 3 && !error && !loading && results.length === 0 && (
            <p className="px-5 py-4 text-lg text-slate-800" role="status">
              No patients found.
            </p>
          )}
          {results.length > 0 && (
            <ul id={listId} role="listbox" aria-label="Matching patients" className="max-h-96 overflow-auto">
              {results.map((p, i) => (
                <li
                  key={p.id}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mouseDown (not click) so the input's blur does not close the list first
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(p)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-baseline justify-between gap-4 border-b border-emerald-100 px-5 py-3 last:border-b-0 ${
                    i === active ? 'bg-brand-100' : 'bg-white'
                  }`}
                >
                  <span className="text-xl font-bold text-slate-900">{p.full_name}</span>
                  <span className="text-base text-slate-700">
                    {ageFromDob(p.date_of_birth)} yrs · {maskPhone(p.phone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
