import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ClinicalRecordForm({
  type,
  patientId,
  onSaved,
  onClose,
}) {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(
    type === "treatment"
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);

  const [form, setForm] = useState({
    service_id: "",
    appointment_id: "",
    quantity: "1",

    treatment_date: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Manila",
    }).format(new Date()),

    diagnosis: "",
    procedure_done: "",
    notes: "",

    allergies: "",
    current_medications: "",
    blood_pressure: "",
    additional_notes: "",

    study_type: "",
    findings: "",
  });

  // ==========================================
  // LOAD DENTAL SERVICES AND APPOINTMENTS
  // ==========================================

  useEffect(() => {
    if (type !== "treatment") return;

    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [serviceResult, appointmentResult] =
          await Promise.all([
            supabase
              .from("dental_service")
              .select(`
                service_id,
                name,
                base_price,
                pricing_type
              `)
              .eq("is_active", true)
              .order("name"),

            supabase
              .from("appointment")
              .select(`
                appointment_id,
                appointment_date,
                start_time
              `)
              .eq("patient_id", patientId)
              .order("appointment_date", {
                ascending: false,
              }),
          ]);

        if (serviceResult.error) {
          throw serviceResult.error;
        }

        if (appointmentResult.error) {
          throw appointmentResult.error;
        }

        if (active) {
          setServices(serviceResult.data || []);
          setAppointments(
            appointmentResult.data || []
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load services."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [type, patientId]);

  // ==========================================
  // AUTOMATIC TREATMENT PRICING
  // ==========================================

  const selectedService = services.find(
    (service) =>
      service.service_id === form.service_id
  );

  function normalizePricingType(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  const pricingType = normalizePricingType(
    selectedService?.pricing_type
  );

  const isPerTooth = pricingType === "per_tooth";

  const validPricingType =
    isPerTooth ||
    [
      "fixed",
      "fixed_price",
      "per_service",
      "flat",
      "flat_rate",
      "per_session",
      "per_procedure",
    ].includes(pricingType);

  const unitPrice =
    selectedService?.base_price != null
      ? Number(selectedService.base_price)
      : null;

  const quantity = isPerTooth
    ? Number(form.quantity)
    : 1;

  const validQuantity =
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    (!isPerTooth || quantity <= 32);

  const validPrice =
    unitPrice !== null &&
    Number.isFinite(unitPrice) &&
    unitPrice >= 0;

  const totalFee =
    validQuantity && validPrice
      ? Math.round(unitPrice * 100) * quantity / 100
      : null;

  function formatMoney(value) {
    if (value == null) return "";

    return Number(value).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ==========================================
  // HANDLE FORM CHANGES
  // ==========================================

  function change(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function changeService(e) {
    setError("");

    setForm((previous) => ({
      ...previous,
      service_id: e.target.value,
      quantity: "1",
    }));
  }

  // ==========================================
  // SAVE CLINICAL RECORD
  // ==========================================

  async function handleSubmit(e) {
    e.preventDefault();

    if (saving || loading) return;

    if (!patientId) {
      setError("Please select a patient first.");
      return;
    }

    setSaving(true);
    setError("");

    let uploadedPath = null;
    let committed = false;

    try {
      // VERIFY AUTHENTICATED USER

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      // VERIFY DENTIST ACCOUNT

      const {
        data: staff,
        error: staffError,
      } = await supabase
        .from("staff_account")
        .select("staff_id, role, is_active")
        .eq("staff_id", user.id)
        .single();

      if (staffError) throw staffError;

      if (
        !staff?.is_active ||
        staff.role !== "dentist"
      ) {
        throw new Error(
          "Only active dentists can add clinical records."
        );
      }

      // ======================================
      // SAVE TREATMENT RECORD
      // ======================================

      if (type === "treatment") {
        if (!selectedService) {
          throw new Error(
            "Please select a dental service."
          );
        }

        if (!validPricingType) {
          throw new Error(
            "This service has an unsupported pricing type. Please contact the administrator."
          );
        }

        if (!validQuantity) {
          throw new Error(
            "Please enter a valid number of teeth treated."
          );
        }

        if (!validPrice) {
          throw new Error(
            "The selected service has an invalid price."
          );
        }

        if (!form.treatment_date) {
          throw new Error(
            "Please select a treatment date."
          );
        }

        if (!form.diagnosis.trim()) {
          throw new Error(
            "Please enter the patient's diagnosis."
          );
        }

        if (!form.procedure_done.trim()) {
          throw new Error(
            "Please enter the treatment performed."
          );
        }

        if (
          form.appointment_id &&
          !appointments.some(
            (appointment) =>
              appointment.appointment_id ===
              form.appointment_id
          )
        ) {
          throw new Error(
            "Invalid appointment selection."
          );
        }

        // RETRIEVE THE LATEST SERVICE PRICE

        const {
          data: latestService,
          error: serviceError,
        } = await supabase
          .from("dental_service")
          .select(`
            service_id,
            base_price,
            pricing_type,
            is_active
          `)
          .eq("service_id", form.service_id)
          .single();

        if (serviceError) throw serviceError;

        if (!latestService?.is_active) {
          throw new Error(
            "The selected service is no longer active."
          );
        }

        if (
          latestService.base_price == null ||
          !Number.isFinite(
            Number(latestService.base_price)
          ) ||
          Number(latestService.base_price) < 0
        ) {
          throw new Error(
            "The service price is invalid."
          );
        }

        const latestPrice = Number(
          latestService.base_price
        );

        if (
          latestPrice !== unitPrice ||
          normalizePricingType(
            latestService.pricing_type
          ) !== pricingType
        ) {
          setServices((previous) =>
            previous.map((service) =>
              service.service_id === form.service_id
                ? { ...service, ...latestService }
                : service
            )
          );

          throw new Error(
            "The service pricing has changed. Review the updated total before saving again."
          );
        }

        // SAVE QUANTITY AND UNIT PRICE
        // SUPABASE GENERATES TOTAL_FEE

        const treatmentData = {
          patient_id: patientId,

          service_id: form.service_id,

          appointment_id:
            form.appointment_id || null,

          performed_by: user.id,

          treatment_date: form.treatment_date,

          diagnosis: form.diagnosis.trim(),

          procedure_done:
            form.procedure_done.trim(),

          notes: form.notes.trim() || null,

          quantity: quantity,

          unit_price: latestPrice,
        };

        const { error: treatmentError } =
          await supabase
            .from("treatment_record")
            .insert(treatmentData);

        if (treatmentError) {
          throw treatmentError;
        }

        committed = true;
      }

      // ======================================
      // SAVE MEDICAL HISTORY
      // ======================================

      else if (type === "medical") {
        const medicalData = {
          patient_id: patientId,

          recorded_by: user.id,

          allergies:
            form.allergies.trim() || null,

          current_medications:
            form.current_medications.trim() ||
            null,

          blood_pressure:
            form.blood_pressure.trim() || null,

          additional_notes:
            form.additional_notes.trim() || null,
        };

        const { error: medicalError } =
          await supabase
            .from("medical_history")
            .insert(medicalData);

        if (medicalError) {
          throw medicalError;
        }

        committed = true;
      }

      // ======================================
      // SAVE X-RAY RECORD
      // ======================================

      else if (type === "xray") {
        if (!form.study_type.trim()) {
          throw new Error(
            "Please enter the X-ray study type."
          );
        }

        if (!file) {
          throw new Error(
            "Please select an X-ray image."
          );
        }

        const extensions = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };

        const extension = extensions[file.type];

        if (!extension) {
          throw new Error(
            "Only JPG, PNG, and WEBP images are allowed."
          );
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(
            "The maximum image size is 10 MB."
          );
        }

        const path =
          `${patientId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("dental-xrays")
            .upload(path, file, {
              contentType: file.type,
              upsert: false,
            });

        if (uploadError) throw uploadError;

        uploadedPath = path;

        const xrayData = {
          patient_id: patientId,

          ordered_by: user.id,

          study_type: form.study_type.trim(),

          image_url: path,

          storage_path: path,

          findings:
            form.findings.trim() || null,

          taken_at: new Date().toISOString(),
        };

        const { error: xrayError } =
          await supabase
            .from("xray_study")
            .insert(xrayData);

        if (xrayError) throw xrayError;

        committed = true;
      }

      else {
        throw new Error("Invalid clinical record type.");
      }
    } catch (err) {
      let message =
        err.message || "Unable to save clinical record.";

      // CLEAN UP FAILED X-RAY UPLOAD

      if (uploadedPath && !committed) {
        try {
          const { error: cleanupError } =
            await supabase.storage
              .from("dental-xrays")
              .remove([uploadedPath]);

          if (cleanupError) {
            message += " Uploaded image cleanup failed.";
          }
        } catch {
          message += " Uploaded image cleanup failed.";
        }
      }

      setError(message);
    } finally {
      setSaving(false);
    }

    // CLOSE AND REFRESH AFTER SUCCESSFUL SAVE

    if (committed) {
      try {
        await onSaved?.();
      } finally {
        onClose?.();
      }
    }
  }

  // ==========================================
  // MODAL TITLES
  // ==========================================

  const titles = {
    treatment: "Add Treatment Record",
    medical: "Add Medical History",
    xray: "Upload X-Ray",
  };

  const descriptions = {
    treatment:
      "Record the dental treatment performed for this patient.",

    medical:
      "Record the patient's medical history and health information.",

    xray:
      "Upload the patient's dental X-ray image and findings.",
  };

  // ==========================================
  // READ-ONLY INPUT STYLE
  // ==========================================

  const readonlyStyle = {
    background: "#eaf4f4",
    color: "#106d72",
    fontWeight: "600",
    cursor: "not-allowed",
  };

  const helperStyle = {
    display: "block",
    color: "#82939c",
    fontSize: "13px",
    lineHeight: "1.6",
    marginBottom: "8px",
  };

  // ==========================================
  // FORM INTERFACE
  // ==========================================

  return (
    <div className="dc-modal-overlay">
      <div
        className="dc-modal"
        role="dialog"
        aria-modal="true"
        aria-label={titles[type]}
      >
        {/* MODAL HEADER */}

        <div className="dc-modal-header">
          <div>
            <h2>{titles[type]}</h2>

            <p>{descriptions[type]}</p>
          </div>

          <button
            type="button"
            className="dc-icon-btn"
            disabled={saving}
            onClick={onClose}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset
            disabled={saving}
            style={{
              border: "none",
              padding: 0,
              margin: 0,
              minWidth: 0,
            }}
          >
            <div className="dc-modal-body">

              {/* ERROR MESSAGE */}

              {error && (
                <div
                  className="dc-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* ==============================
                  TREATMENT RECORD FORM
              ============================== */}

              {type === "treatment" && (
                <>
                  {/* DENTAL SERVICE */}

                  <label htmlFor="clinical-service">
                    Dental Service *
                  </label>

                  <select
                    id="clinical-service"
                    name="service_id"
                    value={form.service_id}
                    onChange={changeService}
                    disabled={loading}
                    required
                  >
                    <option value="">
                      {loading
                        ? "Loading dental services..."
                        : "Select dental service"}
                    </option>

                    {services.map((service) => (
                      <option
                        key={service.service_id}
                        value={service.service_id}
                      >
                        {service.name}
                      </option>
                    ))}
                  </select>

                  {!loading &&
                    services.length === 0 && (
                      <p className="dc-muted">
                        No active dental services found.
                      </p>
                    )}

                  {/* AUTOMATIC UNIT PRICE */}

                  <label htmlFor="clinical-unit-price">
                    {isPerTooth
                      ? "Price per Tooth (₱)"
                      : "Treatment Fee (₱)"}
                  </label>

                  <input
                    id="clinical-unit-price"
                    type="text"
                    value={formatMoney(unitPrice)}
                    placeholder="Automatically retrieved"
                    readOnly
                    style={readonlyStyle}
                  />

                  <small style={helperStyle}>
                    The fee is automatically retrieved
                    from the selected dental service.
                  </small>

                  {/* NUMBER OF TEETH TREATED */}

                  {selectedService && isPerTooth && (
                    <>
                      <label htmlFor="clinical-quantity">
                        Number of Teeth Treated *
                      </label>

                      <input
                        id="clinical-quantity"
                        type="number"
                        name="quantity"
                        min="1"
                        max="32"
                        step="1"
                        value={form.quantity}
                        onChange={change}
                        placeholder="Enter number of teeth"
                        required
                      />

                      <small style={helperStyle}>
                        Enter the number of teeth
                        treated under this service.
                      </small>
                    </>
                  )}

                  {/* FIXED PRICE INFORMATION */}

                  {selectedService &&
                    !isPerTooth &&
                    validPricingType && (
                      <small style={helperStyle}>
                        This service uses fixed pricing.
                        The quantity is automatically
                        set to one.
                      </small>
                    )}

                  {selectedService &&
                    !validPricingType && (
                      <p className="dc-error">
                        Unsupported service pricing type.
                        Please contact the administrator.
                      </p>
                    )}

                  {/* AUTOMATIC TOTAL FEE */}

                  <label htmlFor="clinical-total">
                    Total Treatment Fee (₱)
                  </label>

                  <input
                    id="clinical-total"
                    type="text"
                    value={
                      selectedService && validPricingType
                        ? formatMoney(totalFee)
                        : ""
                    }
                    placeholder="Automatically calculated"
                    readOnly
                    style={{
                      ...readonlyStyle,
                      fontSize: "20px",
                      fontWeight: "700",
                    }}
                  />

                  <small style={helperStyle}>
                    {selectedService &&
                    validPricingType &&
                    totalFee !== null
                      ? `${quantity} × ₱${formatMoney(
                          unitPrice
                        )} = ₱${formatMoney(totalFee)}`
                      : "Total fee is calculated automatically."}
                  </small>

                  {/* OPTIONAL APPOINTMENT */}

                  <label htmlFor="clinical-appointment">
                    Linked Appointment (Optional)
                  </label>

                  <select
                    id="clinical-appointment"
                    name="appointment_id"
                    value={form.appointment_id}
                    onChange={change}
                    disabled={loading}
                  >
                    <option value="">
                      No linked appointment
                    </option>

                    {appointments.map((appointment) => (
                      <option
                        key={appointment.appointment_id}
                        value={appointment.appointment_id}
                      >
                        {appointment.appointment_date}
                        {" — "}
                        {appointment.start_time?.slice(
                          0,
                          5
                        )}
                      </option>
                    ))}
                  </select>

                  {/* TREATMENT DATE */}

                  <label htmlFor="clinical-date">
                    Treatment Date *
                  </label>

                  <input
                    id="clinical-date"
                    type="date"
                    name="treatment_date"
                    value={form.treatment_date}
                    onChange={change}
                    required
                  />

                  {/* DIAGNOSIS */}

                  <label htmlFor="clinical-diagnosis">
                    Diagnosis *
                  </label>

                  <textarea
                    id="clinical-diagnosis"
                    name="diagnosis"
                    rows={3}
                    value={form.diagnosis}
                    onChange={change}
                    placeholder="Enter the patient's diagnosis"
                    required
                  />

                  {/* PROCEDURE */}

                  <label htmlFor="clinical-procedure">
                    Procedure / Treatment *
                  </label>

                  <textarea
                    id="clinical-procedure"
                    name="procedure_done"
                    rows={3}
                    value={form.procedure_done}
                    onChange={change}
                    placeholder="Describe the treatment performed"
                    required
                  />

                  {/* REMARKS */}

                  <label htmlFor="clinical-notes">
                    Remarks
                  </label>

                  <textarea
                    id="clinical-notes"
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={change}
                    placeholder="Additional notes, recommendations, or follow-up instructions"
                  />
                </>
              )}

              {/* ==============================
                  MEDICAL HISTORY FORM
              ============================== */}

              {type === "medical" && (
                <>
                  <label htmlFor="clinical-allergies">
                    Allergies
                  </label>

                  <textarea
                    id="clinical-allergies"
                    name="allergies"
                    rows={3}
                    value={form.allergies}
                    onChange={change}
                    placeholder="Enter known allergies"
                  />

                  <label htmlFor="clinical-medications">
                    Current Medications
                  </label>

                  <textarea
                    id="clinical-medications"
                    name="current_medications"
                    rows={3}
                    value={form.current_medications}
                    onChange={change}
                    placeholder="Enter current medications"
                  />

                  <label htmlFor="clinical-bp">
                    Blood Pressure
                  </label>

                  <input
                    id="clinical-bp"
                    type="text"
                    name="blood_pressure"
                    value={form.blood_pressure}
                    onChange={change}
                    placeholder="Enter blood pressure"
                  />

                  <label htmlFor="clinical-medical-notes">
                    Additional Medical Notes
                  </label>

                  <textarea
                    id="clinical-medical-notes"
                    name="additional_notes"
                    rows={5}
                    value={form.additional_notes}
                    onChange={change}
                    placeholder="Enter existing conditions, medical history, and other relevant information"
                  />
                </>
              )}

              {/* ==============================
                  X-RAY UPLOAD FORM
              ============================== */}

              {type === "xray" && (
                <>
                  <label htmlFor="clinical-study-type">
                    X-Ray Study Type *
                  </label>

                  <input
                    id="clinical-study-type"
                    type="text"
                    name="study_type"
                    value={form.study_type}
                    onChange={change}
                    placeholder="Enter X-ray study type"
                    required
                  />

                  <label htmlFor="clinical-xray-file">
                    X-Ray Image *
                  </label>

                  <input
                    id="clinical-xray-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      setFile(
                        e.target.files?.[0] || null
                      )
                    }
                    required
                  />

                  <small style={helperStyle}>
                    Accepted formats: JPG, PNG, WEBP.
                    Maximum file size: 10 MB.
                  </small>

                  {file && (
                    <p className="dc-muted">
                      Selected file: {file.name}
                    </p>
                  )}

                  <label htmlFor="clinical-findings">
                    Findings / Dentist Assessment
                  </label>

                  <textarea
                    id="clinical-findings"
                    name="findings"
                    rows={5}
                    value={form.findings}
                    onChange={change}
                    placeholder="Enter X-ray findings and clinical assessment"
                  />
                </>
              )}

            </div>

            {/* MODAL FOOTER */}

            <div className="dc-modal-footer">
              {error && (
                <p
                  role="alert"
                  style={{
                    color: "#b42318",
                    fontSize: "13px",
                    flexBasis: "100%",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                className="dc-secondary-btn"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="dc-primary-btn"
                disabled={
                  saving ||
                  loading ||
                  (type === "treatment" &&
                    (
                      !selectedService ||
                      !validPricingType ||
                      !validPrice ||
                      !validQuantity
                    ))
                }
              >
                {saving ? "Saving..." : "Save Record"}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}