import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  IndianRupee,
  Wallet,
  TrendingUp,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as technicianService from "../../services/technician.service";
import { technicianKeys } from "../../lib/queryClient";
import { formatCurrency, formatDate } from "../../utils/format";

function StatCard({ label, value, icon: Icon, accent = "indigo" }) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function TechnicianEarningsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const summaryQuery = useQuery({
    queryKey: technicianKeys.earningsSummary(),
    queryFn: technicianService.getEarningsSummary,
    retry: false,
  });

  const monthlyQuery = useQuery({
    queryKey: technicianKeys.earningsMonthly({ year, month }),
    queryFn: () => technicianService.getMonthlyEarnings({ year, month }),
    retry: false,
  });

  const dashboardQuery = useQuery({
    queryKey: technicianKeys.dashboard(),
    queryFn: technicianService.getDashboard,
    retry: false,
  });

  const summary = summaryQuery.data || {};
  const monthly = monthlyQuery.data || {};
  const dashboardEarnings = dashboardQuery.data?.earnings || {};
  const dailyBreakdown = monthly.dailyBreakdown || [];

  const todayEarnings = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const row = dailyBreakdown.find((item) => {
      const key = String(item.date || "").slice(0, 10);
      return key === todayKey;
    });
    return row?.earnings ?? 0;
  }, [dailyBreakdown]);

  const paymentHistory = useMemo(() => {
    return [...dailyBreakdown]
      .filter((row) => (row.earnings || 0) > 0 || (row.jobs || 0) > 0)
      .reverse();
  }, [dailyBreakdown]);

  if (summaryQuery.isLoading || monthlyQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading earnings..." />
      </DashboardLayout>
    );
  }

  if (summaryQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Earnings unavailable
          </h1>
          <p className="mt-2 text-slate-500">
            {summaryQuery.error?.response?.data?.message ||
              "Could not load earnings right now."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              to="/technician/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Earnings</h1>
            <p className="mt-1 text-slate-500">
              Track daily, weekly, and monthly earnings plus wallet balance.
            </p>
          </div>
          <Link to="/technician/payouts">
            <Button>Request payout</Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today's earnings"
            value={formatCurrency(todayEarnings)}
            icon={CalendarDays}
            accent="sky"
          />
          <StatCard
            label="Weekly earnings"
            value={formatCurrency(dashboardEarnings.weekly || 0)}
            icon={TrendingUp}
            accent="indigo"
          />
          <StatCard
            label="Monthly earnings"
            value={formatCurrency(
              monthly.summary?.grossEarnings ?? dashboardEarnings.monthly ?? 0
            )}
            icon={IndianRupee}
            accent="emerald"
          />
          <StatCard
            label="Wallet balance"
            value={formatCurrency(summary.availableForPayout || 0)}
            icon={Wallet}
            accent="amber"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Gross earnings</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(summary.grossEarnings || 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Paid earnings</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(summary.paidEarnings || 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unpaid / pending</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(summary.unpaidEarnings || 0)}
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Monthly breakdown
            </h2>
            <div className="flex gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString("en-IN", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3 text-sm">
            <p>
              Jobs completed:{" "}
              <span className="font-semibold text-slate-900">
                {monthly.summary?.jobsCompleted ?? 0}
              </span>
            </p>
            <p>
              Gross:{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(monthly.summary?.grossEarnings || 0)}
              </span>
            </p>
            <p>
              Paid:{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(monthly.summary?.paidEarnings || 0)}
              </span>
            </p>
          </div>

          {(monthly.byCategory || []).length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                By category
              </h3>
              <div className="flex flex-wrap gap-2">
                {monthly.byCategory.map((item) => (
                  <span
                    key={item.category}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                  >
                    {item.category}: {formatCurrency(item.earnings || 0)} (
                    {item.jobs || 0})
                  </span>
                ))}
              </div>
            </div>
          )}

          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Payment history (daily)
          </h3>
          {paymentHistory.length === 0 ? (
            <p className="text-sm text-slate-500">
              No paid job activity in this month yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Jobs</th>
                    <th className="px-3 py-2 font-medium">Earnings</th>
                    <th className="px-3 py-2 font-medium">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((row) => (
                    <tr
                      key={row.date}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-2.5 text-slate-800">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {row.jobs || 0}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        {formatCurrency(row.earnings || 0)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {formatCurrency(row.paid || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-indigo-900">
          Pending payouts: {formatCurrency(summary.pendingPayouts || 0)} · Total
          paid out: {formatCurrency(summary.totalPaidOut || 0)} ·{" "}
          <Link to="/technician/payouts" className="font-semibold underline">
            View payout history
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianEarningsPage;
