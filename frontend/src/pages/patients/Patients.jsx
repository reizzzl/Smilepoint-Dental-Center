import { useState } from "react";
import { Search, UserRound, Plus, Eye, X } from "lucide-react";
import "../shared.css";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const emptyForm = {
    name: "",
    age: "",
    gender: "",
    contact: "",
  };

  const [form, setForm] = useState(emptyForm);

  const filtered = patients.filter((patient) =>
    `${patient.id} ${patient.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function addPatient(e) {
    e.preventDefault();

    const newPatient = {
      ...form,
      id: crypto.randomUUID(),
      age: Number(form.age),
    };

    setPatients((current) => [...current, newPatient]);
    setForm(emptyForm);
    setShowForm(false);
  }

  function closeModal() {
    setSelected(null);
    setShowForm(false);
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
                <p><strong>Patient ID:</strong> {selected.id}</p>
                <p><strong>Name:</strong> {selected.name}</p>
                <p><strong>Age:</strong> {selected.age}</p>
                <p><strong>Gender:</strong> {selected.gender}</p>
                <p><strong>Contact:</strong> {selected.contact}</p>
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

                <label>Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={form.age}
                  onChange={(e) =>
                    setForm({ ...form, age: e.target.value })
                  }
                  placeholder="Enter age"
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
