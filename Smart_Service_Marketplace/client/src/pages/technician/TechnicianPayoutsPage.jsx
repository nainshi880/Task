import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Banknote } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import * as technicianService from "../../services/technician.service";
import { technicianKeys } from "../../lib/queryClient";
import { formatCurrency, formatDate } from "../../utils/format";

const PAYOUT_METHODS = ["Bank Transfer", "UPI", "Cash", "Wallet"];

const STATUS_STYLES = {
  Pending: "bg-amber-100 text-amber-800",
  Processing: "bg-sky-100 text-sky-800",
  Paid: "bg-emerald-100 text-emerald-800",
  Failed: "bg-red-100 text-red-800",
  Cancelled: "bg-slate-100 text-slate-700",
};

function TechnicianPayoutsPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [notes, setNotes] = useState("");

  const summaryQuery = useQuery({
    queryKey: technicianKeys.earningsSummary(),
    queryFn: technicianService.getEarningsSummary,
    retry: false,
  });

  const payoutsQuery = useQuery({
    queryKey: technicianKeys.payouts({ page: 1, limit: 20 }),
    queryFn: () => technicianService.getPayouts({ page: 1, limit: 20 }),
    retry: false,
  });

  const requestMutation = useMutation({
    mutationFn: technicianService.requestPayout,
    onSuccess: async () => {
      toast.success("Payout requested");
      setAmount("");
      setNotes("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: technicianKeys.payouts({}),
        }),
        queryClient.invalidateQueries({
          queryKey: technicianKeys.earningsSummary(),
        }),
        queryClient.invalidateQueries({ queryKey: technicianKeys.all }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Could not request payout"
      );
    },
  });

  const summary = summaryQuery.data || {};
  const available = summary.availableForPayout || 0;
  const payouts = payoutsQuery.data?.items || [];

  const handleRequest = (event) => {
    event.preventDefault();
    const payload = {
      method,
      notes: notes.trim() || undefined,
    };
    if (amount.trim()) {
      const value = Number(amount);
      if (Number.isNaN(value) || value <= 0) {
        toast.error("Enter a valid payout amount");
        return;
      }
      payload.amount = value;
    }
    requestMutation.mutate(payload);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            to="/technician/earnings"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to earnings
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Payouts</h1>
          <p className="mt-1 text-slate-500">
            Request withdrawals and track payout history.
          </p>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 py-5 text-white">
            <p className="text-sm text-indigo-100">Available for payout</p>
            <p className="mt-1 text-3xl font-bold">
              {summaryQuery.isLoading
                ? "…"
                : formatCurrency(available)}
            </p>
            <p className="mt-2 text-sm text-indigo-100">
              Pending requests: {formatCurrency(summary.pendingPayouts || 0)} ·
              Total paid out: {formatCurrency(summary.totalPaidOut || 0)}
            </p>
          </div>

          <form onSubmit={handleRequest} className="space-y-4 p-6">
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Banknote className="mt-0.5 text-indigo-600" size={18} />
              Leave amount blank to withdraw the full available balance.
            </div>

            <Input
              label="Amount (optional)"
              type="number"
              placeholder={`Max ${available}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium text-slate-700">
                Payout method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                {PAYOUT_METHODS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="UPI ID or bank reference notes"
              />
            </div>

            <Button
              type="submit"
              loading={requestMutation.isPending}
              disabled={available <= 0}
            >
              Request payout
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Payout history
          </h2>

          {payoutsQuery.isLoading ? (
            <Loader text="Loading payouts..." />
          ) : payoutsQuery.isError ? (
            <p className="text-sm text-slate-500">
              Could not load payout history.
            </p>
          ) : payouts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No payout requests yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Requested</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Method</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Paid at</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr
                      key={payout._id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-2.5 text-slate-800">
                        {formatDate(payout.requestedAt || payout.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {payout.method || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={clsx(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            STATUS_STYLES[payout.status] ||
                              "bg-slate-100 text-slate-700"
                          )}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {payout.paidAt ? formatDate(payout.paidAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianPayoutsPage;
