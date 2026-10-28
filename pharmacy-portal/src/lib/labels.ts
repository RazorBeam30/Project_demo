import { formatDate } from './dates'
import type { FoodInstruction, PrescriptionItem, Slot } from './types'

export const SLOT_ORDER: Slot[] = ['MORNING', 'AFTERNOON', 'EVENING', 'BEDTIME']

export const SLOT_LABEL: Record<Slot, string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
  BEDTIME: 'Bedtime',
}

export const FOOD_LABEL: Record<FoodInstruction, string> = {
  BEFORE_FOOD: 'Take before food',
  AFTER_FOOD: 'Take after food',
  WITH_FOOD: 'Take with food',
  EMPTY_STOMACH: 'Take on an empty stomach',
}

export interface DurationInfo {
  text: string
  review: string | null
  /** True when the prescriber gave no duration, end date or long-term flag. */
  missing: boolean
}

/**
 * Describes treatment duration strictly from what the prescriber specified.
 * Nothing is ever defaulted or calculated. A review date is reported
 * separately from the end of treatment.
 */
export function describeDuration(item: PrescriptionItem): DurationInfo {
  const review = item.review_date ? `Doctor review on ${formatDate(item.review_date)}` : null
  if (item.end_date) return { text: `Until ${formatDate(item.end_date)}`, review, missing: false }
  if (item.duration_days) {
    return {
      text: `For ${item.duration_days} day${item.duration_days === 1 ? '' : 's'}`,
      review,
      missing: false,
    }
  }
  if (item.is_long_term) return { text: 'Long-term medicine (no end date set)', review, missing: false }
  return { text: 'Not specified', review, missing: true }
}
