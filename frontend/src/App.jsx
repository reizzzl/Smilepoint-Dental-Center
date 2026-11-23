import React from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StaffManagement from "./pages/admin/StaffManagement";
import DentalServices from "./pages/admin/DentalServices";
import Reports from "./pages/admin/Reports";

import Login from "./pages/auth/Login";
import Patients from "./pages/patients/Patients";
import Appointments from "./pages/appointments/Appointments";
import Billing from "./pages/billing/Billing";
import DentalRecords from "./pages/dental/DentalRecords";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="services" element={<DentalServices />} />
          <Route path="dental-records" element={<DentalRecords />} />
          <Route path="reports" element={<Reports />} />
          <Route path="patients" element={<Patients />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="billing" element={<Billing />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
