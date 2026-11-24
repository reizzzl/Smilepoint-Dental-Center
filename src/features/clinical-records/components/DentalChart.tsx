import { ClinicalIcon } from '../../../components/ui/ClinicalIcon'
import type {
  ClinicalPatientReference,
  DentalChartRecord,
  ToothExaminationRecord,
} from '../types/clinical-records'

export function DentalChart({
  patient,
  charts,
  toothExaminations,
}: {
  patient: ClinicalPatientReference | null
  charts: DentalChartRecord[]
  toothExaminations: ToothExaminationRecord[]
}) {
  function formatTimestamp(value: string) {
    const timestamp = new Date(value)
    return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString()
  }

  function isValidToothNumber(value: number) {
    return Number.isInteger(value) && value >= 1 && value <= 85
  }

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
        {charts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
                <ClinicalIcon name="tooth" className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                No Dental Chart data is currently loaded.
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {patient
                  ? `Integrate the data source to display Dental Chart records for ${patient.displayName}.`
                  : 'Connect a patient record and integrate the data source to display Dental Chart records.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {charts.map((chart) => {
              const chartExaminations = toothExaminations.filter(
                (examination) => examination.chart_id === chart.chart_id,
              )

              return (
                <article className="space-y-4 py-5 first:pt-0 last:pb-0" key={chart.chart_id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Chart date:{' '}
                        <time dateTime={chart.chart_date}>{chart.chart_date}</time>
                      </h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">
                        {chart.general_notes || 'No general notes recorded.'}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-slate-500">
                      Chart updated{' '}
                      <time dateTime={chart.updated_at}>{formatTimestamp(chart.updated_at)}</time>
                    </p>
                  </div>

                  {chartExaminations.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
                      No tooth examination records are available for this chart.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[720px] divide-y divide-slate-200 text-left text-sm">
                        <caption className="sr-only">
                          Tooth examinations for chart dated {chart.chart_date}
                        </caption>
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3" scope="col">Tooth number</th>
                            <th className="px-4 py-3" scope="col">Surface</th>
                            <th className="px-4 py-3" scope="col">Condition status</th>
                            <th className="px-4 py-3" scope="col">Remarks</th>
                            <th className="px-4 py-3" scope="col">Last updated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {chartExaminations.map((examination: ToothExaminationRecord) => (
                            <tr key={examination.tooth_exam_id}>
                              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                                {isValidToothNumber(examination.tooth_number)
                                  ? examination.tooth_number
                                  : `Invalid (${examination.tooth_number}; expected 1-85)`}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {examination.surface ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {examination.condition_status}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {examination.remarks ?? '—'}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                <time dateTime={examination.updated_at}>
                                  {formatTimestamp(examination.updated_at)}
                                </time>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
