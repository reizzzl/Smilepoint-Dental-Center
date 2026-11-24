import { useEffect, useState } from "react";
import { useOutletContext, Navigate } from "react-router-dom";

import {
  Users,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Eye,
  X,
  Pencil,
  Save,
  ShieldCheck,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import "../shared.css";
import "./StaffManagement.css";

export default function StaffManagement() {
  const { staff: currentStaff } = useOutletContext();

  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [newStatus, setNewStatus] = useState("active");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin =
    currentStaff?.active &&
    currentStaff?.role === "admin";

  // ==========================================
  // LOAD STAFF ACCOUNTS
  // ==========================================

  async function loadStaff() {
    if (!isAdmin) return;

    setLoading(true);
    setError("");

    try {
      const records = [];
      const limit = 500;
      let offset = 0;

      while (true) {
        const { data, error } = await supabase
          .from("staff_account")
          .select(
            "staff_id,full_name,email,role,is_active,created_at"
          )
          .order("full_name")
          .order("staff_id")
          .range(offset, offset + limit - 1);

        if (error) throw error;

        records.push(...(data || []));

        if (!data || data.length < limit) break;

        offset += limit;
      }

      setStaff(records);
    } catch (err) {
      setError(err.message);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, [isAdmin]);

  // ==========================================
  // OPEN EDIT STATUS MODAL
  // ==========================================

  function openEditStatus(person) {
    if (!isAdmin) return;

    if (person.staff_id === currentStaff.id) {
      setError("You cannot change your own account status.");
      return;
    }

    setEditing(person);
    setNewStatus(person.is_active ? "active" : "inactive");

    setEditError("");
    setSuccess("");
  }

  // ==========================================
  // UPDATE ACCOUNT STATUS
  // ==========================================

  async function handleUpdateStatus(e) {
    e.preventDefault();

    if (!editing || !isAdmin || saving) return;

    if (editing.staff_id === currentStaff.id) {
      setEditError(
        "You cannot change your own account status."
      );
      return;
    }

    setSaving(true);
    setEditError("");
    setSuccess("");

    try {
      const { data, error } = await supabase.rpc(
        "update_staff_status",
        {
          p_staff_id: editing.staff_id,
          p_is_active: newStatus === "active",
        }
      );

      if (error) throw error;

      if (data !== true) {
        throw new Error("Account status was not updated.");
      }

      setSuccess(
        `${editing.full_name}'s account has been ${
          newStatus === "active"
            ? "activated"
            : "deactivated"
        } successfully.`
      );

      setEditing(null);

      await loadStaff();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // ROLE PROTECTION
  // ==========================================

  if (!isAdmin) {
    return <Navigate to="/admin/account" replace />;
  }

  // ==========================================
  // FILTER STAFF ACCOUNTS
  // ==========================================

  const filtered = staff.filter((person) => {
    const matchesSearch =
      `${person.full_name} ${person.email} ${person.role} ${person.staff_id}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());

    const matchesRole =
      roleFilter === "all" ||
      person.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && person.is_active) ||
      (statusFilter === "inactive" && !person.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = [
    {
      title: "Total Accounts",
      value: staff.length,
      Icon: Users,
    },
    {
      title: "Active Accounts",
      value: staff.filter((s) => s.is_active).length,
      Icon: UserCheck,
    },
    {
      title: "Inactive Accounts",
      value: staff.filter((s) => !s.is_active).length,
      Icon: UserX,
    },
  ];

  return (
    <div className="sp-page staff-management-page">

      {/* PAGE HEADER */}

      <div className="sp-page-header">
        <div>
          <h1>Staff Management</h1>

          <p>
            Manage registered clinic staff accounts,
            roles, and account status.
          </p>
        </div>

        <button
          className="sp-primary-btn"
          onClick={loadStaff}
          disabled={loading || saving}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* MESSAGES */}

      {error && (
        <div className="sp-error">
          {error}
        </div>
      )}

      {success && (
        <div className="sm-success">
          <ShieldCheck size={20} />
          <span>{success}</span>

          <button
            onClick={() => setSuccess("")}
            aria-label="Dismiss message"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <div className="sp-stats-grid">
        {stats.map(({ title, value, Icon }) => (
          <div className="sp-stat-card" key={title}>
            <Icon size={26} />

            <div>
              <span>{title}</span>

              <h2>
                {loading ? "..." : error ? "—" : value}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* STAFF LIST */}

      <section className="sp-panel">

        <div className="sp-panel-top">
          <h2>Registered Staff Accounts</h2>

          <div className="sp-search">
            <Search size={18} />

            <input
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* FILTERS */}

        <div className="sm-filter-grid">

          <div className="sm-form-group">
            <label htmlFor="roleFilter">
              Filter by Role
            </label>

            <div className="sm-select-wrapper">
              <select
                id="roleFilter"
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value)
                }
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrator</option>
                <option value="dentist">Dentist</option>
                <option value="receptionist">
                  Receptionist
                </option>
              </select>

              <ChevronDown size={18} />
            </div>
          </div>

          <div className="sm-form-group">
            <label htmlFor="statusFilter">
              Filter by Status
            </label>

            <div className="sm-select-wrapper">
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <ChevronDown size={18} />
            </div>
          </div>
        </div>

        {/* STAFF TABLE */}

        <div className="sp-table-scroll">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                !error &&
                filtered.map((person) => (
                  <tr key={person.staff_id}>

                    <td title={person.staff_id}>
                      {person.staff_id.slice(0, 8)}
                    </td>

                    <td>
                      {person.full_name}

                      {person.staff_id === currentStaff.id && (
                        <span className="sm-you-label">
                          You
                        </span>
                      )}
                    </td>

                    <td>{person.email}</td>

                    <td className="sp-capitalize">
                      {person.role}
                    </td>

                    <td>
                      <span
                        className={
                          person.is_active
                            ? "sm-status-active"
                            : "sm-status-inactive"
                        }
                      >
                        <span className="sm-status-dot" />

                        {person.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="sm-table-actions">

                        <button
                          className="sp-action-btn"
                          onClick={() => setSelected(person)}
                        >
                          <Eye size={16} />
                          View
                        </button>

                        {person.staff_id !== currentStaff.id && (
                          <button
                            className="sm-edit-btn"
                            onClick={() => openEditStatus(person)}
                            disabled={saving}
                          >
                            <Pencil size={15} />
                            Edit Status
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}

              {(loading || error || !filtered.length) && (
                <tr>
                  <td colSpan={6} className="sp-empty">
                    {loading
                      ? "Loading staff accounts..."
                      : error
                      ? "Unable to load staff accounts."
                      : "No matching staff accounts found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sm-table-footer">
          Showing {loading ? "—" : filtered.length} of{" "}
          {loading ? "—" : staff.length} accounts
        </div>
      </section>

      {/* VIEW STAFF INFORMATION */}

      {selected && (
        <div className="sp-overlay">
          <div
            className="sp-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Staff Information"
          >
            <div className="sp-modal-header">
              <h2>Staff Information</h2>

              <button
                className="sp-icon-btn"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X size={21} />
              </button>
            </div>

            <div className="sm-profile">
              <div className="sm-avatar">
                {selected.full_name?.charAt(0).toUpperCase()}
              </div>

              <div>
                <h3>{selected.full_name}</h3>
                <p>{selected.email}</p>
              </div>
            </div>

            <div className="sp-details">
              <p>
                <strong>Staff ID:</strong>{" "}
                {selected.staff_id}
              </p>

              <p>
                <strong>Full Name:</strong>{" "}
                {selected.full_name}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {selected.email}
              </p>

              <p className="sp-capitalize">
                <strong>Role:</strong>{" "}
                {selected.role}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {selected.is_active
                  ? "Active"
                  : "Inactive"}
              </p>

              <p>
                <strong>Date Added:</strong>{" "}
                {selected.created_at
                  ? new Date(
                      selected.created_at
                    ).toLocaleDateString("en-PH")
                  : "—"}
              </p>
            </div>

            <button
              className="sp-primary-btn sp-full-btn"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* EDIT STATUS MODAL */}

      {editing && (
        <div className="sp-overlay">
          <div
            className="sp-modal sm-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit Account Status"
          >
            <div className="sp-modal-header">
              <h2>Edit Account Status</h2>

              <button
                className="sp-icon-btn"
                onClick={() => setEditing(null)}
                disabled={saving}
                aria-label="Close"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus}>

              <div className="sm-profile">
                <div className="sm-avatar">
                  {editing.full_name?.charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3>{editing.full_name}</h3>
                  <p>{editing.email}</p>

                  <span className="sm-role-label">
                    {editing.role}
                  </span>
                </div>
              </div>

              {editError && (
                <div className="sp-error">
                  {editError}
                </div>
              )}

              <div className="sm-form-group">
                <label>Current Status</label>

                <div>
                  <span
                    className={
                      editing.is_active
                        ? "sm-status-active"
                        : "sm-status-inactive"
                    }
                  >
                    <span className="sm-status-dot" />

                    {editing.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="sm-form-group sm-status-field">
                <label htmlFor="newStatus">
                  New Account Status
                </label>

                <div className="sm-select-wrapper">
                  <select
                    id="newStatus"
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value)
                    }
                    disabled={saving}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <ChevronDown size={18} />
                </div>
              </div>

              <div
                className={
                  newStatus === "inactive"
                    ? "sm-notice sm-notice-warning"
                    : "sm-notice"
                }
              >
                {newStatus === "inactive" ? (
                  <AlertCircle size={20} />
                ) : (
                  <ShieldCheck size={20} />
                )}

                <p>
                  {newStatus === "inactive"
                    ? "This account will be denied clinic access when its active status is checked. Existing records will not be deleted."
                    : "This account will be allowed to access the system according to its assigned role."}
                </p>
              </div>

              <div className="sm-modal-footer">
                <button
                  type="button"
                  className="sp-secondary-btn"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sp-primary-btn"
                  disabled={
                    saving ||
                    newStatus ===
                      (editing.is_active
                        ? "active"
                        : "inactive")
                  }
                >
                  <Save size={17} />

                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}