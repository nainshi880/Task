import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { formatCurrency } from "../../utils/format";

const PIE_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#e11d48",
  "#7c3aed",
  "#0284c7",
  "#65a30d",
];

function ChartCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="h-72 w-full">{children}</div>
    </section>
  );
}

function AdminAnalyticsPage() {
  const [months, setMonths] = useState(12);

  const overviewQuery = useQuery({
    queryKey: adminKeys.dashboard({ scope: "analytics" }),
    queryFn: () => adminService.getDashboardMetrics(),
    retry: false,
  });

  const growthQuery = useQuery({
    queryKey: adminKeys.growth({ months }),
    queryFn: () => adminService.getGrowthCharts({ months }),
    retry: false,
  });

  const monthlyQuery = useQuery({
    queryKey: adminKeys.monthly({ months }),
    queryFn: () => adminService.getMonthlyReports({ months }),
    retry: false,
  });

  const growthCharts = growthQuery.data?.charts || [];
  const monthlyReports = monthlyQuery.data?.reports || [];
  const categoryData = overviewQuery.data?.breakdown?.bookingsByCategory || [];
  const monthlyTotals = monthlyQuery.data?.totals || {};

  const revenueTrend = useMemo(
    () =>
      growthCharts.map((row) => ({
        label: row.label || row.month,
        revenue: row.revenue?.amount || 0,
        transactions: row.revenue?.transactions || 0,
      })),
    [growthCharts]
  );

  const bookingTrend = useMemo(
    () =>
      growthCharts.map((row) => ({
        label: row.label || row.month,
        total: row.bookings?.total || 0,
        completed: row.bookings?.completed || 0,
      })),
    [growthCharts]
  );

  const customerGrowth = useMemo(
    () =>
      growthCharts.map((row) => ({
        label: row.label || row.month,
        new: row.users?.new || 0,
        cumulative: row.users?.cumulative || 0,
      })),
    [growthCharts]
  );

  const technicianGrowth = useMemo(
    () =>
      growthCharts.map((row) => ({
        label: row.label || row.month,
        new: row.technicians?.new || 0,
        cumulative: row.technicians?.cumulative || 0,
      })),
    [growthCharts]
  );

  const performanceData = useMemo(
    () =>
      monthlyReports.map((row) => ({
        label: row.label || row.month,
        bookings: row.bookings?.total || 0,
        completed: row.bookings?.completed || 0,
        revenue: row.revenue?.amount || row.revenue?.net || 0,
        newUsers: row.users?.newUsers || row.users?.newCustomers || 0,
      })),
    [monthlyReports]
  );

  const pieData = useMemo(
    () =>
      categoryData.map((item) => ({
        name: item.category,
        value: item.count || 0,
        revenue: item.revenue || 0,
      })),
    [categoryData]
  );

  const loading =
    overviewQuery.isLoading || growthQuery.isLoading || monthlyQuery.isLoading;

  if (loading) {
    return (
      <DashboardLayout>
        <Loader text="Loading analytics..." />
      </DashboardLayout>
    );
  }

  if (growthQuery.isError && overviewQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Analytics unavailable
          </h1>
          <p className="mt-2 text-slate-500">
            {growthQuery.error?.response?.data?.message ||
              overviewQuery.error?.response?.data?.message ||
              "Could not load analytics data."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              to="/admin/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
            <p className="mt-1 text-slate-500">
              Revenue, bookings, growth, and monthly performance.
            </p>
          </div>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
          >
            {[6, 12, 18, 24].map((value) => (
              <option key={value} value={value}>
                Last {value} months
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Period bookings</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {monthlyTotals.bookings ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {monthlyTotals.completedBookings ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Revenue</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(monthlyTotals.revenue || monthlyTotals.netRevenue || 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">New users</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {monthlyTotals.newUsers ?? 0}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartCard
            title="Revenue chart"
            description="Monthly revenue over the selected period"
          >
            {revenueTrend.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    fill="url(#revFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Booking trends"
            description="Total vs completed bookings by month"
          >
            {bookingTrend.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Service category distribution"
            description="Share of bookings by service category"
          >
            {pieData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, props) => [
                      `${value} bookings · ${formatCurrency(props.payload.revenue || 0)}`,
                      props.payload.name,
                    ]}
                    contentStyle={{ borderRadius: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Customer growth"
            description="New and cumulative users by month"
          >
            {customerGrowth.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={customerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="new"
                    name="New"
                    stroke="#0891b2"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Technician growth"
            description="New and cumulative technicians by month"
          >
            {technicianGrowth.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={technicianGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="new"
                    name="New"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Monthly performance"
            description="Bookings and revenue from monthly reports"
          >
            {performanceData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "Revenue" ? formatCurrency(value) : value
                    }
                    contentStyle={{ borderRadius: 12 }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="bookings"
                    name="Bookings"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#14b8a6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">
      No data available for this period.
    </div>
  );
}

export default AdminAnalyticsPage;
