
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import {
  Activity,
  LayoutDashboard,
  Users,
  CalendarDays,
  FileHeart,
  Stethoscope,
  UserCog,
  UserRound,
  Wallet,
  BarChart3,
  LogOut,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { getCurrentStaff } from "../../services/patientsApi";

import "../../styles/admin.css";

// ==========================================
// ROLE CONFIGURATION
// ==========================================

const roleConfig = {
  admin: {
    label: "Admin Portal",
    initial: "A",
    background: "#dff2f0",
    color: "#16858a",
  },
  dentist: {
    label: "Dentist Portal",
    initial: "D",
    background: "#e3edfa",
    color: "#3974b8",
  },
  receptionist: {
    label: "Receptionist Portal",
    initial: "R",
    background: "#f3e9fa",
    color: "#8654ac",
  },
};

// ==========================================
// MODULE PERMISSIONS
// ==========================================

const navigationLinks = [
  {
    name: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
    end: true,
    roles: ["admin", "dentist", "receptionist"],
  },
  {
    name: "Appointments",
    path: "/admin/appointments",
    icon: CalendarDays,
    roles: ["admin", "dentist", "receptionist"],
  },
  {
    name: "Patients",
    path: "/admin/patients",
    icon: Users,
    roles: ["admin", "dentist", "receptionist"],
  },
  {
    name: "Dental Records",
    path: "/admin/dental-records",
    icon: FileHeart,
    roles: ["admin", "dentist"],
  },
  {
    name: "Dental Services",
    path: "/admin/services",
    icon: Stethoscope,
    roles: ["admin", "dentist", "receptionist"],
  },
  {
    name: "Billing",
    path: "/admin/billing",
    icon: Wallet,
    roles: ["admin", "receptionist"],
  },
  {
    name: "Reports",
    path: "/admin/reports",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    name: "Staff Management",
    path: "/admin/staff",
    icon: UserCog,
    roles: ["admin"],
  },
  {
    name: "Account Management",
    path: "/admin/account",
    icon: UserRound,
    roles: ["admin", "dentist", "receptionist"],
  },
];

// ==========================================
// MAIN LAYOUT
// ==========================================

export default function AdminLayout() {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountError, setAccountError] = useState("");

  // ==========================================
  // LOAD CURRENT STAFF ACCOUNT
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadStaff() {
      try {
        const data = await getCurrentStaff();

        if (!active) return;

        setStaff(data);
        setAccountError("");
      } catch (error) {
        if (active) {
          setAccountError(error.message);
          setStaff(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStaff();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================
  // VERIFY STAFF ACCESS
  // ==========================================

  const authorized =
    staff?.active === true &&
    Object.prototype.hasOwnProperty.call(
      roleConfig,
      staff?.role
    );

  const currentRole =
    roleConfig[staff?.role] || {
      label: loading ? "Loading..." : "Unknown Role",
      initial: loading ? "..." : "?",
      background: "#edf1f3",
      color: "#82939c",
    };

  // ==========================================
  // FILTER SIDEBAR BY ROLE
  // ==========================================

  const links = authorized
    ? navigationLinks.filter((link) =>
        link.roles.includes(staff.role)
      )
    : [];

  // ==========================================
  // LOGOUT
  // ==========================================

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/login";
  }

  // ==========================================
  // RENDER LAYOUT
  // ==========================================

  return (
    <div className="admin-shell">

      {/* SIDEBAR */}

      <aside className="admin-sidebar">

        {/* BRAND */}

        <div className="admin-brand">
          <div className="admin-brand-icon">
            <Activity size={24} />
          </div>

          <div>
            <h2>Smilepoint</h2>
            <span>Dental Center</span>
          </div>
        </div>

        <p className="admin-menu-label">
          MAIN MENU
        </p>

        {/* ROLE-BASED NAVIGATION */}

        <nav className="admin-navigation">
          {links.map(
            ({ name, path, icon: Icon, end }) => (
              <NavLink
                key={path}
                to={path}
                end={end}
                className={({ isActive }) =>
                  `admin-nav-link ${
                    isActive ? "active" : ""
                  }`
                }
              >
                <Icon size={19} />
                <span>{name}</span>
              </NavLink>
            )
          )}
        </nav>

        {/* SIGN OUT */}

        <div className="admin-sidebar-bottom">
          <button
            type="button"
            onClick={handleLogout}
            className="admin-logout"
          >
            <LogOut size={19} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}

      <div className="admin-workspace">

        {/* TOPBAR */}

        <header className="admin-topbar">
          <div>
            <strong>Smilepoint Dental Center</strong>
            <span>Clinic Management Portal</span>
          </div>

          <div className="admin-topbar-user">
            <span
              className="admin-user-avatar"
              style={{
                background: currentRole.background,
                color: currentRole.color,
              }}
            >
              {currentRole.initial}
            </span>

            <div className="admin-user-details">
              <strong>{currentRole.label}</strong>

              {staff?.full_name && (
                <span>{staff.full_name}</span>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <main className="admin-main">
          {accountError && (
            <div
              role="alert"
              style={{
                padding: "12px 16px",
                marginBottom: "16px",
                background: "#fff1f1",
                color: "#a93b3b",
                borderRadius: "8px",
              }}
            >
              Unable to verify staff account:{" "}
              {accountError}
            </div>
          )}

          {loading ? (
            <p>Loading staff account...</p>
          ) : authorized ? (
            <Outlet context={{ staff }} />
          ) : (
            <p>
              Staff access could not be verified.
              Please sign out and log in again.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
