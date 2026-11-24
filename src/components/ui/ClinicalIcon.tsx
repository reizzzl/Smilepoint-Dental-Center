import type { ReactNode } from 'react'

export type ClinicalIconName =
  | 'dashboard'
  | 'tooth'
  | 'history'
  | 'exam'
  | 'treatment'
  | 'image'
  | 'arrow'

const iconPaths: Record<ClinicalIconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  tooth: (
    <path d="M7.1 3.8c1.4 0 2.1.8 4.9.8s3.5-.8 4.9-.8c2.1 0 3.6 1.8 3.6 4.1 0 2.1-1 3.4-1.6 5.3-.7 2.2-1.1 7-3.1 7-1.5 0-1.6-5.7-3.8-5.7s-2.3 5.7-3.8 5.7c-2 0-2.4-4.8-3.1-7C4.4 11.3 3.4 10 3.4 7.9c0-2.3 1.5-4.1 3.7-4.1Z" />
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.2-5.7L3.5 8.5" />
      <path d="M3.5 4.5v4h4M12 7.5V12l3 1.8" />
    </>
  ),
  exam: (
    <>
      <path d="M8 3.5h8l3 3v14H5v-17h3Z" />
      <path d="M8 3.5v4h8v-4M8.5 13h7M8.5 16.5h5" />
    </>
  ),
  treatment: (
    <>
      <path d="M12 3.5v17M3.5 12h17" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m20.5 15-5-5L7 19.5" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
}

export function ClinicalIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: ClinicalIconName
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {iconPaths[name]}
    </svg>
  )
}
