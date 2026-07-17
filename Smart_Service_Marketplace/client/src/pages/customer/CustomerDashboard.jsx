import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Wallet,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import RecommendedServices from "../../components/customer/dashboard/RecommendedServices";
import * as customerService from "../../services/customer.service";
import * as walletService from "../../services/wallet.service";
import useAuth from "../../hooks/useAuth";
import { customerKeys } from "../../lib/queryClient";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  getGreeting,
} from "../../utils/format";

function StatCard({ label, value, icon: Icon, accent = "indigo" }) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
}

function BookingCard({ booking, variant = "default" }) {
  const technicianName = booking.technician?.name || "Awaiting assignment";

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-indigo-100 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            {booking.serviceName || booking.serviceCategory}
          </p>
          <p className="mt-1 text-sm text-slate-500">{booking.serviceCategory}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="mt-3 space-y-1 text-sm text-slate-600">
        <p>{formatDateTime(booking.bookingDate, booking.bookingTime)}</p>
        <p>Technician: {technicianName}</p>
        {booking.amount > 0 && (
          <p className="font-medium text-slate-800">
            {formatCurrency(booking.amount)}
          </p>
        )}
      </div>

      {variant === "upcoming" && (
        <Link
          to={`/bookings/${booking._id}`}
          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          View details
        </Link>
      )}
    </div>
  );
}

function EmptyBookings({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm text-slate-500">{message}</p>
                  <Link
                to="/services"
                className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
              >
                Browse services
              </Link>
    </div>
  );
}

function CustomerDashboard() {
  const { user } = useAuth();

  const dashboardQuery = useQuery({
    queryKey: customerKeys.dashboard(),
    queryFn: customerService.getDashboard,
    retry: false,
  });

  const walletQuery = useQuery({
    queryKey: customerKeys.walletBalance(),
    queryFn: walletService.getBalance,
    retry: false,
  });

  if (dashboardQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading your dashboard..." />
      </DashboardLayout>
    );
  }

  if (dashboardQuery.isError) {
    const isMissingProfile = dashboardQuery.error?.response?.status === 404;

    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Complete your profile</h1>
          <p className="mt-2 text-slate-500">
            {isMissingProfile
              ? "Set up your customer profile to view bookings and statistics."
              : "We could not load your dashboard right now."}
          </p>
          <Link
            to="/setup/customer"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Finish profile setup
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const data = dashboardQuery.data || {};
  const profile = data.profile || {};
  const stats = data.statistics || {};
  const upcoming = data.upcomingBookings || [];
  const recent = data.recentBookings || [];
  const notifications = data.recentNotifications || [];
  const unreadCount = data.unreadNotifications || 0;
  const wallet = walletQuery.data;
  const displayName = profile.fullName || user?.name || "there";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="h-16 w-16 rounded-full border-2 border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm text-indigo-100">{getGreeting()}</p>
                <h1 className="text-2xl font-bold md:text-3xl">
                  Welcome back, {displayName}
                </h1>
                <p className="mt-1 text-indigo-100">
                  Here&apos;s what&apos;s happening with your services today.
                </p>
              </div>
            </div>

            {profile.profileCompletion !== undefined && (
              <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-indigo-100">
                  Profile completion
                </p>
                <p className="text-2xl font-bold">
                  {Math.round(profile.profileCompletion || 0)}%
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Statistics + Wallet */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total bookings"
            value={stats.totalBookings ?? 0}
            icon={CalendarCheck}
            accent="indigo"
          />
          <StatCard
            label="Completed"
            value={stats.completedBookings ?? 0}
            icon={CheckCircle2}
            accent="emerald"
          />
          <StatCard
            label="Active / pending"
            value={
              (stats.pendingBookings ?? 0) +
              (stats.assignedBookings ?? 0) +
              (stats.acceptedBookings ?? 0) +
              (stats.inProgressBookings ?? 0)
            }
            icon={Clock3}
            accent="amber"
          />
          <StatCard
            label="Total spent"
            value={formatCurrency(data.totalSpent ?? stats.totalSpent ?? 0)}
            icon={IndianRupee}
            accent="violet"
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Wallet balance</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {walletQuery.isLoading
                    ? "…"
                    : formatCurrency(wallet?.balance ?? 0, wallet?.currency)}
                </p>
                {wallet?.isActive === false && (
                  <p className="mt-1 text-xs text-amber-600">Wallet inactive</p>
                )}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                <Wallet size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Bookings */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Upcoming bookings
              </h2>
              <Link
                to="/bookings"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {upcoming.length ? (
                upcoming.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    variant="upcoming"
                  />
                ))
              ) : (
                <EmptyBookings message="No upcoming bookings scheduled." />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent bookings
              </h2>
              <Link
                to="/bookings"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {recent.length ? (
                recent.map((booking) => (
                  <BookingCard key={booking._id} booking={booking} />
                ))
              ) : (
                <EmptyBookings message="You haven't booked any services yet." />
              )}
            </div>
          </section>
        </div>

        {/* Notifications */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <p className="text-sm text-slate-500">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          {notifications.length ? (
            <ul className="divide-y divide-slate-100">
              {notifications.slice(0, 5).map((item) => (
                <li
                  key={item._id}
                  className={`flex gap-3 py-3 ${!item.isRead ? "bg-indigo-50/40 -mx-2 px-2 rounded-lg" : ""}`}
                >
                  <div
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      item.isRead ? "bg-slate-300" : "bg-indigo-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                      {item.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          )}
        </section>

        {/* Recommended services */}
        <RecommendedServices favoriteCategory={data.favoriteCategory} />
      </div>
    </DashboardLayout>
  );
}

export default CustomerDashboard;
