import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { formatCurrency, formatDate } from "../../utils/format";

const TABS = [
  { id: "bookings", label: "Booking reports" },
  { id: "revenue", label: "Revenue reports" },
  { id: "customers", label: "Customer reports" },
  { id: "technicians", label: "Technician reports" },
];

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "bookings";
  const [exporting, setExporting] = useState(false);

  const months = 6;

  const bookingQuery = useQuery({
    queryKey: adminKeys.bookingReports({}),
    queryFn: () => adminService.getBookingReports({}),
    enabled: tab === "bookings",
    retry: false,
  });

  const revenueQuery = useQuery({
    queryKey: adminKeys.revenueReports({}),
    queryFn: () => adminService.getRevenueReports({}),
    enabled: tab === "revenue",
    retry: false,
  });

  const monthlyQuery = useQuery({
    queryKey: adminKeys.monthly({ months }),
    queryFn: () => adminService.getMonthlyReports({ months }),
    enabled: tab === "customers" || tab === "technicians",
    retry: false,
  });

  const growthQuery = useQuery({
    queryKey: adminKeys.growth({ months }),
    queryFn: () => adminService.getGrowthCharts({ months }),
    enabled: tab === "customers" || tab === "technicians",
    retry: false,
  });

  const setTab = (next) => {
    setSearchParams(next === "bookings" ? {} : { tab: next });
  };

  const monthlyRows = monthlyQuery.data?.reports || [];
  const totals = monthlyQuery.data?.totals || {};

  const customerGrowth = useMemo(() => {
    const series =
      growthQuery.data?.customers ||
      growthQuery.data?.customerGrowth ||
      growthQuery.data?.series?.customers ||
      [];
    return Array.isArray(series) ? series : [];
  }, [growthQuery.data]);

  const technicianGrowth = useMemo(() => {
    const series =
      growthQuery.data?.technicians ||
      growthQuery.data?.technicianGrowth ||
      growthQuery.data?.series?.technicians ||
      [];
    return Array.isArray(series) ? series : [];
  }, [growthQuery.data]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      if (tab === "bookings") {
        await adminService.downloadReportCsv("bookings", {});
        toast.success("Booking CSV downloaded");
      } else if (tab === "revenue") {
        await adminService.downloadReportCsv("revenue", {});
        toast.success("Revenue CSV downloaded");
      } else if (tab === "customers") {
        const headers = ["month", "label", "newCustomers", "newUsers"];
        const rows = monthlyRows.map((r) => ({
          month: r.month,
          label: r.label,
          newCustomers: r.users?.newCustomers ?? 0,
          newUsers: r.users?.newUsers ?? 0,
        }));
        adminService.exportRowsAsCsv(
          `customer-report-${Date.now()}.csv`,
          headers,
          rows
        );
        toast.success("Customer CSV downloaded");
      } else {
        const headers = [
          "month",
          "label",
          "newApplications",
          "approved",
        ];
        const rows = monthlyRows.map((r) => ({
          month: r.month,
          label: r.label,
          newApplications: r.technicians?.newApplications ?? 0,
          approved: r.technicians?.approved ?? 0,
        }));
        adminService.exportRowsAsCsv(
          `technician-report-${Date.now()}.csv`,
          headers,
          rows
        );
        toast.success("Technician CSV downloaded");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const bookingSummary = bookingQuery.data?.periodReport?.summary || {};
  const revenue = revenueQuery.data?.revenue || {};

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
            <p className="mt-1 text-slate-500">
              Booking, revenue, customer, and technician performance reports.
            </p>
          </div>
          <Button size="sm" loading={exporting} onClick={exportCsv}>
            <Download size={16} />
            Export CSV
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                tab === t.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "bookings" &&
          (bookingQuery.isLoading ? (
            <Loader text="Loading booking reports..." />
          ) : bookingQuery.isError ? (
            <p className="text-sm text-rose-600">
              {bookingQuery.error?.response?.data?.message ||
                "Could not load booking reports."}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Total bookings"
                  value={bookingSummary.totalBookings ?? 0}
                />
                <Stat
                  label="Total revenue"
                  value={formatCurrency(bookingSummary.totalRevenue ?? 0)}
                />
                <Stat
                  label="Paid revenue"
                  value={formatCurrency(bookingSummary.paidRevenue ?? 0)}
                />
                <Stat
                  label="Cancelled"
                  value={bookingSummary.cancelledCount ?? 0}
                />
              </div>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  By status
                </h2>
                <div className="mt-3 divide-y divide-slate-100">
                  {(bookingQuery.data?.periodReport?.byStatus || []).map(
                    (row) => (
                      <div
                        key={row.status}
                        className="flex justify-between py-2 text-sm"
                      >
                        <span className="text-slate-600">{row.status}</span>
                        <span className="font-medium text-slate-900">
                          {row.count} · {formatCurrency(row.revenue || 0)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  By category
                </h2>
                <div className="mt-3 divide-y divide-slate-100">
                  {(bookingQuery.data?.periodReport?.byCategory || []).map(
                    (row) => (
                      <div
                        key={row.category}
                        className="flex justify-between py-2 text-sm"
                      >
                        <span className="text-slate-600">{row.category}</span>
                        <span className="font-medium text-slate-900">
                          {row.count} · {formatCurrency(row.revenue || 0)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </section>
            </div>
          ))}

        {tab === "revenue" &&
          (revenueQuery.isLoading ? (
            <Loader text="Loading revenue reports..." />
          ) : revenueQuery.isError ? (
            <p className="text-sm text-rose-600">
              {revenueQuery.error?.response?.data?.message ||
                "Could not load revenue reports."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat
                label="Gross collected"
                value={formatCurrency(revenue.grossCollected ?? 0)}
              />
              <Stat
                label="Booking revenue"
                value={formatCurrency(revenue.bookingRevenue ?? 0)}
              />
              <Stat
                label="Refunded"
                value={formatCurrency(revenue.refundedAmount ?? 0)}
              />
              <Stat
                label="Net revenue"
                value={formatCurrency(revenue.netRevenue ?? 0)}
              />
              <Stat
                label="Success rate"
                value={`${Number(revenue.successRate || 0).toFixed(1)}%`}
              />
            </div>
          ))}

        {tab === "customers" &&
          (monthlyQuery.isLoading || growthQuery.isLoading ? (
            <Loader text="Loading customer reports..." />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Stat label="New users (period)" value={totals.newUsers ?? 0} />
                <Stat
                  label="Months covered"
                  value={monthlyRows.length}
                />
              </div>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <FileBarChart size={18} />
                  Monthly customer signups
                </h2>
                <div className="divide-y divide-slate-100">
                  {monthlyRows.map((row) => (
                    <div
                      key={row.month || row.label}
                      className="flex justify-between py-2.5 text-sm"
                    >
                      <span className="text-slate-600">
                        {row.label || row.month}
                      </span>
                      <span className="font-medium text-slate-900">
                        {row.users?.newCustomers ?? 0} customers ·{" "}
                        {row.users?.newUsers ?? 0} users
                      </span>
                    </div>
                  ))}
                  {monthlyRows.length === 0 && (
                    <p className="py-4 text-sm text-slate-500">No data yet.</p>
                  )}
                </div>
              </section>
              {customerGrowth.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-lg font-semibold text-slate-900">
                    Growth series
                  </h2>
                  <div className="divide-y divide-slate-100">
                    {customerGrowth.map((point, idx) => (
                      <div
                        key={point.label || point.month || idx}
                        className="flex justify-between py-2 text-sm"
                      >
                        <span className="text-slate-600">
                          {point.label ||
                            point.month ||
                            formatDate(point.date) ||
                            `Point ${idx + 1}`}
                        </span>
                        <span className="font-medium text-slate-900">
                          {point.count ?? point.value ?? point.total ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ))}

        {tab === "technicians" &&
          (monthlyQuery.isLoading || growthQuery.isLoading ? (
            <Loader text="Loading technician reports..." />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Stat
                  label="Applications (period)"
                  value={monthlyRows.reduce(
                    (sum, r) => sum + (r.technicians?.newApplications || 0),
                    0
                  )}
                />
                <Stat
                  label="Approved (period)"
                  value={monthlyRows.reduce(
                    (sum, r) => sum + (r.technicians?.approved || 0),
                    0
                  )}
                />
              </div>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  Monthly technician pipeline
                </h2>
                <div className="divide-y divide-slate-100">
                  {monthlyRows.map((row) => (
                    <div
                      key={row.month || row.label}
                      className="flex justify-between py-2.5 text-sm"
                    >
                      <span className="text-slate-600">
                        {row.label || row.month}
                      </span>
                      <span className="font-medium text-slate-900">
                        {row.technicians?.newApplications ?? 0} applied ·{" "}
                        {row.technicians?.approved ?? 0} approved
                      </span>
                    </div>
                  ))}
                  {monthlyRows.length === 0 && (
                    <p className="py-4 text-sm text-slate-500">No data yet.</p>
                  )}
                </div>
              </section>
              {technicianGrowth.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-lg font-semibold text-slate-900">
                    Growth series
                  </h2>
                  <div className="divide-y divide-slate-100">
                    {technicianGrowth.map((point, idx) => (
                      <div
                        key={point.label || point.month || idx}
                        className="flex justify-between py-2 text-sm"
                      >
                        <span className="text-slate-600">
                          {point.label ||
                            point.month ||
                            formatDate(point.date) ||
                            `Point ${idx + 1}`}
                        </span>
                        <span className="font-medium text-slate-900">
                          {point.count ?? point.value ?? point.total ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ))}
      </div>
    </DashboardLayout>
  );
}

export default AdminReportsPage;
