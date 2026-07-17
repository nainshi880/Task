import {
  Clock3,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";

import BookingStatusBadge from "../BookingStatusBadge";
import { formatDateTime } from "../../../utils/format";
import { formatTimeSlot } from "../../../constants/timeSlots";
import {
  BOOKING_STATUS,
  shouldTrackLive,
} from "../../../constants/bookingStatus";

function estimateArrivalMinutes(booking, timeline = []) {
  const arrivingEvent = timeline.find((item) => item.event === "ARRIVING");
  if (arrivingEvent) {
    const elapsed = Math.floor(
      (Date.now() - new Date(arrivingEvent.createdAt).getTime()) / 60000
    );
    return Math.max(8, 22 - Math.min(elapsed, 14));
  }

  if (
    booking.status === BOOKING_STATUS.ACCEPTED ||
    booking.status === BOOKING_STATUS.ASSIGNED
  ) {
    if (!booking.bookingDate || !booking.bookingTime) return null;
    const [hours, minutes] = booking.bookingTime.split(":").map(Number);
    const scheduled = new Date(booking.bookingDate);
    scheduled.setHours(hours || 0, minutes || 0, 0, 0);
    const diff = Math.round((scheduled.getTime() - Date.now()) / 60000);
    if (diff <= 0) return 15;
    if (diff > 180) return null;
    return diff;
  }

  if (booking.status === BOOKING_STATUS.IN_PROGRESS) return 0;
  return null;
}

function statusMessage(booking, hasArriving) {
  switch (booking.status) {
    case BOOKING_STATUS.PENDING:
      return "Waiting for technician assignment.";
    case BOOKING_STATUS.ASSIGNED:
      return "A technician has been assigned and will confirm soon.";
    case BOOKING_STATUS.ACCEPTED:
      return hasArriving
        ? "Your technician is on the way."
        : "Technician accepted. Tracking will update when they start heading over.";
    case BOOKING_STATUS.IN_PROGRESS:
      return "Service is currently in progress.";
    case BOOKING_STATUS.PAUSED:
      return "Work is paused. Updates will resume shortly.";
    case BOOKING_STATUS.COMPLETED:
      return "Service completed. You can confirm or leave a review later.";
    case BOOKING_STATUS.CLOSED:
      return "This booking is closed.";
    case BOOKING_STATUS.CANCELLED:
      return "This booking was cancelled.";
    default:
      return "Live status will appear here as the job progresses.";
  }
}

function BookingTrackingPanel({
  booking,
  timeline = [],
  isRefreshing = false,
  lastUpdatedAt,
}) {
  const technician = booking.technician;
  const address = booking.addressDetails;
  const hasArriving = timeline.some((item) => item.event === "ARRIVING");
  const etaMinutes = estimateArrivalMinutes(booking, timeline);
  const live = shouldTrackLive(booking.status);
  const cityLabel = address?.city || address?.state || "Service location";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Booking tracking
          </h2>
          <p className="text-sm text-slate-500">
            {statusMessage(booking, hasArriving)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-2">
        <div className="space-y-4 border-b border-slate-100 p-5 md:border-b-0 md:border-r">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Technician assigned
            </p>
            {technician ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-700">
                  {technician.avatar ? (
                    <img
                      src={technician.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound size={22} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {technician.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {technician.rating
                      ? `${Number(technician.rating).toFixed(1)} rating`
                      : "Verified technician"}
                    {technician.city ? ` · ${technician.city}` : ""}
                  </p>
                  {technician.phone && (
                    <a
                      href={`tel:${technician.phone}`}
                      className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                    >
                      <Phone size={14} />
                      {technician.phone}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No technician assigned yet.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Clock3 size={14} />
              Estimated arrival
            </p>
            {etaMinutes === 0 ? (
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Technician on site
              </p>
            ) : etaMinutes != null ? (
              <p className="mt-2 text-lg font-semibold text-slate-900">
                ~{etaMinutes} min
                {hasArriving ? " · en route" : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                ETA will appear once the technician is en route.
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Scheduled{" "}
              {formatDateTime(booking.bookingDate, booking.bookingTime)}
              {booking.bookingTime
                ? ` (${formatTimeSlot(booking.bookingTime)})`
                : ""}
            </p>
          </div>
        </div>

        <div className="p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Navigation size={14} />
            Technician location
          </p>

          <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 via-indigo-50 to-cyan-50">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, rgba(99,102,241,0.25), transparent 45%), radial-gradient(circle at 75% 60%, rgba(6,182,212,0.2), transparent 40%), linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)",
                backgroundSize: "100% 100%, 100% 100%, 24px 24px, 24px 24px",
              }}
            />
            <div className="relative flex min-h-[180px] flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md text-indigo-600">
                <MapPin size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{cityLabel}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {address
                    ? [address.street, address.city].filter(Boolean).join(", ")
                    : "Service address"}
                </p>
              </div>
              {hasArriving ? (
                <p className="rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-semibold text-white">
                  Live GPS coming soon · approximate area shown
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Precise location is shown when the technician shares live GPS.
                </p>
              )}
            </div>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw
              size={12}
              className={isRefreshing ? "animate-spin" : undefined}
            />
            {live
              ? `Auto-refreshing${lastUpdatedAt ? ` · updated ${lastUpdatedAt}` : ""}`
              : "Live updates pause when the booking is finished"}
          </p>
        </div>
      </div>
    </section>
  );
}

export default BookingTrackingPanel;
