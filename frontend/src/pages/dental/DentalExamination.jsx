
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getCurrentStaff } from "../../services/patientsApi";
import "./DentalRecords.css";

const upperTeeth = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
];

const lowerTeeth = [
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

const conditions = [
  { value: "healthy", label: "Healthy", color: "#bce8b8" },
  { value: "decayed", label: "Decayed", color: "#efb3b3" },
  { value: "filled", label: "Filled", color: "#b8d9f4" },
  { value: "missing", label: "Missing", color: "#c9cdd0" },
  { value: "treated", label: "Treated", color: "#9dd9ce" },
];

const surfaces = [
  { value: "whole", label: "Whole Tooth" },
  { value: "mesial", label: "Mesial" },
  { value: "distal", label: "Distal" },
  { value: "buccal", label: "Buccal" },
  { value: "lingual", label: "Lingual" },
  { value: "occlusal", label: "Occlusal" },
  { value: "incisal", label: "Incisal" },
];

function getColor(status) {
  return (
    conditions.find((item) => item.value === status)
      ?.color || "#ffffff"
  );
}

export default function DentalExamination({ patientId }) {
  const [staff, setStaff] = useState(null);
  const [chart, setChart] = useState(null);
  const [records, setRecords] = useState([]);

  const [selectedTooth, setSelectedTooth] = useState(null);
  const [surface, setSurface] = useState("whole");
  const [condition, setCondition] = useState("");
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canEdit =
    staff?.role === "dentist" &&
    staff?.active === true;

  const canView =
    staff?.active === true &&
    ["admin", "dentist"].includes(staff?.role);

  // ==========================================
  // LOAD STAFF ACCOUNT AND DENTAL CHART
  // ==========================================

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setSuccess("");
    setChart(null);
    setRecords([]);
    setSelectedTooth(null);
    setCondition("");
    setRemarks("");
    setSurface("whole");

    async function loadRecords() {
      try {
        const currentStaff = await getCurrentStaff();

        if (!active) return;

        setStaff(currentStaff);

        if (
          !patientId ||
          !currentStaff?.active ||
          !["admin", "dentist"].includes(currentStaff.role)
        ) {
          return;
        }

        const { data: chartData, error: chartError } =
          await supabase
            .from("dental_chart")
            .select("*")
            .eq("patient_id", patientId)
            .order("chart_date", { ascending: false })
            .order("created_at", { ascending: false })
            .order("chart_id", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (chartError) throw chartError;

        if (!active) return;

        setChart(chartData);

        if (!chartData) return;

        const { data, error: examError } =
          await supabase
            .from("tooth_examination")
            .select("*")
            .eq("chart_id", chartData.chart_id);

        if (examError) throw examError;

        if (active) {
          setRecords(data || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      active = false;
    };
  }, [patientId]);

  // ==========================================
  // SELECT TOOTH AND SURFACE
  // ==========================================

  function loadFinding(number, selectedSurface) {
    const existing = records.find(
      (record) =>
        Number(record.tooth_number) === number &&
        (record.surface || "whole") === selectedSurface
    );

    setCondition(existing?.condition_status || "");
    setRemarks(existing?.remarks || "");
  }

  function selectTooth(number) {
    if (saving || loading || !patientId || !canView) {
      return;
    }

    setSelectedTooth(number);
    setSurface("whole");
    setSuccess("");
    setError("");

    loadFinding(number, "whole");
  }

  function changeSurface(value) {
    setSurface(value);
    setSuccess("");

    loadFinding(selectedTooth, value);
  }

  // ==========================================
  // SAVE EXAMINATION TO SUPABASE
  // ==========================================

  async function saveExamination() {
    if (
      !canEdit ||
      !patientId ||
      !selectedTooth ||
      saving ||
      loading
    ) {
      return;
    }

    if (!conditions.some((item) => item.value === condition)) {
      setError("Please select a tooth condition.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let chartId = chart?.chart_id;

      // Create a chart only when the dentist
      // saves an actual examination.

      if (!chartId) {
        const { data, error: chartError } =
          await supabase
            .from("dental_chart")
            .insert({
              patient_id: patientId,
              examined_by: staff.id,
            })
            .select("*")
            .single();

        if (chartError) throw chartError;

        chartId = data.chart_id;
        setChart(data);
      }

      const existing = records.find(
        (record) =>
          Number(record.tooth_number) === selectedTooth &&
          (record.surface || "whole") === surface
      );

      const payload = {
        chart_id: chartId,
        tooth_number: selectedTooth,
        surface: surface,
        condition_status: condition,
        remarks: remarks.trim() || null,
      };

      let result;

      if (existing) {
        result = await supabase
          .from("tooth_examination")
          .update({
            condition_status: condition,
            remarks: remarks.trim() || null,
          })
          .eq("tooth_exam_id", existing.tooth_exam_id)
          .select("*")
          .single();
      } else {
        result = await supabase
          .from("tooth_examination")
          .upsert(payload, {
            onConflict: "chart_id,tooth_number,surface",
          })
          .select("*")
          .single();
      }

      if (result.error) throw result.error;

      const saved = result.data;

      setRecords((current) => [
        ...current.filter(
          (record) =>
            record.tooth_exam_id !== saved.tooth_exam_id
        ),
        saved,
      ]);

      setSuccess(
        `Tooth ${selectedTooth} examination saved successfully.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // DETERMINE SAVED TOOTH COLOR
  // ==========================================

  function getToothStatus(number) {
    const findings = records.filter(
      (record) => Number(record.tooth_number) === number
    );

    if (!findings.length) return "";

    const priority = [
      "missing",
      "decayed",
      "filled",
      "treated",
      "healthy",
    ];

    return (
      priority.find((status) =>
        findings.some(
          (record) => record.condition_status === status
        )
      ) || findings[0].condition_status
    );
  }

  function renderTooth(number, lower = false) {
    const status = getToothStatus(number);

    const color =
      canEdit &&
      selectedTooth === number &&
      condition
        ? getColor(condition)
        : getColor(status);

    return (
      <button
        type="button"
        key={number}
        className={`dc-tooth ${
          selectedTooth === number
            ? "dc-tooth-selected"
            : ""
        }`}
        disabled={
          loading || saving || !patientId || !canView
        }
        onClick={() => selectTooth(number)}
        aria-label={`Tooth ${number}: ${status || "Unrecorded"}`}
        aria-pressed={selectedTooth === number}
        title={`Tooth ${number}: ${status || "Unrecorded"}`}
      >
        {!lower && <span>{number}</span>}

        <svg
          viewBox="0 0 42 58"
          className={lower ? "dc-lower-tooth" : ""}
        >
          <path
            d="
              M 9 6
              C 14 1, 18 5, 21 6
              C 25 4, 31 1, 35 7
              C 41 16, 33 27, 31 35
              C 29 44, 28 54, 24 54
              C 20 54, 22 36, 19 36
              C 16 36, 17 54, 13 53
              C 8 51, 10 38, 6 27
              C 1 17, 3 10, 9 6 Z
            "
            fill={color}
            stroke="#839ca3"
            strokeWidth="1.6"
          />
        </svg>

        {lower && <span>{number}</span>}
      </button>
    );
  }

  // ==========================================
  // MAIN DENTAL EXAMINATION INTERFACE
  // ==========================================

  return (
    <div className="dc-examination">
      <div className="dc-chart-description">
        <div>
          <strong>Permanent Dentition</strong>
          <p>FDI tooth numbering system</p>

          {chart && (
            <p>Chart date: {chart.chart_date}</p>
          )}
        </div>

        <span className="dc-view-label">
          {loading
            ? "Loading..."
            : canEdit
            ? "Editing Enabled"
            : canView
            ? "View Only"
            : "Restricted Access"}
        </span>
      </div>

      {error && (
        <div className="dc-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="dc-exam-success" role="status">
          {success}
        </div>
      )}

      {!patientId && (
        <p className="dc-muted">
          Select a patient to view the dental chart.
        </p>
      )}

      {!loading && !canView && (
        <p className="dc-muted">
          Your account does not have clinical access.
        </p>
      )}

      <div className="dc-odontogram-scroll">
        <div className="dc-odontogram">
          <div className="dc-quadrant-labels">
            <span>Upper Right</span>
            <span>Upper Left</span>
          </div>

          <div className="dc-teeth-row">
            {upperTeeth.map((number) =>
              renderTooth(number)
            )}
          </div>

          <div className="dc-mouth-divider">
            <span>Upper Arch</span>
            <span>Lower Arch</span>
          </div>

          <div className="dc-teeth-row">
            {lowerTeeth.map((number) =>
              renderTooth(number, true)
            )}
          </div>

          <div className="dc-quadrant-labels">
            <span>Lower Right</span>
            <span>Lower Left</span>
          </div>
        </div>
      </div>

      {/* CONDITION LEGEND */}

      <div className="dc-legend">
        <span>
          <i style={{ background: "#ffffff" }} />
          Unrecorded
        </span>

        {conditions.map((item) => (
          <span key={item.value}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      {/* EXAMINATION EDITOR */}

      {selectedTooth && canView ? (
        <div className="dc-exam-editor">
          <div className="dc-exam-editor-header">
            <h3>Tooth {selectedTooth}</h3>

            <span
              className="dc-condition-preview"
              style={{
                background: getColor(condition),
              }}
            >
              {condition || "Unrecorded"}
            </span>
          </div>

          <div className="dc-exam-form">
            <div className="dc-exam-field">
              <label>Tooth Surface</label>

              <select
                value={surface}
                disabled={saving}
                onChange={(e) =>
                  changeSurface(e.target.value)
                }
              >
                {surfaces.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="dc-exam-field">
              <label>Tooth Condition</label>

              <select
                value={condition}
                disabled={!canEdit || saving}
                onChange={(e) => {
                  setCondition(e.target.value);
                  setSuccess("");
                }}
              >
                <option value="">
                  Select condition
                </option>

                {condition &&
                  !conditions.some(
                    (item) => item.value === condition
                  ) && (
                    <option value={condition}>
                      {condition}
                    </option>
                  )}

                {conditions.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CLICKABLE CONDITION COLORS */}

            <div className="dc-exam-field dc-exam-full">
              <label>Condition Colors</label>

              <div className="dc-condition-options">
                {conditions.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    disabled={!canEdit || saving}
                    className={`dc-condition-option ${
                      condition === item.value
                        ? "dc-condition-active"
                        : ""
                    }`}
                    onClick={() => {
                      setCondition(item.value);
                      setSuccess("");
                    }}
                  >
                    <span
                      className="dc-condition-swatch"
                      style={{
                        background: item.color,
                      }}
                    />

                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dc-exam-field dc-exam-full">
              <label>Examination Remarks</label>

              <textarea
                rows={4}
                value={remarks}
                disabled={!canEdit || saving}
                placeholder="Enter examination findings..."
                onChange={(e) =>
                  setRemarks(e.target.value)
                }
              />
            </div>
          </div>

          {canEdit && (
            <div className="dc-exam-actions">
              <button
                type="button"
                className="dc-secondary-btn"
                disabled={saving}
                onClick={() => {
                  loadFinding(selectedTooth, surface);
                  setSuccess("");
                  setError("");
                }}
              >
                Cancel Changes
              </button>

              <button
                type="button"
                className="dc-primary-btn"
                disabled={saving || !condition}
                onClick={saveExamination}
              >
                {saving
                  ? "Saving..."
                  : "Save Examination"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="dc-tooth-details">
          <strong>Tooth Examination Details</strong>

          <p>
            Select a patient and click a tooth to
            view its examination findings.
          </p>
        </div>
      )}

      {/* SAVED EXAMINATION FINDINGS */}

      {records.length > 0 && canView && (
        <div className="dc-saved-findings">
          <h3>Saved Examination Findings</h3>

          <div className="dc-table-scroll">
            <table className="dc-table">
              <thead>
                <tr>
                  <th>Tooth</th>
                  <th>Surface</th>
                  <th>Condition</th>
                  <th>Remarks</th>
                </tr>
              </thead>

              <tbody>
                {[...records]
                  .sort(
                    (a, b) =>
                      a.tooth_number - b.tooth_number
                  )
                  .map((record) => (
                    <tr key={record.tooth_exam_id}>
                      <td>{record.tooth_number}</td>

                      <td>
                        {record.surface || "Whole Tooth"}
                      </td>

                      <td>
                        <span
                          className="dc-condition-preview"
                          style={{
                            background: getColor(
                              record.condition_status
                            ),
                          }}
                        >
                          {record.condition_status}
                        </span>
                      </td>

                      <td>{record.remarks || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
