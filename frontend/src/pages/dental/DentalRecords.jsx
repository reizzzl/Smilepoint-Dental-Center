
import { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  ClipboardList,
  Eye,
  X,
  CalendarDays,
  UserRound,
  Stethoscope,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import "./DentalRecords.css";

const formatDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("en-PH");
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));

export default function DentalRecords() {
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRecords() {
    setLoading(true);
    setError("");

    const [patientResult, treatmentResult] = await Promise.all([
      supabase
        .from("patient")
        .select("id, full_name, sex, date_of_birth")
        .order("full_name"),

      supabase
        .from("treatment_record")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (patientResult.error || treatmentResult.error) {
      setError(
        patientResult.error?.message ||
        treatmentResult.error?.message
      );
    }

    setPatients(patientResult.data || []);
    setTreatments(treatmentResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredPatients = patients.filter((patient) =>
    (patient.full_name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const patientTreatments = (patientId) =>
    treatments.filter(
      (record) => record.patient_id === patientId
    );

  const selectedTreatments = selectedPatient
    ? patientTreatments(selectedPatient.id)
    : [];

  return (
    <div className="dental-records-page">
      <div className="dental-page-heading">
        <div>
          <h1>Dental Records</h1>
          <p>
            View patient dental information and treatment history.
          </p>
        </div>

        <button
          className="dental-secondary-btn"
          onClick={loadRecords}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="dental-error" role="alert">
          {error}
        </div>
      )}

      <div className="dental-stats">
        <div className="dental-stat-card">
          <div className="dental-stat-icon">
            <UserRound size={23} />
          </div>
          <div>
            <p>Registered Patients</p>
            <h2>{patients.length}</h2>
          </div>
        </div>

        <div className="dental-stat-card">
          <div className="dental-stat-icon">
            <ClipboardList size={23} />
          </div>
          <div>
            <p>Treatment Records</p>
            <h2>{treatments.length}</h2>
          </div>
        </div>
      </div>

      <div className="dental-panel">
        <div className="dental-panel-heading">
          <h2>Patient Dental Records</h2>
          <span>View-only access</span>
        </div>

        <div className="dental-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="dental-table-scroll">
          <table className="dental-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Sex</th>
                <th>Date of Birth</th>
                <th>Treatments</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.full_name}</td>
                  <td>{patient.sex || "—"}</td>
                  <td>{formatDate(patient.date_of_birth)}</td>
                  <td>
                    {patientTreatments(patient.id).length}
                  </td>
                  <td>
                    <button
                      className="dental-view-btn"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <Eye size={16} />
                      View Record
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && filteredPatients.length === 0 && (
                <tr>
                  <td colSpan="5" className="dental-empty">
                    No patient records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPatient && (
        <div
          className="dental-modal-overlay"
          onClick={() => setSelectedPatient(null)}
        >
          <div
            className="dental-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Patient dental record"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dental-modal-heading">
              <div>
                <h2>{selectedPatient.full_name}</h2>
                <p>Dental Record Overview</p>
              </div>

              <button
                className="dental-close-btn"
                onClick={() => setSelectedPatient(null)}
                aria-label="Close record"
              >
                <X size={21} />
              </button>
            </div>

            <div className="dental-patient-info">
              <div>
                <span>Patient Name</span>
                <strong>{selectedPatient.full_name}</strong>
              </div>
              <div>
                <span>Sex</span>
                <strong>{selectedPatient.sex || "—"}</strong>
              </div>
              <div>
                <span>Date of Birth</span>
                <strong>
                  {formatDate(selectedPatient.date_of_birth)}
                </strong>
              </div>
            </div>

            <h3 className="dental-section-title">
              <Stethoscope size={19} />
              Treatment History
            </h3>

            {selectedTreatments.length === 0 ? (
              <div className="dental-empty-state">
                <CalendarDays size={26} />
                <p>No treatment records available.</p>
              </div>
            ) : (
              <div className="dental-treatment-list">
                {selectedTreatments.map((record) => (
                  <div
                    className="dental-treatment-card"
                    key={record.id}
                  >
                    <div className="dental-treatment-top">
                      <strong>
                        {record.treatment || "Dental Treatment"}
                      </strong>
                      <span>
                        {formatDate(
                          record.treatment_date ||
                          record.created_at
                        )}
                      </span>
                    </div>

                    <p>
                      <strong>Diagnosis:</strong>{" "}
                      {record.diagnosis || "—"}
                    </p>

                    <p>
                      <strong>Remarks:</strong>{" "}
                      {record.remarks || "—"}
                    </p>

                    <p>
                      <strong>Fee:</strong>{" "}
                      {formatMoney(record.fee)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="dental-modal-footer">
              <span>
                Clinical records are view-only in this panel.
              </span>
              <button
                className="dental-secondary-btn"
                onClick={() => setSelectedPatient(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
