import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Wrench } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { formatDate } from "../../utils/format";

const STATUS_OPTIONS = [
  { value: "", label: "Status: All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function ApplicationBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase",
        styles[status] || "bg-slate-100 text-slate-600"
      )}
    >
      {status || "unknown"}
    </span>
  );
}

function AdminTechniciansPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [reasonPrompt, setReasonPrompt] = useState(null);

  const filters = useMemo(
    () => ({
      page: Number(searchParams.get("page") || 1),
      limit: 12,
      q: searchParams.get("q") || "",
      applicationStatus: searchParams.get("applicationStatus") || "",
      isSuspended: searchParams.get("isSuspended") || "",
      city: searchParams.get("city") || "",
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [searchParams]
  );

  const techniciansQuery = useQuery({
    queryKey: adminKeys.technicians(filters),
    queryFn: () => {
      const params = { ...filters };
      if (!params.q) delete params.q;
      if (!params.applicationStatus) delete params.applicationStatus;
      if (!params.isSuspended) delete params.isSuspended;
      if (!params.city) delete params.city;
      return adminService.listTechnicians(params);
    },
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: [...adminKeys.all, "technicians"],
    });

  const approveMutation = useMutation({
    mutationFn: (id) => adminService.approveTechnician(id),
    onSuccess: () => {
      toast.success("Technician approved");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Approve failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      adminService.rejectTechnician(id, { reason }),
    onSuccess: () => {
      toast.success("Application rejected");
      setReasonPrompt(null);
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Reject failed"),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      adminService.suspendTechnician(id, { reason }),
    onSuccess: () => {
      toast.success("Technician suspended");
      setReasonPrompt(null);
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Suspend failed"),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id) => adminService.unsuspendTechnician(id),
    onSuccess: () => {
      toast.success("Technician unsuspended");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Unsuspend failed"),
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => adminService.verifyTechnician(id),
    onSuccess: () => {
      toast.success("Documents / account verified");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Verify failed"),
  });

  const updateParams = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete("page");
    setSearchParams(next);
  };

  const applySearch = (e) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim() });
  };

  const items = techniciansQuery.data?.items || [];
  const pagination = techniciansQuery.data?.pagination || {};
  const actionBusy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    suspendMutation.isPending ||
    unsuspendMutation.isPending ||
    verifyMutation.isPending;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Technicians</h1>
            <p className="mt-1 text-slate-500">
              Review applications, verify documents, and manage status.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Wrench size={16} />
            {pagination.total ?? "—"} total
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={applySearch}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, phone, or city"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <Button type="submit" size="sm">
              Search
            </Button>
            {(filters.q ||
              filters.applicationStatus ||
              filters.isSuspended ||
              filters.city) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setSearchParams({});
                }}
              >
                Clear
              </Button>
            )}
          </form>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <select
              value={filters.applicationStatus}
              onChange={(e) =>
                updateParams({ applicationStatus: e.target.value })
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={filters.isSuspended}
              onChange={(e) => updateParams({ isSuspended: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Suspension: All</option>
              <option value="false">Not suspended</option>
              <option value="true">Suspended</option>
            </select>
            <input
              value={filters.city}
              onChange={(e) => updateParams({ city: e.target.value })}
              placeholder="Filter by city"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateParams({ applicationStatus: "pending" })}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                filters.applicationStatus === "pending"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Pending approvals
            </button>
          </div>
        </div>

        {reasonPrompt && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="font-medium text-amber-900">
              {reasonPrompt.type === "reject"
                ? `Reject ${reasonPrompt.name}?`
                : `Suspend ${reasonPrompt.name}?`}
            </p>
            <textarea
              value={reasonPrompt.reason}
              onChange={(e) =>
                setReasonPrompt((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows={2}
              placeholder="Reason (optional)"
              className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="danger"
                loading={
                  rejectMutation.isPending || suspendMutation.isPending
                }
                onClick={() => {
                  if (reasonPrompt.type === "reject") {
                    rejectMutation.mutate({
                      id: reasonPrompt.id,
                      reason: reasonPrompt.reason,
                    });
                  } else {
                    suspendMutation.mutate({
                      id: reasonPrompt.id,
                      reason: reasonPrompt.reason,
                    });
                  }
                }}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReasonPrompt(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {techniciansQuery.isLoading ? (
          <Loader text="Loading technicians..." />
        ) : techniciansQuery.isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">
              Could not load technicians
            </p>
            <p className="mt-1 text-sm text-red-600">
              {techniciansQuery.error?.response?.data?.message ||
                techniciansQuery.error?.message}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => techniciansQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No technicians found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try adjusting search or status filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const user = item.user || {};
                const techId = user._id;
                const name = item.fullName || user.name || "Technician";

                return (
                  <div
                    key={item._id || techId}
                    className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/technicians/${techId}`}
                          className="truncate font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {name}
                        </Link>
                        <ApplicationBadge status={item.applicationStatus} />
                        {item.isSuspended && (
                          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-rose-700">
                            Suspended
                          </span>
                        )}
                        {user.isVerified && (
                          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-sky-700">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {user.email || "—"} · {item.phone || user.phone || "—"}
                        {item.workingCity ? ` · ${item.workingCity}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Rating {Number(item.rating || user.rating || 0).toFixed(1)} ·{" "}
                        {item.totalJobsCompleted || 0} jobs · Joined{" "}
                        {formatDate(item.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/technicians/${techId}`}>
                        <Button size="sm" variant="outline">
                          Profile
                        </Button>
                      </Link>
                      {!user.isVerified && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionBusy}
                          onClick={() => verifyMutation.mutate(techId)}
                        >
                          Verify
                        </Button>
                      )}
                      {item.applicationStatus === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            disabled={actionBusy}
                            onClick={() => approveMutation.mutate(techId)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={actionBusy}
                            onClick={() =>
                              setReasonPrompt({
                                type: "reject",
                                id: techId,
                                name,
                                reason: "",
                              })
                            }
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {item.applicationStatus === "approved" &&
                        (item.isSuspended ? (
                          <Button
                            size="sm"
                            variant="success"
                            disabled={actionBusy}
                            onClick={() => unsuspendMutation.mutate(techId)}
                          >
                            Unsuspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={actionBusy}
                            onClick={() =>
                              setReasonPrompt({
                                type: "suspend",
                                id: techId,
                                name,
                                reason: "",
                              })
                            }
                          >
                            Suspend
                          </Button>
                        ))}
                    </div>
                  </div>
                );
              })}
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
                    onClick={() =>
                      updateParams(
                        { page: Math.max(1, (pagination.page || 1) - 1) },
                        { resetPage: false }
                      )
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination.hasNextPage}
                    onClick={() =>
                      updateParams(
                        { page: (pagination.page || 1) + 1 },
                        { resetPage: false }
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminTechniciansPage;
