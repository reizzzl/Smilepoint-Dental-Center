export interface ClinicalPatientReference {
  patientId: string
  displayName: string
}

export interface MedicalHistoryRecord {
  medical_history_id: string
  patient_id: string
  recorded_by: string | null
  recorded_at: string
  allergies: string | null
  current_medications: string | null
  blood_pressure: string | null
  additional_notes: string | null
}

export interface MedicalHistoryDraft {
  allergies: string
  currentMedications: string
  bloodPressure: string
  additionalNotes: string
}

export interface DentalChartRecord {
  chart_id: string
  patient_id: string
  examined_by: string | null
  chart_date: string
  general_notes: string | null
  created_at: string
  updated_at: string
}

export interface ToothExaminationRecord {
  tooth_exam_id: string
  chart_id: string
  tooth_number: number
  surface: string | null
  condition_status: string
  remarks: string | null
  updated_at: string
}
