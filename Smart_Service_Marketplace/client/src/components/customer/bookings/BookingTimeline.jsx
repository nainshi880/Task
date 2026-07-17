import { formatRelativeTime, formatDate } from "../../../utils/format";

const EVENT_LABELS = {
  CREATED: "Booking created",
  UPDATED: "Booking updated",
  CANCELLED: "Booking cancelled",
  ASSIGNED: "Technician assigned",
  REASSIGNED: "Technician reassigned",
  ACCEPTED: "Technician accepted",
  REJECTED: "Technician declined",
  ARRIVING: "Technician on the way",
  STARTED: "Work started",
  PAUSED: "Work paused",
  RESUMED: "Work resumed",
  WORK_NOTE_ADDED: "Work note added",
  COMPLETION_IMAGES_UPLOADED: "Completion photos uploaded",
  COMPLETED: "Service completed",
  CUSTOMER_CONFIRMED: "Customer confirmed",
  CLOSED: "Booking closed",
  ISSUE_IMAGES_UPLOADED: "Issue photos uploaded",
};

function BookingTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <p className="text-sm text-slate-500">
        No timeline events yet. Updates will appear as the booking progresses.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-slate-200 pl-5">
      {events.map((event, index) => {
        const label =
          EVENT_LABELS[event.event] ||
          String(event.event || "Update").replaceAll("_", " ");
        const isLatest = index === 0;

        return (
          <li key={event._id || `${event.event}-${index}`} className="pb-6 last:pb-0">
            <span
              className={`absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                isLatest ? "bg-indigo-600" : "bg-slate-300"
              }`}
            />
            <div>
              <p className="font-medium text-slate-900">{label}</p>
              {(event.toStatus || event.fromStatus) && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {event.fromStatus && event.toStatus
                    ? `${event.fromStatus} → ${event.toStatus}`
                    : event.toStatus || event.fromStatus}
                </p>
              )}
              {event.note && (
                <p className="mt-1 text-sm text-slate-600">{event.note}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {formatRelativeTime(event.createdAt) || formatDate(event.createdAt)}
                {event.actorRole ? ` · ${event.actorRole}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default BookingTimeline;
