import { formatDate, refillState } from './dates'
import type { Prescription } from './types'

/**
 * Returns the reason a prescription cannot be dispensed, or null if it can.
 * The database function enforces the same rules; this just explains them
 * at the counter before anything is sent.
 */
export function getDispenseBlock(rx: Prescription): string | null {
  if (rx.status !== 'ACTIVE') {
    return `This prescription is already ${rx.status.toLowerCase()}.`
  }
  if (refillState(rx.refill_due_date) === 'EXPIRED') {
    return `Expired on ${formatDate(rx.refill_due_date)}. Expired prescriptions cannot be dispensed.`
  }
  if (rx.items.length === 0) {
    return 'This prescription has no medicines listed.'
  }
  return null
}
