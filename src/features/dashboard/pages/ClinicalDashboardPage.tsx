import { Link } from 'react-router-dom'
import { ClinicalIcon, type ClinicalIconName } from '../../../components/ui/ClinicalIcon'

const clinicalAreas: {
  id: string
  title: string
  description: string
  icon: ClinicalIconName
  status: string
  route?: string
}[] = [
  {
    id: 'dental-chart',
    title: 'Dental Chart',
    description: 'Review dental chart information and patient history.',
    icon: 'tooth',
    status: 'Workspace',
    route: '/clinical-records#dental-chart',
  },
  {
    id: 'medical-history',
    title: 'Medical History',
    description: 'Relevant health history, conditions, and allergies.',
    icon: 'history',
    status: 'Workspace',
    route: '/clinical-records#medical-history',
  },
  {
    id: 'tooth-examination',
    title: 'Tooth Examination',
    description: 'Clinical findings and examination notes.',
    icon: 'exam',
    status: 'Planned',
  },
  {
    id: 'treatment-records',
    title: 'Treatment Records',
    description: 'Planned and completed dental care.',
    icon: 'treatment',
    status: 'Planned',
  },
  {
    id: 'x-ray-management',
    title: 'X-ray Management',
    description: 'Dental imaging and related clinical review.',
    icon: 'image',
    status: 'Planned',
  },
]

export function ClinicalDashboardPage() {
  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
      <header className="mb-7 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          Frontend 3 · Clinical Module
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Clinical Management
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          A focused workspace for dental charting, patient history, examinations, treatment records,
          and diagnostic imaging.
        </p>
      </header>

      <section aria-labelledby="clinical-areas-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="clinical-areas-heading" className="text-base font-semibold text-slate-900">
              Clinical areas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a section from the clinical navigation.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">5 areas</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {clinicalAreas.map((area, index) => {
            const content = (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <ClinicalIcon name={area.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id={`${area.id}-title`} className="text-sm font-semibold text-slate-900">
                    {area.title}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{area.description}</p>
                </div>
                <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:inline-flex">
                  {area.status}
                </span>
              </>
            )
            const className = `scroll-mt-24 flex items-center gap-4 px-4 py-4 sm:px-5 ${
              index < clinicalAreas.length - 1 ? 'border-b border-slate-100' : ''
            } ${area.route ? 'transition hover:bg-blue-50/60 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600' : ''}`

            return area.route ? (
              <Link className={className} id={area.id} key={area.id} to={area.route}>
                {content}
              </Link>
            ) : (
              <section
                aria-labelledby={`${area.id}-title`}
                className={className}
                id={area.id}
                key={area.id}
              >
                {content}
              </section>
            )
          })}
        </div>
      </section>
    </div>
  )
}
