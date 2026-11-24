
import { useEffect, useState } from "react";
import {
  Wallet, CalendarDays, ClipboardList,
  Download, RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar,
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip
} from "recharts";
import { supabase } from "../../lib/supabase";
import "../shared.css";

const peso = value =>
  Number(value).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });

const dateKey = value =>
  value
    ? new Date(value).toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      })
    : "";

async function readAll(table, columns, id) {
  const rows = [];
  const size = 500;

  for (let offset = 0; ; offset += size) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(id)
      .range(offset, offset + size - 1);

    if (error) throw error;
    rows.push(...data);

    if (data.length < size) return rows;
  }
}

export default function Reports() {
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const [p, a, t] = await Promise.all([
        readAll(
          "payment",
          "payment_id,amount,payment_method,payment_status,paid_at",
          "payment_id"
        ),
        readAll(
          "appointment",
          "appointment_id,appointment_date,status",
          "appointment_id"
        ),
        readAll(
          "treatment_record",
          "treatment_id,treatment_date",
          "treatment_id"
        ),
      ]);

      setPayments(p);
      setAppointments(a);
      setTreatments(t);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const invalidRange = start && end && start > end;

  function inRange(date) {
    if (invalidRange) return false;
    if (!date) return !start && !end;
    return (!start || date >= start) && (!end || date <= end);
  }

  const filteredPayments = payments.filter(p =>
    inRange(dateKey(p.paid_at))
  );

  const filteredAppointments = appointments.filter(a =>
    inRange(a.appointment_date)
  );

  const filteredTreatments = treatments.filter(t =>
    inRange(t.treatment_date)
  );

  const paid = filteredPayments.filter(p =>
    p.payment_status === "paid"
  );

  const revenue = paid.reduce(
    (sum, p) => sum + Number(p.amount || 0), 0
  );

  const monthlyRevenue = {};

  paid.forEach(payment => {
    const month = dateKey(payment.paid_at).slice(0, 7);
    if (!month) return;

    monthlyRevenue[month] =
      (monthlyRevenue[month] || 0) + Number(payment.amount);
  });

  const revenueData = Object.entries(monthlyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }));

  const appointmentCounts = {};

  filteredAppointments.forEach(appointment => {
    const status = appointment.status || "Unspecified";

    appointmentCounts[status] =
      (appointmentCounts[status] || 0) + 1;
  });

  const appointmentData = Object.entries(appointmentCounts)
    .map(([status, total]) => ({ status, total }));

  function exportReport() {
    const escapeCSV = value => {
      let text = String(value ?? "");

      if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
      }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = [
      ["Payment ID", "Date", "Method", "Status", "Amount"],
      ...filteredPayments.map(p => [
        p.payment_id,
        dateKey(p.paid_at),
        p.payment_method,
        p.payment_status,
        p.amount,
      ]),
    ];

    const csv = rows
      .map(row => row.map(escapeCSV).join(","))
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "smilepoint-payment-report.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const unavailable = loading || error || invalidRange;

  const stats = [
    {
      title: "Total Revenue",
      value: peso(revenue),
      Icon: Wallet,
    },
    {
      title: "Appointments",
      value: filteredAppointments.length,
      Icon: CalendarDays,
    },
    {
      title: "Treatment Records",
      value: filteredTreatments.length,
      Icon: ClipboardList,
    },
  ];

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div>
          <h1>Reports and Analytics</h1>
          <p>Monitor clinic statistics and financial performance.</p>
        </div>

        <div className="sp-toolbar">
          <button
            className="sp-action-btn"
            onClick={loadReports}
            disabled={loading}
          >
            <RefreshCw size={17} /> Refresh
          </button>

          <button
            className="sp-primary-btn"
            onClick={exportReport}
            disabled={Boolean(unavailable)}
          >
            <Download size={17} /> Export Report
          </button>
        </div>
      </div>

      <div className="sp-panel sp-section">
        <div className="sp-filter-grid">
          <div className="sp-form">
            <label>Start Date</label>
            <input
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </div>

          <div className="sp-form">
            <label>End Date</label>
            <input
              type="date"
              value={end}
              onChange={e => setEnd(e.target.value)}
            />
          </div>

          <button
            className="sp-action-btn"
            onClick={() => {
              setStart("");
              setEnd("");
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && <p className="sp-error">{error}</p>}

      {invalidRange && (
        <p className="sp-error">
          End date must not be earlier than start date.
        </p>
      )}

      <div className="sp-stats-grid">
        {stats.map(({ title, value, Icon }) => (
          <div className="sp-stat-card" key={title}>
            <Icon size={26} />
            <div>
              <span>{title}</span>
              <h2>{loading ? "..." : unavailable ? "—" : value}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="sp-chart-grid">
        <section className="sp-panel">
          <h2>Revenue Overview</h2>
          <p className="sp-muted">Monthly collected payments</p>

          <div className="sp-chart-area">
            {!unavailable && revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={value => peso(value)} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#16858a"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="sp-chart-empty">
                <Wallet size={32} />
                <p>{unavailable ? "Revenue unavailable" : "No revenue data available"}</p>
              </div>
            )}
          </div>
        </section>

        <section className="sp-panel">
          <h2>Appointment Overview</h2>
          <p className="sp-muted">Appointments by status</p>

          <div className="sp-chart-area">
            {!unavailable && appointmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    fill="#16858a"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="sp-chart-empty">
                <CalendarDays size={32} />
                <p>{unavailable ? "Appointments unavailable" : "No appointment data available"}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="sp-panel">
        <div className="sp-panel-top">
          <h2>Transaction Report</h2>
        </div>

        <div className="sp-table-scroll">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Date</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {!unavailable && filteredPayments.map(payment => (
                <tr key={payment.payment_id}>
                  <td>{payment.payment_id.slice(0, 8)}</td>
                  <td>{dateKey(payment.paid_at) || "—"}</td>
                  <td className="sp-capitalize">
                    {payment.payment_method?.replaceAll("_", " ")}
                  </td>
                  <td>{peso(payment.amount)}</td>
                  <td>
                    <span className={
                      payment.payment_status === "paid"
                        ? "sp-status-paid"
                        : "sp-status-pending"
                    }>
                      {payment.payment_status}
                    </span>
                  </td>
                </tr>
              ))}

              {(unavailable || !filteredPayments.length) && (
                <tr>
                  <td colSpan={5} className="sp-empty">
                    {loading
                      ? "Loading transactions..."
                      : unavailable
                      ? "Transactions unavailable."
                      : "No transactions found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
