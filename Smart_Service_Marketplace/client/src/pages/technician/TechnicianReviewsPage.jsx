import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star } from "lucide-react";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { SkeletonList } from "../../components/ui/Skeleton";
import * as reviewService from "../../services/review.service";
import useAuth from "../../hooks/useAuth";
import { technicianKeys } from "../../lib/queryClient";
import { formatDate, formatRelativeTime } from "../../utils/format";

function StarRow({ rating = 0, size = 16 }) {
  const value = Number(rating) || 0;
  return (
    <span className="inline-flex items-center gap-0.5">
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

function TechnicianReviewsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const reviewsQuery = useQuery({
    queryKey: technicianKeys.reviews({ page, limit: 10 }),
    queryFn: () =>
      reviewService.getTechnicianReviews(user._id, {
        page,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(user?._id),
    retry: false,
  });

  const data = reviewsQuery.data || {};
  const items = data.items || [];
  const rating = data.rating || {};
  const distribution = rating.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const total = rating.totalReviews || 0;
  const pagination = data.pagination || {};

  const distributionRows = useMemo(() => {
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = distribution[stars] || distribution[String(stars)] || 0;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return { stars, count, percent };
    });
  }, [distribution, total]);

  if (reviewsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reviews</h1>
            <p className="mt-1 text-slate-500">
              Customer ratings and feedback for your completed jobs.
            </p>
          </div>
          <SkeletonList rows={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            to="/technician/dashboard"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Reviews</h1>
          <p className="mt-1 text-slate-500">
            Customer ratings and feedback for your completed jobs.
          </p>
        </div>

        {reviewsQuery.isError ? (
          <ErrorState
            variant="auto"
            error={reviewsQuery.error}
            onRetry={() => reviewsQuery.refetch()}
            homeTo="/technician/dashboard"
            homeLabel="Back to dashboard"
          />
        ) : (          <>
            <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.4fr]">
              <div className="text-center lg:text-left">
                <p className="text-sm text-slate-500">Overall rating</p>
                <p className="mt-2 text-5xl font-bold text-slate-900">
                  {Number(rating.average || 0).toFixed(1)}
                </p>
                <div className="mt-2 flex justify-center lg:justify-start">
                  <StarRow rating={rating.average || 0} size={20} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {total} review{total === 1 ? "" : "s"}
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-800">
                  Ratings breakdown
                </h2>
                {distributionRows.map((row) => (
                  <div key={row.stars} className="flex items-center gap-3 text-sm">
                    <span className="w-10 text-slate-600">{row.stars}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-slate-500">
                      {row.count} ({row.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Customer reviews
              </h2>

              {items.length === 0 ? (
                <EmptyState
                  preset="reviews"
                  title="No reviews yet"
                  description="They will appear after customers rate completed jobs."
                  className="border-0 shadow-none"
                />
              ) : (
                <ul className="space-y-3">
                  {items.map((review) => (
                    <li key={review._id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelected(
                            selected?._id === review._id ? null : review
                          )
                        }
                        className={clsx(
                          "w-full rounded-xl border p-4 text-left transition",
                          selected?._id === review._id
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-slate-100 bg-slate-50 hover:border-indigo-200"
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">
                              {review.customer?.name || "Customer"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {review.booking?.serviceName ||
                                review.booking?.serviceCategory ||
                                "Service"}
                              {" · "}
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
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                            {review.comment}
                          </p>
                        )}
                      </button>

                      {selected?._id === review._id && (
                        <div className="mt-2 rounded-xl border border-indigo-100 bg-white p-4 text-sm text-slate-700">
                          <p className="font-semibold text-slate-900">
                            Review details
                          </p>
                          <p className="mt-2">
                            Rating: {review.rating}/5
                          </p>
                          {review.title && (
                            <p className="mt-1">Title: {review.title}</p>
                          )}
                          <p className="mt-1 whitespace-pre-wrap">
                            {review.comment || "No written comment."}
                          </p>
                          <p className="mt-3 text-xs text-slate-500">
                            Booking date:{" "}
                            {formatDate(review.booking?.bookingDate)} · Category:{" "}
                            {review.booking?.serviceCategory || "—"}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <p className="text-sm text-slate-500">
                    Page {pagination.page || page} of {pagination.totalPages}
                  </p>
                  <Button
                    variant="outline"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default TechnicianReviewsPage;
