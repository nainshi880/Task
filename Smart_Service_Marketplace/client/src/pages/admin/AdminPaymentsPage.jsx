import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Receipt, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
} from "../../utils/format";

const TABS = [
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "refunds", label: "Refund history", icon: RotateCcw },
  { id: "revenue", label: "Revenue reports", icon: IndianRupee },
];

const PAYMENT_STATUSES = [
  "Created",
  "Pending",
  "Paid",
  "Failed",
  "Refunded",
];

function PaymentStatusPill({ status }) {
  const styles = {
    Created: "bg-slate-100 text-slate-600",
    Pending: "bg-amber-50 text-amber-700",
    Paid: "bg-emerald-50 text-emerald-700",
    Failed: "bg-rose-50 text-rose-700",
    Refunded: "bg-sky-50 text-sky-700",
    Processing: "bg-indigo-50 text-indigo-700",
    Cancelled: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[status] || "bg-slate-100 text-slate-600"
      )}
    >
      {status || "—"}
    </span>
  );
}

function Pagination({ pagination, onPage }) {
  if (!pagination?.hasPrevPage && !pagination?.hasNextPage) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <p className="text-sm text-slate-500">
        Page {pagination.page} of {pagination.totalPages || 1}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!pagination.hasPrevPage}
          onClick={() => onPage(Math.max(1, (pagination.page || 1) - 1))}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!pagination.hasNextPage}
          onClick={() => onPage((pagination.page || 1) + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "transactions";

  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [refundPanel, setRefundPanel] = useState(null);

  const page = Number(searchParams.get("page") || 1);
  const status = searchParams.get("status") || "";

  const setTab = (next) => {
    setSearchParams(next === "transactions" ? {} : { tab: next });
    setSelectedPaymentId(null);
  };

  const updateParams = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete("page");
    setSearchParams(next);
  };

  const txFilters = useMemo(
    () => ({
      page,
      limit: 12,
      q: searchParams.get("q") || "",
      status,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, searchParams, status]
  );

  const transactionsQuery = useQuery({
    queryKey: adminKeys.payments(txFilters),
    queryFn: () => {
      const params = { ...txFilters };
      if (!params.q) delete params.q;
      if (!params.status) delete params.status;
      return adminService.listPaymentTransactions(params);
    },
    enabled: tab === "transactions",
    retry: false,
  });

  const refundsQuery = useQuery({
    queryKey: adminKeys.refunds({ page, limit: 12 }),
    queryFn: () =>
      adminService.listPaymentRefunds({ page, limit: 12 }),
    enabled: tab === "refunds",
    retry: false,
  });

  const revenueQuery = useQuery({
    queryKey: adminKeys.revenue({ tab: "payments" }),
    queryFn: () => adminService.getRevenueAnalytics({}),
    enabled: tab === "revenue",
    retry: false,
  });

  const reportsQuery = useQuery({
    queryKey: adminKeys.paymentReports({}),
    queryFn: () => adminService.getPaymentReports({}),
    enabled: tab === "revenue",
    retry: false,
  });

  const paymentDetailQuery = useQuery({
    queryKey: adminKeys.payment(selectedPaymentId),
    queryFn: () => adminService.getPaymentDetails(selectedPaymentId),
    enabled: Boolean(selectedPaymentId),
    retry: false,
  });

  const refundMutation = useMutation({
    mutationFn: ({ paymentId, data }) =>
      adminService.refundPayment(paymentId, data),
    onSuccess: () => {
      toast.success("Refund processed");
      setRefundPanel(null);
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, "payments"],
      });
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, "refunds"],
      });
      if (selectedPaymentId) {
        queryClient.invalidateQueries({
          queryKey: adminKeys.payment(selectedPaymentId),
        });
      }
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Refund failed"),
  });

  const txItems = transactionsQuery.data?.items || [];
  const txPagination = transactionsQuery.data?.pagination || {};
  const refundItems =
    refundsQuery.data?.items || refundsQuery.data?.refunds || [];
  const refundPagination = refundsQuery.data?.pagination || {};
  const revenue = revenueQuery.data?.revenue || revenueQuery.data || {};
  const overview =
    reportsQuery.data?.overview || revenueQuery.data?.overview || {};

  const payment =
    paymentDetailQuery.data?.payment || paymentDetailQuery.data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
          <p className="mt-1 text-slate-500">
            Transactions, refunds, and revenue reports.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {tab === "transactions" && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateParams({ q: searchInput.trim() });
                }}
                className="flex flex-col gap-3 md:flex-row"
              >
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search transactions…"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <select
                  value={status}
                  onChange={(e) => updateParams({ status: e.target.value })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="">Status: All</option>
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm">
                  Search
                </Button>
              </form>
            </div>

            {transactionsQuery.isLoading ? (
              <Loader text="Loading transactions..." />
            ) : transactionsQuery.isError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                <p className="font-medium text-red-800">
                  Could not load transactions
                </p>
                <p className="mt-1 text-sm text-red-600">
                  {transactionsQuery.error?.response?.data?.message}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {txItems.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500">
                      No transactions found.
                    </p>
                  ) : (
                    txItems.map((tx) => (
                      <div
                        key={tx._id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(tx.amount || 0)}
                            </p>
                            <PaymentStatusPill status={tx.status} />
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {tx.customer?.name || "Customer"} ·{" "}
                            {tx.purpose || tx.method || "payment"}
                            {tx.booking?.serviceName
                              ? ` · ${tx.booking.serviceName}`
                              : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatRelativeTime(tx.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPaymentId(tx._id)}
                          >
                            Details
                          </Button>
                          {tx.status === "Paid" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setRefundPanel({
                                  paymentId: tx._id,
                                  amount: "",
                                  reason: "",
                                  method: "razorpay",
                                })
                              }
                            >
                              Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Pagination
                  pagination={txPagination}
                  onPage={(p) => updateParams({ page: p }, { resetPage: false })}
                />
              </div>
            )}
          </>
        )}

        {tab === "refunds" && (
          <>
            {refundsQuery.isLoading ? (
              <Loader text="Loading refunds..." />
            ) : refundsQuery.isError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                <p className="font-medium text-red-800">
                  Could not load refunds
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {refundItems.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500">
                      No refund history yet.
                    </p>
                  ) : (
                    refundItems.map((item) => (
                      <div
                        key={item._id}
                        className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(
                                item.refundedAmount || item.amount || 0
                              )}
                            </p>
                            <PaymentStatusPill status={item.status} />
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.customer?.name || "Customer"}
                            {item.booking?.serviceName
                              ? ` · ${item.booking.serviceName}`
                              : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(item.updatedAt || item.createdAt)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPaymentId(item._id)}
                        >
                          Details
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <Pagination
                  pagination={refundPagination}
                  onPage={(p) => updateParams({ page: p }, { resetPage: false })}
                />
              </div>
            )}
          </>
        )}

        {tab === "revenue" && (
          <>
            {revenueQuery.isLoading || reportsQuery.isLoading ? (
              <Loader text="Loading revenue reports..." />
            ) : revenueQuery.isError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                <p className="font-medium text-red-800">
                  Could not load revenue
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: "Gross collected",
                      value: revenue.grossCollected ?? overview.grossCollected,
                    },
                    {
                      label: "Booking revenue",
                      value: revenue.bookingRevenue ?? overview.bookingRevenue,
                    },
                    {
                      label: "Refunded",
                      value: revenue.refundedAmount ?? overview.refundedAmount,
                    },
                    {
                      label: "Net revenue",
                      value: revenue.netRevenue ?? overview.netRevenue,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {formatCurrency(stat.value ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Success rate</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600">
                      {Number(
                        revenue.successRate ?? overview.successRate ?? 0
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Failure rate</p>
                    <p className="mt-2 text-2xl font-bold text-rose-600">
                      {Number(
                        revenue.failureRate ?? overview.failureRate ?? 0
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>
                {(revenueQuery.data?.period?.from ||
                  revenueQuery.data?.period?.to) && (
                  <p className="text-sm text-slate-500">
                    Period:{" "}
                    {revenueQuery.data.period.from
                      ? formatDateTime(revenueQuery.data.period.from)
                      : "—"}{" "}
                    →{" "}
                    {revenueQuery.data.period.to
                      ? formatDateTime(revenueQuery.data.period.to)
                      : "—"}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {selectedPaymentId && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Payment details
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedPaymentId(null)}
              >
                Close
              </Button>
            </div>
            {paymentDetailQuery.isLoading ? (
              <Loader text="Loading payment..." />
            ) : paymentDetailQuery.isError ? (
              <p className="mt-3 text-sm text-rose-600">
                {paymentDetailQuery.error?.response?.data?.message ||
                  "Could not load payment."}
              </p>
            ) : payment ? (
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="text-slate-500">Amount: </span>
                  <span className="font-semibold">
                    {formatCurrency(payment.amount || 0)}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500">Status:</span>
                  <PaymentStatusPill status={payment.status} />
                </p>
                <p>
                  <span className="text-slate-500">Customer: </span>
                  {payment.customer?.name || "—"} ({payment.customer?.email})
                </p>
                <p>
                  <span className="text-slate-500">Purpose: </span>
                  {payment.purpose || "—"} · Method {payment.method || "—"}
                </p>
                <p>
                  <span className="text-slate-500">Refunded: </span>
                  {formatCurrency(payment.refundedAmount || 0)}
                </p>
                <p>
                  <span className="text-slate-500">Razorpay payment: </span>
                  {payment.razorpayPaymentId || "—"}
                </p>
                <p>
                  <span className="text-slate-500">Created: </span>
                  {formatDateTime(payment.createdAt)}
                </p>
                {payment.status === "Paid" && (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setRefundPanel({
                        paymentId: payment._id,
                        amount: "",
                        reason: "",
                        method: "razorpay",
                      })
                    }
                  >
                    Issue refund
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        )}

        {refundPanel && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="font-medium text-amber-900">Process refund</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundPanel.amount}
                onChange={(e) =>
                  setRefundPanel((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="Amount (optional = full)"
                className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none"
              />
              <select
                value={refundPanel.method}
                onChange={(e) =>
                  setRefundPanel((p) => ({ ...p, method: e.target.value }))
                }
                className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none"
              >
                <option value="razorpay">Razorpay</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <textarea
              value={refundPanel.reason}
              onChange={(e) =>
                setRefundPanel((p) => ({ ...p, reason: e.target.value }))
              }
              rows={2}
              placeholder="Reason (optional)"
              className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none"
            />
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="danger"
                loading={refundMutation.isPending}
                onClick={() =>
                  refundMutation.mutate({
                    paymentId: refundPanel.paymentId,
                    data: {
                      amount: refundPanel.amount
                        ? Number(refundPanel.amount)
                        : undefined,
                      reason: refundPanel.reason || undefined,
                      method: refundPanel.method,
                    },
                  })
                }
              >
                Confirm refund
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRefundPanel(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

export default AdminPaymentsPage;
