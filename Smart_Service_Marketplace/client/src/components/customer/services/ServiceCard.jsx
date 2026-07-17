import { Link } from "react-router-dom";
import { Clock3, Star } from "lucide-react";
import { formatCurrency } from "../../../utils/format";

function ServiceCard({ service }) {
  return (
    <Link
      to={`/services/${service._id}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            {service.category}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
            {service.name}
          </h3>
        </div>
        {service.isPopular && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Popular
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-slate-500">
        {service.shortDescription || service.description}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
        <span className="font-bold text-slate-900">
          {formatCurrency(service.basePrice)}
        </span>
        <div className="flex items-center gap-3 text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock3 size={14} />
            {service.durationMinutes}m
          </span>
          <span className="inline-flex items-center gap-1">
            <Star size={14} className="text-amber-500" />
            {Number(service.rating || 0).toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default ServiceCard;
