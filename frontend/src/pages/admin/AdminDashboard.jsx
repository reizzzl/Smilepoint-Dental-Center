import { useEffect, useState } from "react";
import {
  Users,
  CalendarDays,
  Stethoscope,
  Wallet,
  RefreshCw,
  Activity,
  Clock,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "../shared.css";

const COLORS = {
  scheduled: "#16858a",
  confirmed: "#528bd1",
  completed: "#49a879",
  cancelled: "#dc7777",
  pending: "#e9b65b",
  unknown: "#a5b5bf",
};

const currency = (value) =>
  Number(value).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });

function dateKey(value) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function appointmentTime(item) {
  if (!item.appointment_date || !item.start_time) {
    return "";
  }

  return `${item.appointment_date}T${item.start_time}+08:00`;
}

function statusLabel(value) {
  const status = String(value || "unknown");

  return status.charAt(0).toUpperCase() + status.slice(1);
}

async function fetchRows(table, columns, primaryKey) {
  const records = [];
  const pageSize = 500;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(primaryKey)
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    records.push(...(data || []));

    if (!data || data.length < pageSize) {
      return records;
    }
  }
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="dashboard-empty">
      <Icon size={32} />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [appointmentServices, setAppointmentServices] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  async function loadDashboard() {
    setLoading(true);
    setErrors({});

    const tables = [
      {
        name: "patient",
        columns: "patient_id,first_name,last_name,created_at",
        key: "patient_id",
        setter: setPatients,
      },
      {
        name: "appointment",
        columns: "*",
        key: "appointment_id",
        setter: setAppointments,
      },
      {
        name: "dental_service",
        columns: "service_id,name,is_active",
        key: "service_id",
        setter: setServices,
      },
      {
        name: "appointment_service",
        columns: "appointment_service_id,appointment_id,service_id",
        key: "appointment_service_id",
        setter: setAppointmentServices,
      },
      {
        name: "payment",
        columns: "payment_id,patient_id,amount,payment_status,paid_at,payment_method",
        key: "payment_id",
        setter: setPayments,
      },
    ];

    const results = await Promise.allSettled(
      tables.map((table) =>
        fetchRows(table.name, table.columns, table.key)
      )
    );

    const nextErrors = {};

    results.forEach((result, index) => {
      const table = tables[index];

      if (result.status === "fulfilled") {
        table.setter(result.value);
      } else {
        table.setter([]);
        nextErrors[table.name] =
          result.reason?.message || "Unable to load records.";
      }
    });

    setErrors(nextErrors);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==========================================
  // PAYMENTS COLLECTED
  // ==========================================

  const paidPayments = payments.filter(
    (payment) =>
      String(payment.payment_status).toLowerCase() === "paid"
  );

  const invalidPayments = paidPayments.some(
    (payment) =>
      payment.amount == null ||
      !Number.isFinite(Number(payment.amount)) ||
      Number(payment.amount) < 0
  );

  const totalRevenue = paidPayments.reduce(
    (total, payment) =>
      total + Math.round(Number(payment.amount) * 100),
    0
  ) / 100;

  const cards = [
    {
      title: "Total Patients",
      value: patients.length,
      icon: Users,
      unavailable: Boolean(errors.patient),
    },
    {
      title: "Appointments",
      value: appointments.length,
      icon: CalendarDays,
      unavailable: Boolean(errors.appointment),
    },
    {
      title: "Dental Services",
      value: services.length,
      icon: Stethoscope,
      unavailable: Boolean(errors.dental_service),
    },
    {
      title: "Payments Collected",
      value: currency(totalRevenue),
      icon: Wallet,
      unavailable: Boolean(errors.payment) || invalidPayments,
    },
  ];

  function getPatientName(id) {
    const patient = patients.find(
      (item) => item.patient_id === id
    );

    if (!patient) return "Patient unavailable";

    return [patient.first_name, patient.last_name]
      .filter(Boolean)
      .join(" ");
  }

  function getAppointmentServices(appointmentId) {
    const names = appointmentServices
      .filter(
        (item) => item.appointment_id === appointmentId
      )
      .map((item) =>
        services.find(
          (service) => service.service_id === item.service_id
        )?.name
      )
      .filter(Boolean);

    return names.join(", ") || "—";
  }

  const [year, month, day] = dateKey(new Date())
    .split("-")
    .map(Number);

  // ==========================================
  // APPOINTMENT OVERVIEW - LAST 7 DAYS
  // ==========================================

  const appointmentData = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(
        Date.UTC(year, month - 1, day - 6 + index)
      );

      const key = date.toISOString().slice(0, 10);

      return {
        day: date.toLocaleDateString("en-PH", {
          timeZone: "UTC",
          month: "short",
          day: "numeric",
        }),
        appointments: appointments.filter(
          (item) => dateKey(item.appointment_date) === key
        ).length,
      };
    }
  );

  // ==========================================
  // REVENUE OVERVIEW - LAST 6 MONTHS
  // ==========================================

  const revenueData = Array.from(
    { length: 6 },
    (_, index) => {
      const date = new Date(
        Date.UTC(year, month - 1 - 5 + index, 1)
      );

      const key = date.toISOString().slice(0, 7);

      const revenue = paidPayments
        .filter((payment) =>
          dateKey(payment.paid_at).startsWith(key)
        )
        .reduce(
          (sum, payment) =>
            sum + Math.round(Number(payment.amount) * 100),
          0
        ) / 100;

      return {
        month: date.toLocaleDateString("en-PH", {
          timeZone: "UTC",
          month: "short",
          year: "2-digit",
        }),
        revenue,
      };
    }
  );

  const invalidPaymentDates = paidPayments.some(
    (payment) => !dateKey(payment.paid_at)
  );

  // ==========================================
  // APPOINTMENT STATUS
  // ==========================================

  const statusCounts = {};

  appointments.forEach((item) => {
    const status = String(
      item.status || "unknown"
    ).toLowerCase();

    statusCounts[status] =
      (statusCounts[status] || 0) + 1;
  });

  const statusData = Object.entries(statusCounts).map(
    ([status, value]) => ({
      name: statusLabel(status),
      value,
      color: COLORS[status] || COLORS.unknown,
    })
  );

  // ==========================================
  // RECENT ACTIVITY
  // ==========================================

  const recentActivity = [
    ...patients.map((item) => ({
      id: `patient-${item.patient_id}`,
      title: "Patient registered",
      description: getPatientName(item.patient_id),
      date: item.created_at,
      icon: Users,
    })),

    ...appointments.map((item) => ({
      id: `appointment-${item.appointment_id}`,
      title: "Appointment recorded",
      description: getPatientName(item.patient_id),
      date: item.created_at,
      icon: CalendarDays,
    })),

    ...paidPayments.map((item) => ({
      id: `payment-${item.payment_id}`,
      title: "Payment collected",
      description:
        `${getPatientName(item.patient_id)} — ${currency(item.amount)}`,
      date: item.paid_at,
      icon: Wallet,
    })),
  ]
    .filter((item) => dateKey(item.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  // ==========================================
  // UPCOMING APPOINTMENTS
  // ==========================================

  const upcomingAppointments = appointments
    .filter(
      (item) =>
        ["scheduled", "confirmed"].includes(
          String(item.status).toLowerCase()
        ) &&
        new Date(appointmentTime(item)) >= new Date()
    )
    .sort(
      (a, b) =>
        new Date(appointmentTime(a)) -
        new Date(appointmentTime(b))
    )
    .slice(0, 5);

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Monitor clinic operations, appointments, and revenue.
          </p>
        </div>

        <button
          className="sp-primary-btn"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={17} />
          {loading ? "Loading..." : "Refresh Dashboard"}
        </button>
      </div>

      {Object.entries(errors).map(([table, message]) => (
        <p className="sp-error" key={table}>
          Unable to load {table}: {message}
        </p>
      ))}

      {invalidPayments && (
        <p className="sp-error">
          Some paid transactions contain invalid amounts.
        </p>
      )}

      <div className="sp-stats-grid">
        {cards.map(({ title, value, icon: Icon, unavailable }) => (
          <div className="sp-stat-card" key={title}>
            <Icon size={26} />

            <div>
              <span>{title}</span>
              <h2>
                {loading ? "..." : unavailable ? "—" : value}
              </h2>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">

        {/* APPOINTMENT OVERVIEW */}

        <section className="sp-panel">
          <div className="dashboard-panel-heading">
            <h2>Appointment Overview</h2>
            <p>Appointments over the last 7 days</p>
          </div>

          {loading ? (
            <p>Loading appointments...</p>
          ) : errors.appointment ? (
            <p className="sp-error">
              Appointment data unavailable.
            </p>
          ) : (
            <div
              className="dashboard-chart"
              style={{ width: "100%", height: 280 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />

                  <Bar
                    dataKey="appointments"
                    name="Appointments"
                    fill="#16858a"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* REVENUE OVERVIEW */}

        <section className="sp-panel">
          <div className="dashboard-panel-heading">
            <h2>Revenue Overview</h2>
            <p>Collected payments over the last 6 months</p>
          </div>

          {loading ? (
            <p>Loading revenue...</p>
          ) : errors.payment ||
            invalidPayments ||
            invalidPaymentDates ? (
            <p className="sp-error">
              Revenue data unavailable or incomplete.
            </p>
          ) : (
            <div
              className="dashboard-chart"
              style={{ width: "100%", height: 280 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#16858a"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="#16858a"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis dataKey="month" />

                  <YAxis
                    tickFormatter={(value) =>
                      `₱${Number(value).toLocaleString()}`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      currency(value),
                      "Revenue",
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#16858a"
                    strokeWidth={3}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* APPOINTMENT STATUS */}

        <section className="sp-panel">
          <div className="dashboard-panel-heading">
            <h2>Appointment Status</h2>
            <p>Distribution of clinic appointments</p>
          </div>

          {loading ? (
            <p>Loading appointment status...</p>
          ) : errors.appointment ? (
            <p className="sp-error">
              Appointment status unavailable.
            </p>
          ) : statusData.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No appointments"
              message="Recorded appointments will appear here."
            />
          ) : (
            <div
              className="dashboard-chart"
              style={{ width: "100%", height: 280 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {statusData.map((item) => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* RECENT ACTIVITY */}

        <section className="sp-panel">
          <div className="dashboard-panel-heading">
            <h2>Recent Activity</h2>
            <p>Latest recorded clinic activities</p>
          </div>

          {loading ? (
            <p>Loading activities...</p>
          ) : (
            <>
              {(errors.patient ||
                errors.appointment ||
                errors.payment ||
                invalidPayments ||
                invalidPaymentDates) && (
                <p className="sp-error">
                  Some activity records may be unavailable.
                </p>
              )}

              {recentActivity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  message="New clinic records will appear here."
                />
              ) : (
                <div className="dashboard-activity-list">
                  {recentActivity.map(
                    ({ id, title, description, date, icon: Icon }) => (
                      <div
                        className="dashboard-activity-item"
                        key={id}
                      >
                        <div className="dashboard-activity-icon">
                          <Icon size={20} />
                        </div>

                        <div className="dashboard-activity-info">
                          <strong>{title}</strong>
                          <p>{description}</p>
                          <small>{formatDate(date)}</small>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* UPCOMING APPOINTMENTS */}

      <section className="sp-panel dashboard-upcoming">
        <div className="sp-panel-top">
          <div className="dashboard-panel-heading">
            <h2>Upcoming Appointments</h2>
            <p>Next scheduled patient appointments</p>
          </div>

          <Link
            to="/admin/appointments"
            className="sp-primary-btn"
          >
            <CalendarDays size={16} />
            View Appointments
          </Link>
        </div>

        <div className="sp-table-scroll">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Dental Service</th>
                <th>Date and Time</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="sp-empty">
                    Loading appointments...
                  </td>
                </tr>
              ) : errors.appointment ? (
                <tr>
                  <td colSpan={4} className="sp-empty">
                    Unable to load appointments.
                  </td>
                </tr>
              ) : upcomingAppointments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="sp-empty">
                    <Clock size={22} />
                    <p>No upcoming appointments.</p>
                  </td>
                </tr>
              ) : (
                upcomingAppointments.map((item) => (
                  <tr key={item.appointment_id}>
                    <td>
                      {getPatientName(item.patient_id)}
                    </td>

                    <td>
                      {getAppointmentServices(item.appointment_id)}
                    </td>

                    <td>
                      {formatDate(appointmentTime(item))}
                    </td>

                    <td>
                      <span className="dashboard-status">
                        {statusLabel(item.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}