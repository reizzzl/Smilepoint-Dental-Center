begin;

-- The fixed IDs let us rerun this file without replacing the sample rows.
insert into public.patient (id, full_name, sex, date_of_birth, email) values
  ('10000000-0000-4000-8000-000000000001', 'Demo Patient Andrea', 'Female', '1996-04-12', 'andrea@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'Demo Patient Marco', 'Male', '1989-09-03', 'marco@example.invalid')
on conflict (id) do nothing;

insert into public.dental_service (id, name, description, price) values
  ('20000000-0000-4000-8000-000000000001', 'Demo Dental Checkup', 'Routine oral examination', 500),
  ('20000000-0000-4000-8000-000000000002', 'Demo Oral Prophylaxis', 'Routine cleaning', 1200)
on conflict (id) do nothing;

insert into public.appointment (id, patient_id, service_id, scheduled_at) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001', '2026-12-01 10:00:00+08')
on conflict (id) do nothing;

insert into public.treatment_record (id, patient_id, treatment, treatment_date, diagnosis, remarks, fee) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
   'Oral prophylaxis', '2026-10-15', 'Plaque buildup', 'Sample clinical note', 1200)
on conflict (id) do nothing;

insert into public.medical_history (patient_id, allergies, previous_dental_history) values
  ('10000000-0000-4000-8000-000000000002', array['Latex'], 'Sample routine cleaning in October 2026')
on conflict (patient_id) do nothing;

insert into public.dental_chart (patient_id, teeth, history_summary) values
  ('10000000-0000-4000-8000-000000000002',
   '[{"toothIdentifier":"16","condition":"Restored","notes":null}]', 'Example chart entry')
on conflict (patient_id) do nothing;

insert into public.payment (id, patient_id, service_id, amount, status, billing_date) values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002', 1200, 'Paid', '2026-10-15'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001', 500, 'Pending', '2026-12-01')
on conflict (id) do nothing;

commit;
