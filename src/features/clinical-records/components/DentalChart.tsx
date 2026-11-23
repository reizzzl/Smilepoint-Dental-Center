import { ClinicalIcon } from '../../../components/ui/ClinicalIcon'
import type { ClinicalPatientReference, DentalChartRecord } from '../types/clinical-records'

export function DentalChart({
  patient,
  record,
}: {
  patient: ClinicalPatientReference | null
  record: DentalChartRecord | null
}) {
  return (
    <section
      aria-labelledby="dental-chart-heading"
      className="rounded-2xl border border-slate-200 bg-white"
      id="dental-chart"
    >
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ClinicalIcon name="tooth" />
          </div>
          <div>
            <h2 id="dental-chart-heading" className="text-base font-semibold text-slate-900">
              Dental Chart
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tooth conditions and dental history summary.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
          <div className="mx-auto flex max-w-lg flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
              <ClinicalIcon name="tooth" className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              {record ? 'Dental chart data received' : 'No tooth-condition data loaded'}
            </h3>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {patient
                ? `No dental chart entries are available for ${patient.displayName}.`
                : 'Connect a patient record to display its dental chart. No tooth conditions are assumed.'}
            </p>
          </div>
        </div>

        {record?.teeth.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-3 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Tooth ID</span>
              <span>Condition</span>
              <span>Notes</span>
            </div>
            {record.teeth.map((tooth) => (
              <div
                className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-3 border-t border-slate-100 px-4 py-3 text-sm"
                key={tooth.toothIdentifier}
              >
                <span className="font-medium text-slate-800">{tooth.toothIdentifier}</span>
                <span className="text-slate-600">{tooth.condition || 'Not recorded'}</span>
                <span className="text-slate-600">{tooth.notes || '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500">
            Tooth numbering and condition codes will follow the agreed clinical data contract.
          </p>
        )}

        <div className="rounded-xl border border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Dental history summary</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {record?.historySummary || 'No dental history summary is available.'}
          </p>
        </div>
      </div>
    </section>
  )
}
