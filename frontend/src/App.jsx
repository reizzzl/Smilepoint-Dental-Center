
import React from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useOutletContext,
} from "react-router-dom";

// ==========================================
// LAYOUT
// ==========================================

import AdminLayout from "./components/admin/AdminLayout";

// ==========================================
// ADMIN MODULES
// ==========================================

import AdminDashboard from "./pages/admin/AdminDashboard";
import StaffManagement from "./pages/admin/StaffManagement";
import AccountManagement from "./pages/admin/AccountManagement";
import DentalServices from "./pages/admin/DentalServices";
import Reports from "./pages/admin/Reports";

// ==========================================
// SHARED MODULES
// ==========================================

import Login from "./pages/auth/Login";
import Patients from "./pages/patients/Patients";
import Appointments from "./pages/appointments/Appointments";
import Billing from "./pages/billing/Billing";
import DentalRecords from "./pages/dental/DentalRecords";

// ==========================================
// ROLE GROUPS
// ==========================================

const ALL_ROLES = [
  "admin",
  "dentist",
  "receptionist",
];

const CLINICAL_ROLES = [
  "admin",
  "dentist",
];

const BILLING_ROLES = [
  "admin",
  "receptionist",
];

const ADMIN_ONLY = [
  "admin",
];

// ==========================================
// PROTECTED ROUTE
// ==========================================

function ProtectedRoute({ allowedRoles, children }) {
  const { staff } = useOutletContext() || {};

  if (!staff || staff.active !== true) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(staff.role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

// ==========================================
// APPLICATION ROUTES
// ==========================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* DEFAULT ROUTE */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* LOGIN */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* MAIN PORTAL */}

        <Route
          path="/admin"
          element={<AdminLayout />}
        >

          {/* DASHBOARD - ALL ROLES */}

          <Route
            index
            element={
              <ProtectedRoute allowedRoles={ALL_ROLES}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* APPOINTMENTS - ALL ROLES */}

          <Route
            path="appointments"
            element={
              <ProtectedRoute allowedRoles={ALL_ROLES}>
                <Appointments />
              </ProtectedRoute>
            }
          />

          {/* PATIENTS - ALL ROLES */}

          <Route
            path="patients"
            element={
              <ProtectedRoute allowedRoles={ALL_ROLES}>
                <Patients />
              </ProtectedRoute>
            }
          />

          {/* DENTAL RECORDS - ADMIN AND DENTIST */}

          <Route
            path="dental-records"
            element={
              <ProtectedRoute
                allowedRoles={CLINICAL_ROLES}
              >
                <DentalRecords />
              </ProtectedRoute>
            }
          />

          {/* DENTAL SERVICES - ALL ROLES */}

          <Route
            path="services"
            element={
              <ProtectedRoute allowedRoles={ALL_ROLES}>
                <DentalServices />
              </ProtectedRoute>
            }
          />

          {/* BILLING - ADMIN AND RECEPTIONIST */}

          <Route
            path="billing"
            element={
              <ProtectedRoute
                allowedRoles={BILLING_ROLES}
              >
                <Billing />
              </ProtectedRoute>
            }
          />

          {/* REPORTS - ADMIN ONLY */}

          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ONLY}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* STAFF MANAGEMENT - ADMIN ONLY */}

          <Route
            path="staff"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ONLY}>
                <StaffManagement />
              </ProtectedRoute>
            }
          />

          {/* ACCOUNT MANAGEMENT - ALL ROLES */}

          <Route
            path="account"
            element={
              <ProtectedRoute allowedRoles={ALL_ROLES}>
                <AccountManagement />
              </ProtectedRoute>
            }
          />

          {/* INVALID PORTAL ROUTE */}

          <Route
            path="*"
            element={<Navigate to="/admin" replace />}
          />

        </Route>

        {/* INVALID APPLICATION ROUTE */}

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
