import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Star,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import ServiceCard from "../../components/customer/services/ServiceCard";
import * as serviceService from "../../services/service.service";
import { serviceKeys } from "../../lib/queryClient";
import { formatCurrency, formatDate, formatRelativeTime } from "../../utils/format";

function StarRow({ rating = 0, size = 16 }) {
  const value = Number(rating) || 0;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={size}
          className={
            index < Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }
        />
      ))}
    </span>
  );
}

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span className="font-medium text-slate-900">{faq.question}</span>
        <ChevronDown
          size={18}
          className={clsx(
            "shrink-0 text-slate-400 transition",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
      )}
    </div>
  );
}

function ServiceDetailPage() {
  const { serviceId } = useParams();

  const detailQuery = useQuery({
    queryKey: serviceKeys.detail(serviceId),
    queryFn: () => serviceService.getServiceById(serviceId),
    enabled: Boolean(serviceId),
    retry: false,
  });

  if (detailQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading service details..." />
      </DashboardLayout>
    );
  }

  if (detailQuery.isError || !detailQuery.data?.service) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Service not found</h1>
          <p className="mt-2 text-slate-500">
            This service may have been removed or is unavailable.
          </p>
          <Link
            to="/services"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Back to services
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const {
    service,
    relatedServices = [],
    reviews = [],
    reviewStats = {},
    topTechnicians = [],
  } = detailQuery.data;

  const averageRating =
    reviewStats.average ?? service.reviewAverage ?? service.rating ?? 0;
  const reviewCount =
    reviewStats.total ?? service.reviewCount ?? 0;

  const bookUrl = `/book-service?serviceId=${encodeURIComponent(service._id)}&category=${encodeURIComponent(service.category)}&serviceName=${encodeURIComponent(service.name)}`;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
        >
          <ArrowLeft size={16} />
          Back to services
        </Link>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 py-8 text-white md:px-8">
            <p className="text-sm font-medium text-indigo-100">{service.category}</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">{service.name}</h1>
            <p className="mt-3 max-w-2xl text-indigo-100">
              {service.shortDescription || service.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-indigo-50">
              <span className="inline-flex items-center gap-1.5">
                <Star size={16} className="fill-amber-300 text-amber-300" />
                {Number(averageRating).toFixed(1)} ({reviewCount} reviews)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={16} />
                ~{service.durationMinutes} min
              </span>
              {service.isPopular && (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  Popular
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Service description
                </h2>
                <p className="mt-2 leading-relaxed text-slate-600">
                  {service.description}
                </p>
              </div>

              {service.features?.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    What&apos;s included
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {service.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <CheckCircle2
                          size={18}
                          className="mt-0.5 shrink-0 text-emerald-500"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <aside className="h-fit space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Pricing</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {formatCurrency(service.basePrice)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Starting price · final amount may vary by scope
                </p>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Clock3 size={16} />
                    Estimated duration: {service.durationMinutes} minutes
                  </p>
                  <p className="flex items-center gap-2">
                    <Star size={16} className="text-amber-500" />
                    {Number(averageRating).toFixed(1)} average rating
                  </p>
                </div>

                <Link to={bookUrl}>
                  <Button className="mt-6 w-full" size="lg">
                    Book Now
                  </Button>
                </Link>

                <Link
                  to={`/services?category=${encodeURIComponent(service.category)}`}
                  className="mt-3 block text-center text-sm font-medium text-indigo-600 hover:underline"
                >
                  More in {service.category}
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {topTechnicians.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Top-rated technicians
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Available pros for {service.category} services
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {topTechnicians.map((tech) => (
                <div
                  key={tech._id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-700">
                    {tech.avatar ? (
                      <img
                        src={tech.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {tech.name}
                    </p>
                    <p className="flex items-center gap-1 text-sm text-slate-500">
                      <Star size={14} className="text-amber-500" />
                      {Number(tech.rating || 0).toFixed(1)}
                      {tech.city ? ` · ${tech.city}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Customer reviews
              </h2>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <StarRow rating={averageRating} />
                <span>
                  {Number(averageRating).toFixed(1)} · {reviewCount} review
                  {reviewCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          {reviews.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              No reviews yet for this service. Be the first after your booking.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {reviews.map((review) => (
                <li
                  key={review._id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {review.customer?.name || "Customer"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatRelativeTime(review.createdAt) ||
                          formatDate(review.createdAt)}
                      </p>
                    </div>
                    <StarRow rating={review.rating} size={14} />
                  </div>
                  {review.title && (
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {review.title}
                    </p>
                  )}
                  {review.comment && (
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {review.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {service.faqs?.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">FAQs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Common questions about booking this service
            </p>
            <div className="mt-2">
              {service.faqs.map((faq, index) => (
                <FaqItem key={`${faq.question}-${index}`} faq={faq} />
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-5">
          <div>
            <p className="font-semibold text-slate-900">Ready to book?</p>
            <p className="text-sm text-slate-600">
              Choose your address, date, and preferred time in a few steps.
            </p>
          </div>
          <Link to={bookUrl}>
            <Button size="lg">Book Now</Button>
          </Link>
        </div>

        {relatedServices.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Related services
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {relatedServices.map((item) => (
                <ServiceCard key={item._id} service={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ServiceDetailPage;
