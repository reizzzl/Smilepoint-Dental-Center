# Smilepoint-Dental-Center

Smilepoint's backend uses Node.js, Express, Supabase Auth, and PostgreSQL. The API handles patient registration, scheduling, dental services, clinical records, billing, and staff permissions.

#DATABASE LINK

https://supabase.com/dashboard/project/fiycofqxnmgbfppzvcpf/database/schemas

#CREDENTIALS

#Admin

Email: joshuacloud@gmail.com

Pass: Joshua12345

#Receptionist

Email: lasicreivin@gmail.com

Pass: Reivin12345

#Dentist

Email: jestermarc@staff.com

Pass: Jester12345

## Backend setup

1. Use Node.js 24 and a development Supabase project. In the Supabase SQL Editor, run [database/smilepoint.sql](database/smilepoint.sql) once against a project that has no Smilepoint tables. Then run [database/seed.sql](database/seed.sql) for fictional patients, services, appointments, clinical records, and payments. The seed can be rerun without overwriting those records.
2. In Supabase Authentication, create and confirm an email/password user for the first administrator. Copy the user's UUID and run the following in the SQL Editor.

   ```sql
   insert into public.staff_profile (id, full_name, role)
   values ('REPLACE_WITH_AUTH_USER_UUID', 'Clinic Administrator', 'admin');
   ```

   Create or invite additional users through Supabase Auth. The administrator then assigns their profiles using `POST /api/staff` with each existing Auth UUID. Set `active` to `false` on a staff profile to revoke its clinic access. [Supabase Auth user management](https://supabase.com/docs/guides/auth/managing-user-data)
3. From the repository root, install the locked dependencies and copy the example configuration.

   ```powershell
   cd backend
   npm.cmd ci
   Copy-Item .env.example .env
   ```

   Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the project's API URL and publishable key. `CORS_ORIGINS` takes a comma-separated list of frontend origins and defaults to the local Vite origins. On macOS or Linux use `npm ci` and `cp .env.example .env`.
4. In `backend/`, run `npm.cmd start` on Windows or `npm start` on macOS/Linux. The API defaults to port 5000. Open `http://localhost:5000/api/health` to check that the server is responding.

## Authentication and permissions

Sign in through Supabase Auth, as the admin frontend does with `signInWithPassword`. Send the returned session's `access_token` as `Authorization: Bearer <access_token>` for every protected API request. `GET /api/auth/me` returns the active staff profile, including its role. The backend forwards the user's token so the same PostgreSQL row-level security policies protect queries made directly through Supabase. [Supabase Auth token validation](https://supabase.com/docs/reference/javascript/auth-getuser) · [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)

| Resource | Read | Write |
| --- | --- | --- |
| Patients and appointments | Admin, dentist, receptionist | Admin, receptionist |
| Dental services | Admin, dentist, receptionist | Admin |
| Treatments, medical history, and dental charts | Admin, dentist | Dentist |
| Payments | Admin, receptionist | Admin, receptionist |
| Staff directory | Admin | Admin |
| Dashboard summary | Admin | |

Staff can read their own profile via `/api/auth/me`. Administrators can edit other staff profiles. Use appointment cancellation and service or staff deactivation for records that should stay in clinic history.

## API contract

All paths below start with `/api`. `GET /health` is public. Collection routes support `GET /resource`, `POST /resource`, `GET /resource/:id`, and `PATCH /resource/:id`. Send JSON for writes. Use a patient's or service's UUID when linking related records.

| Collection | Required in POST | Additional fields |
| --- | --- | --- |
| `/patients` | `full_name` | `sex`, `date_of_birth`, `phone`, `email` |
| `/appointments` | `patient_id`, `service_id`, `scheduled_at` | `dentist_id`, `status`, `notes` |
| `/services` | `name`, `price` | `description`, `active` |
| `/treatments` | `patient_id`, `treatment` | `treatment_date`, `diagnosis`, `remarks`, `fee` |
| `/payments` | `patient_id`, `service_id`, `amount` | `billing_date`, `status` |
| `/staff` | `id` (Supabase Auth UUID), `full_name`, `role` | `active` |

Date fields use `YYYY-MM-DD`. Appointment timestamps include a time zone, for example `2026-12-01T10:00:00+08:00`. Appointment statuses are `Scheduled`, `Completed`, and `Cancelled`. Payment statuses are `Pending` and `Paid`. Send prices, fees, and amounts as JSON numbers in Philippine pesos with up to two decimal places. Staff role values are `admin`, `dentist`, and `receptionist`.

- `GET /patients/:patientId/medical-history` and `PUT /patients/:patientId/medical-history` use `existingConditions`, `allergies`, and `currentMedications` as string arrays, plus `previousDentalHistory` and `clinicalNotes` as nullable strings.
- `GET /patients/:patientId/dental-chart` and `PUT /patients/:patientId/dental-chart` use a `teeth` array of objects with `toothIdentifier`, `condition`, and `notes`, plus a nullable `historySummary`. Each tooth identifier is unique within the chart. `condition` and `notes` may be null.
- Clinical `PUT` creates or replaces the patient's record. Omitted values default to empty arrays or null. The response includes `patientId`.
- `GET /dashboard/summary` returns `patients`, `appointments`, `services`, and `payments`. The payments total includes paid amounts only.

Collection responses use `{ data, limit, offset }`. The defaults are `limit=25` and `offset=0`, with a maximum page size of 100. Appointments, treatments, and payments accept a `patient_id` filter. Single-record responses use `{ data }`. Successful creates return `201` and a `Location` header. Errors use `{ error }` with an HTTP status such as `400` for invalid input, `401` for an invalid or missing token, `403` for insufficient permissions, `404` for a missing record, or `409` for a conflict.

## Backend integration tests

From the repository root, run `npm.cmd --prefix backend test` on Windows or `npm --prefix backend test` on macOS/Linux. The HTTP suite uses the actual Express server and Supabase client against a local test server that simulates Auth and the Data API. The database suite loads the actual schema and seed in an isolated PostgreSQL engine and verifies constraints and row-level security. Both suites run without a hosted project or patient data.
