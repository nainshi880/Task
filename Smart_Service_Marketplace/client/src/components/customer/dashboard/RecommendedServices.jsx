import {
  Zap,
  Wrench,
  Paintbrush,
  AirVent,
  Hammer,
  BrushCleaning,
  Bug,
  Truck,
  Settings,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SERVICE_CATEGORIES } from "../../../constants/serviceCategories";

const SERVICE_META = {
  Plumbing: {
    icon: Wrench,
    description: "Leak repairs, fittings, and bathroom plumbing.",
  },
  Electrical: {
    icon: Zap,
    description: "Wiring, switchboard, and electrical maintenance.",
  },
  Cleaning: {
    icon: BrushCleaning,
    description: "Home, office, and deep cleaning services.",
  },
  Painting: {
    icon: Paintbrush,
    description: "Interior and exterior painting services.",
  },
  Carpentry: {
    icon: Hammer,
    description: "Furniture assembly, repairs, and woodwork.",
  },
  "Appliance Repair": {
    icon: Settings,
    description: "Repair and maintenance for home appliances.",
  },
  "AC Repair": {
    icon: AirVent,
    description: "AC installation, servicing, and maintenance.",
  },
  "Pest Control": {
    icon: Bug,
    description: "Safe and effective pest control treatments.",
  },
  "Home Shifting": {
    icon: Truck,
    description: "Packing and relocation assistance.",
  },
  Other: {
    icon: Settings,
    description: "Other verified home services.",
  },
};

function getRecommendedCategories(favoriteCategory) {
  const favorite =
    typeof favoriteCategory === "string"
      ? favoriteCategory
      : favoriteCategory?._id || null;

  const ordered = favorite
    ? [favorite, ...SERVICE_CATEGORIES.filter((c) => c !== favorite)]
    : [...SERVICE_CATEGORIES];

  return ordered.slice(0, 6);
}

function RecommendedServices({ favoriteCategory }) {
  const categories = getRecommendedCategories(favoriteCategory);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Recommended Services
          </h2>
          <p className="text-sm text-slate-500">
            Book trusted professionals for your next job
          </p>
        </div>
        <Link
          to="/bookings"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          Book now
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const meta = SERVICE_META[category] || SERVICE_META.Other;
          const Icon = meta.icon;

          return (
            <div
              key={category}
              className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-indigo-200 hover:bg-white hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Icon size={22} />
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{category}</h3>
              <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
              <Link
                to="/bookings"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600"
              >
                Explore
                <ArrowRight
                  size={14}
                  className="transition group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default RecommendedServices;
