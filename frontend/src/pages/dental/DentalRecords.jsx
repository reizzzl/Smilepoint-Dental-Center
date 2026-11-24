
import { useEffect, useState } from "react";

import {
  Search,
  RefreshCw,
  Printer,
  UserRound,
  ClipboardList,
  Stethoscope,
  Image,
  Plus,
  X,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import {
  getPatients,
  getCurrentStaff,
} from "../../services/patientsApi";

import DentalExamination from "./DentalExamination";
import ClinicalRecordForm from "./ClinicalRecordForm";

import "./DentalRecords.css";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-PH");
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

function getFullName(patient) {
  if (!patient) return "—";

  return (
    [
      patient.first_name,
      patient.middle_name,
      patient.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    patient.full_name ||
    "—"
  );
}

function getAge(dob) {
  if (!dob) return "—";

  const birth = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  if (
    today.getMonth() < birth.getMonth() ||
    (
      today.getMonth() === birth.getMonth() &&
      today.getDate() < birth.getDate()
    )
  ) {
    age--;
  }

  return Number.isFinite(age) && age >= 0
    ? age
    : "—";
}

function displayValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.map(displayValue).join(", ")
      : "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

function InfoField({ label, value }) {
  return (
    <div className="dc-info-field">
      <span>{label}</span>
      <strong>{displayValue(value)}</strong>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  action,
  children,
}) {
  return (
    <section className="dc-section">
      <div className="dc-section-heading">
        {Icon && <Icon size={19} />}

        <h2>{title}</h2>

        {action && (
          <div className="dc-section-actions">
            {action}
          </div>
        )}
      </div>

      <div className="dc-section-body">
        {children}
      </div>
    </section>
  );
}

// ==========================================
// PRIVATE X-RAY IMAGE
// ==========================================

function XrayPreview({ path }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setUrl("");
    setError("");

    if (!path) return;

    async function loadImage() {
      const { data, error } = await supabase.storage
        .from("dental-xrays")
        .createSignedUrl(path, 300);

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setUrl(data.signedUrl);
      }
    }

    loadImage();

    return () => {
      active = false;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="dc-xray-placeholder">
        <Image size={34} />
        <span>
          {error
            ? "Unable to load image"
            : path
              ? "Loading X-ray..."
              : "No image available"}
        </span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="dc-xray-image-link"
    >
      <img
        src={url}
        alt="Patient dental X-ray"
        className="dc-xray-image"
      />
    </a>
  );
}

// ==========================================
// DATABASE RECORD RETRIEVAL
// ==========================================

async function readPatientRecords(table, patientId) {
  const limit = 500;
  let offset = 0;

  const records = [];

  const orderColumns = {
    medical_history: "medical_history_id",
    dental_chart: "chart_id",
    treatment_record: "treatment_id",
    xray_study: "xray_id",
  };

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("patient_id", patientId)
      .order(orderColumns[table] || "patient_id")
      .range(offset, offset + limit - 1);

    if (error) throw error;

    records.push(...(data || []));

    if (!data || data.length < limit) {
      break;
    }

    offset += limit;
  }

  return records;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function DentalRecords() {
  const [staff, setStaff] = useState(null);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedPatient, setSelectedPatient] =
    useState(null);

  const [medicalHistory, setMedicalHistory] =
    useState([]);

  const [dentalChart, setDentalChart] =
    useState([]);

  const [treatments, setTreatments] =
    useState([]);

  const [xrays, setXrays] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadingRecords, setLoadingRecords] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sectionErrors, setSectionErrors] =
    useState({});

  const [refresh, setRefresh] = useState(0);
  const [activeForm, setActiveForm] = useState(null);

  // ==========================================
  // ROLE-BASED ACCESS
  // ==========================================

  const canViewClinical =
    staff?.active === true &&
    ["admin", "dentist"].includes(staff?.role);

  const canEditClinical =
    staff?.active === true &&
    staff?.role === "dentist";

  const patientId =
    selectedPatient?.patient_id ||
    selectedPatient?.id;

  const canAddRecord =
    canEditClinical &&
    Boolean(patientId) &&
    !loading &&
    !loadingRecords;

  // ==========================================
  // LOAD STAFF AND PATIENTS
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadPatients() {
      setLoading(true);
      setError("");

      try {
        const currentStaff = await getCurrentStaff();

        if (!active) return;

        setStaff(currentStaff);

        if (
          !currentStaff?.active ||
          !["admin", "dentist"].includes(
            currentStaff.role
          )
        ) {
          setPatients([]);
          setSelectedPatient(null);
          return;
        }

        const data = await getPatients();

        if (!active) return;

        const patientList = Array.isArray(data)
          ? data
          : [];

        setPatients(patientList);

        setSelectedPatient((current) => {
          if (!current) return null;

          return (
            patientList.find(
              (patient) =>
                (patient.patient_id || patient.id) ===
                (current.patient_id || current.id)
            ) || null
          );
        });
      } catch (err) {
        if (active) {
          setError(err.message);
          setStaff(null);
          setPatients([]);
          setSelectedPatient(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPatients();

    return () => {
      active = false;
    };
  }, [refresh]);

  // ==========================================
  // LOAD DENTAL SERVICES
  // ==========================================

  useEffect(() => {
    let active = true;

    if (!canViewClinical) return;

    async function loadServices() {
      const { data, error } = await supabase
        .from("dental_service")
        .select("service_id, name, base_price")
        .order("name");

      if (!active) return;

      if (!error) {
        setServices(data || []);
      } else {
        setServices([]);
      }
    }

    loadServices();

    return () => {
      active = false;
    };
  }, [canViewClinical, refresh]);

  // ==========================================
  // PATIENT SEARCH
  // ==========================================

  const filteredPatients = patients.filter(
    (patient) =>
      [
        patient.patient_id || patient.id,
        getFullName(patient),
        patient.phone_number || patient.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  );

  // ==========================================
  // LOAD CLINICAL RECORDS
  // ==========================================

  useEffect(() => {
    let active = true;

    setMedicalHistory([]);
    setDentalChart([]);
    setTreatments([]);
    setXrays([]);
    setSectionErrors({});

    if (!patientId || !canViewClinical) {
      setLoadingRecords(false);
      return;
    }

    async function loadClinicalRecords() {
      setLoadingRecords(true);

      const requests = [
        {
          key: "medical",
          table: "medical_history",
          setter: setMedicalHistory,
        },
        {
          key: "chart",
          table: "dental_chart",
          setter: setDentalChart,
        },
        {
          key: "treatments",
          table: "treatment_record",
          setter: setTreatments,
        },
        {
          key: "xrays",
          table: "xray_study",
          setter: setXrays,
        },
      ];

      await Promise.all(
        requests.map(async (request) => {
          try {
            const records = await readPatientRecords(
              request.table,
              patientId
            );

            if (active) {
              request.setter(records);
            }
          } catch (err) {
            if (active) {
              setSectionErrors((current) => ({
                ...current,
                [request.key]: err.message,
              }));
            }
          }
        })
      );

      if (active) {
        setLoadingRecords(false);
      }
    }

    loadClinicalRecords();

    return () => {
      active = false;
    };
  }, [patientId, refresh, canViewClinical]);

  // ==========================================
  // PATIENT ACTIONS
  // ==========================================

  function resetClinicalRecords() {
    setMedicalHistory([]);
    setDentalChart([]);
    setTreatments([]);
    setXrays([]);
    setSectionErrors({});
    setActiveForm(null);
    setSuccess("");
  }

  function selectPatient(patient) {
    const nextId = patient.patient_id || patient.id;

    if (nextId !== patientId) {
      resetClinicalRecords();
      setLoadingRecords(true);
    }

    setSelectedPatient(patient);
    setSearch("");
  }

  function clearPatient() {
    setSelectedPatient(null);
    setSearch("");
    resetClinicalRecords();
  }

  function refreshRecords() {
    setRefresh((current) => current + 1);
  }

  function handleSaved() {
    setActiveForm(null);
    setSuccess("Clinical record saved successfully.");
    refreshRecords();
  }

  function printChart() {
    if (
      !selectedPatient ||
      loadingRecords ||
      !canViewClinical
    ) {
      return;
    }

    window.print();
  }

  function openForm(type) {
    if (!canAddRecord) return;

    setSuccess("");
    setActiveForm(type);
  }

  // ==========================================
  // PREPARE RECORDS
  // ==========================================

  const history =
    [...medicalHistory].sort(
      (a, b) =>
        String(b.recorded_at || "").localeCompare(
          String(a.recorded_at || "")
        )
    )[0] || {};

  const chart =
    [...dentalChart].sort(
      (a, b) =>
        String(b.chart_date || "").localeCompare(
          String(a.chart_date || "")
        ) ||
        String(b.created_at || "").localeCompare(
          String(a.created_at || "")
        )
    )[0] || {};

  const sortedTreatments = [...treatments].sort(
    (a, b) =>
      String(b.treatment_date || "").localeCompare(
        String(a.treatment_date || "")
      )
  );

  const sortedXrays = [...xrays].sort(
    (a, b) =>
      String(b.taken_at || "").localeCompare(
        String(a.taken_at || "")
      )
  );

  function getService(record) {
    return services.find(
      (service) =>
        service.service_id === record.service_id
    );
  }

  function sectionMessage(key, empty) {
    if (!selectedPatient) {
      return (
        <p className="dc-empty">
          Select a patient to view records.
        </p>
      );
    }

    if (loadingRecords) {
      return (
        <p className="dc-empty">
          Loading records...
        </p>
      );
    }

    if (sectionErrors[key]) {
      return (
        <div className="dc-error">
          Unable to load records: {sectionErrors[key]}
        </div>
      );
    }

    if (empty) {
      return (
        <p className="dc-empty">
          No accessible records available.
        </p>
      );
    }

    return null;
  }

  // ==========================================
  // ACCESS CONTROL
  // ==========================================

  if (loading && !staff) {
    return (
      <div className="dental-chart-page">
        <p className="dc-empty">
          Loading dental records...
        </p>
      </div>
    );
  }

  if (!canViewClinical) {
    return (
      <div className="dental-chart-page">
        <div className="dc-page-header">
          <div>
            <h1>Patient Dental Chart</h1>
            <p>Confidential clinical records.</p>
          </div>
        </div>

        <div className="dc-error">
          {error ||
            "Your account does not have permission to access clinical records."}
        </div>

        <button
          className="dc-secondary-btn"
          onClick={refreshRecords}
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  // ==========================================
  // MAIN INTERFACE
  // ==========================================

  return (
    <div className="dental-chart-page">

      {/* PAGE HEADER */}

      <div className="dc-page-header">
        <div>
          <h1>Patient Dental Chart</h1>

          <p>
            Patient information, clinical examination,
            and treatment history.
          </p>

          <span className="dc-view-label">
            {canEditClinical
              ? "Dentist Access"
              : "Administrator — View Only"}
          </span>
        </div>

        <div className="dc-header-actions">
          <button
            className="dc-secondary-btn"
            disabled={loading || loadingRecords}
            onClick={refreshRecords}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="dc-primary-btn"
            disabled={
              !selectedPatient ||
              loading ||
              loadingRecords
            }
            onClick={printChart}
          >
            <Printer size={16} />
            Print Chart
          </button>
        </div>
      </div>

      {error && (
        <div className="dc-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="dc-success" role="status">
          {success}

          <button
            className="dc-icon-btn"
            onClick={() => setSuccess("")}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* PATIENT SEARCH */}

      <div className="dc-search-panel">
        <div className="dc-search-label">
          <UserRound size={18} />
          <strong>Select Patient</strong>
        </div>

        <div className="dc-search-input">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search patient by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              className="dc-icon-btn"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={17} />
            </button>
          )}
        </div>

        {loading && (
          <p className="dc-muted">
            Loading registered patients...
          </p>
        )}

        {search.trim() && !loading && (
          <div className="dc-search-results">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <button
                  type="button"
                  className="dc-search-result"
                  key={patient.patient_id || patient.id}
                  onClick={() => selectPatient(patient)}
                >
                  <div className="dc-patient-avatar">
                    <UserRound size={20} />
                  </div>

                  <div>
                    <strong>
                      {getFullName(patient)}
                    </strong>

                    <span>
                      ID:{" "}
                      {(
                        patient.patient_id ||
                        patient.id
                      )?.slice(0, 8)}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <p className="dc-empty">
                No matching patients found.
              </p>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          patients.length === 0 && (
            <p className="dc-muted">
              No registered patients. Register a
              patient in Patient Management first.
            </p>
          )}

        {selectedPatient && (
          <div className="dc-selected-patient">
            <div className="dc-patient-avatar">
              <UserRound size={22} />
            </div>

            <div className="dc-selected-info">
              <strong>
                {getFullName(selectedPatient)}
              </strong>

              <span>Selected patient</span>
            </div>

            <button
              className="dc-icon-btn"
              onClick={clearPatient}
              aria-label="Clear selected patient"
            >
              <X size={19} />
            </button>
          </div>
        )}
      </div>

      {/* PRINTABLE DENTAL CHART */}

      <div className="dc-print-area">

        <div className="dc-print-heading">
          <h1>Smilepoint Dental Center</h1>
          <p>Patient Dental Chart</p>
        </div>

        {/* PATIENT INFORMATION */}

        <Section
          title="Patient Information"
          icon={UserRound}
        >
          <div className="dc-info-grid">
            <InfoField
              label="Patient ID"
              value={patientId}
            />

            <InfoField
              label="Full Name"
              value={getFullName(selectedPatient)}
            />

            <InfoField
              label="Date of Birth"
              value={formatDate(
                selectedPatient?.date_of_birth
              )}
            />

            <InfoField
              label="Age"
              value={getAge(
                selectedPatient?.date_of_birth
              )}
            />

            <InfoField
              label="Gender"
              value={selectedPatient?.sex}
            />

            <InfoField
              label="Contact Number"
              value={
                selectedPatient?.phone_number ||
                selectedPatient?.phone
              }
            />

            <InfoField
              label="Email Address"
              value={selectedPatient?.email}
            />

            <InfoField
              label="Address"
              value={selectedPatient?.address}
            />

            <InfoField
              label="Emergency Contact"
              value={
                selectedPatient?.emergency_contact_name
              }
            />

            <InfoField
              label="Emergency Contact Number"
              value={
                selectedPatient?.emergency_contact_phone
              }
            />
          </div>
        </Section>

        {/* MEDICAL HISTORY */}

        <Section
          title="Medical History"
          icon={ClipboardList}
          action={
            canEditClinical && (
              <button
                className="dc-primary-btn"
                disabled={!canAddRecord}
                onClick={() => openForm("medical")}
              >
                <Plus size={16} />
                Add Medical History
              </button>
            )
          }
        >
          {sectionMessage(
            "medical",
            medicalHistory.length === 0
          ) || (
            <>
              <div className="dc-history-grid">
                <InfoField
                  label="Blood Pressure"
                  value={history.blood_pressure}
                />

                <InfoField
                  label="Known Allergies"
                  value={history.allergies}
                />

                <InfoField
                  label="Current Medications"
                  value={history.current_medications}
                />

                <InfoField
                  label="Additional Notes"
                  value={history.additional_notes}
                />

                <InfoField
                  label="Recorded Date"
                  value={formatDate(history.recorded_at)}
                />
              </div>

              {medicalHistory.length > 1 && (
                <details className="dc-history-details">
                  <summary>
                    Previous medical history records
                  </summary>

                  {medicalHistory
                    .filter(
                      (item) =>
                        item.medical_history_id !==
                        history.medical_history_id
                    )
                    .map((item) => (
                      <div
                        className="dc-history-grid"
                        key={item.medical_history_id}
                      >
                        <InfoField
                          label="Recorded Date"
                          value={formatDate(item.recorded_at)}
                        />

                        <InfoField
                          label="Blood Pressure"
                          value={item.blood_pressure}
                        />

                        <InfoField
                          label="Allergies"
                          value={item.allergies}
                        />

                        <InfoField
                          label="Current Medications"
                          value={item.current_medications}
                        />

                        <InfoField
                          label="Additional Notes"
                          value={item.additional_notes}
                        />
                      </div>
                    ))}
                </details>
              )}
            </>
          )}
        </Section>

        {/* DENTAL HISTORY */}

        <Section
          title="Dental History"
          icon={ClipboardList}
        >
          {sectionMessage(
            "chart",
            dentalChart.length === 0
          ) || (
            <div className="dc-history-grid">
              <InfoField
                label="Dental History Summary"
                value={chart.history_summary}
              />

              <InfoField
                label="General Notes"
                value={chart.general_notes}
              />

              <InfoField
                label="Last Examination Date"
                value={formatDate(chart.chart_date)}
              />

              <InfoField
                label="Outstanding Balance"
                value={formatMoney(
                  chart.outstanding_balance
                )}
              />
            </div>
          )}
        </Section>

        {/* INTERACTIVE DENTAL EXAMINATION */}

        <Section
          title="Dental Examination"
          icon={Stethoscope}
        >
          <DentalExamination
            key={`${patientId || "no-patient"}-${refresh}`}
            patientId={patientId}
          />
        </Section>

        {/* PROGRESS AND TREATMENT RECORDS */}

        <Section
          title="Progress and Treatment Records"
          icon={ClipboardList}
          action={
            canEditClinical && (
              <button
                className="dc-primary-btn"
                disabled={!canAddRecord}
                onClick={() => openForm("treatment")}
              >
                <Plus size={16} />
                Add Treatment
              </button>
            )
          }
        >
          <div className="dc-table-scroll">
            <table className="dc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Dental Service</th>
                  <th>Diagnosis</th>
                  <th>Procedure / Treatment</th>
                  <th>Dentist</th>
                  <th>Fee</th>
                  <th>Remarks</th>
                </tr>
              </thead>

              <tbody>
                {loadingRecords ||
                sectionErrors.treatments ||
                sortedTreatments.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      {sectionMessage("treatments", true)}
                    </td>
                  </tr>
                ) : (
                  sortedTreatments.map((record) => (
                    <tr key={record.treatment_id}>
                      <td>
                        {formatDate(record.treatment_date)}
                      </td>

                      <td>
                        {displayValue(
                          getService(record)?.name
                        )}
                      </td>

                      <td>
                        {displayValue(record.diagnosis)}
                      </td>

                      <td>
                        {displayValue(
                          record.procedure_done ||
                          record.treatment
                        )}
                      </td>

                      <td>
                        {displayValue(
                          record.dentist_name ||
                          (
                            record.performed_by ===
                            (staff.staff_id || staff.id)
                              ? staff.full_name
                              : record.performed_by
                          )
                        )}
                      </td>

                      <td>
                        {formatMoney(record.fee)}
                      </td>

                      <td>
                        {displayValue(record.remarks)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* X-RAY RECORDS */}

        <Section
          title="X-Ray Records"
          icon={Image}
          action={
            canEditClinical && (
              <button
                className="dc-primary-btn"
                disabled={!canAddRecord}
                onClick={() => openForm("xray")}
              >
                <Plus size={16} />
                Upload X-Ray
              </button>
            )
          }
        >
          {sectionMessage(
            "xrays",
            xrays.length === 0
          ) || (
            <div className="dc-xray-grid">
              {sortedXrays.map((record) => (
                <div
                  className="dc-xray-card"
                  key={record.xray_id}
                >
                  <XrayPreview
                    path={record.storage_path}
                  />

                  <div className="dc-xray-info">
                    <strong>
                      {record.study_type || "X-Ray Record"}
                    </strong>

                    <p>
                      Date: {formatDate(record.taken_at)}
                    </p>

                    <p>
                      Findings:{" "}
                      {displayValue(record.findings)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* FOOTER */}

        <div className="dc-footer">
          Smilepoint Dental Center — Confidential
          Patient Clinical Record
        </div>
      </div>

      {/* CLINICAL RECORD MODAL */}

      {activeForm && canEditClinical && patientId && (
        <ClinicalRecordForm
          key={`${patientId}-${activeForm}`}
          type={activeForm}
          patientId={patientId}
          onClose={() => setActiveForm(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
