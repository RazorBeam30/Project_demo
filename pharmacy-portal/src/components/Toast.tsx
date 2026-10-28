import { AlertCircle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'
export interface ToastState {
  kind: ToastKind
  message: string
}

const STYLE: Record<ToastKind, { Icon: LucideIcon; cls: string }> = {
  success: { Icon: CheckCircle2, cls: 'border-emerald-800 bg-emerald-100 text-emerald-950' },
  error: { Icon: AlertCircle, cls: 'border-red-700 bg-red-100 text-red-950' },
  info: { Icon: Info, cls: 'border-slate-600 bg-white text-slate-900' },
}

export default function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      {toast && (
        <div
          className={`pointer-events-auto flex max-w-xl items-center gap-3 rounded-xl border-4 px-5 py-4 text-xl font-bold shadow-2xl ${STYLE[toast.kind].cls}`}
        >
          {(() => {
            const { Icon } = STYLE[toast.kind]
            return <Icon className="h-8 w-8 shrink-0" aria-hidden="true" />
          })()}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss message"
            className="ml-2 rounded-md p-1 hover:bg-black/10"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
