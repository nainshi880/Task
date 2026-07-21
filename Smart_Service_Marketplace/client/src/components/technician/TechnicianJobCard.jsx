import { Link } from "react-router-dom";
import { CalendarDays, MapPin, UserRound } from "lucide-react";

import BookingStatusBadge from "../customer/BookingStatusBadge";
import { formatCurrency, formatDate } from "../../utils/format";
import { formatTimeSlot } from "../../constants/timeSlots";

function TechnicianJobCard({ job, linkTo }) {
  const customerName = job.customer?.name || "Customer";
  const href = linkTo || `/technician/jobs/${job._id}`;

  return (
    <Link
      to={href}
      className="block rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-indigo-100 hover:bg-white"
    >
        <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            {job.serviceName || job.serviceCategory}
          </p>
          <p className="mt-1 text-sm text-slate-500">{job.serviceCategory}</p>
          {job.isOpenOffer || (job.status === "Pending" && !job.technician) ? (
            <p className="mt-1 text-xs font-medium text-amber-700">
              Open job — accept to claim
            </p>
          ) : null}
        </div>
        <BookingStatusBadge status={job.status} />
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
        <p className="flex items-center gap-2">
          <CalendarDays size={14} className="shrink-0 text-slate-400" />
          {formatDate(job.bookingDate)}
          {job.bookingTime ? ` · ${formatTimeSlot(job.bookingTime)}` : ""}
        </p>
        <p className="flex items-center gap-2">
          <UserRound size={14} className="shrink-0 text-slate-400" />
          {customerName}
          {job.customer?.city ? ` · ${job.customer.city}` : ""}
        </p>
        {job.customer?.phone && (
          <p className="flex items-center gap-2">
            <MapPin size={14} className="shrink-0 text-slate-400" />
            {job.customer.phone}
          </p>
        )}
        {job.amount > 0 && (
          <p className="font-medium text-slate-800">
            {formatCurrency(job.amount)}
          </p>
        )}
      </div>

      <span className="mt-3 inline-block text-sm font-medium text-indigo-600">
        View details
      </span>
    </Link>
  );
}

export default TechnicianJobCard;
