import { CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react'
import { formatDate, refillState, type RefillState } from '../lib/dates'

const STYLE: Record<RefillState, { Icon: LucideIcon; cls: string; word: string }> = {
  VALID: { Icon: CheckCircle2, cls: 'border-emerald-700 bg-emerald-100 text-emerald-950', word: 'VALID' },
  DUE_TODAY: { Icon: Clock, cls: 'border-amber-600 bg-amber-100 text-amber-950', word: 'DUE TODAY' },
  EXPIRED: { Icon: XCircle, cls: 'border-red-700 bg-red-100 text-red-950', word: 'EXPIRED' },
}

/** Colour is never the only signal: every state also has an icon and a word. */
export default function RefillBadge({ due }: { due: string }) {
  const state = refillState(due)
  const { Icon, cls, word } = STYLE[state]
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-lg ${cls}`}
      aria-label={`Refill status ${word.toLowerCase()}, due date ${formatDate(due)}`}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
      <span className="font-extrabold">{word}</span>
      <span className="font-semibold">
        · {state === 'EXPIRED' ? 'was due' : 'refill due'} {formatDate(due)}
      </span>
    </span>
  )
}
