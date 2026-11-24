begin;

create type public.staff_role as enum ('admin', 'dentist', 'receptionist');
create type public.appointment_status as enum ('Scheduled', 'Completed', 'Cancelled');
create type public.payment_status as enum ('Pending', 'Paid');

create table public.staff_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 1 and 160),
  role public.staff_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.patient (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) between 1 and 160),
  sex text check (length(sex) <= 40),
  date_of_birth date check (date_of_birth <= current_date),
  phone text check (length(phone) <= 50),
  email text check (length(email) <= 254),
  created_at timestamptz not null default now()
);

create table public.dental_service (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  description text check (length(description) <= 4000),
  price numeric(10,2) not null check (price between 0 and 99999999.99),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index dental_service_name_key on public.dental_service (lower(btrim(name)));

create table public.appointment (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient(id),
  service_id uuid not null references public.dental_service(id),
  dentist_id uuid references public.staff_profile(id),
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'Scheduled',
  notes text check (length(notes) <= 4000),
  created_at timestamptz not null default now()
);
create index appointment_patient_id_idx on public.appointment (patient_id);
create unique index appointment_patient_slot_key on public.appointment (patient_id, scheduled_at)
  where status = 'Scheduled';
create unique index appointment_dentist_slot_key on public.appointment (dentist_id, scheduled_at)
  where status = 'Scheduled' and dentist_id is not null;

create table public.treatment_record (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient(id),
  treatment text not null check (length(btrim(treatment)) between 1 and 160),
  treatment_date date not null default current_date,
  diagnosis text check (length(diagnosis) <= 4000),
  remarks text check (length(remarks) <= 4000),
  fee numeric(10,2) not null default 0 check (fee between 0 and 99999999.99),
  created_at timestamptz not null default now()
);
create index treatment_patient_id_idx on public.treatment_record (patient_id);

create table public.medical_history (
  patient_id uuid primary key references public.patient(id),
  existing_conditions text[] not null default '{}',
  allergies text[] not null default '{}',
  current_medications text[] not null default '{}',
  previous_dental_history text check (length(previous_dental_history) <= 4000),
  clinical_notes text check (length(clinical_notes) <= 4000)
);

create table public.dental_chart (
  patient_id uuid primary key references public.patient(id),
  teeth jsonb not null default '[]' check (jsonb_typeof(teeth) = 'array'),
  history_summary text check (length(history_summary) <= 4000)
);

create table public.payment (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient(id),
  service_id uuid not null references public.dental_service(id),
  amount numeric(10,2) not null check (amount between 0.01 and 99999999.99),
  status public.payment_status not null default 'Pending',
  billing_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index payment_patient_id_idx on public.payment (patient_id);

create schema if not exists smilepoint_private;
revoke all on schema smilepoint_private from public;
grant usage on schema smilepoint_private to authenticated;

-- Read the caller's server-managed role without recursing through staff RLS.
create function smilepoint_private.current_staff_role()
returns public.staff_role
language sql stable security definer set search_path = ''
as $$
  select role from public.staff_profile where id = (select auth.uid()) and active
$$;
revoke all on function smilepoint_private.current_staff_role() from public;
grant execute on function smilepoint_private.current_staff_role() to authenticated;

-- Appointment writers can assign active dentists without reading the staff directory.
create function smilepoint_private.validate_appointment_dentist()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.dentist_id is not distinct from old.dentist_id then
    return new;
  end if;
  if new.dentist_id is not null then
    perform id from public.staff_profile
    where id = new.dentist_id and role = 'dentist' and active
    for share;
    if not found then
      raise check_violation using message = 'An active dentist is required for this assignment';
    end if;
  end if;
  return new;
end
$$;
revoke all on function smilepoint_private.validate_appointment_dentist() from public;
create trigger validate_appointment_dentist
before insert or update of dentist_id on public.appointment
for each row execute function smilepoint_private.validate_appointment_dentist();

-- Apply the same clinic roles to direct Supabase clients and to the backend.
do $$
declare
  resource record;
begin
  for resource in
    select * from (values
      ('patient', 'admin,dentist,receptionist', 'admin,receptionist',
       'full_name, sex, date_of_birth, phone, email'),
      ('dental_service', 'admin,dentist,receptionist', 'admin',
       'name, description, price, active'),
      ('appointment', 'admin,dentist,receptionist', 'admin,receptionist',
       'patient_id, service_id, dentist_id, scheduled_at, status, notes'),
      ('treatment_record', 'admin,dentist', 'dentist',
       'patient_id, treatment, treatment_date, diagnosis, remarks, fee'),
      ('medical_history', 'admin,dentist', 'dentist',
       'patient_id, existing_conditions, allergies, current_medications, previous_dental_history, clinical_notes'),
      ('dental_chart', 'admin,dentist', 'dentist', 'patient_id, teeth, history_summary'),
      ('payment', 'admin,receptionist', 'admin,receptionist',
       'patient_id, service_id, amount, status, billing_date')
    ) as rules(table_name, readers, writers, writable_columns)
  loop
    execute format('alter table public.%I enable row level security', resource.table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', resource.table_name);
    execute format('grant select, insert (%s), update (%s) on public.%I to authenticated',
      resource.writable_columns, resource.writable_columns, resource.table_name);
    execute format('create policy clinic_read on public.%I for select to authenticated
      using ((select smilepoint_private.current_staff_role()) = any (string_to_array(%L, '','')::public.staff_role[]))',
      resource.table_name, resource.readers);
    execute format('create policy clinic_insert on public.%I for insert to authenticated
      with check ((select smilepoint_private.current_staff_role()) = any (string_to_array(%L, '','')::public.staff_role[]))',
      resource.table_name, resource.writers);
    execute format('create policy clinic_update on public.%I for update to authenticated
      using ((select smilepoint_private.current_staff_role()) = any (string_to_array(%L, '','')::public.staff_role[]))
      with check ((select smilepoint_private.current_staff_role()) = any (string_to_array(%L, '','')::public.staff_role[]))',
      resource.table_name, resource.writers, resource.writers);
  end loop;
end
$$;

alter table public.staff_profile enable row level security;
revoke all on public.staff_profile from public, anon, authenticated;
grant select, insert (id, full_name, role, active), update (full_name, role, active)
  on public.staff_profile to authenticated;
create policy staff_read on public.staff_profile for select to authenticated
  using (id = (select auth.uid()) or (select smilepoint_private.current_staff_role()) = 'admin');
create policy staff_insert on public.staff_profile for insert to authenticated
  with check ((select smilepoint_private.current_staff_role()) = 'admin');
create policy staff_update on public.staff_profile for update to authenticated
  using (id <> (select auth.uid()) and (select smilepoint_private.current_staff_role()) = 'admin')
  with check (id <> (select auth.uid()) and (select smilepoint_private.current_staff_role()) = 'admin');

create function public.clinic_summary()
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if smilepoint_private.current_staff_role() is distinct from 'admin'::public.staff_role then
    raise insufficient_privilege using message = 'Administrator access required';
  end if;
  return jsonb_build_object(
    'patients', (select count(*) from public.patient),
    'appointments', (select count(*) from public.appointment),
    'services', (select count(*) from public.dental_service),
    'payments', (select coalesce(sum(amount), 0) from public.payment where status = 'Paid')
  );
end
$$;
revoke all on function public.clinic_summary() from public, anon, authenticated;
grant execute on function public.clinic_summary() to authenticated;

commit;
