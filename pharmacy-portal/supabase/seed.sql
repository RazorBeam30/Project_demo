-- =====================================================================
-- FICTIONAL demo data for testing. Do not load into a real database.
-- Dates are relative to today so the Valid / Due today / Expired
-- badges can all be seen. Medicine names are made up.
-- =====================================================================

insert into public.patients (id, full_name, phone, date_of_birth) values
  ('11111111-1111-1111-1111-111111111111', 'Aarav Sharma', '9876543210', '1984-03-12'),
  ('22222222-2222-2222-2222-222222222222', 'Meera Iyer',   '9123456780', '1958-11-02'),
  ('33333333-3333-3333-3333-333333333333', 'Rohan Verma',  '9988776655', '1992-07-21')
on conflict (id) do nothing;

insert into public.prescriptions (id, patient_id, prescriber_name, issued_on, refill_due_date, status) values
  -- Due today (amber)
  ('aaaaaaa1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Dr. Demo Kulkarni', current_date - 20, current_date, 'ACTIVE'),
  -- Valid (green)
  ('aaaaaaa1-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Dr. Demo Kulkarni', current_date - 2, current_date + 5, 'ACTIVE'),
  -- Expired (red): cannot be dispensed
  ('aaaaaaa1-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Dr. Demo Rao', current_date - 14, current_date - 3, 'ACTIVE'),
  -- Contains a controlled medicine: blocked on this screen
  ('aaaaaaa1-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'Dr. Demo Nair', current_date - 1, current_date + 5, 'ACTIVE')
on conflict (id) do nothing;

insert into public.prescription_items
  (prescription_id, medicine_name, strength, form, dose, frequency_label, schedule_slots,
   food_instruction, duration_days, end_date, is_long_term, review_date, additional_instructions,
   quantity, is_controlled)
values
  ('aaaaaaa1-0000-0000-0000-000000000001', 'Examplin', '500 mg', 'Tablet', '1 tablet', 'Twice daily',
   array['MORNING', 'EVENING'], 'AFTER_FOOD', 7, null, false, null, null, 14, false),
  ('aaaaaaa1-0000-0000-0000-000000000001', 'Sampleol', '10 mg', 'Tablet', '1 tablet', 'Once daily at bedtime',
   array['BEDTIME'], null, null, null, true, current_date + 60, null, 30, false),
  -- No duration given by the prescriber: the app flags this instead of inventing one
  ('aaaaaaa1-0000-0000-0000-000000000001', 'Demovit', '1000 IU', 'Capsule', '1 capsule', 'Once daily',
   array['MORNING'], 'WITH_FOOD', null, null, false, null, null, 30, false),
  ('aaaaaaa1-0000-0000-0000-000000000002', 'Fictocream', '1%', 'Cream', 'Thin layer on affected area', 'Twice daily',
   array['MORNING', 'EVENING'], null, null, current_date + 10, false, null, 'For skin use only.', 1, false),
  ('aaaaaaa1-0000-0000-0000-000000000003', 'Examplin', '250 mg', 'Tablet', '1 tablet', 'Twice daily',
   array['MORNING', 'EVENING'], 'AFTER_FOOD', 5, null, false, null, null, 10, false),
  ('aaaaaaa1-0000-0000-0000-000000000004', 'Controlex', '5 mg', 'Tablet', '1 tablet', 'Once daily at bedtime',
   array['BEDTIME'], null, 5, null, false, null, null, 5, true),
  ('aaaaaaa1-0000-0000-0000-000000000004', 'Sampleol', '10 mg', 'Tablet', '1 tablet', 'Once daily',
   array['MORNING'], null, null, null, true, current_date + 90, null, 30, false);

-- ---------------------------------------------------------------------
-- After creating a user in Supabase Auth, give them a profile:
--
-- insert into public.profiles (id, full_name, role, default_pharmacy_name)
-- values ('<auth user uuid>', 'Your Name', 'CHEMIST', 'Your Pharmacy');
--
-- Product photos: set product_image_url to an image of the exact product
-- (host it in your own storage) and product_image_verified = true only
-- after a pharmacist has checked that the image matches the product.
-- ---------------------------------------------------------------------
