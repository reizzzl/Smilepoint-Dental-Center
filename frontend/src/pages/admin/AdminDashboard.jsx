
import { useEffect, useState } from "react";
import {
  Users,
  CalendarDays,
  Stethoscope,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    services: 0,
    payments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const [patients, appointments, services, payments] =
      await Promise.all([
        supabase.from("patient").select("*", { count: "exact", head: true }),
        supabase.from("appointment").select("*", { count: "exact", head: true }),
        supabase.from("dental_service").select("*", { count: "exact", head: true }),
        supabase.from("payment").select("amount"),
      ]);

    const failure = [patients, appointments, services, payments]
      .find((result) => result.error);

    if (failure) setError(failure.error.message);

    setStats({
      patients: patients.count ?? 0,
      appointments: appointments.count ?? 0,
      services: services.count ?? 0,
      payments: (payments.data || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    });

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const cards = [
    { title: "Total Patients", value: stats.patients, icon: Users },
    { title: "Appointments", value: stats.appointments, icon: CalendarDays },
    { title: "Dental Services", value: stats.services, icon: Stethoscope },
    {
      title: "Payments Collected",
      value: new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(stats.payments),
      icon: Wallet,
    },
  ];

  return (
    <div style={{ padding: "25px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p>Smilepoint Dental Center Management System</p>
        </div>
        <button onClick={loadDashboard}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginTop: "25px",
      }}>
        {cards.map(({ title, value, icon: Icon }) => (
          <div key={title} style={{
            padding: "24px",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}>
            <Icon size={26} color="#167c80" />
            <p>{title}</p>
            <h2>{loading ? "Loading..." : value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}
