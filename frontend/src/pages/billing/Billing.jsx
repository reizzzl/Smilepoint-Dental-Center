import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import {
  Wallet,
  Receipt,
  CreditCard,
  RefreshCw,
  Search,
  UserRound,
  X,
  Plus,
  Save,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "../shared.css";
import "./Billing.css";

const paymentMethods = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank Transfer",
  card: "Credit / Debit Card",
  hmo: "HMO",
};

const currency = (amount) =>
  amount == null
    ? "—"
    : Number(amount).toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
      });

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
      })
    : "—";

const patientName = (patient) =>
  [
    patient?.first_name,
    patient?.middle_name,
    patient?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

const cents = (value) =>
  Math.round(Number(value) * 100);

const validFee = (value) =>
  value != null &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0 &&
  Math.abs(Number(value) * 100 - cents(value)) < 0.00001;

const emptyBillingForm = {
  treatment_id: "",
  notes: "",
};

const emptyPaymentForm = {
  billing_id: "",
  amount: "",
  payment_method: "cash",
  reference_no: "",
  notes: "",
};

// ==========================================
// DATABASE PAGINATION
// ==========================================

async function readAll(table, columns, order, patientId) {
  const records = [];
  const pageSize = 500;

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from(table)
      .select(columns)
      .order(order)
      .range(offset, offset + pageSize - 1);

    if (patientId) {
      query = query.eq("patient_id", patientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    records.push(...(data || []));

    if (!data || data.length < pageSize) {
      return records;
    }
  }
}

export default function Billing() {
  const { staff } = useOutletContext();

  const canManage =
    staff?.active === true &&
    staff?.role === "receptionist";

  const canView =
    staff?.active === true &&
    ["admin", "receptionist"].includes(staff?.role);

  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);

  const [selectedPatient, setSelectedPatient] =
    useState("");

  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  const [loadingPatients, setLoadingPatients] =
    useState(true);

  const [loadingRecords, setLoadingRecords] =
    useState(false);

  const [loadedPatient, setLoadedPatient] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [patientError, setPatientError] = useState("");
  const [recordError, setRecordError] = useState("");
  const [success, setSuccess] = useState("");

  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  const [billingForm, setBillingForm] =
    useState({ ...emptyBillingForm });

  const [paymentForm, setPaymentForm] =
    useState({ ...emptyPaymentForm });

  // ==========================================
  // LOAD PATIENTS
  // ==========================================

  useEffect(() => {
    if (!canView) return;

    let active = true;

    async function loadPatients() {
      setLoadingPatients(true);
      setPatientError("");

      try {
        const data = await readAll(
          "patient",
          "patient_id,first_name,middle_name,last_name,phone_number",
          "patient_id"
        );

        if (!active) return;

        setPatients(
          data.sort((a, b) =>
            patientName(a).localeCompare(patientName(b))
          )
        );
      } catch (error) {
        if (active) {
          setPatients([]);
          setPatientError(error.message);
        }
      } finally {
        if (active) setLoadingPatients(false);
      }
    }

    loadPatients();

    return () => {
      active = false;
    };
  }, [canView, refresh]);

  // ==========================================
  // LOAD TREATMENTS, BILLING AND PAYMENTS
  // ==========================================

  useEffect(() => {
    if (!canView || !selectedPatient) {
      setTreatments([]);
      setBills([]);
      setPayments([]);
      setLoadedPatient("");
      setLoadingRecords(false);
      return;
    }

    let active = true;

    async function loadRecords() {
      setLoadingRecords(true);
      setRecordError("");
      setLoadedPatient("");

      setTreatments([]);
      setBills([]);
      setPayments([]);

      try {
        const [treatmentData, billingData, paymentData] =
          await Promise.all([
            readAll(
              "treatment_record",
              `
                treatment_id,
                patient_id,
                appointment_id,
                service_id,
                procedure_done,
                treatment_date,
                quantity,
                unit_price,
                total_fee,
                dental_service(name)
              `,
              "treatment_id",
              selectedPatient
            ),

            readAll(
              "billing",
              "*",
              "billing_id",
              selectedPatient
            ),

            readAll(
              "payment",
              "*",
              "payment_id",
              selectedPatient
            ),
          ]);

        if (!active) return;

        setTreatments(
          treatmentData.sort(
            (a, b) =>
              new Date(b.treatment_date) -
              new Date(a.treatment_date)
          )
        );

        setBills(
          billingData.sort(
            (a, b) =>
              new Date(b.billing_date) -
              new Date(a.billing_date)
          )
        );

        setPayments(
          paymentData.sort(
            (a, b) =>
              new Date(b.paid_at) -
              new Date(a.paid_at)
          )
        );

        setLoadedPatient(selectedPatient);
      } catch (error) {
        if (active) {
          setRecordError(error.message);
        }
      } finally {
        if (active) setLoadingRecords(false);
      }
    }

    loadRecords();

    return () => {
      active = false;
    };
  }, [selectedPatient, refresh, canView]);

  // ==========================================
  // PATIENT SEARCH
  // ==========================================

  const currentPatient = patients.find(
    (patient) => patient.patient_id === selectedPatient
  );

  const filteredPatients = patients.filter((patient) =>
    `${patientName(patient)} ${patient.phone_number || ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  function selectPatient(patient) {
    setLoadedPatient("");
    setSelectedPatient(patient.patient_id);
    setSearch(patientName(patient));
    setShowResults(false);
    setRecordError("");
    setSuccess("");
  }

  function clearPatient() {
    setSelectedPatient("");
    setLoadedPatient("");
    setSearch("");
    setShowResults(false);
    setRecordError("");
    setSuccess("");
    setTreatments([]);
    setBills([]);
    setPayments([]);
  }

  function reload() {
    setLoadedPatient("");
    setRefresh((previous) => previous + 1);
  }

  const ready =
    Boolean(selectedPatient) &&
    loadedPatient === selectedPatient &&
    !loadingRecords &&
    !recordError;

  // ==========================================
  // BILLING CALCULATIONS
  // ==========================================

  const paidPayments = payments.filter(
    (payment) =>
      String(payment.payment_status).toLowerCase() === "paid"
  );

  function treatmentLabel(id) {
    const treatment = treatments.find(
      (item) => item.treatment_id === id
    );

    return (
      treatment?.dental_service?.name ||
      treatment?.procedure_done ||
      "Treatment record"
    );
  }

  function paidAmount(treatmentId) {
    return paidPayments
      .filter(
        (payment) => payment.treatment_id === treatmentId
      )
      .reduce(
        (sum, payment) => sum + cents(payment.amount),
        0
      ) / 100;
  }

  function billBalance(bill) {
    return Math.max(
      0,
      cents(bill.amount_due) -
        cents(paidAmount(bill.treatment_id))
    ) / 100;
  }

  const totalBilling =
    bills.reduce(
      (sum, bill) => sum + cents(bill.amount_due),
      0
    ) / 100;

  const totalPayments =
    paidPayments.reduce(
      (sum, payment) => sum + cents(payment.amount),
      0
    ) / 100;

  const outstandingBalance =
    bills.reduce(
      (sum, bill) => sum + cents(billBalance(bill)),
      0
    ) / 100;

  const invalidFinancialRecords =
    bills.some((bill) => !validFee(bill.amount_due)) ||
    paidPayments.some(
      (payment) => !validFee(payment.amount)
    );

  const billedTreatmentIds = new Set(
    bills.map((bill) => bill.treatment_id)
  );

  const unbilledTreatments = treatments.filter(
    (treatment) =>
      !billedTreatmentIds.has(treatment.treatment_id)
  );

  const billableTreatments = unbilledTreatments.filter(
    (treatment) =>
      validFee(treatment.total_fee) &&
      Number(treatment.total_fee) >=
        paidAmount(treatment.treatment_id)
  );

  const invalidTreatments = unbilledTreatments.filter(
    (treatment) =>
      !validFee(treatment.total_fee) ||
      Number(treatment.total_fee) <
        paidAmount(treatment.treatment_id)
  );

  const selectedTreatment = billableTreatments.find(
    (treatment) =>
      treatment.treatment_id === billingForm.treatment_id
  );

  const selectedBill = bills.find(
    (bill) => bill.billing_id === paymentForm.billing_id
  );

  const canTransact =
    canManage && ready && !invalidFinancialRecords;

  // ==========================================
  // CREATE BILLING
  // ==========================================

  function openBilling() {
    if (!canTransact) return;

    setBillingForm({ ...emptyBillingForm });
    setModalError("");
    setSuccess("");
    setModal("billing");
  }

  async function createBilling(event) {
    event.preventDefault();

    if (!canTransact || saving) return;

    setModalError("");

    if (!selectedTreatment) {
      setModalError("Please select a dental treatment.");
      return;
    }

    setSaving(true);

    try {
      const { data: treatment, error: treatmentError } =
        await supabase
          .from("treatment_record")
          .select("treatment_id,patient_id,total_fee")
          .eq("treatment_id", billingForm.treatment_id)
          .eq("patient_id", selectedPatient)
          .single();

      if (treatmentError) throw treatmentError;

      if (!validFee(treatment.total_fee)) {
        throw new Error(
          "This treatment does not have a valid saved total fee."
        );
      }

      const amount = Number(treatment.total_fee);

      if (cents(amount) !== cents(selectedTreatment.total_fee)) {
        reload();
        setModal(null);

        throw new Error(
          "The treatment fee has changed. Reopen the billing form."
        );
      }

      if (amount < paidAmount(treatment.treatment_id)) {
        throw new Error(
          "The billing total cannot be lower than existing payments."
        );
      }

      const { data: existingBill, error: existingError } =
        await supabase
          .from("billing")
          .select("billing_id")
          .eq("treatment_id", treatment.treatment_id)
          .maybeSingle();

      if (existingError) throw existingError;

      if (existingBill) {
        throw new Error(
          "Billing already exists for this treatment."
        );
      }

      const { error } = await supabase
        .from("billing")
        .insert({
          treatment_id: treatment.treatment_id,
          patient_id: selectedPatient,
          amount_due: amount,
          created_by: staff.id,
          notes: billingForm.notes.trim() || null,
        })
        .select("billing_id")
        .single();

      if (error) throw error;

      setSuccess("Billing created successfully.");
      setModal(null);
      setBillingForm({ ...emptyBillingForm });
      reload();
    } catch (error) {
      setModalError(error.message);
      setRecordError(
        error.message.includes("fee has changed")
          ? error.message
          : ""
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // RECORD PAYMENT
  // ==========================================

  function openPayment(bill) {
    if (!canTransact || billBalance(bill) <= 0) return;

    setPaymentForm({
      ...emptyPaymentForm,
      billing_id: bill.billing_id,
      amount: billBalance(bill).toFixed(2),
    });

    setModalError("");
    setSuccess("");
    setModal("payment");
  }

  async function recordPayment(event) {
    event.preventDefault();

    if (!canTransact || saving || !selectedBill) return;

    setModalError("");

    const amount = Number(paymentForm.amount);

    if (
      !validFee(amount) ||
      amount <= 0 ||
      cents(amount) > cents(billBalance(selectedBill))
    ) {
      setModalError(
        "Enter a valid payment amount within the outstanding balance."
      );
      return;
    }

    if (!Object.hasOwn(paymentMethods, paymentForm.payment_method)) {
      setModalError("Please select a valid payment method.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc(
        "record_billing_payment",
        {
          p_billing_id: paymentForm.billing_id,
          p_amount: amount,
          p_method: paymentForm.payment_method,
          p_reference:
            paymentForm.reference_no.trim() || null,
          p_notes: paymentForm.notes.trim() || null,
        }
      );

      if (error) throw error;

      setSuccess("Payment recorded successfully.");
      setModal(null);
      setPaymentForm({ ...emptyPaymentForm });
      reload();
    } catch (error) {
      setModalError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    if (saving) return;

    setModal(null);
    setModalError("");
  }

  const stats = [
    {
      title: "Total Billing",
      value: totalBilling,
      Icon: Receipt,
    },
    {
      title: "Total Payments",
      value: totalPayments,
      Icon: Wallet,
    },
    {
      title: "Outstanding Balance",
      value: outstandingBalance,
      Icon: CreditCard,
    },
  ];

  if (!canView) {
    return (
      <div className="sp-page">
        <div className="sp-error">
          You do not have permission to access billing.
        </div>
      </div>
    );
  }

  return (
    <div className="sp-page billing-page">

      {/* PAGE HEADER */}

      <div className="sp-page-header">
        <div>
          <h1>Billing and Payments</h1>

          <p>
            {canManage
              ? "Manage patient billing and record payments."
              : "View patient billing and payment transactions."}
          </p>
        </div>

        <div className="billing-actions">
          <button
            className="sp-secondary-btn"
            onClick={reload}
            disabled={loadingPatients || loadingRecords || saving}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          {canManage && (
            <button
              className="sp-primary-btn"
              onClick={openBilling}
              disabled={
                !canTransact ||
                billableTreatments.length === 0
              }
            >
              <Plus size={18} />
              Create Billing
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <div className="billing-access">
          Administrator — View Only
        </div>
      )}

      {patientError && (
        <div className="sp-error">{patientError}</div>
      )}

      {recordError && (
        <div className="sp-error">{recordError}</div>
      )}

      {success && (
        <div className="billing-success">{success}</div>
      )}

      {ready && invalidFinancialRecords && (
        <div className="sp-error">
          Some financial records contain invalid amounts.
          Transactions are disabled until these records are verified.
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div className="sp-stats-grid">
        {stats.map(({ title, value, Icon }) => (
          <div className="sp-stat-card" key={title}>
            <Icon size={26} />

            <div>
              <span>{title}</span>

              <h2>
                {loadingRecords
                  ? "..."
                  : !ready || invalidFinancialRecords
                  ? "—"
                  : currency(value)}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* PATIENT SEARCH */}

      <section
        className="sp-panel"
        style={{ overflow: "visible" }}
      >
        <div className="sp-panel-top">
          <div>
            <h2>Select Patient</h2>

            <p className="billing-panel-description">
              Search for a patient to view billing and payment records.
            </p>
          </div>
        </div>

        <div
          className="billing-patient-search"
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minWidth: 0,
          }}
        >
          <div className="sp-search">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search patient name or phone number..."
              value={search}
              disabled={saving}
              onFocus={() => {
                if (!selectedPatient) {
                  setShowResults(true);
                }
              }}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedPatient("");
                setLoadedPatient("");
                setShowResults(true);
                setSuccess("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setShowResults(false);
                }
              }}
            />

            {search && (
              <button
                type="button"
                className="sp-icon-btn"
                onClick={clearPatient}
                aria-label="Clear search"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {/* FIXED PATIENT SEARCH RESULTS */}

          {showResults &&
            !selectedPatient &&
            search.trim() && (
              <div
                className="billing-search-results"
                style={{
                  position: "static",
                  inset: "auto",
                  transform: "none",
                  width: "100%",
                  maxWidth: "100%",
                  maxHeight: "260px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  marginTop: "10px",
                  padding: "6px",
                  background: "#ffffff",
                  border: "1px solid #dce7eb",
                  borderRadius: "10px",
                  boxSizing: "border-box",
                }}
              >
                {loadingPatients ? (
                  <div className="billing-no-results">
                    Loading patients...
                  </div>
                ) : patientError ? (
                  <div className="billing-no-results">
                    Unable to load patients.
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="billing-no-results">
                    No matching patients found.
                  </div>
                ) : (
                  filteredPatients.map((patient) => (
                    <button
                      type="button"
                      key={patient.patient_id}
                      className="billing-patient-result"
                      onClick={() => selectPatient(patient)}
                      style={{
                        position: "static",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        width: "100%",
                        minWidth: 0,
                        gap: "14px",
                        padding: "12px",
                        textAlign: "left",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        className="billing-patient-avatar"
                        style={{ flexShrink: 0 }}
                      >
                        <UserRound size={22} />
                      </div>

                      <div
                        className="billing-patient-info"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: "left",
                        }}
                      >
                        <strong>{patientName(patient)}</strong>

                        <small>
                          {patient.phone_number || "No phone number"}
                        </small>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
        </div>

        {/* SELECTED PATIENT */}

        {currentPatient && (
          <div className="billing-selected-patient">
            <div className="billing-patient-avatar">
              <UserRound size={24} />
            </div>

            <div className="billing-patient-info">
              <strong>{patientName(currentPatient)}</strong>

              <small>
                {currentPatient.phone_number || "No phone number"}
              </small>
            </div>

            <button
              type="button"
              className="sp-secondary-btn billing-clear-btn"
              onClick={clearPatient}
              disabled={saving}
            >
              Clear
            </button>
          </div>
        )}

        {selectedPatient && (
          <p className="billing-search-hint">
            {loadingRecords
              ? "Loading treatment records..."
              : ready
              ? `${billableTreatments.length} treatment(s) available for billing.`
              : "Treatment records unavailable."}
          </p>
        )}

        {ready && invalidTreatments.length > 0 && (
          <div className="billing-warning">
            Some treatments do not have a valid saved total fee.
            Ask the dentist to verify these records before billing.
          </div>
        )}
      </section>

      {/* BILLING RECORDS */}

      <section className="sp-panel">
        <div className="sp-panel-top">
          <div>
            <h2>Billing Records</h2>

            <p className="billing-panel-description">
              Patient charges and outstanding balances.
            </p>
          </div>
        </div>

        <div className="sp-table-scroll">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Treatment</th>
                <th>Amount Due</th>
                <th>Amount Paid</th>
                <th>Balance</th>
                <th>Status</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {!ready || bills.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="sp-empty"
                  >
                    {!selectedPatient
                      ? "Select a patient to view billing records."
                      : loadingRecords
                      ? "Loading billing records..."
                      : recordError
                      ? "Unable to load billing records."
                      : "No billing records found."}
                  </td>
                </tr>
              ) : (
                bills.map((bill) => {
                  const paid = paidAmount(bill.treatment_id);
                  const balance = billBalance(bill);

                  const status =
                    balance === 0
                      ? "Paid"
                      : paid > 0
                      ? "Partial"
                      : "Unpaid";

                  return (
                    <tr key={bill.billing_id}>
                      <td>{formatDate(bill.billing_date)}</td>

                      <td>
                        {treatmentLabel(bill.treatment_id)}
                      </td>

                      <td>{currency(bill.amount_due)}</td>

                      <td>{currency(paid)}</td>

                      <td>{currency(balance)}</td>

                      <td>
                        <span
                          className={
                            status === "Paid"
                              ? "sp-status-paid"
                              : status === "Partial"
                              ? "sp-status-partial"
                              : "sp-status-unpaid"
                          }
                        >
                          {status}
                        </span>
                      </td>

                      {canManage && (
                        <td>
                          {balance > 0 ? (
                            <button
                              className="sp-action-btn"
                              onClick={() => openPayment(bill)}
                              disabled={!canTransact}
                            >
                              <Wallet size={15} />
                              Record Payment
                            </button>
                          ) : (
                            "Completed"
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PAYMENT HISTORY */}

      <section className="sp-panel">
        <div className="sp-panel-top">
          <div>
            <h2>Payment History</h2>

            <p className="billing-panel-description">
              Recorded patient payment transactions.
            </p>
          </div>
        </div>

        <div className="sp-table-scroll">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Treatment</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Reference No.</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>

            <tbody>
              {!ready || payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="sp-empty">
                    {!selectedPatient
                      ? "Select a patient to view payment history."
                      : loadingRecords
                      ? "Loading payments..."
                      : recordError
                      ? "Unable to load payments."
                      : "No payment records found."}
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.payment_id}>
                    <td>{formatDate(payment.paid_at)}</td>

                    <td>
                      {treatmentLabel(payment.treatment_id)}
                    </td>

                    <td>{currency(payment.amount)}</td>

                    <td>
                      {paymentMethods[payment.payment_method] ||
                        payment.payment_method}
                    </td>

                    <td>{payment.reference_no || "—"}</td>

                    <td>
                      <span
                        className={
                          payment.payment_status === "paid"
                            ? "sp-status-paid"
                            : "sp-status-pending"
                        }
                      >
                        {payment.payment_status}
                      </span>
                    </td>

                    <td>{payment.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE BILLING MODAL */}

      {modal === "billing" && canManage && (
        <div className="sp-overlay">
          <div
            className="sp-modal billing-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Create Billing"
          >
            <div className="sp-modal-header">
              <h2>Create Billing</h2>

              <button
                type="button"
                className="sp-icon-btn"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <form
              className="sp-form billing-form"
              onSubmit={createBilling}
            >
              {modalError && (
                <div className="sp-error">{modalError}</div>
              )}

              <label>Patient</label>

              <div className="billing-readonly">
                {patientName(currentPatient)}
              </div>

              <label htmlFor="billing-treatment">
                Dental Treatment
              </label>

              <select
                id="billing-treatment"
                value={billingForm.treatment_id}
                disabled={saving}
                onChange={(event) =>
                  setBillingForm((previous) => ({
                    ...previous,
                    treatment_id: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select dental treatment</option>

                {billableTreatments.map((treatment) => (
                  <option
                    key={treatment.treatment_id}
                    value={treatment.treatment_id}
                  >
                    {treatmentLabel(treatment.treatment_id)}
                    {" — "}
                    {formatDate(treatment.treatment_date)}
                  </option>
                ))}
              </select>

              {/* AUTOMATIC TOTAL ONLY */}

              <label htmlFor="billing-total">
                Billing Amount (₱)
              </label>

              <input
                id="billing-total"
                type="text"
                value={
                  selectedTreatment
                    ? Number(
                        selectedTreatment.total_fee
                      ).toFixed(2)
                    : ""
                }
                placeholder="Automatically calculated"
                readOnly
                className="billing-readonly-input"
              />

              <small className="billing-form-hint">
                The total is automatically retrieved from the
                dentist's saved treatment record.
              </small>

              <label htmlFor="billing-notes">
                Billing Notes
              </label>

              <textarea
                id="billing-notes"
                rows={4}
                placeholder="Enter billing notes..."
                value={billingForm.notes}
                disabled={saving}
                onChange={(event) =>
                  setBillingForm((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
              />

              <div className="billing-modal-footer">
                <button
                  type="button"
                  className="sp-secondary-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sp-primary-btn"
                  disabled={
                    saving ||
                    !selectedTreatment ||
                    !canTransact
                  }
                >
                  <Save size={17} />

                  {saving ? "Creating..." : "Create Billing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}

      {modal === "payment" && canManage && selectedBill && (
        <div className="sp-overlay">
          <div
            className="sp-modal billing-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Record Payment"
          >
            <div className="sp-modal-header">
              <h2>Record Payment</h2>

              <button
                type="button"
                className="sp-icon-btn"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <form
              className="sp-form billing-form"
              onSubmit={recordPayment}
            >
              {modalError && (
                <div className="sp-error">{modalError}</div>
              )}

              <label>Patient</label>

              <div className="billing-readonly">
                {patientName(currentPatient)}
              </div>

              <label>Dental Treatment</label>

              <div className="billing-readonly">
                {treatmentLabel(selectedBill.treatment_id)}
              </div>

              <div className="billing-payment-summary">
                <div className="billing-summary-row">
                  <span>Total Billing</span>

                  <strong>
                    {currency(selectedBill.amount_due)}
                  </strong>
                </div>

                <div className="billing-summary-row">
                  <span>Amount Paid</span>

                  <strong>
                    {currency(
                      paidAmount(selectedBill.treatment_id)
                    )}
                  </strong>
                </div>

                <div className="billing-summary-row">
                  <span>Outstanding Balance</span>

                  <strong>
                    {currency(billBalance(selectedBill))}
                  </strong>
                </div>
              </div>

              <label htmlFor="payment-amount">
                Payment Amount (₱)
              </label>

              <input
                id="payment-amount"
                type="number"
                min="0.01"
                max={billBalance(selectedBill)}
                step="0.01"
                value={paymentForm.amount}
                disabled={saving}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    amount: event.target.value,
                  }))
                }
                required
              />

              <label htmlFor="payment-method">
                Payment Method
              </label>

              <select
                id="payment-method"
                value={paymentForm.payment_method}
                disabled={saving}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    payment_method: event.target.value,
                  }))
                }
                required
              >
                {Object.entries(paymentMethods).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>

              <label htmlFor="payment-reference">
                Reference Number
              </label>

              <input
                id="payment-reference"
                type="text"
                placeholder="Enter reference number if applicable"
                value={paymentForm.reference_no}
                disabled={saving}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    reference_no: event.target.value,
                  }))
                }
              />

              <label htmlFor="payment-notes">
                Payment Notes
              </label>

              <textarea
                id="payment-notes"
                rows={3}
                placeholder="Enter payment notes..."
                value={paymentForm.notes}
                disabled={saving}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
              />

              <div className="billing-modal-footer">
                <button
                  type="button"
                  className="sp-secondary-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sp-primary-btn"
                  disabled={saving || !canTransact}
                >
                  <Save size={17} />

                  {saving ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}