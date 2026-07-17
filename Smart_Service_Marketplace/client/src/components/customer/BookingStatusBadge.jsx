import clsx from "clsx";

const STATUS_STYLES = {
  Pending: "bg-amber-100 text-amber-800",
  Assigned: "bg-blue-100 text-blue-800",
  Accepted: "bg-sky-100 text-sky-800",
  "In Progress": "bg-indigo-100 text-indigo-800",
  Paused: "bg-orange-100 text-orange-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Closed: "bg-slate-100 text-slate-700",
  Cancelled: "bg-red-100 text-red-800",
};

function BookingStatusBadge({ status }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700"
      )}
    >
      {status}
    </span>
  );
}

export default BookingStatusBadge;
