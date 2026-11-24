import { Link } from 'react-router-dom'
import { ClinicalIcon } from '../../../components/ui/ClinicalIcon'
import { DentalChart } from '../components/DentalChart'
import { MedicalHistoryForm } from '../components/MedicalHistoryForm'
import { TreatmentRecords } from '../components/TreatmentRecords'
import { XrayManagement } from '../components/XrayManagement'
import type { ClinicalPatientReference } from '../types/clinical-records'

export function ClinicalRecordsPage({ patient }: { patient: ClinicalPatientReference | null }) {
  return (
    <div className="space-y-6 px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
      <header className="border-b border-slate-200 pb-6">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
          to="/"
        >
          <ClinicalIcon name="arrow" className="h-4 w-4 rotate-180" />
          Clinical dashboard
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          Clinical records
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Dental Chart, Medical History &amp; Treatment Records
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Review dental chart information, prepare a medical history draft, and manage treatment
          records for the selected patient.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
          !
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {patient ? `Patient: ${patient.displayName}` : 'Patient context is not connected'}
          </p>
          <p className="mt-1 text-sm leading-5 text-amber-800">
            {patient
              ? 'Clinical records are not loaded. Draft edits remain in this page session and are not saved.'
              : 'No patient identifier or shared patient context is available in the current app. No patient data is shown or saved.'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <MedicalHistoryForm patient={patient} record={null} />
        <DentalChart patient={patient} charts={[]} toothExaminations={[]} />
        <TreatmentRecords patient={patient} records={[]} />
        <XrayManagement patient={patient} studies={[]} />
      </div>
    </div>
  )
}
