import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Flag, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { SkeletonList } from "../../components/ui/Skeleton";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { formatRelativeTime } from "../../utils/format";

const TABS = [
  { id: "all", label: "All reviews" },
  { id: "reported", label: "Reported" },
];

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  hidden: "bg-slate-100 text-slate-600",
};

function Stars({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < rating ? "currentColor" : "none"}
          className={i < rating ? "" : "text-slate-300"}
        />
      ))}
    </span>
  );
}

function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "reported" ? "reported" : "all";
  const status = searchParams.get("status") || "";
  const page = Number(searchParams.get("page") || 1);
  const [selectedId, setSelectedId] = useState(null);

  const filters = useMemo(
    () => ({
      page,
      limit: 12,
      status: tab === "reported" ? undefined : status || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, status, tab]
  );

  const reviewsQuery = useQuery({
    queryKey: adminKeys.reviews({ ...filters, tab }),
    queryFn: () =>
      tab === "reported"
        ? adminService.listReportedReviews({
            page: filters.page,
            limit: filters.limit,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
          })
        : adminService.listAdminReviews(
            Object.fromEntries(
              Object.entries(filters).filter(([, v]) => v != null && v !== "")
            )
          ),
    retry: false,
  });

  const analyticsQuery = useQuery({
    queryKey: adminKeys.reviewAnalytics({}),
    queryFn: () => adminService.getReviewAnalytics({}),
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: adminKeys.review(selectedId),
    queryFn: () => adminService.getAdminReviewDetails(selectedId),
    enabled: Boolean(selectedId),
    retry: false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [...adminKeys.all, "reviews"] });
    queryClient.invalidateQueries({
      queryKey: [...adminKeys.all, "review-analytics"],
    });
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: adminKeys.review(selectedId) });
    }
  };

  const approveMutation = useMutation({
    mutationFn: (id) => adminService.approveReview(id, {}),
    onSuccess: () => {
      toast.success("Review approved");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Approve failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) =>
      adminService.rejectReview(id, { reason: "Rejected by admin" }),
    onSuccess: () => {
      toast.success("Review rejected");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Reject failed"),
  });

  const hideMutation = useMutation({
    mutationFn: (id) =>
      adminService.deleteReview(id, { reason: "Hidden by admin" }),
    onSuccess: () => {
      toast.success("Review hidden");
      setSelectedId(null);
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Hide failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      adminService.deleteReview(id, { reason: "Deleted by admin" }),
    onSuccess: () => {
      toast.success("Review deleted");
      setSelectedId(null);
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Delete failed"),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ reviewId, reportId }) =>
      adminService.resolveReviewReport(reviewId, reportId, {
        status: "resolved",
      }),
    onSuccess: () => {
      toast.success("Report resolved");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Resolve failed"),
  });

  const setTab = (next) => {
    const params = new URLSearchParams();
    if (next === "reported") params.set("tab", "reported");
    setSearchParams(params);
    setSelectedId(null);
  };

  const items = reviewsQuery.data?.items || [];
  const pagination = reviewsQuery.data?.pagination || {};
  const summary = analyticsQuery.data?.summary || {};
  const detail = detailQuery.data?.review || detailQuery.data;
  const busy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    hideMutation.isPending ||
    deleteMutation.isPending;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reviews</h1>
          <p className="mt-1 text-slate-500">
            Moderate reviews, handle reports, and hide inappropriate content.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Approved", value: summary.totalApproved },
            { label: "Avg rating", value: Number(summary.averageRating || 0).toFixed(1) },
            { label: "Pending", value: summary.pendingModeration },
            { label: "Reported", value: summary.reportedReviews },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {stat.value ?? 0}
              </p>
            </div>
          ))}
        </div>

        <div
          className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
          role="tablist"
          aria-label="Review views"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                tab === t.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "all" && (
          <label className="block max-w-xs">
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams);
                if (e.target.value) next.set("status", e.target.value);
                else next.delete("status");
                next.delete("page");
                setSearchParams(next);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Status: All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
        )}

        {reviewsQuery.isLoading ? (
          <SkeletonList rows={5} />
        ) : reviewsQuery.isError ? (
          <ErrorState
            variant="auto"
            error={reviewsQuery.error}
            onRetry={() => reviewsQuery.refetch()}
            homeTo="/admin/dashboard"
            homeLabel="Back to dashboard"
          />
        ) : items.length === 0 ? (
          <EmptyState
            preset="reviews"
            title="No reviews found"
            description="Try adjusting filters or check the Reported tab."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {items.map((review) => (
                <div
                  key={review._id}
                  className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={review.rating || 0} />
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase",
                          STATUS_STYLES[review.status] ||
                            "bg-slate-100 text-slate-600"
                        )}
                      >
                        {review.status}
                      </span>
                      {(review.reportCount || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                          <Flag size={12} />
                          {review.reportCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-medium text-slate-900">
                      {review.title || "Review"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {review.comment || "—"}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {review.customer?.name || "Customer"} →{" "}
                      {review.technician?.name || "Technician"}
                      {review.booking?.serviceName
                        ? ` · ${review.booking.serviceName}`
                        : ""}{" "}
                      · {formatRelativeTime(review.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedId(review._id)}
                    >
                      View
                    </Button>
                    {review.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          disabled={busy}
                          onClick={() => approveMutation.mutate(review._id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => rejectMutation.mutate(review._id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {review.status !== "hidden" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("Hide this review from public view?")) {
                            hideMutation.mutate(review._id);
                          }
                        }}
                      >
                        <EyeOff size={14} />
                        Hide
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("Delete this review?")) {
                          deleteMutation.mutate(review._id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {(pagination.hasPrevPage || pagination.hasNextPage) && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.set("page", String(Math.max(1, page - 1)));
                      setSearchParams(next);
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination.hasNextPage}
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.set("page", String(page + 1));
                      setSearchParams(next);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedId && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Review details
              </h2>
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            </div>
            {detailQuery.isLoading ? (
              <Loader text="Loading..." />
            ) : detail ? (
              <div className="mt-4 space-y-3">
                <Stars rating={detail.rating || 0} />
                <p className="font-medium text-slate-900">
                  {detail.title || "Review"}
                </p>
                <p className="text-sm text-slate-600">{detail.comment}</p>
                <p className="text-xs text-slate-400">
                  {detail.customer?.name} → {detail.technician?.name} ·{" "}
                  {detail.status}
                </p>
                {(detail.reports || []).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Reports
                    </h3>
                    {detail.reports.map((report) => (
                      <div
                        key={report._id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-slate-700">
                            {report.reason || "No reason"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {report.status} ·{" "}
                            {formatRelativeTime(report.createdAt)}
                          </p>
                        </div>
                        {report.status === "open" || !report.status || report.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={resolveMutation.isPending}
                            onClick={() =>
                              resolveMutation.mutate({
                                reviewId: detail._id,
                                reportId: report._id,
                              })
                            }
                          >
                            Resolve
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminReviewsPage;
