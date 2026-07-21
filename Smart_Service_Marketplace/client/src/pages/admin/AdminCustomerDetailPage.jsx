import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  CalendarCheck,
  Mail,
  MapPin,
  Phone,
  Trash2,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "../../utils/format";

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">
        {value ?? "—"}
      </span>
    </div>
  );
}

function AdminCustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: adminKeys.customer(id),
    queryFn: () => adminService.getCustomerDetails(id),
    enabled: Boolean(id),
    retry: false,
  });

  const bookingsQuery = useQuery({
    queryKey: adminKeys.customerBookings(id, { page: 1, limit: 20 }),
    queryFn: () =>
      adminService.listAdminBookings({
        customerId: id,
        page: 1,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(id),
    retry: false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.customer(id) });
    queryClient.invalidateQueries({
      queryKey: [...adminKeys.all, "customers"],
    });
  };

  const blockMutation = useMutation({
    mutationFn: () => adminService.blockCustomer(id),
    onSuccess: () => {
      toast.success("Customer blocked");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Could not block customer"),
  });

  const unblockMutation = useMutation({
    mutationFn: () => adminService.unblockCustomer(id),
    onSuccess: () => {
      toast.success("Customer unblocked");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Could not unblock customer"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminService.deleteCustomer(id),
    onSuccess: () => {
      toast.success("Customer deleted");
      navigate("/admin/customers", { replace: true });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Could not delete customer"),
  });

  if (detailQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading customer..." />
      </DashboardLayout>
    );
  }

  if (detailQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Customer not found
          </h1>
          <p className="mt-2 text-slate-500">
            {detailQuery.error?.response?.data?.message ||
              "Could not load this customer."}
          </p>
          <Link
            to="/admin/customers"
            className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:underline"
          >
            Back to customers
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const { user, profile, bookings } = detailQuery.data || {};
  const name = profile?.fullName || user?.name || "Customer";
  const busy =
    blockMutation.isPending ||
    unblockMutation.isPending ||
    deleteMutation.isPending;
  const bookingItems = bookingsQuery.data?.items || [];
  const byStatus = bookings?.byStatus || {};

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to="/admin/customers"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft size={16} />
              Customers
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900">{name}</h1>
              <span
                className={clsx(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase",
                  user?.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                )}
              >
                {user?.isDeleted
                  ? "Deleted"
                  : user?.isActive
                    ? "Active"
                    : "Blocked"}
              </span>
            </div>
            <p className="mt-1 text-slate-500">{user?.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {user?.isActive ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                loading={blockMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Block ${name}?`)) {
                    blockMutation.mutate();
                  }
                }}
              >
                <Ban size={16} />
                Block
              </Button>
            ) : (
              <Button
                size="sm"
                variant="success"
                disabled={busy || user?.isDeleted}
                loading={unblockMutation.isPending}
                onClick={() => unblockMutation.mutate()}
              >
                <UserCheck size={16} />
                Unblock
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              disabled={busy || user?.isDeleted}
              loading={deleteMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${name}? This soft-deletes the account.`
                  )
                ) {
                  deleteMutation.mutate();
                }
              }}
            >
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarCheck size={18} />
              <span className="text-sm">Total bookings</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {bookings?.total ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <UserCheck size={18} />
              <span className="text-sm">Verified</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {user?.isVerified ? "Yes" : "No"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            <div className="mt-3">
              <InfoRow
                label="Phone"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={14} />
                    {profile?.phone || user?.phone || "—"}
                  </span>
                }
              />
              <InfoRow
                label="Email"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={14} />
                    {user?.email || "—"}
                  </span>
                }
              />
              <InfoRow label="Gender" value={profile?.gender} />
              <InfoRow
                label="Date of birth"
                value={
                  profile?.dateOfBirth
                    ? formatDate(profile.dateOfBirth)
                    : "—"
                }
              />
              <InfoRow
                label="Profile completed"
                value={profile?.profileCompleted ? "Yes" : "No"}
              />
              <InfoRow
                label="Joined"
                value={formatDate(user?.createdAt)}
              />
              <InfoRow
                label="Last login"
                value={
                  user?.lastLogin ? formatDateTime(user.lastLogin) : "—"
                }
              />
              {user?.deactivatedAt && (
                <InfoRow
                  label="Blocked at"
                  value={formatDateTime(user.deactivatedAt)}
                />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Booking summary
            </h2>
            <div className="mt-3">
              {Object.keys(byStatus).length === 0 ? (
                <p className="text-sm text-slate-500">No bookings yet.</p>
              ) : (
                Object.entries(byStatus).map(([status, count]) => (
                  <InfoRow
                    key={status}
                    label={<BookingStatusBadge status={status} />}
                    value={count}
                  />
                ))
              )}
            </div>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Addresses
            </h3>
            <div className="mt-2 space-y-2">
              {(profile?.addresses || []).length === 0 ? (
                <p className="text-sm text-slate-500">No addresses saved.</p>
              ) : (
                profile.addresses.map((addr, idx) => (
                  <div
                    key={addr._id || idx}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                      <div>
                        <p className="font-medium">
                          {addr.label || "Address"}
                          {addr.isDefault ? " · Default" : ""}
                        </p>
                        <p className="text-slate-500">
                          {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Booking history
            </h2>
            <Link
              to="/admin/bookings"
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              All bookings
            </Link>
          </div>

          {bookingsQuery.isLoading ? (
            <div className="py-8">
              <Loader text="Loading bookings..." />
            </div>
          ) : bookingsQuery.isError ? (
            <p className="mt-4 text-sm text-rose-600">
              {bookingsQuery.error?.response?.data?.message ||
                "Could not load booking history."}
            </p>
          ) : bookingItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No bookings for this customer.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {bookingItems.map((booking) => (
                <div
                  key={booking._id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {booking.service?.name ||
                        booking.serviceName ||
                        booking.category ||
                        "Service"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(
                        booking.bookingDate || booking.scheduledAt,
                        booking.timeSlot || booking.slot
                      )}
                      {booking.technician?.name || booking.technicianName
                        ? ` · ${booking.technician?.name || booking.technicianName}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookingStatusBadge status={booking.status} />
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(
                        booking.totalAmount ?? booking.amount ?? 0
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AdminCustomerDetailPage;
