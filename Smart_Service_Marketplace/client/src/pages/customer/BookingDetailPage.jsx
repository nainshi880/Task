import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  StickyNote,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import BookingTimeline from "../../components/customer/bookings/BookingTimeline";
import BookingTrackingPanel from "../../components/customer/bookings/BookingTrackingPanel";
import CancelBookingModal from "../../components/customer/bookings/CancelBookingModal";
import RescheduleBookingModal from "../../components/customer/bookings/RescheduleBookingModal";
import * as bookingService from "../../services/booking.service";
import { bookingKeys, customerKeys } from "../../lib/queryClient";
import {
  canCancelBooking,
  canEditBooking,
  shouldTrackLive,
} from "../../constants/bookingStatus";
import { formatCurrency, formatDate, formatRelativeTime } from "../../utils/format";
import { formatTimeSlot } from "../../constants/timeSlots";

function formatAddress(address) {
  if (!address) return "—";
  return [
    address.label,
    address.street,
    address.city,
    address.state,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function BookingDetailPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: bookingKeys.detail(bookingId),
    queryFn: () => bookingService.getBookingById(bookingId),
    enabled: Boolean(bookingId),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return shouldTrackLive(status) ? 12_000 : false;
    },
  });

  const timelineQuery = useQuery({
    queryKey: bookingKeys.timeline(bookingId),
    queryFn: () => bookingService.getBookingTimeline(bookingId),
    enabled: Boolean(bookingId),
    retry: false,
    refetchInterval: (query) => {
      const status = detailQuery.data?.status;
      return shouldTrackLive(status) ? 12_000 : false;
    },
  });

  const invalidateBooking = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) }),
      queryClient.invalidateQueries({ queryKey: bookingKeys.timeline(bookingId) }),
      queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
      queryClient.invalidateQueries({ queryKey: customerKeys.dashboard() }),
    ]);
  };

  const cancelMutation = useMutation({
    mutationFn: (reason) =>
      bookingService.cancelBooking(bookingId, {
        cancellationReason: reason,
      }),
    onSuccess: async () => {
      toast.success("Booking cancelled.");
      setCancelOpen(false);
      await invalidateBooking();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Could not cancel booking."
      );
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: (payload) => bookingService.updateBooking(bookingId, payload),
    onSuccess: async () => {
      toast.success("Booking rescheduled.");
      setRescheduleOpen(false);
      await invalidateBooking();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Could not reschedule booking."
      );
    },
  });

  const booking = detailQuery.data;
  const timeline = useMemo(() => {
    const events = timelineQuery.data?.timeline || [];
    return [...events].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [timelineQuery.data]);

  const lastUpdatedAt = useMemo(() => {
    const stamp =
      detailQuery.dataUpdatedAt || timelineQuery.dataUpdatedAt || null;
    return stamp ? formatRelativeTime(new Date(stamp)) : null;
  }, [detailQuery.dataUpdatedAt, timelineQuery.dataUpdatedAt]);

  if (detailQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading booking details..." />
      </DashboardLayout>
    );
  }

  if (detailQuery.isError || !booking) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Booking not found</h1>
          <p className="mt-2 text-slate-500">
            This booking may have been removed or you don&apos;t have access.
          </p>
          <Button className="mt-6" onClick={() => navigate("/bookings")}>
            Back to bookings
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const editable = canEditBooking(booking.status);
  const cancellable = canCancelBooking(booking.status);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            to="/bookings"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to bookings
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                {booking.serviceCategory}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                {booking.serviceName || booking.serviceCategory}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <BookingStatusBadge status={booking.status} />
                {booking.amount > 0 && (
                  <span className="text-sm font-semibold text-slate-800">
                    {formatCurrency(booking.amount)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {editable && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleOpen(true)}
                >
                  Reschedule
                </Button>
              )}
              {cancellable && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel booking
                </Button>
              )}
            </div>
          </div>
        </div>

        <BookingTrackingPanel
          booking={booking}
          timeline={timeline}
          isRefreshing={detailQuery.isFetching || timelineQuery.isFetching}
          lastUpdatedAt={lastUpdatedAt}
        />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Booking details
            </h2>

            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 text-indigo-600" size={18} />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Schedule
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {formatDate(booking.bookingDate)}
                    {booking.bookingTime
                      ? ` · ${formatTimeSlot(booking.bookingTime)}`
                      : ""}
                  </dd>
                </div>
              </div>

              <div className="flex gap-3">
                <MapPin className="mt-0.5 text-indigo-600" size={18} />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Address
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {formatAddress(booking.addressDetails)}
                  </dd>
                </div>
              </div>

              <div className="flex gap-3">
                <UserRound className="mt-0.5 text-indigo-600" size={18} />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Technician
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {booking.technician?.name || "Awaiting assignment"}
                  </dd>
                  {booking.technician?.phone && (
                    <dd className="mt-0.5 text-slate-500">
                      {booking.technician.phone}
                    </dd>
                  )}
                </div>
              </div>

              {(booking.description || booking.notes) && (
                <div className="flex gap-3">
                  <StickyNote className="mt-0.5 text-indigo-600" size={18} />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </dt>
                    {booking.description && (
                      <dd className="mt-1 text-slate-700">{booking.description}</dd>
                    )}
                    {booking.notes && (
                      <dd className="mt-1 text-slate-600">{booking.notes}</dd>
                    )}
                  </div>
                </div>
              )}

              {booking.cancellationReason && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-semibold">Cancellation reason</p>
                  <p className="mt-1">{booking.cancellationReason}</p>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Booking timeline
              </h2>
              {timelineQuery.isFetching && (
                <span className="text-xs text-slate-400">Updating…</span>
              )}
            </div>
            {timelineQuery.isLoading ? (
              <Loader text="Loading timeline..." />
            ) : timelineQuery.isError ? (
              <p className="text-sm text-slate-500">
                Timeline could not be loaded right now.
              </p>
            ) : (
              <BookingTimeline events={timeline} />
            )}
          </section>
        </div>
      </div>

      <CancelBookingModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        loading={cancelMutation.isPending}
        onConfirm={(reason) => cancelMutation.mutate(reason)}
      />

      <RescheduleBookingModal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        booking={booking}
        loading={rescheduleMutation.isPending}
        onConfirm={(payload) => rescheduleMutation.mutate(payload)}
      />
    </DashboardLayout>
  );
}

export default BookingDetailPage;
