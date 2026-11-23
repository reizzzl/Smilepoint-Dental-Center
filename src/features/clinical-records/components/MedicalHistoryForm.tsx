import { useEffect, useState, type FormEvent } from 'react'
import { ClinicalIcon } from '../../../components/ui/ClinicalIcon'
import type {
  ClinicalPatientReference,
  MedicalHistoryDraft,
  MedicalHistoryRecord,
} from '../types/clinical-records'

const emptyDraft: MedicalHistoryDraft = {
  existingConditions: '',
  allergies: '',
  currentMedications: '',
  previousDentalHistory: '',
  clinicalNotes: '',
}

const fields: {
  name: keyof MedicalHistoryDraft
  label: string
  description: string
  maxLength: number
  rows: number
  list?: boolean
}[] = [
  {
    name: 'existingConditions',
    label: 'Existing medical conditions',
    description: 'List relevant conditions, one per line.',
    maxLength: 3000,
    rows: 3,
    list: true,
  },
  {
    name: 'allergies',
    label: 'Allergies',
    description: 'List known allergies, one per line.',
    maxLength: 2000,
    rows: 3,
    list: true,
  },
  {
    name: 'currentMedications',
    label: 'Current medications',
    description: 'List current medications, one per line.',
    maxLength: 3000,
    rows: 3,
    list: true,
  },
  {
    name: 'previousDentalHistory',
    label: 'Previous dental history',
    description: 'Relevant prior dental procedures or history.',
    maxLength: 3000,
    rows: 3,
  },
  {
    name: 'clinicalNotes',
    label: 'Clinical notes',
    description: 'Additional notes for the clinical record.',
    maxLength: 5000,
    rows: 4,
  },
]

function toDraft(record: MedicalHistoryRecord | null): MedicalHistoryDraft {
  if (!record) return { ...emptyDraft }

  return {
    existingConditions: record.existingConditions.join('\n'),
    allergies: record.allergies.join('\n'),
    currentMedications: record.currentMedications.join('\n'),
    previousDentalHistory: record.previousDentalHistory ?? '',
    clinicalNotes: record.clinicalNotes ?? '',
  }
}

export function MedicalHistoryForm({
  patient,
  record,
}: {
  patient: ClinicalPatientReference | null
  record: MedicalHistoryRecord | null
}) {
  const [draft, setDraft] = useState(() => toDraft(record))
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    setDraft(toDraft(record))
    setFeedback('')
  }, [patient?.patientId, record])

  const hasInformation = Object.values(draft).some((value) => value.trim().length > 0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const invalidField = fields.find((field) => draft[field.name].length > field.maxLength)
    if (invalidField) {
      setFeedback(`${invalidField.label} exceeds the ${invalidField.maxLength} character limit.`)
      return
    }

    setFeedback(
      patient
        ? 'Draft validated. It has not been saved because clinical record integration is pending.'
        : 'Draft validated for this page only. No patient is connected, and nothing has been saved.',
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

        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((field) => (
            <label
              className={`block ${field.name === 'clinicalNotes' ? 'md:col-span-2' : ''}`}
              key={field.name}
            >
              <span className="block text-sm font-medium text-slate-800">{field.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{field.description}</span>
              <textarea
                className="mt-2 block w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                maxLength={field.maxLength}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, [field.name]: event.target.value }))
                  setFeedback('')
                }}
                placeholder={field.list ? 'No information entered' : 'Enter information'}
                rows={field.rows}
                value={draft[field.name]}
              />
              <span className="mt-1 block text-right text-xs text-slate-400">
                {draft[field.name].length}/{field.maxLength}
              </span>
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
            Drafts exist only in this page session. They are not associated with a patient or saved.
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
              Validate draft
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
