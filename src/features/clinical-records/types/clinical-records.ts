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

export interface DentalToothRecord {
  toothIdentifier: string
  condition: string | null
  notes: string | null
}

export interface DentalChartRecord {
  patientId: string
  teeth: DentalToothRecord[]
  historySummary: string | null
}
