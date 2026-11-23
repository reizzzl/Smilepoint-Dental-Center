import { useState } from "react";
import { Wallet, Search, Receipt, Plus, X } from "lucide-react";
import "../shared.css";

const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);

export default function Billing() {
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const emptyForm = {
    patient: "",
    service: "",
    amount: "",
    date: "",
    status: "Pending",
  };

  const [form, setForm] = useState(emptyForm);

  const totalCollected = bills
    .filter((bill) => bill.status === "Paid")
    .reduce((sum, bill) => sum + bill.amount, 0);

  const totalPending = bills
    .filter((bill) => bill.status === "Pending")
    .reduce((sum, bill) => sum + bill.amount, 0);

  const filtered = bills.filter((bill) =>
    `${bill.id} ${bill.patient} ${bill.service}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function addBill(e) {
    e.preventDefault();

    const newBill = {
      ...form,
      id: crypto.randomUUID(),
      amount: Number(form.amount),
    };

    setBills((current) => [...current, newBill]);
    setForm(emptyForm);
    setShowForm(false);
  }

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div>
          <h1>Billing and Payments</h1>
          <p>Manage clinic billing and payment records.</p>
        </div>

        <button
          className="sp-primary-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} />
          New Billing
        </button>
      </div>

      <div className="sp-stats-grid">
        <div className="sp-stat-card">
          <Wallet size={26} />
          <div>
            <span>Total Collected</span>
            <h2>{peso(totalCollected)}</h2>
          </div>
        </div>

        <div className="sp-stat-card">
          <Receipt size={26} />
          <div>
            <span>Pending Payments</span>
            <h2>{peso(totalPending)}</h2>
          </div>
        </div>
      </div>

      <div className="sp-panel">
        <div className="sp-panel-top">
          <h2>Billing Records</h2>

          <div className="sp-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search billing records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="sp-table-scroll">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Billing ID</th>
                <th>Patient</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length > 0 ? (
                filtered.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.id.slice(0, 8)}</td>
                    <td>{bill.patient}</td>
                    <td>{bill.service}</td>
                    <td>{peso(bill.amount)}</td>
                    <td>{bill.date}</td>
                    <td>
                      <span
                        className={
                          bill.status === "Paid"
                            ? "sp-status-paid"
                            : "sp-status-pending"
                        }
                      >
                        {bill.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="sp-empty">
                    No billing records found.
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
              <h2>Create Billing Record</h2>

              <button
                className="sp-icon-btn"
                onClick={() => setShowForm(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="sp-form" onSubmit={addBill}>
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

              <label>Amount (PHP)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
                placeholder="Enter amount"
              />

              <label>Billing Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) =>
                  setForm({ ...form, date: e.target.value })
                }
              />

              <label>Payment Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>

              <button type="submit" className="sp-primary-btn">
                Save Billing
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
