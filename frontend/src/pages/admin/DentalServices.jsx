
import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Stethoscope,
  CheckCircle,
  XCircle,
  Pencil,
  X,
  RefreshCw,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "../shared.css";

const emptyForm = {
  service_code: "",
  name: "",
  description: "",
  pricing_type: "",
  base_price: "",
  duration_minutes: "",
  is_active: true,
};

function formatMoney(value) {
  return Number(value).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function pricingLabel(value) {
  if (value === "per_tooth") return "Per Tooth";
  if (value === "per_session") return "Per Session";
  return "Not Configured";
}

export default function DentalServices() {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // ==========================================
  // LOAD DENTAL SERVICES
  // ==========================================

  async function loadServices() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("dental_service")
        .select("*")
        .order("name");

      if (error) throw error;

      setServices(data || []);
    } catch (err) {
      setError(
        err.message || "Unable to load dental services."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  // ==========================================
  // ADD SERVICE
  // ==========================================

  function openAdd() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  }

  // ==========================================
  // EDIT SERVICE
  // ==========================================

  function openEdit(service) {
    setForm({
      service_code: service.service_code || "",
      name: service.name || "",
      description: service.description || "",
      pricing_type: service.pricing_type || "",
      base_price: service.base_price ?? "",
      duration_minutes: service.duration_minutes ?? "",
      is_active: service.is_active,
    });

    setEditingId(service.service_id);
    setFormError("");
    setShowModal(true);
  }

  // ==========================================
  // HANDLE FORM INPUT
  // ==========================================

  function changeField(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormError("");
  }

  // ==========================================
  // SAVE DENTAL SERVICE
  // ==========================================

  async function saveService(e) {
    e.preventDefault();

    if (saving) return;

    setFormError("");

    if (!form.service_code.trim()) {
      setFormError("Please enter the service code.");
      return;
    }

    if (!form.name.trim()) {
      setFormError("Please enter the service name.");
      return;
    }

    if (
      !["per_tooth", "per_session"].includes(
        form.pricing_type
      )
    ) {
      setFormError("Please select a pricing type.");
      return;
    }

    const price = Number(form.base_price);
    const duration = Number(form.duration_minutes);

    if (
      form.base_price === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setFormError("Please enter a valid service price.");
      return;
    }

    if (
      !Number.isInteger(duration) ||
      duration < 1
    ) {
      setFormError("Please enter a valid duration.");
      return;
    }

    setSaving(true);

    try {
      // VERIFY ADMIN ACCOUNT

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const {
        data: staff,
        error: staffError,
      } = await supabase
        .from("staff_account")
        .select("role, is_active")
        .eq("staff_id", user.id)
        .single();

      if (staffError) throw staffError;

      if (
        !staff?.is_active ||
        staff.role !== "admin"
      ) {
        throw new Error(
          "Only active administrators can manage dental services."
        );
      }

      // PREPARE DATABASE VALUES

      const values = {
        service_code: form.service_code.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        pricing_type: form.pricing_type,
        base_price: price,
        duration_minutes: duration,
        is_active: form.is_active,
      };

      const query = editingId
        ? supabase
            .from("dental_service")
            .update(values)
            .eq("service_id", editingId)
        : supabase
            .from("dental_service")
            .insert(values);

      const { error } = await query
        .select("service_id")
        .single();

      if (error) throw error;

      setShowModal(false);
      await loadServices();

    } catch (err) {
      setFormError(
        err.message || "Unable to save dental service."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // SEARCH SERVICES
  // ==========================================

  const filtered = services.filter((service) =>
    `${service.name} ${service.service_code} ${
      pricingLabel(service.pricing_type)
    }`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = [
    {
      title: "Total Services",
      value: services.length,
      Icon: Stethoscope,
    },
    {
      title: "Active Services",
      value: services.filter(
        (service) => service.is_active
      ).length,
      Icon: CheckCircle,
    },
    {
      title: "Inactive Services",
      value: services.filter(
        (service) => !service.is_active
      ).length,
      Icon: XCircle,
    },
  ];

  const unconfiguredCount = services.filter(
    (service) => !service.pricing_type
  ).length;

  // ==========================================
  // PAGE INTERFACE
  // ==========================================

  return (
    <div className="sp-page">

      {/* PAGE HEADER */}

      <div className="sp-page-header">
        <div>
          <h1>Dental Services</h1>
          <p>
            Manage dental services, pricing,
            duration, and availability.
          </p>
        </div>

        <button
          className="sp-primary-btn"
          onClick={openAdd}
        >
          <Plus size={18} />
          Add Service
        </button>
      </div>

      {error && (
        <p className="sp-error">{error}</p>
      )}

      {/* STATISTICS */}

      <div className="sp-stats-grid">
        {stats.map(({ title, value, Icon }) => (
          <div
            className="sp-stat-card"
            key={title}
          >
            <Icon size={26} />

            <div>
              <span>{title}</span>

              <h2>
                {loading
                  ? "..."
                  : error
                  ? "—"
                  : value}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* PRICING CONFIGURATION NOTICE */}

      {!loading &&
        !error &&
        unconfiguredCount > 0 && (
          <div
            style={{
              padding: "14px 18px",
              background: "#fff8e8",
              color: "#946b16",
              border: "1px solid #f0dfb3",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            <strong>Pricing Configuration Required</strong>

            <p style={{ margin: "6px 0 0" }}>
              {unconfiguredCount} dental service(s)
              require a pricing type. Edit each service
              and select Per Tooth or Per Session.
            </p>
          </div>
        )}

      {/* SERVICE LIST */}

      <section className="sp-panel">
        <div className="sp-panel-top">
          <h2>Service List</h2>

          <div className="sp-toolbar">
            <div className="sp-search">
              <Search size={18} />

              <input
                placeholder="Search services..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <button
              className="sp-action-btn"
              onClick={loadServices}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* SERVICES TABLE */}

        <div className="sp-table-scroll">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Service Code</th>
                <th>Service Name</th>
                <th>Description</th>
                <th>Pricing Type</th>
                <th>Base Price</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                !error &&
                filtered.map((service) => (
                  <tr key={service.service_id}>
                    <td>{service.service_code}</td>

                    <td>
                      <strong>{service.name}</strong>
                    </td>

                    <td>
                      {service.description || "—"}
                    </td>

                    {/* PRICING TYPE */}

                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          whiteSpace: "nowrap",
                          fontSize: "12px",
                          fontWeight: "600",
                          background:
                            service.pricing_type ===
                            "per_tooth"
                              ? "#e5f4f3"
                              : service.pricing_type ===
                                "per_session"
                              ? "#e8effa"
                              : "#fff3d9",
                          color:
                            service.pricing_type ===
                            "per_tooth"
                              ? "#106d72"
                              : service.pricing_type ===
                                "per_session"
                              ? "#3974b8"
                              : "#946b16",
                        }}
                      >
                        {pricingLabel(
                          service.pricing_type
                        )}
                      </span>
                    </td>

                    {/* BASE PRICE */}

                    <td>
                      <strong>
                        {formatMoney(service.base_price)}
                      </strong>

                      {service.pricing_type && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#82939c",
                            marginTop: "4px",
                          }}
                        >
                          {service.pricing_type ===
                          "per_tooth"
                            ? "per tooth"
                            : "per session"}
                        </div>
                      )}
                    </td>

                    <td>
                      {service.duration_minutes} mins
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={
                          service.is_active
                            ? "sp-status-paid"
                            : "sp-status-inactive"
                        }
                      >
                        {service.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    {/* EDIT ACTION */}

                    <td>
                      <button
                        className="sp-action-btn"
                        onClick={() =>
                          openEdit(service)
                        }
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

              {(loading ||
                error ||
                !filtered.length) && (
                <tr>
                  <td
                    colSpan={8}
                    className="sp-empty"
                  >
                    {loading
                      ? "Loading services..."
                      : error
                      ? "Unable to load services."
                      : "No dental services found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ADD / EDIT SERVICE MODAL */}

      {showModal && (
        <div className="sp-overlay">
          <div
            className="sp-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId
                ? "Edit Service"
                : "Add Service"
            }
          >
            <div className="sp-modal-header">
              <h2>
                {editingId
                  ? "Edit Service"
                  : "Add Service"}
              </h2>

              <button
                type="button"
                className="sp-icon-btn"
                disabled={saving}
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <X size={21} />
              </button>
            </div>

            <form
              className="sp-form"
              onSubmit={saveService}
            >

              {/* SERVICE CODE */}

              <label htmlFor="service_code">
                Service Code *
              </label>

              <input
                id="service_code"
                name="service_code"
                value={form.service_code}
                onChange={changeField}
                placeholder="Enter service code"
                disabled={saving}
                required
              />

              {/* SERVICE NAME */}

              <label htmlFor="name">
                Service Name *
              </label>

              <input
                id="name"
                name="name"
                value={form.name}
                onChange={changeField}
                placeholder="Enter dental service name"
                disabled={saving}
                required
              />

              {/* DESCRIPTION */}

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={changeField}
                placeholder="Enter service description"
                disabled={saving}
                rows={3}
              />

              {/* PRICING TYPE */}

              <label htmlFor="pricing_type">
                Pricing Type *
              </label>

              <select
                id="pricing_type"
                name="pricing_type"
                value={form.pricing_type}
                onChange={changeField}
                disabled={saving}
                required
              >
                <option value="">
                  Select pricing type
                </option>

                <option value="per_tooth">
                  Per Tooth
                </option>

                <option value="per_session">
                  Per Session
                </option>
              </select>

              <div
                style={{
                  padding: "12px",
                  background: "#eaf4f4",
                  color: "#106d72",
                  borderRadius: "8px",
                  fontSize: "13px",
                  lineHeight: "1.6",
                }}
              >
                {form.pricing_type === "per_tooth"
                  ? "The total fee will be calculated by multiplying the base price by the number of teeth treated."
                  : form.pricing_type === "per_session"
                  ? "The service has a fixed fee for one treatment session."
                  : "Select how this dental service should be charged."}
              </div>

              {/* BASE PRICE */}

              <label htmlFor="base_price">
                {form.pricing_type === "per_tooth"
                  ? "Price per Tooth (₱) *"
                  : form.pricing_type === "per_session"
                  ? "Price per Session (₱) *"
                  : "Base Price (₱) *"}
              </label>

              <input
                id="base_price"
                name="base_price"
                type="number"
                min="0"
                step="0.01"
                value={form.base_price}
                onChange={changeField}
                placeholder="Enter service price"
                disabled={saving}
                required
              />

              {/* DURATION */}

              <label htmlFor="duration_minutes">
                Duration (Minutes) *
              </label>

              <input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min="1"
                step="1"
                value={form.duration_minutes}
                onChange={changeField}
                placeholder="Enter estimated duration"
                disabled={saving}
                required
              />

              {/* AVAILABILITY */}

              <label htmlFor="is_active">
                Availability
              </label>

              <select
                id="is_active"
                value={String(form.is_active)}
                disabled={saving}
                onChange={(e) =>
                  setForm((previous) => ({
                    ...previous,
                    is_active:
                      e.target.value === "true",
                  }))
                }
              >
                <option value="true">
                  Active
                </option>

                <option value="false">
                  Inactive
                </option>
              </select>

              {/* ERROR MESSAGE */}

              {formError && (
                <p
                  className="sp-error"
                  role="alert"
                >
                  {formError}
                </p>
              )}

              {/* FORM BUTTONS */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <button
                  type="button"
                  className="sp-action-btn"
                  disabled={saving}
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sp-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
