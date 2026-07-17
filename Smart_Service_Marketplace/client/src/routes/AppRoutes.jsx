import { Routes, Route, Navigate } from "react-router-dom";

import GuestRoute from "./GuestRoute";
import {
  CustomerRoute,
  TechnicianRoute,
  AdminRoute,
  SuperAdminRoute,
  ProfileSetupRoute,
} from "./ProtectedRoute";
import { ROLES } from "../constants/roles";

import LandingPage from "../pages/shared/LandingPage";
import Login from "../pages/auth/Login";
import AdminLogin from "../pages/auth/AdminLogin";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";
import VerifyOtp from "../pages/auth/VerifyOtp";

import CustomerProfileSetup from "../pages/onboarding/CustomerProfileSetup";
import TechnicianProfileSetup from "../pages/onboarding/TechnicianProfileSetup";
import CreateAdminPage from "../pages/admin/CreateAdminPage";

import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerProfilePage from "../pages/customer/CustomerProfilePage";
import AddressesPage from "../pages/customer/AddressesPage";
import ServicesPage from "../pages/customer/ServicesPage";
import ServiceDetailPage from "../pages/customer/ServiceDetailPage";
import BookServicePage from "../pages/customer/BookServicePage";
import BookingConfirmPage from "../pages/customer/BookingConfirmPage";
import MyBookingsPage from "../pages/customer/MyBookingsPage";
import BookingDetailPage from "../pages/customer/BookingDetailPage";

import {
  CustomerChat,
  TechnicianDashboard,
  TechnicianJobs,
  TechnicianEarnings,
  TechnicianProfile,
  AdminDashboard,
  AdminUsers,
  AdminBookings,
} from "../pages/placeholders/RolePages";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />

      {/* Profile setup wizards (after first login) */}
      <Route
        path="/setup/customer"
        element={
          <ProfileSetupRoute role={ROLES.CUSTOMER}>
            <CustomerProfileSetup />
          </ProfileSetupRoute>
        }
      />
      <Route
        path="/setup/technician"
        element={
          <ProfileSetupRoute role={ROLES.TECHNICIAN}>
            <TechnicianProfileSetup />
          </ProfileSetupRoute>
        }
      />

      {/* Customer routes */}
      <Route element={<CustomerRoute />}>
        <Route path="/dashboard" element={<CustomerDashboard />} />
        <Route path="/profile" element={<CustomerProfilePage />} />
        <Route path="/profile/addresses" element={<AddressesPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
        <Route path="/book-service" element={<BookServicePage />} />
        <Route path="/booking/confirm" element={<BookingConfirmPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/bookings/:bookingId" element={<BookingDetailPage />} />
        <Route path="/chat" element={<CustomerChat />} />
      </Route>

      {/* Technician routes */}
      <Route element={<TechnicianRoute />}>
        <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
        <Route path="/jobs" element={<TechnicianJobs />} />
        <Route path="/earnings" element={<TechnicianEarnings />} />
        <Route path="/technician/profile" element={<TechnicianProfile />} />
      </Route>

      {/* Admin routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
      </Route>

      <Route element={<SuperAdminRoute />}>
        <Route path="/admin/admins" element={<CreateAdminPage />} />
      </Route>

      {/* Convenience aliases */}
      <Route path="/technician" element={<Navigate to="/technician/dashboard" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
