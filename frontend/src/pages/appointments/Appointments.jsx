import { useState } from "react";
import { CalendarDays, Plus, Search, X } from "lucide-react";
import "../shared.css";

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

const [calendarMonth, setCalendarMonth] = useState(() => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
});

const firstDay = calendarMonth.getDay();

const daysInMonth = new Date(
  calendarMonth.getFullYear(),
  calendarMonth.getMonth() + 1,
  0
).getDate();

const calendarDays = Array.from(
  { length: firstDay + daysInMonth },
  (_, index) => (index < firstDay ? null : index - firstDay + 1)
);

function selectCalendarDate(day) {

function getBookingCount(day) {
  const year = calendarMonth.getFullYear();
  const month = String(
    calendarMonth.getMonth() + 1
  ).padStart(2, "0");

  const date = String(day).padStart(2, "0");
  const selectedDay = `${year}-${month}-${date}`;

  return appointments.filter(
    (appointment) =>
      appointment.date === selectedDay &&
      appointment.status === "Scheduled"
  ).length;
}

  const year = calendarMonth.getFullYear();
  const month = String(calendarMonth.getMonth() + 1).padStart(2, "0");
  const date = String(day).padStart(2, "0");

  setSelectedDate(`${year}-${month}-${date}`);
}

  const [showForm, setShowForm] = useState(false);

const [rescheduling, setRescheduling] = useState(null);

const [rescheduleForm, setRescheduleForm] = useState({
  date: "",
  time: "",
});

  const emptyForm = {
  patient: "",
  service: "",
  date: "",
  time: "",
  visitType: "Scheduled",
};

  const [form, setForm] = useState(emptyForm);

  
const filtered = appointments.filter((appointment) => {
  const matchesSearch =
    `${appointment.patient} ${appointment.service} ${appointment.status}`
      .toLowerCase()
      .includes(search.toLowerCase());

  const matchesDate =
    !selectedDate || appointment.date === selectedDate;

  return matchesSearch && matchesDate;
});


  const scheduledCount = appointments.filter(
    (item) => item.status === "Scheduled"
  ).length;

  const completedCount = appointments.filter(
    (item) => item.status === "Completed"
  ).length;

  const cancelledCount = appointments.filter(
    (item) => item.status === "Cancelled"
  ).length;

  function addAppointment(e) {
    e.preventDefault();

    const newAppointment = {
      ...form,
      id: crypto.randomUUID(),
      status: "Scheduled",
    };

    setAppointments((current) => [
      ...current,
      newAppointment,
    ]);

    setForm(emptyForm);
    setShowForm(false);
  }

  function updateStatus(id, status) {
    setAppointments((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
  }

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div>
          <h1>Appointment Management</h1>
          <p>Schedule and monitor dental appointments.</p>
        </div>

        <button
          className="sp-primary-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} />
          New Appointment
        </button>
      </div>

      <div className="sp-stats-grid">
        <div className="sp-stat-card">
          <CalendarDays size={26} />
          <div>
            <span>Total Appointments</span>
            <h2>{appointments.length}</h2>
          </div>
        </div>

        <div className="sp-stat-card">
          <div>
            <span>Scheduled</span>
            <h2>{scheduledCount}</h2>
          </div>
        </div>

        <div className="sp-stat-card">
          <div>
            <span>Completed</span>
            <h2>{completedCount}</h2>
          </div>
        </div>

        <div className="sp-stat-card">
          <div>
            <span>Cancelled</span>
            <h2>{cancelledCount}</h2>
          </div>
        </div>
      </div>


<div className="sp-panel" style={{ marginBottom: 20 }}>
  <div className="sp-panel-top">
    <h2>Appointment Calendar</h2>

    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <button
        type="button"
        className="sp-action-btn"
        onClick={() =>
          setCalendarMonth(
            new Date(
              calendarMonth.getFullYear(),
              calendarMonth.getMonth() - 1,
              1
            )
          )
        }
      >
        Previous
      </button>

      <strong>
        {calendarMonth.toLocaleDateString("en-PH", {
          month: "long",
          year: "numeric",
        })}
      </strong>

      <button
        type="button"
        className="sp-action-btn"
        onClick={() =>
          setCalendarMonth(
            new Date(
              calendarMonth.getFullYear(),
              calendarMonth.getMonth() + 1,
              1
            )
          )
        }
      >
        Next
      </button>
    </div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
      gap: 8,
      marginTop: 20,
    }}
  >
    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
      (day) => (
        <strong key={day} style={{ textAlign: "center" }}>
          {day}
        </strong>
      )
    )}

    {calendarDays.map((day, index) =>
      day === null ? (
        <div key={`empty-${index}`} />
      ) : (
        <button
          key={day}
          type="button"
          onClick={() => selectCalendarDate(day)}
          style={{
            padding: "15px 5px",
            borderRadius: 8,
            border: "1px solid #dce6e8",
            cursor: "pointer",
            background:
              selectedDate ===
              `${calendarMonth.getFullYear()}-${String(
                calendarMonth.getMonth() + 1
              ).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                ? "#16858b"
                : "#ffffff",
            color:
              selectedDate ===
              `${calendarMonth.getFullYear()}-${String(
                calendarMonth.getMonth() + 1
              ).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                ? "#ffffff"
                : "#243b43",
          }}
        >
          {day}

{appointments.filter((appointment) => {
  const year = calendarMonth.getFullYear();
  const month = String(calendarMonth.getMonth() + 1).padStart(2, "0");
  const date = String(day).padStart(2, "0");

  return (
    appointment.date === `${year}-${month}-${date}` &&
    appointment.status !== "Cancelled"
  );
}).length > 0 && (
  <small style={{ display: "block", marginTop: 4 }}>
    {appointments.filter((appointment) => {
      const year = calendarMonth.getFullYear();
      const month = String(calendarMonth.getMonth() + 1).padStart(2, "0");
      const date = String(day).padStart(2, "0");

      return (
        appointment.date === `${year}-${month}-${date}` &&
        appointment.status !== "Cancelled"
      );
    }).length} booked
  </small>
)}

        </button>
      )
    )}
  </div>
</div>

      <div className="sp-panel">
        <div className="sp-panel-top">
          <h2>Appointment List</h2>

          <div className="sp-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search appointments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

<div className="sp-date-filter">
  <label htmlFor="appointment-date-filter">
    Filter by Date
  </label>

  <input
    id="appointment-date-filter"
    type="date"
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
  />

  <button
    type="button"
    className="sp-action-btn"
    onClick={() => setSelectedDate("")}
  >
    All Dates
  </button>
</div>

        </div>

        <div className="sp-table-scroll">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Appointment ID</th>
                <th>Patient</th>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id.slice(0, 8)}</td>
                    <td>{item.patient}</td>
                    <td>{item.service}</td>
                    <td>{item.date}</td>
                    <td>{item.time}</td>
                    <td>
                      <select
                        value={item.status}
                        onChange={(e) =>
                          updateStatus(item.id, e.target.value)
                        }
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="sp-empty">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="sp-overlay">
          <div className="sp-modal">
            <div className="sp-modal-header">
              <h2>New Appointment</h2>

              <button
                className="sp-icon-btn"
                onClick={() => setShowForm(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="sp-form" onSubmit={addAppointment}>
              
<label>Appointment Type</label>

<select
  value={form.visitType}
  onChange={(e) => {
    const visitType = e.target.value;
    const now = new Date();

    const today = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;

    setForm({
      ...form,
      visitType,
      date: visitType === "Walk-in" ? today : "",
    });
  }}
>

  <option value="Scheduled">Scheduled Appointment</option>
  <option value="Walk-in">Walk-in Patient</option>
</select>

              <label>Patient Name</label>
              <input
                required
                value={form.patient}
                onChange={(e) =>
                  setForm({ ...form, patient: e.target.value })
                }
                placeholder="Enter patient name"
              />

              <label>Dental Service</label>
              <input
                required
                value={form.service}
                onChange={(e) =>
                  setForm({ ...form, service: e.target.value })
                }
                placeholder="Enter dental service"
              />

              <label>Appointment Date</label>
              <input
                type="date"
                required
                value={form.date}
                disabled={form.visitType === "Walk-in"}
                onChange={(e) =>
                  setForm({ ...form, date: e.target.value })
                }
              />

              <label>Appointment Time</label>
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) =>
                  setForm({ ...form, time: e.target.value })
                }
              />

              <button type="submit" className="sp-primary-btn">
                Save Appointment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
