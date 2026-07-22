import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  StickyNote,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import DashboardLayout from "../../layouts/DashboardLayout";
import Button from "../../components/ui/Button";
import * as bookingService from "../../services/booking.service";
import { bookingKeys, customerKeys } from "../../lib/queryClient";
import {
  clearBookingDraft,
  loadBookingDraft,
} from "../../utils/bookingDraft";
import { formatCurrency, formatDate } from "../../utils/format";
import { formatTimeSlot } from "../../constants/timeSlots";

function formatAddressLine(address) {
  if (!address) return "—";
  return [address.street, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");
}

function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-4 last:border-0">
      <div className="mt-0.5 text-indigo-600">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function BookingConfirmPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft] = useState(() => loadBookingDraft());
  const [createdBooking, setCreatedBooking] = useState(null);

  const createMutation = useMutation({
    mutationFn: bookingService.createBooking,
    onSuccess: (booking) => {
      clearBookingDraft();
      setCreatedBooking(booking);
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.dashboard() });
      toast.success("Booking created — complete payment to confirm.");
    },
    onError: (error) => {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Could not create booking.";
      toast.error(message);
    },
  });

  if (!draft && !createdBooking) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            No booking to confirm
          </h1>
          <p className="mt-2 text-slate-500">
            Start from a service and complete the booking steps first.
          </p>
          <Link
            to="/services"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Browse services
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (createdBooking) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Booking created
          </h1>
          <p className="mt-2 text-slate-500">
            Your request for{" "}
            <span className="font-medium text-slate-800">
              {createdBooking.serviceName}
            </span>{" "}
            is saved with status Pending Payment. Pay from booking details to
            confirm and notify technicians.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            {formatDate(createdBooking.bookingDate)} ·{" "}
            {formatTimeSlot(createdBooking.bookingTime)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              onClick={() =>
                navigate(
                  createdBooking._id
                    ? `/bookings/${createdBooking._id}`
                    : "/bookings"
                )
              }
            >
              Pay &amp; view booking
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
            >
              Go to dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleConfirm = () => {
    const payload = {
      serviceCategory: draft.serviceCategory,
      serviceName: draft.serviceName,
      address: draft.addressId,
      bookingDate: new Date(draft.bookingDate).toISOString(),
      bookingTime: draft.bookingTime,
      amount: draft.amount || 0,
    };

    if (draft.description) payload.description = draft.description;
    if (draft.notes) payload.notes = draft.notes;
    if (draft.technicianId) payload.technician = draft.technicianId;

    createMutation.mutate(payload);
  };

  const editUrl = draft.serviceId
    ? `/book-service?serviceId=${encodeURIComponent(draft.serviceId)}&category=${encodeURIComponent(draft.serviceCategory)}&serviceName=${encodeURIComponent(draft.serviceName)}${draft.technicianId ? `&technicianId=${encodeURIComponent(draft.technicianId)}` : ""}`
    : "/book-service";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            to={editUrl}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Edit booking details
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Confirm booking</h1>
          <p className="mt-1 text-slate-500">
            Review the summary, then confirm to place your request.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-5 py-4 text-white">
            <p className="text-sm text-indigo-100">{draft.serviceCategory}</p>
            <h2 className="mt-1 text-2xl font-bold">{draft.serviceName}</h2>
            {draft.amount > 0 && (
              <p className="mt-2 text-lg font-semibold">
                {formatCurrency(draft.amount)}
                {draft.durationMinutes
                  ? ` · ~${draft.durationMinutes} min`
                  : ""}
              </p>
            )}
          </div>

          <div className="mt-2">
            <SummaryRow
              icon={MapPin}
              label="Address"
              value={
                draft.address
                  ? `${draft.address.label || "Address"} — ${formatAddressLine(draft.address)}`
                  : "—"
              }
            />
            <SummaryRow
              icon={CalendarDays}
              label="Date"
              value={formatDate(draft.bookingDate)}
            />
            <SummaryRow
              icon={Clock3}
              label="Time slot"
              value={formatTimeSlot(draft.bookingTime)}
            />
            <SummaryRow
              icon={UserRound}
              label="Technician"
              value={draft.technician?.name || "Auto-assign (no preference)"}
            />
            {(draft.description || draft.notes) && (
              <SummaryRow
                icon={StickyNote}
                label="Notes"
                value={[draft.description, draft.notes]
                  .filter(Boolean)
                  .join(" · ")}
              />
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(editUrl)}
              disabled={createMutation.isPending}
            >
              Go back
            </Button>
            <Button
              type="button"
              loading={createMutation.isPending}
              onClick={handleConfirm}
            >
              Confirm booking
            </Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default BookingConfirmPage;
