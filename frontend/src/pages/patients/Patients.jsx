import { useEffect, useState } from "react";

import {
  Search,
  UserRound,
  Plus,
  Eye,
  X,
  Pencil,
  RefreshCw,
} from "lucide-react";

import "../shared.css";

import {
  getPatients,
  createPatient,
  updatePatient,
  getCurrentStaff,
} from "../../services/patientsApi";

// ==========================================
// DEFAULT FORM
// ==========================================

const emptyForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  date_of_birth: "",
  sex: "",
  phone_number: "",
  email: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getAge(dob) {
  if (!dob) return "—";

  const [year, month, day] = dob
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return "—";

  const today = new Date();

  let age = today.getFullYear() - year;

  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month &&
      today.getDate() < day)
  ) {
    age--;
  }

  return age >= 0 ? age : "—";
}

function formatPatient(patient) {
  return {
    ...patient,

    id: patient.patient_id ?? patient.id,

    name:
      [
        patient.first_name,
        patient.middle_name,
        patient.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      patient.full_name ||
      "",

    age: getAge(patient.date_of_birth),

    gender: patient.sex || "—",

    contact: patient.phone_number || "—",
  };
}

function getToday() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ==========================================
// PATIENT MANAGEMENT
// ==========================================

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState(null);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    ...emptyForm,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const [refresh, setRefresh] = useState(0);

  // ==========================================
  // ROLE-BASED ACCESS
  // ==========================================

  const canManage =
    staff?.role === "receptionist" &&
    staff?.active === true;

  // ==========================================
  // LOAD PATIENTS AND STAFF ACCOUNT
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setLoadError("");

      try {
        const currentStaff = await getCurrentStaff();

        if (!active) return;

        setStaff(currentStaff);

        const data = await getPatients();

        if (!active) return;

        setPatients(data.map(formatPatient));
      } catch (error) {
        if (active) {
          setLoadError(
            error.message ||
              "Unable to load patient records."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [refresh]);

  // ==========================================
  // SEARCH PATIENTS
  // ==========================================

  const filtered = patients.filter((patient) =>
    [
      patient.id,
      patient.name,
      patient.phone_number,
      patient.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  // ==========================================
  // OPEN ADD PATIENT FORM
  // ==========================================

  function openAddForm() {
    if (!canManage || saving) return;

    setSelected(null);
    setForm({ ...emptyForm });
    setFormError("");
    setSuccess("");
    setIsEditing(false);
    setShowForm(true);
  }

  // ==========================================
  // VIEW PATIENT DETAILS
  // ==========================================

  function viewPatient(patient) {
    if (saving) return;

    setSelected(patient);
    setShowForm(false);
    setIsEditing(false);
    setFormError("");
  }

  // ==========================================
  // EDIT PATIENT
  // ==========================================

  function startEditing() {
    if (!selected || !canManage || saving) {
      return;
    }

    setForm({
      first_name: selected.first_name ?? "",

      middle_name: selected.middle_name ?? "",

      last_name: selected.last_name ?? "",

      date_of_birth:
        selected.date_of_birth?.slice(0, 10) ?? "",

      sex: selected.sex ?? "",

      phone_number: selected.phone_number ?? "",

      email: selected.email ?? "",

      address: selected.address ?? "",

      emergency_contact_name:
        selected.emergency_contact_name ?? "",

      emergency_contact_phone:
        selected.emergency_contact_phone ?? "",
    });

    setFormError("");
    setSuccess("");
    setShowForm(false);
    setIsEditing(true);
  }

  // ==========================================
  // FORM INPUT HANDLER
  // ==========================================

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // ==========================================
  // SAVE PATIENT
  // ==========================================

  async function savePatient(e) {
    e.preventDefault();

    if (!canManage || saving) return;

    setFormError("");
    setSuccess("");

    if (!form.first_name.trim()) {
      setFormError("First name is required.");
      return;
    }

    if (!form.last_name.trim()) {
      setFormError("Last name is required.");
      return;
    }

    if (
      form.date_of_birth &&
      form.date_of_birth > getToday()
    ) {
      setFormError(
        "Date of birth cannot be in the future."
      );
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),

      middle_name:
        form.middle_name.trim() || null,

      last_name: form.last_name.trim(),

      date_of_birth:
        form.date_of_birth || null,

      sex: form.sex || null,

      phone_number:
        form.phone_number.trim() || null,

      email: form.email.trim() || null,

      address: form.address.trim() || null,

      emergency_contact_name:
        form.emergency_contact_name.trim() || null,

      emergency_contact_phone:
        form.emergency_contact_phone.trim() || null,
    };

    const createPayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([, value]) => value !== null
      )
    );

    setSaving(true);

    try {
      // ======================================
      // UPDATE EXISTING PATIENT
      // ======================================

      if (isEditing && selected) {
        const patientId =
          selected.patient_id ?? selected.id;

        if (!patientId) {
          throw new Error(
            "Unable to identify the selected patient."
          );
        }

        const updated = await updatePatient(
          patientId,
          payload
        );

        // Preserve patient information and ID
        // if the API returns only updated fields.

        const formatted = formatPatient({
          ...selected,
          ...payload,
          ...updated,

          patient_id:
            updated?.patient_id ??
            updated?.id ??
            patientId,
        });

        setPatients((current) =>
          current.map((patient) =>
            patient.id === patientId
              ? formatted
              : patient
          )
        );

        setSelected(formatted);
        setIsEditing(false);
        setShowForm(false);

        setSuccess(
          "Patient updated successfully."
        );
      } else {
        // ====================================
        // REGISTER NEW PATIENT
        // ====================================

        const saved = await createPatient(
          createPayload
        );

        const formatted = formatPatient(saved);

        setPatients((current) => [
          formatted,

          ...current.filter(
            (patient) =>
              patient.id !== formatted.id
          ),
        ]);

        setSelected(null);
        setShowForm(false);
        setIsEditing(false);

        setForm({ ...emptyForm });

        setSuccess(
          "Patient registered successfully."
        );
      }

      setRefresh((current) => current + 1);
    } catch (error) {
      setFormError(
        error.message ||
          "Unable to save patient information."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // CLOSE MODAL
  // ==========================================

  function closeModal() {
    if (saving) return;

    setSelected(null);
    setShowForm(false);
    setIsEditing(false);
    setFormError("");
    setForm({ ...emptyForm });
  }

  function cancelEditing() {
    if (saving) return;

    setIsEditing(false);
    setFormError("");
    setForm({ ...emptyForm });
  }

  // ==========================================
  // PATIENT FORM
  // ==========================================

  function renderForm() {
    return (
      <form
        className="sp-form"
        onSubmit={savePatient}
      >
        {formError && (
          <div
            className="sp-error"
            role="alert"
          >
            {formError}
          </div>
        )}

        <div className="sp-form-grid">

          {/* FIRST NAME */}

          <div className="sp-form-group">
            <label htmlFor="first_name">
              First Name *
            </label>

            <input
              id="first_name"
              name="first_name"
              required
              maxLength={160}
              value={form.first_name}
              onChange={handleChange}
              placeholder="Enter first name"
              disabled={saving}
            />
          </div>

          {/* LAST NAME */}

          <div className="sp-form-group">
            <label htmlFor="last_name">
              Last Name *
            </label>

            <input
              id="last_name"
              name="last_name"
              required
              maxLength={160}
              value={form.last_name}
              onChange={handleChange}
              placeholder="Enter last name"
              disabled={saving}
            />
          </div>

          {/* MIDDLE NAME */}

          <div className="sp-form-group">
            <label htmlFor="middle_name">
              Middle Name
            </label>

            <input
              id="middle_name"
              name="middle_name"
              maxLength={160}
              value={form.middle_name}
              onChange={handleChange}
              placeholder="Enter middle name"
              disabled={saving}
            />
          </div>

          {/* DATE OF BIRTH */}

          <div className="sp-form-group">
            <label htmlFor="date_of_birth">
              Date of Birth
            </label>

            <input
              id="date_of_birth"
              type="date"
              name="date_of_birth"
              max={getToday()}
              value={form.date_of_birth}
              onChange={handleChange}
              disabled={saving}
            />
          </div>

          {/* GENDER */}

          <div className="sp-form-group">
            <label htmlFor="sex">
              Gender
            </label>

            <select
              id="sex"
              name="sex"
              value={form.sex}
              onChange={handleChange}
              disabled={saving}
            >
              <option value="">
                Select gender
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>
            </select>
          </div>

          {/* CONTACT NUMBER */}

          <div className="sp-form-group">
            <label htmlFor="phone_number">
              Contact Number
            </label>

            <input
              id="phone_number"
              type="tel"
              name="phone_number"
              maxLength={50}
              value={form.phone_number}
              onChange={handleChange}
              placeholder="Enter contact number"
              disabled={saving}
            />
          </div>

          {/* EMAIL */}

          <div className="sp-form-group sp-form-group-full">
            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email address"
              disabled={saving}
            />
          </div>

          {/* ADDRESS */}

          <div className="sp-form-group sp-form-group-full">
            <label htmlFor="address">
              Address
            </label>

            <textarea
              id="address"
              name="address"
              rows={3}
              maxLength={500}
              value={form.address}
              onChange={handleChange}
              placeholder="Enter complete address"
              disabled={saving}
            />
          </div>

          {/* EMERGENCY CONTACT NAME */}

          <div className="sp-form-group">
            <label htmlFor="emergency_contact_name">
              Emergency Contact Name
            </label>

            <input
              id="emergency_contact_name"
              name="emergency_contact_name"
              maxLength={160}
              value={
                form.emergency_contact_name
              }
              onChange={handleChange}
              placeholder="Enter contact name"
              disabled={saving}
            />
          </div>

          {/* EMERGENCY CONTACT NUMBER */}

          <div className="sp-form-group">
            <label htmlFor="emergency_contact_phone">
              Emergency Contact Number
            </label>

            <input
              id="emergency_contact_phone"
              type="tel"
              name="emergency_contact_phone"
              maxLength={50}
              value={
                form.emergency_contact_phone
              }
              onChange={handleChange}
              placeholder="Enter contact number"
              disabled={saving}
            />
          </div>
        </div>

        {/* FORM ACTIONS */}

        <div className="sp-modal-footer">
          <button
            type="button"
            className="sp-secondary-btn"
            disabled={saving}
            onClick={
              isEditing
                ? cancelEditing
                : closeModal
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="sp-primary-btn"
            disabled={saving || !canManage}
          >
            {saving
              ? "Saving..."
              : isEditing
              ? "Save Changes"
              : "Save Patient"}
          </button>
        </div>
      </form>
    );
  }

  // ==========================================
  // MAIN PATIENT MANAGEMENT INTERFACE
  // ==========================================

  return (
    <div className="sp-page">

      {/* PAGE HEADER */}

      <div className="sp-page-header">
        <div>
          <h1>Patient Management</h1>

          <p>
            Manage patient information and
            registration.
          </p>
        </div>

        <div className="sp-toolbar">
          <button
            type="button"
            className="sp-secondary-btn"
            disabled={loading || saving}
            onClick={() =>
              setRefresh(
                (current) => current + 1
              )
            }
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          {canManage && (
            <button
              type="button"
              className="sp-primary-btn"
              onClick={openAddForm}
              disabled={saving}
            >
              <Plus size={17} />
              Add Patient
            </button>
          )}
        </div>
      </div>

      {/* SUCCESS MESSAGE */}

      {success && (
        <div
          className="sp-success"
          role="status"
        >
          {success}
        </div>
      )}

      {/* ERROR MESSAGE */}

      {loadError && (
        <div
          className="sp-error"
          role="alert"
        >
          Unable to load patients: {loadError}
        </div>
      )}

      {/* VIEW-ONLY ACCESS */}

      {staff && !canManage && (
        <p className="sp-muted">
          View-only access — patient registration
          and editing are available to
          receptionists.
        </p>
      )}

      {/* PATIENT STATISTICS */}

      <div className="sp-stats-grid">
        <div className="sp-stat-card">
          <UserRound size={26} />

          <div>
            <span>Total Patients</span>

            <h2>
              {loading || loadError
                ? "—"
                : patients.length}
            </h2>
          </div>
        </div>
      </div>

      {/* PATIENT LIST */}

      <div className="sp-panel">
        <div className="sp-panel-top">
          <h2>Patient List</h2>

          <div className="sp-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search patients..."
              aria-label="Search patients"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            {search && (
              <button
                type="button"
                className="sp-icon-btn"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* PATIENT TABLE */}

        <div className="sp-table-scroll">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Contact</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="sp-empty"
                  >
                    Loading patient records...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="sp-empty"
                  >
                    Unable to retrieve patient
                    records.
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((patient) => (
                  <tr key={patient.id}>
                    <td title={patient.id}>
                      {patient.id?.slice(0, 8)}
                    </td>

                    <td>
                      {patient.name || "—"}
                    </td>

                    <td>{patient.age}</td>

                    <td>{patient.gender}</td>

                    <td>{patient.contact}</td>

                    <td>
                      <button
                        type="button"
                        className="sp-action-btn"
                        onClick={() =>
                          viewPatient(patient)
                        }
                        disabled={saving}
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="sp-empty"
                  >
                    {search
                      ? "No matching patients found."
                      : "No patient records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PATIENT MODAL */}

      {(showForm || selected) && (
        <div className="sp-overlay">
          <div
            className="sp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-modal-title"
            style={{
              maxWidth: "720px",
              width: "95%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >

            {/* MODAL HEADER */}

            <div className="sp-modal-header">
              <h2 id="patient-modal-title">
                {isEditing
                  ? "Edit Patient"
                  : selected
                  ? "Patient Details"
                  : "Add New Patient"}
              </h2>

              <button
                type="button"
                className="sp-icon-btn"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close patient details"
              >
                <X size={20} />
              </button>
            </div>

            {/* ADD OR EDIT FORM */}

            {showForm || isEditing ? (
              renderForm()
            ) : (
              <div className="sp-details">

                {/* PATIENT DETAILS */}

                <p>
                  <strong>Patient ID:</strong>{" "}
                  {selected.id}
                </p>

                <p>
                  <strong>Full Name:</strong>{" "}
                  {selected.name || "—"}
                </p>

                <p>
                  <strong>Date of Birth:</strong>{" "}
                  {selected.date_of_birth?.slice(
                    0,
                    10
                  ) || "—"}
                </p>

                <p>
                  <strong>Age:</strong>{" "}
                  {selected.age}
                </p>

                <p>
                  <strong>Gender:</strong>{" "}
                  {selected.gender}
                </p>

                <p>
                  <strong>Contact Number:</strong>{" "}
                  {selected.contact}
                </p>

                <p>
                  <strong>Email:</strong>{" "}
                  {selected.email || "—"}
                </p>

                <p>
                  <strong>Address:</strong>{" "}
                  {selected.address || "—"}
                </p>

                <p>
                  <strong>
                    Emergency Contact:
                  </strong>{" "}
                  {selected.emergency_contact_name ||
                    "—"}
                </p>

                <p>
                  <strong>
                    Emergency Contact Number:
                  </strong>{" "}
                  {selected.emergency_contact_phone ||
                    "—"}
                </p>

                {/* MODAL ACTIONS */}

                <div className="sp-modal-footer">
                  <button
                    type="button"
                    className="sp-secondary-btn"
                    onClick={closeModal}
                  >
                    Close
                  </button>

                  {canManage && (
                    <button
                      type="button"
                      className="sp-primary-btn"
                      onClick={startEditing}
                    >
                      <Pencil size={16} />
                      Edit Patient
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}