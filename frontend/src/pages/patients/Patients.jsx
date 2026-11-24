import { useEffect, useState } from "react";
import { Search, UserRound, Plus, Eye, X } from "lucide-react";
import "../shared.css";

import {
  getPatients,
  createPatient,
  updatePatient,
} from "../../services/patientsApi";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

const [isEditing, setIsEditing] = useState(false);

const [editForm, setEditForm] = useState({
  name: "",
  dob: "",
  gender: "",
  contact: "",
});

const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState("");

useEffect(() => {
  let active = true;

  async function loadPatients() {
    try {
      const data = await getPatients();

      if (!active) return;

      const today = new Date();

      const formatted = data.map((patient) => {
        const birth = patient.date_of_birth
          ?.split("-")
          .map(Number);

        const age = birth
          ? today.getFullYear() - birth[0] -
            (today.getMonth() + 1 < birth[1] ||
            (today.getMonth() + 1 === birth[1] &&
              today.getDate() < birth[2]) ? 1 : 0)
          : "";

        return {
          ...patient,
          id: patient.id,
          name: patient.full_name,
          age,
          gender: patient.sex ?? "",
          contact: patient.phone ?? "",
        };
      });

      setPatients(formatted);
      setLoadError("");
    } catch (error) {
      if (active) setLoadError(error.message);
    } finally {
      if (active) setLoading(false);
    }
  }

  loadPatients();

  return () => {
    active = false;
  };
}, []);

  const emptyForm = {
    name: "",
    dob: "",
    gender: "",
    contact: "",
  };

  const [form, setForm] = useState(emptyForm);

  const filtered = patients.filter((patient) =>
    `${patient.id} ${patient.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );


async function addPatient(e) {
  e.preventDefault();

  try {
    const saved = await createPatient({
      full_name: form.name.trim(),
      date_of_birth: form.dob,
      sex: form.gender,
      phone: form.contact.trim(),
    });

    const [year, month, day] = form.dob.split("-").map(Number);
    const today = new Date();

    const age =
      today.getFullYear() -
      year -
      (today.getMonth() + 1 < month ||
      (today.getMonth() + 1 === month &&
        today.getDate() < day)
        ? 1
        : 0);

    setPatients((current) => [
      {
        ...saved,
        id: saved.id,
        name: saved.full_name,
        age,
        gender: saved.sex ?? "",
        contact: saved.phone ?? "",
      },
      ...current,
    ]);

    setForm(emptyForm);
    setShowForm(false);
    alert("Patient registered successfully!");
  } catch (error) {
    alert(`Patient registration failed: ${error.message}`);
  }
}


function startEditing() {
  if (!selected) return;

  setEditForm({
    name: selected.name ?? "",
    dob: selected.date_of_birth?.slice(0, 10) ?? "",
    gender: selected.gender ?? "",
    contact: selected.contact ?? "",
  });

  setIsEditing(true);
}

async function saveEditedPatient(e) {
  e.preventDefault();

  if (!selected) return;

  try {
    const updated = await updatePatient(selected.id, {
      full_name: editForm.name.trim(),
      date_of_birth: editForm.dob,
      sex: editForm.gender,
      phone: editForm.contact.trim(),
    });

    const [year, month, day] = editForm.dob
      .split("-")
      .map(Number);

    const today = new Date();

    const age =
      today.getFullYear() -
      year -
      (today.getMonth() + 1 < month ||
      (today.getMonth() + 1 === month &&
        today.getDate() < day)
        ? 1
        : 0);

    const patient = {
      ...updated,
      id: updated.id ?? selected.id,
      name: updated.full_name,
      age,
      gender: updated.sex ?? "",
      contact: updated.phone ?? "",
    };

    setPatients((current) =>
      current.map((item) =>
        item.id === selected.id ? patient : item
      )
    );

    setSelected(patient);
    setIsEditing(false);

    alert("Patient updated successfully!");
  } catch (error) {
    alert(`Unable to update patient: ${error.message}`);
  }
}

  function closeModal() {
    setSelected(null);
    setShowForm(false);
      setIsEditing(false);
  }

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div>
          <h1>Patient Management</h1>
          <p>Manage patient information and registration.</p>
        </div>

        <button
          className="sp-primary-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} />
          Add Patient
        </button>
      </div>

      
{loading && (
  <p role="status">
    Loading patient records...
  </p>
)}

{loadError && (
  <div className="sp-error" role="alert">
    Unable to load patients: {loadError}
  </div>
)}

      <div className="sp-stat-card">
        <UserRound size={26} />
        <div>
          <span>Total Patients</span>
          <h2>{patients.length}</h2>
        </div>
      </div>

      <div className="sp-panel">
        <div className="sp-panel-top">
          <h2>Patient List</h2>

          <div className="sp-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

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
              {filtered.length > 0 ? (
                filtered.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.id.slice(0, 8)}</td>
                    <td>{patient.name}</td>
                    <td>{patient.age}</td>
                    <td>{patient.gender}</td>
                    <td>{patient.contact}</td>
                    <td>
                      <button
                        className="sp-action-btn"
                        onClick={() => setSelected(patient)}
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="sp-empty">
                    No patient records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(showForm || selected) && (
        <div className="sp-overlay">
          <div className="sp-modal">
            <div className="sp-modal-header">
              <h2>
                {selected ? "Patient Details" : "Add New Patient"}
              </h2>

              <button
                className="sp-icon-btn"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            {selected ? (
              
<div className="sp-details">
  {isEditing ? (
    <form className="sp-form" onSubmit={saveEditedPatient}>
      <label>Full Name</label>
      <input
        required
        value={editForm.name}
        onChange={(e) =>
          setEditForm({ ...editForm, name: e.target.value })
        }
      />

      <label>Date of Birth</label>
      <input
        type="date"
        required
        value={editForm.dob}
        onChange={(e) =>
          setEditForm({ ...editForm, dob: e.target.value })
        }
      />

      <label>Gender</label>
      <select
        required
        value={editForm.gender}
        onChange={(e) =>
          setEditForm({ ...editForm, gender: e.target.value })
        }
      >
        <option value="">Select Gender</option>
        <option value="Female">Female</option>
        <option value="Male">Male</option>
        <option value="Other">Other</option>
      </select>

      <label>Contact Number</label>
      <input
        required
        value={editForm.contact}
        onChange={(e) =>
          setEditForm({ ...editForm, contact: e.target.value })
        }
      />

      <button type="submit" className="sp-primary-btn">
        Save Changes
      </button>

      <button
        type="button"
        className="sp-action-btn"
        onClick={() => setIsEditing(false)}
      >
        Cancel Editing
      </button>
    </form>
  ) : (
    <>
      <p><strong>Patient ID:</strong> {selected.id}</p>
      <p><strong>Name:</strong> {selected.name}</p>
      <p><strong>Age:</strong> {selected.age}</p>
      <p><strong>Gender:</strong> {selected.gender}</p>
      <p><strong>Contact:</strong> {selected.contact}</p>

      <button
        type="button"
        className="sp-primary-btn"
        onClick={startEditing}
      >
        Edit Patient
      </button>
    </>
  )}
</div>

            ) : (
              <form className="sp-form" onSubmit={addPatient}>
                <label>Full Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter full name"
                />

                
<label>Date of Birth</label>
<input
  type="date"
  required
  value={form.dob}
  onChange={(e) =>
    setForm({ ...form, dob: e.target.value })
  }
/>


                <label>Gender</label>
                <select
                  required
                  value={form.gender}
                  onChange={(e) =>
                    setForm({ ...form, gender: e.target.value })
                  }
                >
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>

                <label>Contact Number</label>
                <input
                  required
                  value={form.contact}
                  onChange={(e) =>
                    setForm({ ...form, contact: e.target.value })
                  }
                  placeholder="Enter contact number"
                />

                <button type="submit" className="sp-primary-btn">
                  Save Patient
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
