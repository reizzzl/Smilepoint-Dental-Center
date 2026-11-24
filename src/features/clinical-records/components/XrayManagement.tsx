import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ClinicalIcon } from '../../../components/ui/ClinicalIcon'
import type { ClinicalPatientReference, XrayStudy } from '../types/clinical-records'

function formatTimestamp(value: string) {
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString()
}

export function XrayManagement({
  patient,
  studies,
}: {
  patient: ClinicalPatientReference | null
  studies: XrayStudy[]
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedFile])

  const patientStudies = patient
    ? studies.filter((study) => study.patient_id === patient.patientId)
    : []

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setSelectedFile(null)
      event.currentTarget.value = ''
      setFeedback({
        message: 'Select an image file. The selected file was not uploaded.',
        isError: true,
      })
      return
    }

    setSelectedFile(file)
    setFeedback({
      message: 'This image is available for local preview only. It has not been uploaded or saved.',
      isError: false,
    })
  }

  function clearSelection() {
    setSelectedFile(null)
    setFeedback(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <section
      aria-labelledby="xray-management-heading"
      className="rounded-2xl border border-slate-200 bg-white"
      id="x-ray-management"
    >
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ClinicalIcon name="image" />
          </div>
          <div>
            <h2 id="xray-management-heading" className="text-base font-semibold text-slate-900">
              X-ray Management
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review available study details and preview an image locally.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div>
          {patientStudies.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Available X-ray studies</h3>
              {patientStudies.map((study) => (
                <article
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  key={study.xray_id}
                >
                  <h4 className="text-sm font-semibold text-slate-900">{study.study_type}</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Taken <time dateTime={study.taken_at}>{formatTimestamp(study.taken_at)}</time>
                  </p>
                  {study.findings && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {study.findings}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm text-slate-600">
              No X-ray study data is currently loaded.
              {patient
                ? ` Studies for ${patient.displayName} will appear here when a data source is connected.`
                : ' Connect a patient record and data source to display X-ray studies.'}
            </p>
          )}
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Local image preview</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Choose an image to preview in this browser. No upload or database save is performed.
            </p>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-slate-800">Select an image file</span>
            <input
              accept="image/*"
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              onChange={handleFileSelection}
              ref={fileInputRef}
              type="file"
            />
          </label>

          {feedback && (
            <p
              aria-live="polite"
              className={`rounded-lg px-3 py-2 text-sm ${
                feedback.isError ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'
              }`}
              role={feedback.isError ? 'alert' : 'status'}
            >
              {feedback.message}
            </p>
          )}

          {selectedFile && previewUrl && (
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 break-all text-sm font-medium text-slate-800">
                  Selected file: {selectedFile.name}
                </p>
                <button
                  className="shrink-0 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  onClick={clearSelection}
                  type="button"
                >
                  Clear image
                </button>
              </div>
              <img
                alt={`Local preview of ${selectedFile.name}`}
                className="max-h-[28rem] w-full rounded-lg bg-slate-50 object-contain"
                src={previewUrl}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
