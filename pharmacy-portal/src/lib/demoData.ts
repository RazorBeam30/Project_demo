import { addDays, todayISO } from './dates'
import type { Patient, Prescription, PrescriptionItem } from './types'

/**
 * FICTIONAL demo data. Medicine names and packs are made up and every pack
 * image is labelled as a demo illustration. In a real deployment, images
 * must come from your own verified product catalogue.
 */
function packImage(name: string, strength: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
<rect width="240" height="160" fill="#ffffff"/>
<rect x="30" y="16" width="180" height="128" rx="10" fill="hsl(${hue} 55% 92%)" stroke="hsl(${hue} 55% 28%)" stroke-width="3"/>
<rect x="30" y="16" width="180" height="34" rx="10" fill="hsl(${hue} 55% 28%)"/>
<text x="120" y="38" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">DEMO - NOT A REAL PRODUCT</text>
<text x="120" y="92" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#111111" text-anchor="middle">${name}</text>
<text x="120" y="120" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#111111" text-anchor="middle">${strength}</text>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

let seq = 0
const nextId = (prefix: string) => `${prefix}-${++seq}`

type ItemInit = Pick<
  PrescriptionItem,
  'medicine_name' | 'strength' | 'dose' | 'frequency_label'
> &
  Partial<Omit<PrescriptionItem, 'id' | 'prescription_id'>>

function item(prescriptionId: string, init: ItemInit): PrescriptionItem {
  return {
    id: nextId('item'),
    prescription_id: prescriptionId,
    form: 'Tablet',
    schedule_slots: [],
    food_instruction: null,
    duration_days: null,
    end_date: null,
    is_long_term: false,
    review_date: null,
    additional_instructions: null,
    quantity: 1,
    is_controlled: false,
    product_image_url: null,
    product_image_verified: false,
    ...init,
  }
}

export interface DemoStore {
  patients: Patient[]
  prescriptions: Prescription[]
}

export function buildDemo(): DemoStore {
  const today = todayISO()

  const patients: Patient[] = [
    { id: 'pt-1', full_name: 'Aarav Sharma', phone: '9876543210', date_of_birth: '1984-03-12' },
    { id: 'pt-2', full_name: 'Meera Iyer', phone: '9123456780', date_of_birth: '1958-11-02' },
    { id: 'pt-3', full_name: 'Rohan Verma', phone: '9988776655', date_of_birth: '1992-07-21' },
    { id: 'pt-4', full_name: 'John Doe', phone: '9845123456', date_of_birth: '1979-05-18' },
  ]

  const prescriptions: Prescription[] = [
    // Dispensed earlier: shows in history
    {
      id: 'rx-1000',
      patient_id: 'pt-1',
      prescriber_name: 'Dr. Demo Kulkarni',
      hospital_name: 'Apollo Hospital, Bangalore',
      issued_on: addDays(today, -60),
      refill_due_date: addDays(today, -50),
      status: 'DISPENSED',
      dispensed_at: new Date(Date.now() - 55 * 24 * 3600 * 1000).toISOString(),
      items: [
        item('rx-1000', {
          medicine_name: 'Examplin',
          strength: '250 mg',
          dose: '1 tablet',
          frequency_label: 'Twice daily',
          schedule_slots: ['MORNING', 'EVENING'],
          duration_days: 5,
          quantity: 10,
        }),
      ],
    },
    // Due today (amber)
    {
      id: 'rx-1001',
      patient_id: 'pt-1',
      prescriber_name: 'Dr. Demo Kulkarni',
      hospital_name: 'Apollo Hospital, Bangalore',
      issued_on: addDays(today, -20),
      refill_due_date: today,
      status: 'ACTIVE',
      dispensed_at: null,
      items: [
        item('rx-1001', {
          medicine_name: 'Examplin',
          strength: '500 mg',
          dose: '1 tablet',
          frequency_label: 'Twice daily',
          schedule_slots: ['MORNING', 'EVENING'],
          food_instruction: 'AFTER_FOOD',
          duration_days: 7,
          quantity: 14,
          product_image_url: packImage('Examplin', '500 mg', 160),
          product_image_verified: true,
        }),
        item('rx-1001', {
          medicine_name: 'Sampleol',
          strength: '10 mg',
          dose: '1 tablet',
          frequency_label: 'Once daily at bedtime',
          schedule_slots: ['BEDTIME'],
          is_long_term: true,
          review_date: addDays(today, 60),
          quantity: 30,
          product_image_url: packImage('Sampleol', '10 mg', 210),
          product_image_verified: true,
        }),
        // No duration from the prescriber, no verified photo: both are flagged, never guessed
        item('rx-1001', {
          medicine_name: 'Demovit',
          strength: '1000 IU',
          form: 'Capsule',
          dose: '1 capsule',
          frequency_label: 'Once daily',
          schedule_slots: ['MORNING'],
          food_instruction: 'WITH_FOOD',
          quantity: 30,
        }),
      ],
    },
    // Valid (green)
    {
      id: 'rx-1002',
      patient_id: 'pt-1',
      prescriber_name: 'Dr. Neha Sharma',
      hospital_name: 'Manipal Hospital, Bangalore',
      issued_on: addDays(today, -2),
      refill_due_date: addDays(today, 5),
      status: 'ACTIVE',
      dispensed_at: null,
      items: [
        item('rx-1002', {
          medicine_name: 'Fictocream',
          strength: '1%',
          form: 'Cream',
          dose: 'Thin layer on the affected area',
          frequency_label: 'Twice daily',
          schedule_slots: ['MORNING', 'EVENING'],
          end_date: addDays(today, 10),
          additional_instructions: 'For use on skin only.',
          quantity: 1,
          product_image_url: packImage('Fictocream', '1%', 30),
          product_image_verified: true,
        }),
      ],
    },
    // Earlier visit with Dr. Neha Sharma
    {
      id: 'rx-1003',
      patient_id: 'pt-1',
      prescriber_name: 'Dr. Neha Sharma',
      hospital_name: 'Manipal Hospital, Bangalore',
      issued_on: addDays(today, -45),
      refill_due_date: addDays(today, -35),
      status: 'DISPENSED',
      dispensed_at: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
      items: [
        item('rx-1003', {
          medicine_name: 'Fictocream',
          strength: '0.5%',
          form: 'Cream',
          dose: 'Apply once at night',
          frequency_label: 'Once daily',
          schedule_slots: ['BEDTIME'],
          duration_days: 10,
          quantity: 1,
        }),
      ],
    },
    // Expired (red): cannot be dispensed
    {
      id: 'rx-2001',
      patient_id: 'pt-2',
      prescriber_name: 'Dr. Demo Rao',
      hospital_name: 'Fortis Clinic, Mumbai',
      issued_on: addDays(today, -14),
      refill_due_date: addDays(today, -3),
      status: 'ACTIVE',
      dispensed_at: null,
      items: [
        item('rx-2001', {
          medicine_name: 'Examplin',
          strength: '250 mg',
          dose: '1 tablet',
          frequency_label: 'Twice daily',
          schedule_slots: ['MORNING', 'EVENING'],
          food_instruction: 'AFTER_FOOD',
          duration_days: 5,
          quantity: 10,
          product_image_url: packImage('Examplin', '250 mg', 160),
          product_image_verified: true,
        }),
      ],
    },
    // Contains a controlled medicine: pharmacist can view and dispense
    {
      id: 'rx-3001',
      patient_id: 'pt-3',
      prescriber_name: 'Dr. Demo Nair',
      hospital_name: 'Max Healthcare, Delhi',
      issued_on: addDays(today, -1),
      refill_due_date: addDays(today, 5),
      status: 'ACTIVE',
      dispensed_at: null,
      items: [
        item('rx-3001', {
          medicine_name: 'Controlex',
          strength: '5 mg',
          dose: '1 tablet',
          frequency_label: 'Once daily at bedtime',
          schedule_slots: ['BEDTIME'],
          duration_days: 5,
          quantity: 5,
          is_controlled: true,
        }),
        item('rx-3001', {
          medicine_name: 'Sampleol',
          strength: '10 mg',
          dose: '1 tablet',
          frequency_label: 'Once daily',
          schedule_slots: ['MORNING'],
          is_long_term: true,
          review_date: addDays(today, 90),
          quantity: 30,
        }),
      ],
    },
    // John Doe active prescription
    {
      id: 'rx-4001',
      patient_id: 'pt-4',
      prescriber_name: 'Dr. Rajesh Singhania',
      hospital_name: 'Lilavati Hospital, Mumbai',
      issued_on: addDays(today, -3),
      refill_due_date: addDays(today, 12),
      status: 'ACTIVE',
      dispensed_at: null,
      items: [
        item('rx-4001', {
          medicine_name: 'Amoxilin',
          strength: '500 mg',
          form: 'Capsule',
          dose: '1 capsule',
          frequency_label: 'Thrice daily',
          schedule_slots: ['MORNING', 'AFTERNOON', 'EVENING'],
          food_instruction: 'AFTER_FOOD',
          duration_days: 7,
          quantity: 21,
          product_image_url: packImage('Amoxilin', '500 mg', 190),
          product_image_verified: true,
          additional_instructions: 'Complete the full 7-day course.',
        }),
        item('rx-4001', {
          medicine_name: 'Cetrizol',
          strength: '10 mg',
          form: 'Tablet',
          dose: '1 tablet',
          frequency_label: 'Once daily at bedtime',
          schedule_slots: ['BEDTIME'],
          food_instruction: 'AFTER_FOOD',
          duration_days: 10,
          quantity: 10,
          product_image_url: packImage('Cetrizol', '10 mg', 45),
          product_image_verified: true,
        }),
        item('rx-4001', {
          medicine_name: 'Paracetamol',
          strength: '650 mg',
          form: 'Tablet',
          dose: '1 tablet',
          frequency_label: 'Twice daily',
          schedule_slots: ['MORNING', 'EVENING'],
          food_instruction: 'WITH_FOOD',
          duration_days: 5,
          quantity: 10,
          product_image_url: packImage('Paracetamol', '650 mg', 140),
          product_image_verified: true,
        }),
      ],
    },
    // Earlier visit for John Doe (dispensed)
    {
      id: 'rx-4000',
      patient_id: 'pt-4',
      prescriber_name: 'Dr. Rajesh Singhania',
      hospital_name: 'Lilavati Hospital, Mumbai',
      issued_on: addDays(today, -45),
      refill_due_date: addDays(today, -35),
      status: 'DISPENSED',
      dispensed_at: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
      items: [
        item('rx-4000', {
          medicine_name: 'Demovit',
          strength: '1000 IU',
          form: 'Capsule',
          dose: '1 capsule',
          frequency_label: 'Once daily',
          schedule_slots: ['MORNING'],
          food_instruction: 'WITH_FOOD',
          duration_days: 30,
          quantity: 30,
        }),
      ],
    },
  ]

  return { patients, prescriptions }
}
