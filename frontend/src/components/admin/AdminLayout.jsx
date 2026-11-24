import { NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  Users,
  CalendarDays,
  FileHeart,
  Stethoscope,
  UserCog,
  Wallet,
  BarChart3,
  LogOut,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import "../../styles/admin.css";

export default function AdminLayout() {
  const links = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
    { name: "Appointments", path: "/admin/appointments", icon: CalendarDays },
    { name: "Patients", path: "/admin/patients", icon: Users },
    { name: "Dental Records", path: "/admin/dental-records", icon: FileHeart },
    { name: "Dental Services", path: "/admin/services", icon: Stethoscope },
    { name: "Staff Management", path: "/admin/staff", icon: UserCog },
    { name: "Billing", path: "/admin/billing", icon: Wallet },
    { name: "Reports", path: "/admin/reports", icon: BarChart3 },
  ];

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/login";
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <Activity size={24} />
          </div>
          <div>
            <h2>Smilepoint</h2>
            <span>Dental Center</span>
          </div>
        </div>

        <p className="admin-menu-label">MAIN MENU</p>

        <nav className="admin-navigation">
          {links.map(({ name, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <button onClick={handleLogout} className="admin-logout">
            <LogOut size={19} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <strong>Smilepoint Dental Center</strong>
            <span>Clinic Management Portal</span>
          </div>

          <div className="admin-topbar-user">
            <span className="admin-user-avatar">A</span>
            <span>Admin Portal</span>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
