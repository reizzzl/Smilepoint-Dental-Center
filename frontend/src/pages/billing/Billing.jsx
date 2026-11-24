import { useEffect, useRef, useState } from "react";
import { Receipt, Wallet, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import "../shared.css";

const paymentMethods = {
  cash: "Cash",
  gcash: "GCash",
  bank_transfer: "Bank Transfer",
};
const paymentFields = "payment_id, treatment_id, amount, payment_method, payment_status, paid_at";
const pageSize = 100;
const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const paymentDate = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "Asia/Manila",
});

const toCents = (amount) => Math.round(Number(amount) * 100);
const peso = (cents) => cents === null ? "—" : currency.format(cents / 100);

function billingError(error) {
  const schemaErrors = ["42703", "42P01", "PGRST200", "PGRST204", "PGRST205"];
  if (schemaErrors.includes(error.code)) {
    return "Billing could not find the expected tables or columns in the connected database.";
  }
  if (error.code === "42501") {
    return "Your staff account does not have permission for this billing action.";
  }
  return error.message;
}

async function readPages(query, signal) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query()
      .range(offset, offset + pageSize - 1)
      .abortSignal(signal);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

function loadPatients(signal) {
  return readPages(
    () => supabase.from("patient")
      .select("patient_id, first_name, middle_name, last_name")
      .order("last_name")
      .order("first_name")
      .order("patient_id"),
    signal
  );
}

async function loadLedger(patientId, signal) {
  const [treatments, payments] = await Promise.all([
    readPages(
      () => supabase.from("treatment_record")
        .select("treatment_id, appointment_id, procedure_done, treatment_date, dental_service(base_price)")
        .eq("patient_id", patientId)
        .order("treatment_date", { ascending: false })
        .order("treatment_id"),
      signal
    ),
    readPages(
      () => supabase.from("payment")
        .select(paymentFields)
        .eq("patient_id", patientId)
        .order("paid_at", { ascending: false })
        .order("payment_id"),
      signal
    ),
  ]);

  return { treatments, payments };
}

function summarizeLedger({ treatments, payments }) {
  const paidByTreatment = new Map();

  for (const payment of payments) {
    if (!payment.treatment_id || payment.payment_status !== "paid") continue;
    const amount = toCents(payment.amount);
    const previous = paidByTreatment.get(payment.treatment_id) ?? 0;
    paidByTreatment.set(payment.treatment_id, previous + amount);
  }

  const charges = treatments.map((treatment) => {
    const price = treatment.dental_service?.base_price;
    const fee = price == null ? null : toCents(price);
    const paid = paidByTreatment.get(treatment.treatment_id) ?? 0;
    return { ...treatment, fee, paid, balance: fee === null ? null : fee - paid };
  });

  const hasMissingPrice = charges.some(({ fee }) => fee === null);
  const totalCharges = hasMissingPrice ? null : charges.reduce((sum, item) => sum + item.fee, 0);
  const totalPaid = charges.reduce((sum, item) => sum + item.paid, 0);
  const balance = totalCharges === null ? null : totalCharges - totalPaid;

  return { charges, totalCharges, totalPaid, balance };
}

export default function Billing() {
  const [patients, setPatients] = useState(null);
  const [patientsError, setPatientsError] = useState("");
  const [patientRefresh, setPatientRefresh] = useState(0);
  const [patientId, setPatientId] = useState("");
  const [ledger, setLedger] = useState(null);
  const [ledgerError, setLedgerError] = useState("");
  const [ledgerRefresh, setLedgerRefresh] = useState(0);
  const [treatmentId, setTreatmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPatients() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error("Sign in to access billing.");
        if (controller.signal.aborted) return;

        const rows = await loadPatients(controller.signal);
        if (!controller.signal.aborted) setPatients(rows);
      } catch (error) {
        if (!controller.signal.aborted) setPatientsError(billingError(error));
      }
    }

    fetchPatients();
    return () => controller.abort();
  }, [patientRefresh]);

  useEffect(() => {
    if (!patientId) return;

    const controller = new AbortController();
    loadLedger(patientId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setLedger(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLedgerError(billingError(error));
      });

    return () => controller.abort();
  }, [patientId, ledgerRefresh]);

  const summary = ledger && summarizeLedger(ledger);
  const treatmentNames = new Map(
    ledger?.treatments.map(({ treatment_id, procedure_done }) => [treatment_id, procedure_done])
  );
  const selectedTreatment = summary?.charges.find((item) => item.treatment_id === treatmentId);

  function clearLedger() {
    setLedger(null);
    setLedgerError("");
    setNotice("");
  }

  function selectPatient(event) {
    clearLedger();
    setPatientId(event.target.value);
  }

  function refreshLedger() {
    clearLedger();
    setLedgerRefresh((value) => value + 1);
  }

  function openPayment(treatment) {
    setTreatmentId(treatment.treatment_id);
    setAmount("");
    setMethod("");
    setPaymentError("");
    setNotice("");
    dialog.current.showModal();
  }

  async function recordPayment(event) {
    event.preventDefault();
    if (saving || !selectedTreatment || selectedTreatment.balance === null) return;

    const enteredAmount = amount.trim();
    const cents = toCents(enteredAmount);
    if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(enteredAmount) ||
        !Number.isSafeInteger(cents) || cents < 1) {
      setPaymentError("Enter a positive amount with up to two decimal places.");
      return;
    }
    if (cents > selectedTreatment.balance) {
      setPaymentError("The amount exceeds this treatment's remaining balance.");
      return;
    }
    if (!Object.hasOwn(paymentMethods, method)) {
      setPaymentError("Select a payment method.");
      return;
    }

    setSaving(true);
    setPaymentError("");
    try {
      const { data, error } = await supabase.from("payment")
        .insert({
          patient_id: patientId,
          appointment_id: selectedTreatment.appointment_id,
          treatment_id: selectedTreatment.treatment_id,
          amount: cents / 100,
          payment_method: method,
          payment_status: "paid",
        })
        .select(paymentFields)
        .single();
      if (error) throw error;

      setLedger((current) => ({
        ...current,
        payments: [data, ...current.payments],
      }));
      dialog.current?.close();
      setNotice("Payment recorded.");
    } catch (error) {
      setPaymentError(billingError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <h1>Billing and Payments</h1>
        {patients?.length > 0 && (
          <div className="sp-form">
            <label htmlFor="billing-patient">Patient</label>
            <select id="billing-patient" value={patientId} onChange={selectPatient}>
              <option value="">Select a patient</option>
              {patients.map((patient) => (
                <option key={patient.patient_id} value={patient.patient_id}>
                  {[patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(" ")}
                  {" (" + patient.patient_id.slice(0, 8) + ")"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {patientsError && (
        <div className="sp-panel">
          <p className="sp-error" role="alert">{patientsError}</p>
          <button
            type="button"
            className="sp-action-btn"
            onClick={() => {
              setPatientsError("");
              setPatientRefresh((value) => value + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {!patients && !patientsError && <p role="status">Loading patients…</p>}
      {patients?.length === 0 && <p>No patients are available for billing.</p>}
      {patients?.length > 0 && !patientId && (
        <p>Select a patient to view treatment charges and payment history.</p>
      )}
      {patientId && !ledger && !ledgerError && <p role="status">Loading billing records…</p>}
      {ledgerError && (
        <div className="sp-panel">
          <p className="sp-error" role="alert">{ledgerError}</p>
          <button type="button" className="sp-action-btn" onClick={refreshLedger}>
            Retry
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}

      {summary && (
        <>
          <div className="sp-stats-grid" aria-label="Selected patient's totals">
            {[
              { title: "Total Charges", value: summary.totalCharges, Icon: Receipt },
              { title: "Payments Applied", value: summary.totalPaid, Icon: Wallet },
              { title: "Remaining Balance", value: summary.balance, Icon: Wallet },
            ].map(({ title, value, Icon }) => (
              <div key={title} className="sp-stat-card">
                <Icon size={26} aria-hidden="true" />
                <div>
                  <span>{title}</span>
                  <h2>{peso(value)}</h2>
                </div>
              </div>
            ))}
          </div>

          <section className="sp-panel" aria-labelledby="billing-charges-title">
            <div className="sp-panel-top">
              <h2 id="billing-charges-title">Treatment Charges</h2>
              <button type="button" className="sp-action-btn" onClick={refreshLedger}>
                Refresh
              </button>
            </div>
            <p>Balances use current prices and paid transactions linked to each treatment.</p>
            {summary.totalCharges === null && (
              <p role="status">Link a priced dental service to each treatment to calculate the full balance.</p>
            )}
            <div className="sp-table-scroll">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th scope="col">Treatment</th>
                    <th scope="col">Treatment Date</th>
                    <th scope="col">Charge</th>
                    <th scope="col">Paid</th>
                    <th scope="col">Balance</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.charges.map((treatment) => (
                    <tr key={treatment.treatment_id}>
                      <td>{treatment.procedure_done}</td>
                      <td>{treatment.treatment_date || "—"}</td>
                      <td>{peso(treatment.fee)}</td>
                      <td>{peso(treatment.paid)}</td>
                      <td>{peso(treatment.balance)}</td>
                      <td>
                        {treatment.balance > 0 && (
                          <button
                            type="button"
                            className="sp-action-btn"
                            aria-label={"Record payment for " + treatment.procedure_done}
                            onClick={() => openPayment(treatment)}
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!summary.charges.length && (
                    <tr><td colSpan={6} className="sp-empty">No treatment charges.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <h2 id="billing-history-title">Transaction History</h2>
            <div className="sp-table-scroll">
              <table className="sp-table" aria-labelledby="billing-history-title">
                <thead>
                  <tr>
                    <th scope="col">Date Recorded</th>
                    <th scope="col">Treatment</th>
                    <th scope="col">Payment Method</th>
                    <th scope="col">Status</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.payments.map((payment) => (
                    <tr key={payment.payment_id}>
                      <td>{paymentDate.format(new Date(payment.paid_at))}</td>
                      <td>{treatmentNames.get(payment.treatment_id) ?? "—"}</td>
                      <td>{paymentMethods[payment.payment_method] ?? payment.payment_method}</td>
                      <td>{payment.payment_status}</td>
                      <td>{peso(toCents(payment.amount))}</td>
                    </tr>
                  ))}
                  {!ledger.payments.length && (
                    <tr><td colSpan={5} className="sp-empty">No payments recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <dialog
        ref={dialog}
        className="sp-modal"
        aria-labelledby="billing-payment-title"
        onCancel={(event) => { if (saving) event.preventDefault(); }}
      >
        <div className="sp-modal-header">
          <h2 id="billing-payment-title">Record Payment</h2>
          <button
            type="button"
            className="sp-icon-btn"
            aria-label="Close payment form"
            disabled={saving}
            onClick={() => dialog.current.close()}
          >
            <X size={20} />
          </button>
        </div>

        {selectedTreatment && (
          <p>
            {selectedTreatment.procedure_done} · Balance {peso(selectedTreatment.balance)}
          </p>
        )}

        <form className="sp-form" onSubmit={recordPayment}>
          <label htmlFor="billing-payment-amount">Amount (PHP)</label>
          <input
            id="billing-payment-amount"
            type="number"
            min="0.01"
            max={selectedTreatment?.balance == null ? undefined : selectedTreatment.balance / 100}
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={saving}
          />

          <label htmlFor="billing-payment-method">Payment Method</label>
          <select
            id="billing-payment-method"
            required
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            disabled={saving}
          >
            <option value="">Select a payment method</option>
            {Object.entries(paymentMethods).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {paymentError && <p className="sp-error" role="alert">{paymentError}</p>}
          <button type="submit" className="sp-primary-btn" disabled={saving || !selectedTreatment}>
            {saving ? "Saving…" : "Save Payment"}
          </button>
        </form>
      </dialog>
    </div>
  );
}
