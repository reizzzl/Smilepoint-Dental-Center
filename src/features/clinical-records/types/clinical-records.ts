export interface ClinicalPatientReference {
  patientId: string
  displayName: string
}

export interface MedicalHistoryRecord {
  existingConditions: string[]
  allergies: string[]
  currentMedications: string[]
  previousDentalHistory: string | null
  clinicalNotes: string | null
}

export interface MedicalHistoryDraft {
  existingConditions: string
  allergies: string
  currentMedications: string
  previousDentalHistory: string
  clinicalNotes: string
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
