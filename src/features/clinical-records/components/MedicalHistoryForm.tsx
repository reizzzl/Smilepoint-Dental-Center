import { useEffect, useState, type FormEvent } from 'react'
import { ClinicalIcon } from '../../../components/ui/ClinicalIcon'
import type {
  ClinicalPatientReference,
  MedicalHistoryDraft,
  MedicalHistoryRecord,
} from '../types/clinical-records'

const emptyDraft: MedicalHistoryDraft = {
  allergies: '',
  currentMedications: '',
  bloodPressure: '',
  additionalNotes: '',
}

const fields: {
  name: keyof MedicalHistoryDraft
  column: 'allergies' | 'current_medications' | 'blood_pressure' | 'additional_notes'
  label: string
  description: string
  rows: number
}[] = [
  {
    name: 'allergies',
    column: 'allergies',
    label: 'Allergies',
    description: 'Allergy information.',
    rows: 3,
  },
  {
    name: 'currentMedications',
    column: 'current_medications',
    label: 'Current medications',
    description: 'Current medication information.',
    rows: 3,
  },
  {
    name: 'bloodPressure',
    column: 'blood_pressure',
    label: 'Blood pressure',
    description: 'Blood pressure information.',
    rows: 1,
  },
  {
    name: 'additionalNotes',
    column: 'additional_notes',
    label: 'Additional notes',
    description: 'Additional notes associated with this medical history.',
    rows: 4,
  },
]

function toDraft(record: MedicalHistoryRecord | null) {
  const draft = { ...emptyDraft }
  const incompatibleColumns: string[] = []

  if (!record) return { draft, incompatibleColumns }

  for (const field of fields) {
    const value = record[field.column]
    if (value === null || value === undefined) continue
    if (typeof value !== 'string') {
      incompatibleColumns.push(field.column)
      continue
    }
    draft[field.name] = value
  }

  return { draft, incompatibleColumns }
}

export function MedicalHistoryForm({
  patient,
  record,
}: {
  patient: ClinicalPatientReference | null
  record: MedicalHistoryRecord | null
}) {
  const [initialRecord] = useState(() => toDraft(record))
  const [draft, setDraft] = useState(initialRecord.draft)
  const [incompatibleColumns, setIncompatibleColumns] = useState(initialRecord.incompatibleColumns)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const nextRecord = toDraft(record)
    setDraft(nextRecord.draft)
    setIncompatibleColumns(nextRecord.incompatibleColumns)
    setFeedback('')
  }, [patient?.patientId, record])

  const hasInformation = Object.values(draft).some((value) => value.trim().length > 0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (incompatibleColumns.length > 0) {
      setFeedback(
        `Draft review is blocked until these column types are confirmed: ${incompatibleColumns.join(', ')}.`,
      )
      return
    }

    setFeedback(
      hasInformation
        ? 'Draft text is ready for review. It remains local; no API request was made.'
        : 'The draft is empty. No data was sent.',
    )
  }

  return (
    <section
      aria-labelledby="medical-history-heading"
      className="rounded-2xl border border-slate-200 bg-white"
      id="medical-history"
    >
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ClinicalIcon name="history" />
          </div>
          <div>
            <h2 id="medical-history-heading" className="text-base font-semibold text-slate-900">
              Medical History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review or prepare a clinical history draft.
            </p>
          </div>
        </div>
      </div>

      <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit}>
        {!hasInformation && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No medical history has been loaded. Fields are blank and no patient data is prefilled.
          </div>
        )}

        {incompatibleColumns.length > 0 && (
          <p
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="alert"
          >
            Could not display {incompatibleColumns.join(', ')} as text. Confirm the backend column
            types before integrating these values.
          </p>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((field) => (
            <label
              className={`block ${field.name === 'additionalNotes' ? 'md:col-span-2' : ''}`}
              key={field.name}
            >
              <span className="block text-sm font-medium text-slate-800">{field.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{field.description}</span>
              <textarea
                className="mt-2 block w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                name={field.column}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, [field.name]: event.target.value }))
                  setFeedback('')
                }}
                placeholder="Enter information"
                rows={field.rows}
                value={draft[field.name]}
              />
            </label>
          ))}
        </div>

        {feedback && (
          <p aria-live="polite" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800" role="status">
            {feedback}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-xs leading-5 text-slate-500">
            This is a page-local draft. No API request is made because the supplied backend fields
            do not fully match the actual Supabase columns.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              onClick={() => {
                setDraft({ ...emptyDraft })
                setFeedback('')
              }}
              type="button"
            >
              Clear draft
            </button>
            <button
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              type="submit"
            >
              Review draft
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
