import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ClinicalRecordsPage } from '../features/clinical-records/pages/ClinicalRecordsPage'
import { ClinicalDashboardPage } from '../features/dashboard/pages/ClinicalDashboardPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <ClinicalDashboardPage /> },
      { path: 'clinical-records', element: <ClinicalRecordsPage patient={null} /> },
    ],
  },
])
