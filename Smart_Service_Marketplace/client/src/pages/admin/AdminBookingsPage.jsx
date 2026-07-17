import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Search } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { BOOKING_STATUS } from "../../constants/bookingStatus";
import SERVICE_CATEGORIES from "../../constants/serviceCategories";
import { formatCurrency, formatDateTime } from "../../utils/format";

const PAYMENT_STATUSES = ["Pending", "Paid", "Refunded"];

function PaymentPill({ status }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700",
    Paid: "bg-emerald-50 text-emerald-700",
    Refunded: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "—"}
    </span>
  );
}

function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  const filters = useMemo(
    () => ({
      page: Number(searchParams.get("page") || 1),
      limit: 12,
      q: searchParams.get("q") || "",
      status: searchParams.get("status") || "",
      paymentStatus: searchParams.get("paymentStatus") || "",
      serviceCategory: searchParams.get("serviceCategory") || "",
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [searchParams]
  );

  const bookingsQuery = useQuery({
    queryKey: adminKeys.bookings(filters),
    queryFn: () => adminService.fetchAdminBookings(filters),
    retry: false,
  });

  const updateParams = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete("page");
    setSearchParams(next);
  };

  const applySearch = (e) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim() });
  };

  const items = bookingsQuery.data?.items || [];
  const pagination = bookingsQuery.data?.pagination || {};

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Bookings</h1>
            <p className="mt-1 text-slate-500">
              View, reassign, cancel, and refund platform bookings.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CalendarCheck size={16} />
            {pagination.total ?? "—"} total
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={applySearch}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search bookings, customers, services…"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <Button type="submit" size="sm">
              Search
            </Button>
            {(filters.q ||
              filters.status ||
              filters.paymentStatus ||
              filters.serviceCategory) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setSearchParams({});
                }}
              >
                Clear
              </Button>
            )}
          </form>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <select
              value={filters.status}
              onChange={(e) => updateParams({ status: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Status: All</option>
              {Object.values(BOOKING_STATUS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filters.paymentStatus}
              onChange={(e) => updateParams({ paymentStatus: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Payment: All</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filters.serviceCategory}
              onChange={(e) =>
                updateParams({ serviceCategory: e.target.value })
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Category: All</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {bookingsQuery.isLoading ? (
          <Loader text="Loading bookings..." />
        ) : bookingsQuery.isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">Could not load bookings</p>
            <p className="mt-1 text-sm text-red-600">
              {bookingsQuery.error?.response?.data?.message ||
                bookingsQuery.error?.message}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => bookingsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No bookings found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try adjusting search or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {items.map((booking) => (
                <div
                  key={booking._id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/bookings/${booking._id}`}
                        className="truncate font-semibold text-slate-900 hover:text-indigo-600"
                      >
                        {booking.serviceName || "Service"}
                      </Link>
                      <BookingStatusBadge status={booking.status} />
                      <PaymentPill status={booking.paymentStatus} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {booking.customer?.name || "Customer"}
                      {booking.technician?.name
                        ? ` · ${booking.technician.name}`
                        : " · Unassigned"}
                      {booking.serviceCategory
                        ? ` · ${booking.serviceCategory}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(booking.bookingDate, booking.bookingTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(booking.amount || 0)}
                    </span>
                    <Link to={`/admin/bookings/${booking._id}`}>
                      <Button size="sm" variant="outline">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {(pagination.hasPrevPage || pagination.hasNextPage) && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination.hasPrevPage}
                    onClick={() =>
                      updateParams(
                        { page: Math.max(1, (pagination.page || 1) - 1) },
                        { resetPage: false }
                      )
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination.hasNextPage}
                    onClick={() =>
                      updateParams(
                        { page: (pagination.page || 1) + 1 },
                        { resetPage: false }
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminBookingsPage;
