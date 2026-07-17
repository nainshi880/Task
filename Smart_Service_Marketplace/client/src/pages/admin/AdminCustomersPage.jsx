import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { formatDate, formatRelativeTime } from "../../utils/format";

function StatusPill({ active, deleted }) {
  if (deleted) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-600">
        Deleted
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase",
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      )}
    >
      {active ? "Active" : "Blocked"}
    </span>
  );
}

function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  const filters = useMemo(
    () => ({
      page: Number(searchParams.get("page") || 1),
      limit: 12,
      q: searchParams.get("q") || "",
      isActive: searchParams.get("isActive") || "",
      isVerified: searchParams.get("isVerified") || "",
      profileCompleted: searchParams.get("profileCompleted") || "",
      gender: searchParams.get("gender") || "",
      city: searchParams.get("city") || "",
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [searchParams]
  );

  const customersQuery = useQuery({
    queryKey: adminKeys.customers(filters),
    queryFn: () => adminService.fetchCustomers(filters),
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [...adminKeys.all, "customers"] });

  const blockMutation = useMutation({
    mutationFn: (userId) => adminService.blockCustomer(userId),
    onSuccess: () => {
      toast.success("Customer blocked");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Could not block customer"),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId) => adminService.unblockCustomer(userId),
    onSuccess: () => {
      toast.success("Customer unblocked");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Could not unblock customer"),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => adminService.deleteCustomer(userId),
    onSuccess: () => {
      toast.success("Customer deleted");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Could not delete customer"),
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

  const items = customersQuery.data?.items || [];
  const pagination = customersQuery.data?.pagination || {};

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
            <p className="mt-1 text-slate-500">
              Search, filter, and manage customer accounts.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={16} />
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
                placeholder="Search by name, email, or phone"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <Button type="submit" size="sm">
              Search
            </Button>
            {(filters.q ||
              filters.isActive ||
              filters.isVerified ||
              filters.profileCompleted ||
              filters.gender ||
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

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={filters.isActive}
              onChange={(e) => updateParams({ isActive: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Status: All</option>
              <option value="true">Active</option>
              <option value="false">Blocked</option>
            </select>
            <select
              value={filters.isVerified}
              onChange={(e) => updateParams({ isVerified: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Verified: All</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
            <select
              value={filters.profileCompleted}
              onChange={(e) =>
                updateParams({ profileCompleted: e.target.value })
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Profile: All</option>
              <option value="true">Completed</option>
              <option value="false">Incomplete</option>
            </select>
            <select
              value={filters.gender}
              onChange={(e) => updateParams({ gender: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Gender: All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {customersQuery.isLoading ? (
          <Loader text="Loading customers..." />
        ) : customersQuery.isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">Could not load customers</p>
            <p className="mt-1 text-sm text-red-600">
              {customersQuery.error?.response?.data?.message ||
                customersQuery.error?.message}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => customersQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No customers found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try adjusting search or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const user = item.user || {};
                const userId = user._id;
                const name = item.fullName || user.name || "Customer";
                const busy =
                  blockMutation.isPending ||
                  unblockMutation.isPending ||
                  deleteMutation.isPending;

                return (
                  <div
                    key={item._id || userId}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/customers/${userId}`}
                          className="truncate font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {name}
                        </Link>
                        <StatusPill
                          active={user.isActive}
                          deleted={user.isDeleted || item.isDeleted}
                        />
                        {user.isVerified && (
                          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-sky-700">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {user.email || "—"} · {item.phone || user.phone || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Joined {formatDate(item.createdAt || user.createdAt)}
                        {user.lastLogin
                          ? ` · Last login ${formatRelativeTime(user.lastLogin)}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/customers/${userId}`}>
                        <Button size="sm" variant="outline">
                          Details
                        </Button>
                      </Link>
                      {user.isActive ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          loading={
                            blockMutation.isPending &&
                            blockMutation.variables === userId
                          }
                          onClick={() => {
                            if (
                              window.confirm(
                                `Block ${name}? They will not be able to sign in.`
                              )
                            ) {
                              blockMutation.mutate(userId);
                            }
                          }}
                        >
                          Block
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="success"
                          disabled={busy || user.isDeleted}
                          loading={
                            unblockMutation.isPending &&
                            unblockMutation.variables === userId
                          }
                          onClick={() => unblockMutation.mutate(userId)}
                        >
                          Unblock
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy || user.isDeleted}
                        loading={
                          deleteMutation.isPending &&
                          deleteMutation.variables === userId
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              `Permanently delete ${name}? This cannot be undone.`
                            )
                          ) {
                            deleteMutation.mutate(userId);
                          }
                        }}
                      >
                        Delete
                      </Button>
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

export default AdminCustomersPage;
