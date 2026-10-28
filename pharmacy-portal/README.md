# Pharmacy Counter Portal

Fast patient lookup, prescription verification and one-click dispensing for a chemist's counter, plus a printable
daily-routine guide for the patient. React + TypeScript + Tailwind + Lucide + `@supabase/supabase-js`.

## Run it (demo mode, no backend)

```bash
npm install
npm run dev
```

With no `.env.local` the app runs on **fictional in-memory data** with no login. Try searching `Aarav`, `Meera`
or `9988`:

| Patient | What it shows |
|---|---|
| Aarav Sharma | One prescription **due today** (amber), one **valid** (green); a medicine with no duration and no verified photo; a long-term medicine with a review date |
| Meera Iyer | An **expired** prescription (red): Dispense is disabled |
| Rohan Verma | A **controlled** medicine: Dispense is disabled |

Hotkeys: `Ctrl/Cmd + K` anywhere, or `/` when not typing in a field.

## Connect Supabase

1. In the Supabase SQL editor run `supabase/schema.sql`, then (optionally, test projects only) `supabase/seed.sql`.
2. Create a user under Authentication, then give them a profile:
   ```sql
   insert into public.profiles (id, full_name, role, default_pharmacy_name)
   values ('<auth user uuid>', 'Your Name', 'CHEMIST', 'Your Pharmacy');
   ```
3. Copy `.env.example` to `.env.local` and fill in the project URL and **anon** key. Never use the service-role key
   in this app.
4. `npm run dev`, sign in.

## How the safety rules are enforced

The browser only explains the rules. The database enforces them in `dispense_prescription()`:

- Only signed-in users with a `profiles` row can read anything. The anon key sees nothing (RLS on every table).
- Prescriptions, items and logs have **no** insert/update/delete policies. The only way to change them is the
  dispense function.
- The function locks the prescription row, then refuses if it is not `ACTIVE`, is past `refill_due_date`
  (India time), contains a controlled item, or the product-check box was not ticked. A unique index on
  `dispense_logs(prescription_id)` is a second guard against double dispensing.
- `dispense_logs` records the authenticated chemist's user id, the typed chemist and pharmacy names, a timestamp
  and a snapshot of the items. It is append-only (a trigger blocks edits and deletes).
- `patient_access_logs` records who opened which patient.
- Phone numbers are masked until the chemist presses Show. The patient clears after 5 minutes of inactivity.
- Patient search needs 3+ characters and returns at most 8 matches.

## Patient routine guide

Opened from "Routine guide" on any prescription, or after dispensing. It lays out Morning / Afternoon / Evening /
Bedtime from each item's `schedule_slots`. Medicines with no slots appear under "Other / as directed".

- Nothing is assumed: an empty time says nothing is scheduled; food instructions appear only when the prescriber
  gave one.
- Duration comes only from `end_date`, `duration_days` or `is_long_term`. If none is set, the guide says
  "Not specified" and the counter view flags it. A review date is shown separately from the end of treatment.
- Pack images show only when `product_image_verified` is true, always next to the printed name and strength,
  with a reminder never to identify a medicine by colour or shape. Otherwise a labelled placeholder is shown.
- Every state uses an icon and a text label as well as colour. Use the Print button for a clean one-page handout.

## Before real-world use

This is a prototype. It has **not** had a clinical, legal or security review, and the npm build was not run
in the environment it was written in. Before it touches real patients:

- Have the RLS policies and the dispense function reviewed and tested against your own data model.
- Controlled drugs are only *blocked* here. Real use needs your jurisdiction's register and verification process.
- Product photos must come from your own verified catalogue (e.g. Supabase Storage); the demo images are made up.
- Review obligations under India's Digital Personal Data Protection Act for health data (consent, retention,
  breach handling, access logs).
- Add multi-factor sign-in, rate limiting on search, and server-side session expiry. The 5-minute clear is
  client-side only.
- Decide how prescriptions get into this database (this app only reads and dispenses them).
