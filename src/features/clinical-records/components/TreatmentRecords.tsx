import { useEffect, useState, type FormEvent } from 'react'
import { ClinicalIcon } from '../../../components/ui/ClinicalIcon'
import type {
  ClinicalPatientReference,
  TreatmentRecord,
  TreatmentRecordDraft,
} from '../types/clinical-records'

interface TreatmentDraftFormValues {
  appointment_id: string
  service_id: string
  performed_by: string
  tooth_number: string
  diagnosis: string
  procedure_done: string
  treatment_date: string
  notes: string
}

type TreatmentDraftField = keyof TreatmentDraftFormValues
type TreatmentDraftErrors = Partial<Record<TreatmentDraftField, string>>

const emptyDraft: TreatmentDraftFormValues = {
  appointment_id: '',
  service_id: '',
  performed_by: '',
  tooth_number: '',
  diagnosis: '',
  procedure_done: '',
  treatment_date: '',
  notes: '',
}

const fieldClassName =
  'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function isValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const [, yearText, monthText, dayText] = match
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(Number(yearText), Number(monthText) - 1, Number(dayText))

  return (
    date.getUTCFullYear() === Number(yearText) &&
    date.getUTCMonth() === Number(monthText) - 1 &&
    date.getUTCDate() === Number(dayText)
  )
}

function isValidUuid(value: string) {
  return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
}

export function TreatmentRecords({
  patient,
  records,
}: {
  patient: ClinicalPatientReference | null
  records: TreatmentRecord[]
}) {
  const [form, setForm] = useState({ ...emptyDraft })
  const [drafts, setDrafts] = useState<TreatmentRecordDraft[]>([])
  const [errors, setErrors] = useState<TreatmentDraftErrors>({})
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    setForm({ ...emptyDraft })
    setDrafts([])
    setErrors({})
    setFeedback('')
  }, [patient?.patientId])

  const patientRecords = patient
    ? records.filter((record) => record.patient_id === patient.patientId)
    : []

  function updateField(field: TreatmentDraftField, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFeedback('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: TreatmentDraftErrors = {}
    const procedure = form.procedure_done.trim()
    const toothValue = form.tooth_number.trim()
    const toothNumber = toothValue ? Number(toothValue) : null

    if (!procedure) nextErrors.procedure_done = 'Enter the procedure performed.'
    if (!isValidDate(form.treatment_date)) {
      nextErrors.treatment_date = 'Enter a valid treatment date.'
    }
    if (
      toothValue &&
      (!Number.isInteger(toothNumber) || toothNumber === null || toothNumber < 1 || toothNumber > 85)
    ) {
      nextErrors.tooth_number = 'Enter a whole tooth number from 1 to 85, or leave it blank.'
    }
    if (form.appointment_id.trim() && !isValidUuid(form.appointment_id.trim())) {
      nextErrors.appointment_id = 'Enter a valid appointment UUID or leave this field blank.'
    }
    if (form.service_id.trim() && !isValidUuid(form.service_id.trim())) {
      nextErrors.service_id = 'Enter a valid service UUID or leave this field blank.'
    }
    if (form.performed_by.trim() && !isValidUuid(form.performed_by.trim())) {
      nextErrors.performed_by = 'Enter a valid performer UUID or leave this field blank.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setFeedback('Review the highlighted fields before adding this draft.')
      return
    }

    if (!patient) {
      setErrors({})
      setFeedback('Connect a patient record before creating an associated treatment draft.')
      return
    }

    const draft: TreatmentRecordDraft = {
      patient_id: patient.patientId,
      appointment_id: form.appointment_id.trim() || null,
      service_id: form.service_id.trim() || null,
      performed_by: form.performed_by.trim() || null,
      tooth_number: toothNumber,
      diagnosis: form.diagnosis.trim() || null,
      procedure_done: procedure,
      treatment_date: form.treatment_date,
      notes: form.notes.trim() || null,
    }

    setDrafts((current) => [...current, draft])
    setForm({ ...emptyDraft })
    setErrors({})
    setFeedback('Draft added locally only. It has not been saved to Supabase.')
  }

  function renderRecordTable(items: TreatmentRecord[]) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[700px] divide-y divide-slate-200 text-left text-sm">
          <caption className="sr-only">Loaded treatment records</caption>
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3" scope="col">Treatment date</th>
              <th className="px-4 py-3" scope="col">Tooth number</th>
              <th className="px-4 py-3" scope="col">Diagnosis</th>
              <th className="px-4 py-3" scope="col">Procedure done</th>
              <th className="px-4 py-3" scope="col">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((record) => (
              <tr key={record.treatment_id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  <time dateTime={record.treatment_date}>{record.treatment_date}</time>
                </td>
                <td className="px-4 py-3 text-slate-600">{record.tooth_number ?? '—'}</td>
                <td className="whitespace-pre-wrap px-4 py-3 text-slate-600">
                  {record.diagnosis ?? '—'}
                </td>
                <td className="whitespace-pre-wrap px-4 py-3 font-medium text-slate-800">
                  {record.procedure_done}
                </td>
                <td className="whitespace-pre-wrap px-4 py-3 text-slate-600">
                  {record.notes ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section
      aria-labelledby="treatment-records-heading"
      className="rounded-2xl border border-slate-200 bg-white"
      id="treatment-records"
    >
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ClinicalIcon name="treatment" />
          </div>
          <div>
            <h2 id="treatment-records-heading" className="text-base font-semibold text-slate-900">
              Treatment Records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review loaded treatment details or prepare an unsaved draft.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Loaded records</h3>
          {patientRecords.length > 0 ? (
            renderRecordTable(patientRecords)
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm text-slate-600">
              No Treatment Records data is currently loaded.
              {patient
                ? ` Records for ${patient.displayName} will appear here when a data source is connected.`
                : ' Connect a patient record and data source to display treatment records.'}
            </p>
          )}
        </div>

        {drafts.length > 0 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Unsaved local drafts</h3>
              <p className="mt-1 text-xs text-amber-800">
                These drafts exist only in this page session and have not been saved to Supabase.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-amber-200">
              <table className="w-full min-w-[700px] divide-y divide-amber-100 text-left text-sm">
                <caption className="sr-only">Unsaved treatment drafts</caption>
                <thead className="bg-amber-50 text-xs font-semibold uppercase tracking-wide text-amber-900">
                  <tr>
                    <th className="px-4 py-3" scope="col">Treatment date</th>
                    <th className="px-4 py-3" scope="col">Tooth number</th>
                    <th className="px-4 py-3" scope="col">Diagnosis</th>
                    <th className="px-4 py-3" scope="col">Procedure done</th>
                    <th className="px-4 py-3" scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {drafts.map((draft, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {draft.treatment_date}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{draft.tooth_number ?? '—'}</td>
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-600">
                        {draft.diagnosis ?? '—'}
                      </td>
                      <td className="whitespace-pre-wrap px-4 py-3 font-medium text-slate-800">
                        {draft.procedure_done}
                      </td>
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-600">
                        {draft.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <form className="space-y-5 border-t border-slate-100 pt-5" noValidate onSubmit={handleSubmit}>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">New treatment draft</h3>
            <p className="mt-1 text-xs text-slate-500">
              Draft values remain local. Generated database fields are not created here.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="block text-sm font-medium text-slate-800">Treatment date</span>
              <input
                aria-describedby={errors.treatment_date ? 'treatment-date-error' : undefined}
                aria-invalid={Boolean(errors.treatment_date)}
                className={fieldClassName}
                name="treatment_date"
                onChange={(event) => updateField('treatment_date', event.target.value)}
                required
                type="date"
                value={form.treatment_date}
              />
              {errors.treatment_date && (
                <span className="mt-1 block text-xs text-red-700" id="treatment-date-error" role="alert">
                  {errors.treatment_date}
                </span>
              )}
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-slate-800">Tooth number (optional)</span>
              <input
                aria-describedby={errors.tooth_number ? 'treatment-tooth-error' : undefined}
                aria-invalid={Boolean(errors.tooth_number)}
                className={fieldClassName}
                max={85}
                min={1}
                name="tooth_number"
                onChange={(event) => updateField('tooth_number', event.target.value)}
                placeholder="1–85"
                step={1}
                type="number"
                value={form.tooth_number}
              />
              {errors.tooth_number && (
                <span className="mt-1 block text-xs text-red-700" id="treatment-tooth-error" role="alert">
                  {errors.tooth_number}
                </span>
              )}
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-slate-800">Procedure done</span>
              <textarea
                aria-describedby={errors.procedure_done ? 'procedure-done-error' : undefined}
                aria-invalid={Boolean(errors.procedure_done)}
                className={`${fieldClassName} resize-y`}
                name="procedure_done"
                onChange={(event) => updateField('procedure_done', event.target.value)}
                required
                rows={3}
                value={form.procedure_done}
              />
              {errors.procedure_done && (
                <span className="mt-1 block text-xs text-red-700" id="procedure-done-error" role="alert">
                  {errors.procedure_done}
                </span>
              )}
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-slate-800">Diagnosis (optional)</span>
              <textarea
                className={`${fieldClassName} resize-y`}
                name="diagnosis"
                onChange={(event) => updateField('diagnosis', event.target.value)}
                rows={3}
                value={form.diagnosis}
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-slate-800">Appointment ID (optional)</span>
              <input
                aria-describedby={errors.appointment_id ? 'appointment-id-error' : undefined}
                aria-invalid={Boolean(errors.appointment_id)}
                className={fieldClassName}
                name="appointment_id"
                onChange={(event) => updateField('appointment_id', event.target.value)}
                type="text"
                value={form.appointment_id}
              />
              {errors.appointment_id && (
                <span className="mt-1 block text-xs text-red-700" id="appointment-id-error" role="alert">
                  {errors.appointment_id}
                </span>
              )}
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-slate-800">Service ID (optional)</span>
              <input
                aria-describedby={errors.service_id ? 'service-id-error' : undefined}
                aria-invalid={Boolean(errors.service_id)}
                className={fieldClassName}
                name="service_id"
                onChange={(event) => updateField('service_id', event.target.value)}
                type="text"
                value={form.service_id}
              />
              {errors.service_id && (
                <span className="mt-1 block text-xs text-red-700" id="service-id-error" role="alert">
                  {errors.service_id}
                </span>
              )}
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-slate-800">Performed by ID (optional)</span>
              <input
                aria-describedby={errors.performed_by ? 'performed-by-error' : undefined}
                aria-invalid={Boolean(errors.performed_by)}
                className={fieldClassName}
                name="performed_by"
                onChange={(event) => updateField('performed_by', event.target.value)}
                type="text"
                value={form.performed_by}
              />
              {errors.performed_by && (
                <span className="mt-1 block text-xs text-red-700" id="performed-by-error" role="alert">
                  {errors.performed_by}
                </span>
              )}
            </label>

            <label className="block md:col-span-2">
              <span className="block text-sm font-medium text-slate-800">Notes (optional)</span>
              <textarea
                className={`${fieldClassName} resize-y`}
                name="notes"
                onChange={(event) => updateField('notes', event.target.value)}
                rows={3}
                value={form.notes}
              />
            </label>
          </div>

          {feedback && (
            <p
              aria-live="polite"
              className={`rounded-lg px-3 py-2 text-sm ${
                Object.values(errors).some(Boolean)
                  ? 'bg-red-50 text-red-800'
                  : 'bg-blue-50 text-blue-800'
              }`}
              role="status"
            >
              {feedback}
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-5 text-slate-500">
              No API request is made. The draft is associated with the connected patient only when
              patient context is available.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                onClick={() => {
                  setForm({ ...emptyDraft })
                  setErrors({})
                  setFeedback('')
                }}
                type="button"
              >
                Clear form
              </button>
              <button
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                type="submit"
              >
                Add unsaved draft
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
