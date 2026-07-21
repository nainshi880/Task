import { Routes, Route, Navigate } from "react-router-dom";

import GuestRoute from "./GuestRoute";
import {
  CustomerRoute,
  TechnicianRoute,
  AdminRoute,
  SuperAdminRoute,
  ProfileSetupRoute,
  ChatRoute,
} from "./ProtectedRoute";
import { ROLES } from "../constants/roles";

import LandingPage from "../pages/shared/LandingPage";
import Login from "../pages/auth/Login";
import AdminLogin from "../pages/auth/AdminLogin";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";

import CustomerProfileSetup from "../pages/onboarding/CustomerProfileSetup";
import TechnicianProfileSetup from "../pages/onboarding/TechnicianProfileSetup";
import CreateAdminPage from "../pages/admin/CreateAdminPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminAnalyticsPage from "../pages/admin/AdminAnalyticsPage";
import AdminCustomersPage from "../pages/admin/AdminCustomersPage";
import AdminCustomerDetailPage from "../pages/admin/AdminCustomerDetailPage";
import AdminTechniciansPage from "../pages/admin/AdminTechniciansPage";
import AdminTechnicianDetailPage from "../pages/admin/AdminTechnicianDetailPage";
import AdminBookingsPage from "../pages/admin/AdminBookingsPage";
import AdminBookingDetailPage from "../pages/admin/AdminBookingDetailPage";
import AdminServicesPage from "../pages/admin/AdminServicesPage";
import AdminPaymentsPage from "../pages/admin/AdminPaymentsPage";
import AdminReviewsPage from "../pages/admin/AdminReviewsPage";
import AdminReportsPage from "../pages/admin/AdminReportsPage";
import AdminSettingsPage from "../pages/admin/AdminSettingsPage";
import AdminProfilePage from "../pages/admin/AdminProfilePage";

import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerProfilePage from "../pages/customer/CustomerProfilePage";
import AddressesPage from "../pages/customer/AddressesPage";
import ServicesPage from "../pages/customer/ServicesPage";
import ServiceDetailPage from "../pages/customer/ServiceDetailPage";
import BookServicePage from "../pages/customer/BookServicePage";
import BookingConfirmPage from "../pages/customer/BookingConfirmPage";
import MyBookingsPage from "../pages/customer/MyBookingsPage";
import BookingDetailPage from "../pages/customer/BookingDetailPage";
import TechnicianDashboard from "../pages/technician/TechnicianDashboard";
import TechnicianProfilePage from "../pages/technician/TechnicianProfilePage";
import TechnicianProfileEditPage from "../pages/technician/TechnicianProfileEditPage";
import TechnicianJobsPage from "../pages/technician/TechnicianJobsPage";
import TechnicianJobDetailPage from "../pages/technician/TechnicianJobDetailPage";
import TechnicianAvailabilityPage from "../pages/technician/TechnicianAvailabilityPage";
import TechnicianReviewsPage from "../pages/technician/TechnicianReviewsPage";
import TechnicianNotificationsPage from "../pages/technician/TechnicianNotificationsPage";
import TechnicianSettingsPage from "../pages/technician/TechnicianSettingsPage";
import NotificationsPage from "../pages/shared/NotificationsPage";
import ChatInboxPage from "../pages/shared/ChatInboxPage";
import ChatRoomPage from "../pages/shared/ChatRoomPage";
import NotFoundPage from "../pages/shared/NotFoundPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Outside GuestRoute so a technician session cannot bounce this page away */}
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

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
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Shared chat (customer + technician) */}
      <Route element={<ChatRoute />}>
        <Route path="/chat" element={<ChatInboxPage />} />
        <Route path="/chat/:conversationId" element={<ChatRoomPage />} />
      </Route>

      {/* Technician routes */}
      <Route element={<TechnicianRoute />}>
        <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
        <Route path="/technician/jobs" element={<TechnicianJobsPage />} />
        <Route
          path="/technician/jobs/:bookingId"
          element={<TechnicianJobDetailPage />}
        />
        <Route path="/jobs" element={<Navigate to="/technician/jobs" replace />} />
        <Route
          path="/technician/availability"
          element={<TechnicianAvailabilityPage />}
        />
        <Route path="/technician/reviews" element={<TechnicianReviewsPage />} />
        <Route
          path="/technician/notifications"
          element={<TechnicianNotificationsPage />}
        />
        <Route
          path="/technician/settings"
          element={<TechnicianSettingsPage />}
        />
        <Route path="/technician/profile" element={<TechnicianProfilePage />} />
        <Route
          path="/technician/profile/edit"
          element={<TechnicianProfileEditPage />}
        />
      </Route>

      {/* Admin routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="/admin/customers" element={<AdminCustomersPage />} />
        <Route
          path="/admin/customers/:id"
          element={<AdminCustomerDetailPage />}
        />
        <Route path="/admin/technicians" element={<AdminTechniciansPage />} />
        <Route
          path="/admin/technicians/:id"
          element={<AdminTechnicianDetailPage />}
        />
        <Route
          path="/admin/users"
          element={<Navigate to="/admin/customers" replace />}
        />
        <Route path="/admin/bookings" element={<AdminBookingsPage />} />
        <Route
          path="/admin/bookings/:id"
          element={<AdminBookingDetailPage />}
        />
        <Route path="/admin/services" element={<AdminServicesPage />} />
        <Route path="/admin/payments" element={<AdminPaymentsPage />} />
        <Route path="/admin/reviews" element={<AdminReviewsPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/notifications" element={<NotificationsPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
      </Route>

      <Route element={<SuperAdminRoute />}>
        <Route path="/admin/admins" element={<CreateAdminPage />} />
      </Route>

      {/* Convenience aliases */}
      <Route path="/technician" element={<Navigate to="/technician/dashboard" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
