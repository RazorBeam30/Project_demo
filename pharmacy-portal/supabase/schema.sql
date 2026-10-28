-- =====================================================================
-- Pharmacy Counter Portal: schema, row level security, RPC functions
-- Run in the Supabase SQL editor (or as a migration), then seed.sql.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- One row per signed-in staff member. Create the auth user first
-- (Supabase Dashboard > Authentication), then insert a profile row.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('CHEMIST', 'ADMIN')),
  default_pharmacy_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,              -- digits only, e.g. 9876543210
  date_of_birth date not null,
  created_at timestamptz not null default now()
);
create index if not exists patients_name_trgm
  on public.patients using gin (full_name extensions.gin_trgm_ops);
create index if not exists patients_phone_idx on public.patients (phone);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  prescriber_name text not null,
  issued_on date not null,
  refill_due_date date not null,    -- last valid day to dispense
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISPENSED', 'CANCELLED')),
  dispensed_at timestamptz,
  dispensed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check ((status = 'DISPENSED') = (dispensed_at is not null))
);
create index if not exists prescriptions_patient_status_idx
  on public.prescriptions (patient_id, status);

create table if not exists public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medicine_name text not null,
  strength text not null,
  form text not null default 'Tablet',
  dose text not null,                       -- e.g. '1 tablet'
  frequency_label text not null,            -- as written by the prescriber
  schedule_slots text[] not null default '{}'
    check (schedule_slots <@ array['MORNING', 'AFTERNOON', 'EVENING', 'BEDTIME']),
  food_instruction text
    check (food_instruction in ('BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD', 'EMPTY_STOMACH')),
  -- Duration: only what the prescriber specified. Never defaulted.
  duration_days integer check (duration_days > 0),
  end_date date,
  is_long_term boolean not null default false,
  review_date date,                         -- review is NOT the same as an end date
  additional_instructions text,
  quantity integer not null default 1 check (quantity > 0),
  is_controlled boolean not null default false,
  -- Image of the exact product, from your own verified catalogue.
  product_image_url text,
  product_image_verified boolean not null default false,
  check (not product_image_verified or product_image_url is not null)
);
create index if not exists prescription_items_rx_idx
  on public.prescription_items (prescription_id);

-- Append-only record of every dispense. One row per prescription (unique).
create table if not exists public.dispense_logs (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id),
  patient_id uuid not null references public.patients(id),
  chemist_user_id uuid not null references auth.users(id),
  chemist_name text not null,               -- as typed at the counter
  pharmacy_name text not null,              -- as typed at the counter
  products_verified boolean not null,       -- chemist confirmed products match
  items jsonb not null,                     -- snapshot of what was dispensed
  dispensed_at timestamptz not null default now()
);
create unique index if not exists dispense_logs_one_per_rx
  on public.dispense_logs (prescription_id);

create or replace function public.block_log_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'dispense_logs is append-only';
end $$;

drop trigger if exists dispense_logs_no_change on public.dispense_logs;
create trigger dispense_logs_no_change
  before update or delete on public.dispense_logs
  for each row execute function public.block_log_mutation();

-- Who opened which patient record (supports data-protection audits).
create table if not exists public.patient_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  patient_id uuid not null references public.patients(id),
  accessed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Helper functions for policies
-- ---------------------------------------------------------------------
create or replace function public.is_chemist()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('CHEMIST', 'ADMIN')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'ADMIN'
  );
$$;

-- ---------------------------------------------------------------------
-- Row level security: signed-in chemists only. The anon key sees nothing.
-- There is deliberately NO insert/update/delete policy on prescriptions,
-- items or dispense_logs: changes happen only via dispense_prescription().
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.patients            enable row level security;
alter table public.prescriptions       enable row level security;
alter table public.prescription_items  enable row level security;
alter table public.dispense_logs       enable row level security;
alter table public.patient_access_logs enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "chemists read patients" on public.patients;
create policy "chemists read patients" on public.patients
  for select to authenticated using (public.is_chemist());

drop policy if exists "chemists read prescriptions" on public.prescriptions;
create policy "chemists read prescriptions" on public.prescriptions
  for select to authenticated using (public.is_chemist());

drop policy if exists "chemists read items" on public.prescription_items;
create policy "chemists read items" on public.prescription_items
  for select to authenticated using (public.is_chemist());

drop policy if exists "read own or admin dispense logs" on public.dispense_logs;
create policy "read own or admin dispense logs" on public.dispense_logs
  for select to authenticated
  using (public.is_chemist() and (chemist_user_id = auth.uid() or public.is_admin()));

drop policy if exists "chemists log access" on public.patient_access_logs;
create policy "chemists log access" on public.patient_access_logs
  for insert to authenticated
  with check (public.is_chemist() and user_id = auth.uid());

drop policy if exists "admins read access logs" on public.patient_access_logs;
create policy "admins read access logs" on public.patient_access_logs
  for select to authenticated using (public.is_admin());

-- Table privileges (RLS still applies on top of these)
revoke all on public.profiles, public.patients, public.prescriptions,
  public.prescription_items, public.dispense_logs, public.patient_access_logs
  from anon, authenticated;
grant select on public.profiles, public.patients, public.prescriptions,
  public.prescription_items, public.dispense_logs to authenticated;
grant insert on public.patient_access_logs to authenticated;

-- ---------------------------------------------------------------------
-- Patient search (name or phone). Runs as the caller, so RLS applies.
-- Requires 3+ characters to make bulk enumeration harder.
-- ---------------------------------------------------------------------
create or replace function public.search_patients(q text)
returns setof public.patients
language sql stable security invoker set search_path = public as $$
  with params as (
    select
      trim(q) as term,
      regexp_replace(coalesce(q, ''), '\D', '', 'g') as digits
  )
  select p.*
  from public.patients p, params
  where length(params.term) >= 3
    and (
      p.full_name ilike
        '%' || replace(replace(replace(params.term, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or (length(params.digits) >= 3 and p.phone like '%' || params.digits || '%')
    )
  order by p.full_name
  limit 8;
$$;

revoke all on function public.search_patients(text) from public, anon;
grant execute on function public.search_patients(text) to authenticated;

-- ---------------------------------------------------------------------
-- Atomic dispense. The row lock plus the status check prevent two
-- counters dispensing the same prescription; the unique index on
-- dispense_logs is a second safety net.
-- ---------------------------------------------------------------------
create or replace function public.dispense_prescription(
  p_prescription_id uuid,
  p_pharmacy_name text,
  p_chemist_name text,
  p_products_verified boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_rx public.prescriptions%rowtype;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_items jsonb;
  v_log_id uuid;
begin
  if auth.uid() is null or not public.is_chemist() then
    raise exception 'You are not authorised to dispense medicines.' using errcode = '42501';
  end if;

  if coalesce(trim(p_pharmacy_name), '') = '' or coalesce(trim(p_chemist_name), '') = '' then
    raise exception 'Pharmacy name and chemist name are required.';
  end if;

  if not coalesce(p_products_verified, false) then
    raise exception 'Confirm that the products match before dispensing.';
  end if;

  select * into v_rx from public.prescriptions where id = p_prescription_id for update;
  if not found then
    raise exception 'Prescription not found.';
  end if;

  if v_rx.status <> 'ACTIVE' then
    raise exception 'This prescription is already %, so it cannot be dispensed.', lower(v_rx.status);
  end if;

  if v_rx.refill_due_date < v_today then
    raise exception 'This prescription expired on %.', to_char(v_rx.refill_due_date, 'DD Mon YYYY');
  end if;

  if exists (
    select 1 from public.prescription_items i
    where i.prescription_id = v_rx.id and i.is_controlled
  ) then
    raise exception 'Contains a controlled medicine. Dispense it through the controlled-drug register process, not this screen.';
  end if;

  select jsonb_agg(jsonb_build_object(
           'item_id', i.id,
           'medicine_name', i.medicine_name,
           'strength', i.strength,
           'dose', i.dose,
           'frequency_label', i.frequency_label,
           'quantity', i.quantity
         ))
    into v_items
    from public.prescription_items i
   where i.prescription_id = v_rx.id;

  if v_items is null then
    raise exception 'This prescription has no medicines listed.';
  end if;

  update public.prescriptions
     set status = 'DISPENSED', dispensed_at = now(), dispensed_by = auth.uid()
   where id = v_rx.id and status = 'ACTIVE';

  insert into public.dispense_logs
    (prescription_id, patient_id, chemist_user_id, chemist_name, pharmacy_name, products_verified, items)
  values
    (v_rx.id, v_rx.patient_id, auth.uid(), trim(p_chemist_name), trim(p_pharmacy_name), true, v_items)
  returning id into v_log_id;

  return v_log_id;
end $$;

revoke all on function public.dispense_prescription(uuid, text, text, boolean) from public, anon;
grant execute on function public.dispense_prescription(uuid, text, text, boolean) to authenticated;
