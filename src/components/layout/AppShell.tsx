import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ClinicalIcon, type ClinicalIconName } from '../ui/ClinicalIcon'

const clinicalSections: {
  label: string
  icon: ClinicalIconName
  href: string
  route?: string
}[] = [
  { label: 'Dental Chart', icon: 'tooth', href: '#dental-chart', route: '/clinical-records#dental-chart' },
  {
    label: 'Medical History',
    icon: 'history',
    href: '#medical-history',
    route: '/clinical-records#medical-history',
  },
  { label: 'Tooth Examination', icon: 'exam', href: '#tooth-examination' },
  { label: 'Treatment Records', icon: 'treatment', href: '#treatment-records' },
  { label: 'X-ray Management', icon: 'image', href: '#x-ray-management' },
]

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {sidebarOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white">
            <ClinicalIcon name="tooth" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">Smile Point</p>
            <p className="mt-0.5 text-xs text-slate-500">Dental Center</p>
          </div>
        </div>

        <nav aria-label="Clinical navigation" className="flex-1 space-y-7 overflow-y-auto px-4 py-7">
          <div>
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Workspace
            </p>
            <NavLink
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
              end
              onClick={() => setSidebarOpen(false)}
              to="/"
            >
              <ClinicalIcon name="dashboard" />
              Clinical dashboard
            </NavLink>
          </div>

          <div>
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Clinical records
            </p>
            <div className="space-y-1">
              {clinicalSections.map((section) => {
                const linkContent = (
                  <>
                    <ClinicalIcon name={section.icon} />
                    <span className="flex-1">{section.label}</span>
                    <ClinicalIcon name="arrow" className="h-4 w-4 text-slate-400" />
                  </>
                )
                const className =
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

                return section.route ? (
                  <Link
                    className={className}
                    key={section.label}
                    onClick={() => setSidebarOpen(false)}
                    to={section.route}
                  >
                    {linkContent}
                  </Link>
                ) : (
                  <a
                    className={className}
                    href={section.href}
                    key={section.label}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {linkContent}
                  </a>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="border-t border-slate-100 px-6 py-5">
          <p className="text-xs font-medium text-slate-700">Clinical Management</p>
          <p className="mt-1 text-xs text-slate-500">Frontend workspace</p>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
            <div>
              <p className="text-xs font-medium text-slate-500">Smile Point Dental Center</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">Clinical workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 sm:inline-flex">
              Clinical workspace
            </span>
            <div
              aria-label="Smile Point Dental Center"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800"
              role="img"
            >
              SP
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
