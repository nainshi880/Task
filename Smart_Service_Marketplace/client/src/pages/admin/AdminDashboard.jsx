import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  Bell,
  CalendarCheck,
  CheckCircle2,
  IndianRupee,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import * as adminService from "../../services/admin.service";
import * as notificationService from "../../services/notification.service";
import useAuth from "../../hooks/useAuth";
import { adminKeys, notificationKeys } from "../../lib/queryClient";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  getGreeting,
} from "../../utils/format";

function StatCard({ label, value, icon: Icon, accent = "indigo", href }) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };

  const content = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}

function AdminDashboard() {
  const { user } = useAuth();

  const metricsQuery = useQuery({
    queryKey: adminKeys.dashboard({}),
    queryFn: () => adminService.getDashboardMetrics(),
    retry: false,
  });

  const auditQuery = useQuery({
    queryKey: adminKeys.auditLogs({ limit: 8 }),
    queryFn: () => adminService.getAuditLogs({ page: 1, limit: 8 }),
    retry: false,
  });

  const notificationsQuery = useQuery({
    queryKey: notificationKeys.list({ limit: 5, scope: "admin-dash" }),
    queryFn: () => notificationService.listNotifications({ limit: 5, page: 1 }),
    retry: false,
  });

  if (metricsQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading admin dashboard..." />
      </DashboardLayout>
    );
  }

  if (metricsQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard unavailable
          </h1>
          <p className="mt-2 text-slate-500">
            {metricsQuery.error?.response?.data?.message ||
              "Could not load platform metrics."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const data = metricsQuery.data || {};
  const metrics = data.metrics || {};
  const breakdown = data.breakdown || {};
  const recentBookings = breakdown.recentBookings || [];
  const auditItems = auditQuery.data?.items || auditQuery.data?.logs || [];
  const notifications =
    notificationsQuery.data?.items ||
    notificationsQuery.data?.notifications ||
    [];

  const displayName = user?.name || "Admin";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-indigo-700 to-cyan-600 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-indigo-100">{getGreeting()}</p>
              <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                Admin dashboard · {displayName}
              </h1>
              <p className="mt-2 text-indigo-100">
                Platform overview, approvals, and recent activity.
              </p>
            </div>
            <Link
              to="/admin/analytics"
              className="inline-flex rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur hover:bg-white/25"
            >
              Open analytics
            </Link>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total customers"
            value={metrics.totalCustomers ?? 0}
            icon={Users}
            accent="indigo"
            href="/admin/customers"
          />
          <StatCard
            label="Total technicians"
            value={metrics.totalTechnicians ?? 0}
            icon={Wrench}
            accent="sky"
            href="/admin/technicians"
          />
          <StatCard
            label="Active bookings"
            value={metrics.activeBookings ?? 0}
            icon={CalendarCheck}
            accent="amber"
            href="/admin/bookings"
          />
          <StatCard
            label="Completed bookings"
            value={metrics.completedBookings ?? 0}
            icon={CheckCircle2}
            accent="emerald"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Revenue overview"
            value={formatCurrency(metrics.revenue || metrics.netRevenue || 0)}
            icon={IndianRupee}
            accent="violet"
            href="/admin/analytics"
          />
          <StatCard
            label="Pending technician approvals"
            value={metrics.pendingTechnicianApplications ?? 0}
            icon={UserCheck}
            accent="rose"
            href="/admin/technicians?applicationStatus=pending"
          />
          <StatCard
            label="Bookings today"
            value={metrics.bookingsToday ?? 0}
            icon={Activity}
            accent="indigo"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent bookings
              </h2>
              <Link
                to="/admin/bookings"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-slate-500">No recent bookings.</p>
            ) : (
              <ul className="space-y-3">
                {recentBookings.map((booking) => (
                  <li
                    key={booking._id}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {booking.serviceName || booking.serviceCategory}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {booking.customer?.name || "Customer"}
                          {booking.technician?.name
                            ? ` · ${booking.technician.name}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(
                            booking.bookingDate || booking.createdAt
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <BookingStatusBadge status={booking.status} />
                        {booking.amount > 0 && (
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {formatCurrency(booking.amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Recent activities
            </h2>
            {auditQuery.isLoading ? (
              <Loader text="Loading activity..." />
            ) : auditItems.length === 0 ? (
              <p className="text-sm text-slate-500">No recent audit activity.</p>
            ) : (
              <ul className="space-y-3">
                {auditItems.slice(0, 8).map((item) => (
                  <li
                    key={item._id}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <p className="font-medium text-slate-900">
                      {item.action || item.event || "Activity"}
                      {item.resource ? ` · ${item.resource}` : ""}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {item.description || item.note || "System activity"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatRelativeTime(item.createdAt)}
                      {item.actor?.name ? ` · ${item.actor.name}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Bell size={18} className="text-indigo-600" />
              System notifications
            </h2>
          </div>
          {notificationsQuery.isLoading ? (
            <Loader text="Loading notifications..." />
          ) : notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.slice(0, 5).map((item) => (
                <li
                  key={item._id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                        {item.message}
                      </p>
                    </div>
                    {!item.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {formatRelativeTime(item.createdAt)}
                    {item.type ? ` · ${item.type}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(breakdown.bookingsByCategory || []).length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Service categories snapshot
              </h2>
              <Link
                to="/admin/analytics"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Full analytics
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {breakdown.bookingsByCategory.map((item) => (
                <span
                  key={item.category}
                  className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700"
                >
                  {item.category}: {item.count} ·{" "}
                  {formatCurrency(item.revenue || 0)}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
