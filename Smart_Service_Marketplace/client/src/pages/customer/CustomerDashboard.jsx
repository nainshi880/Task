import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  IndianRupee,
  MapPin,
  MessageSquare,
  PlusCircle,
  UserRound,
  Wrench,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import {
  DashboardEmpty,
  DashboardLink,
  DashboardMetaPill,
  DashboardQuickActions,
  DashboardSection,
  DashboardStatCard,
  DashboardWelcome,
} from "../../components/dashboard/DashboardPrimitives";
import * as customerService from "../../services/customer.service";
import useAuth from "../../hooks/useAuth";
import { customerKeys } from "../../lib/queryClient";
import { needsPayment } from "../../constants/bookingStatus";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  getGreeting,
} from "../../utils/format";

function BookingCard({ booking, variant = "default" }) {
  const technicianName = booking.technician?.name || "Awaiting assignment";
  const paymentDue = needsPayment(booking);

  return (
    <Link
      to={`/bookings/${booking._id}`}
      className="group block rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
            {booking.serviceName || booking.serviceCategory}
          </p>
          <p className="mt-1 text-sm text-slate-500">{booking.serviceCategory}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <BookingStatusBadge status={booking.status} />
          {paymentDue ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Payment due
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
        <p className="flex items-center gap-2">
          <CalendarDays size={14} className="shrink-0 text-slate-400" />
          {formatDateTime(booking.bookingDate, booking.bookingTime)}
        </p>
        <p className="flex items-center gap-2">
          <UserRound size={14} className="shrink-0 text-slate-400" />
          {technicianName}
        </p>
        {booking.amount > 0 && (
          <p className="flex items-center gap-2 font-medium text-slate-800">
            <IndianRupee size={14} className="shrink-0 text-slate-400" />
            {formatCurrency(booking.amount)}
          </p>
        )}
      </div>

      {variant === "upcoming" ? (
        <span className="mt-3 inline-block text-sm font-semibold text-indigo-600">
          View details →
        </span>
      ) : null}
    </Link>
  );
}

function CustomerDashboard() {
  const { user } = useAuth();

  const dashboardQuery = useQuery({
    queryKey: customerKeys.dashboard(),
    queryFn: customerService.getDashboard,
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UserRound size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Complete your profile</h1>
          <p className="mt-2 text-slate-500">
            {isMissingProfile
              ? "Set up your customer profile to view bookings and statistics."
              : "We could not load your dashboard right now."}
          </p>
          <Link
            to="/setup/customer"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
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
  const displayName = profile.fullName || user?.name || "there";
  const activeCount =
    (stats.pendingBookings ?? 0) +
    (stats.assignedBookings ?? 0) +
    (stats.acceptedBookings ?? 0) +
    (stats.inProgressBookings ?? 0);
  const paymentDueCount = upcoming.filter((b) => needsPayment(b)).length;

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <DashboardWelcome
          greeting={getGreeting()}
          title={`Welcome back, ${displayName}`}
          subtitle="Track bookings, pay for services, and manage your home service requests."
          avatarUrl={profile.avatar}
          avatarFallback={displayName.charAt(0).toUpperCase()}
          actions={
            <Link
              to="/services"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-indigo-50"
            >
              <PlusCircle size={16} />
              Book a service
            </Link>
          }
        >
          {profile.profileCompletion !== undefined ? (
            <DashboardMetaPill
              label="Profile"
              value={`${Math.round(profile.profileCompletion || 0)}%`}
            />
          ) : null}
        </DashboardWelcome>

        {paymentDueCount > 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {paymentDueCount} booking{paymentDueCount !== 1 ? "s" : ""} waiting for payment
              </p>
              <p className="text-sm text-amber-800/80">
                Complete payment to confirm and notify available technicians.
              </p>
            </div>
            <Link
              to="/bookings"
              className="inline-flex shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Pay now
            </Link>
          </div>
        ) : null}

        <DashboardQuickActions
          actions={[
            {
              to: "/services",
              label: "Browse services",
              description: "Find help for your home",
              icon: Wrench,
              tone: "bg-indigo-50 text-indigo-600",
            },
            {
              to: "/bookings",
              label: "My bookings",
              description: "Track active requests",
              icon: CalendarCheck,
              tone: "bg-sky-50 text-sky-600",
            },
            {
              to: "/profile/addresses",
              label: "Addresses",
              description: "Manage service locations",
              icon: MapPin,
              tone: "bg-emerald-50 text-emerald-600",
            },
            {
              to: "/chat",
              label: "Messages",
              description: "Chat with technicians",
              icon: MessageSquare,
              tone: "bg-violet-50 text-violet-600",
            },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            label="Total bookings"
            value={stats.totalBookings ?? 0}
            icon={CalendarCheck}
            accent="indigo"
          />
          <DashboardStatCard
            label="Completed"
            value={stats.completedBookings ?? 0}
            icon={CheckCircle2}
            accent="emerald"
          />
          <DashboardStatCard
            label="Active / pending"
            value={activeCount}
            icon={Clock3}
            accent="amber"
            hint="In progress or awaiting assignment"
          />
          <DashboardStatCard
            label="Total spent"
            value={formatCurrency(data.totalSpent ?? stats.totalSpent ?? 0)}
            icon={IndianRupee}
            accent="violet"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardSection
            title="Upcoming bookings"
            subtitle="Your next scheduled services"
            action={<DashboardLink to="/bookings">View all</DashboardLink>}
          >
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
                <DashboardEmpty
                  icon={CalendarDays}
                  message="No upcoming bookings scheduled."
                  actionLabel="Browse services"
                  actionTo="/services"
                />
              )}
            </div>
          </DashboardSection>

          <DashboardSection
            title="Recent bookings"
            subtitle="Latest activity on your account"
            action={<DashboardLink to="/bookings">View all</DashboardLink>}
          >
            <div className="space-y-3">
              {recent.length ? (
                recent.map((booking) => (
                  <BookingCard key={booking._id} booking={booking} />
                ))
              ) : (
                <DashboardEmpty
                  icon={Wrench}
                  message="You haven't booked any services yet."
                  actionLabel="Book your first service"
                  actionTo="/services"
                />
              )}
            </div>
          </DashboardSection>
        </div>

        <DashboardSection
          title="Notifications"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "Updates about your bookings and account"
          }
          action={<DashboardLink to="/notifications">View all</DashboardLink>}
        >
          {notifications.length ? (
            <ul className="divide-y divide-slate-100">
              {notifications.slice(0, 5).map((item) => (
                <li
                  key={item._id}
                  className={`flex gap-3 py-3 ${
                    !item.isRead
                      ? "-mx-2 rounded-lg bg-indigo-50/50 px-2"
                      : ""
                  }`}
                >
                  <div
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
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
            <DashboardEmpty message="No notifications yet." />
          )}
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
}

export default CustomerDashboard;
