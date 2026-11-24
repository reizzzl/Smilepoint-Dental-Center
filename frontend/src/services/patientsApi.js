12
import { supabase } from "../lib/supabase";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

// ==========================================
// AUTHENTICATED API REQUEST
// ==========================================

async function request(path, options = {}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session?.access_token) {
    throw new Error("Please sign in again.");
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,

        headers: {
          Authorization:
            `Bearer ${session.access_token}`,

          ...(options.body
            ? {
                "Content-Type": "application/json",
              }
            : {}),

          ...options.headers,
        },
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to the backend. Make sure the backend server is running."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.error ||
        `Request failed (${response.status})`
    );
  }

  if (!result || !("data" in result)) {
    throw new Error(
      "Invalid response received from the backend."
    );
  }

  return result.data;
}

// ==========================================
// GET CURRENT STAFF ACCOUNT
// ==========================================

export function getCurrentStaff() {
  return request("/auth/me");
}

// ==========================================
// GET ALL PATIENTS WITH PAGINATION
// ==========================================

export async function getPatients() {
  const limit = 100;
  let offset = 0;

  const patients = [];

  while (true) {
    const data = await request(
      `/patients?limit=${limit}&offset=${offset}`
    );

    if (!Array.isArray(data)) {
      throw new Error(
        "Invalid patient list received."
      );
    }

    patients.push(...data);

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  return patients;
}

// ==========================================
// GET SINGLE PATIENT
// ==========================================

export function getPatient(id) {
  return request(
    `/patients/${encodeURIComponent(id)}`
  );
}

// ==========================================
// REGISTER NEW PATIENT
// ==========================================

export function createPatient(patient) {
  return request("/patients", {
    method: "POST",
    body: JSON.stringify(patient),
  });
}

// ==========================================
// UPDATE EXISTING PATIENT
// ==========================================

export function updatePatient(id, changes) {
  return request(
    `/patients/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(changes),
    }
  );
}
