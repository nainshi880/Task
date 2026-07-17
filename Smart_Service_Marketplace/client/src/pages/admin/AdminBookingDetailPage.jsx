import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { BOOKING_STATUS } from "../../constants/bookingStatus";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
} from "../../utils/format";

const ADMIN_CANCELLABLE = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.PAUSED,
];

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

function AdminBookingDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState(null);
  const [reason, setReason] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("razorpay");

  const detailQuery = useQuery({
    queryKey: adminKeys.booking(id),
    queryFn: () => adminService.getAdminBookingDetails(id),
    enabled: Boolean(id),
    retry: false,
  });

  const timelineQuery = useQuery({
    queryKey: adminKeys.bookingTimeline(id),
    queryFn: () => adminService.getAdminBookingTimeline(id),
    enabled: Boolean(id),
    retry: false,
  });

  const techniciansQuery = useQuery({
    queryKey: adminKeys.technicians({
      applicationStatus: "approved",
      isSuspended: "false",
      limit: 50,
      forReassign: true,
    }),
    queryFn: () =>
      adminService.listTechnicians({
        applicationStatus: "approved",
        isSuspended: "false",
        limit: 50,
        page: 1,
      }),
    enabled: panel === "reassign",
    retry: false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.booking(id) });
    queryClient.invalidateQueries({ queryKey: adminKeys.bookingTimeline(id) });
    queryClient.invalidateQueries({ queryKey: [...adminKeys.all, "bookings"] });
  };

  const reassignMutation = useMutation({
    mutationFn: () =>
      adminService.reassignBookingTechnician(id, {
        technicianId,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      toast.success("Technician assigned");
      setPanel(null);
      setReason("");
      setTechnicianId("");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Reassign failed"),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      adminService.cancelAdminBooking(id, { reason: reason || undefined }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      setPanel(null);
      setReason("");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Cancel failed"),
  });

  const refundMutation = useMutation({
    mutationFn: () =>
      adminService.refundAdminBooking(id, {
        amount: refundAmount ? Number(refundAmount) : undefined,
        reason: reason || undefined,
        method: refundMethod,
      }),
    onSuccess: () => {
      toast.success("Refund processed");
      setPanel(null);
      setReason("");
      setRefundAmount("");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Refund failed"),
  });

  const booking = detailQuery.data?.booking || detailQuery.data;
  const payments = detailQuery.data?.payments || [];
  const timeline =
    timelineQuery.data?.timeline ||
    timelineQuery.data?.history?.events ||
    detailQuery.data?.timeline ||
    [];

  const techOptions = useMemo(() => {
    return (techniciansQuery.data?.items || []).map((item) => ({
      id: item.user?._id,
      label: `${item.fullName || item.user?.name || "Technician"}${
        item.workingCity ? ` · ${item.workingCity}` : ""
      }`,
    }));
  }, [techniciansQuery.data]);

  if (detailQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading booking..." />
      </DashboardLayout>
    );
  }

  if (detailQuery.isError || !booking) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Booking not found
          </h1>
          <p className="mt-2 text-slate-500">
            {detailQuery.error?.response?.data?.message ||
              "Could not load this booking."}
          </p>
          <Link
            to="/admin/bookings"
            className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:underline"
          >
            Back to bookings
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const canCancel = ADMIN_CANCELLABLE.includes(booking.status);
  const canRefund = booking.paymentStatus === "Paid";
  const canReassign = ![
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.CLOSED,
  ].includes(booking.status);
  const actionBusy =
    reassignMutation.isPending ||
    cancelMutation.isPending ||
    refundMutation.isPending;

  const address = booking.address;
  const addressText = address
    ? [address.line1, address.line2, address.city, address.state, address.pincode]
        .filter(Boolean)
        .join(", ")
    : "—";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to="/admin/bookings"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft size={16} />
              Bookings
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900">
                {booking.serviceName || "Booking"}
              </h1>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-1 text-slate-500">
              {booking.serviceCategory || "Service"} ·{" "}
              {formatCurrency(booking.amount || 0)} · Payment{" "}
              {booking.paymentStatus || "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canReassign && (
              <Button
                size="sm"
                variant="secondary"
                disabled={actionBusy}
                onClick={() => {
                  setPanel("reassign");
                  setReason("");
                }}
              >
                <UserPlus size={16} />
                Assign technician
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="danger"
                disabled={actionBusy}
                onClick={() => {
                  setPanel("cancel");
                  setReason("");
                }}
              >
                Cancel
              </Button>
            )}
            {canRefund && (
              <Button
                size="sm"
                variant="outline"
                disabled={actionBusy}
                onClick={() => {
                  setPanel("refund");
                  setReason("");
                  setRefundAmount("");
                }}
              >
                Refund
              </Button>
            )}
          </div>
        </div>

        {panel && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-sm">
            <p className="font-medium text-slate-900">
              {panel === "reassign" && "Assign / reassign technician"}
              {panel === "cancel" && "Cancel booking"}
              {panel === "refund" && "Refund booking payment"}
            </p>

            {panel === "reassign" && (
              <div className="mt-3 space-y-3">
                {techniciansQuery.isLoading ? (
                  <p className="text-sm text-slate-500">Loading technicians…</p>
                ) : (
                  <select
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="">Select technician</option>
                    {techOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {panel === "refund" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Amount (default full · ${booking.amount || 0})`}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="wallet">Wallet</option>
                </select>
              </div>
            )}

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Reason (optional)"
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant={panel === "cancel" ? "danger" : "primary"}
                loading={actionBusy}
                disabled={panel === "reassign" && !technicianId}
                onClick={() => {
                  if (panel === "reassign") reassignMutation.mutate();
                  else if (panel === "cancel") cancelMutation.mutate();
                  else refundMutation.mutate();
                }}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPanel(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Details</h2>
            <div className="mt-3">
              <InfoRow
                label="Customer"
                value={
                  booking.customer?._id ? (
                    <Link
                      to={`/admin/customers/${booking.customer._id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {booking.customer.name}
                    </Link>
                  ) : (
                    booking.customer?.name || "—"
                  )
                }
              />
              <InfoRow
                label="Technician"
                value={
                  booking.technician?._id ? (
                    <Link
                      to={`/admin/technicians/${booking.technician._id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {booking.technician.name}
                    </Link>
                  ) : (
                    "Unassigned"
                  )
                }
              />
              <InfoRow
                label="Schedule"
                value={formatDateTime(
                  booking.bookingDate,
                  booking.bookingTime
                )}
              />
              <InfoRow label="Address" value={addressText} />
              <InfoRow
                label="Created"
                value={formatDateTime(booking.createdAt)}
              />
              {booking.cancellationReason && (
                <InfoRow
                  label="Cancel reason"
                  value={booking.cancellationReason}
                />
              )}
            </div>
            {booking.description && (
              <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {booking.description}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
            {payments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No payment records linked.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {payments.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(p.amount || 0)} · {p.status}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.method || p.purpose || "payment"} ·{" "}
                        {formatRelativeTime(p.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
          {timelineQuery.isLoading ? (
            <div className="py-6">
              <Loader text="Loading timeline..." />
            </div>
          ) : timeline.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No timeline events yet.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {timeline.map((event, idx) => (
                <li key={event._id || idx} className="flex gap-3">
                  <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
                  <div className="min-w-0 flex-1 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {event.event || event.type || "Event"}
                      </span>
                      {event.toStatus && (
                        <BookingStatusBadge status={event.toStatus} />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatDateTime(event.createdAt)}
                      {event.actor?.name ? ` · ${event.actor.name}` : ""}
                      {event.actorRole ? ` (${event.actorRole})` : ""}
                    </p>
                    {event.note && (
                      <p className="mt-1 text-sm text-slate-600">{event.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AdminBookingDetailPage;
