import { Link } from "react-router-dom";
import { CalendarDays, MapPin, UserRound } from "lucide-react";

import BookingStatusBadge from "../BookingStatusBadge";
import { formatCurrency, formatDate } from "../../../utils/format";
import { formatTimeSlot } from "../../../constants/timeSlots";

function formatAddress(address) {
  if (!address) return null;
  return [address.street, address.city, address.state]
    .filter(Boolean)
    .join(", ");
}

function BookingListCard({ booking }) {
  const addressLine = formatAddress(booking.addressDetails);
  const technicianName = booking.technician?.name || "Awaiting assignment";

  return (
    <Link
      to={`/bookings/${booking._id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            {booking.serviceCategory}
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">
            {booking.serviceName || booking.serviceCategory}
          </h3>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p className="flex items-center gap-2">
          <CalendarDays size={15} className="shrink-0 text-slate-400" />
          {formatDate(booking.bookingDate)}
          {booking.bookingTime
            ? ` · ${formatTimeSlot(booking.bookingTime)}`
            : ""}
        </p>
        <p className="flex items-center gap-2">
          <UserRound size={15} className="shrink-0 text-slate-400" />
          {technicianName}
        </p>
        {addressLine && (
          <p className="flex items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
            <span className="line-clamp-1">{addressLine}</span>
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-semibold text-slate-900">
          {booking.amount > 0 ? formatCurrency(booking.amount) : "Quote pending"}
        </span>
        <span className="text-sm font-medium text-indigo-600">View details</span>
      </div>
    </Link>
  );
}

export default BookingListCard;
