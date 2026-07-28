import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, IndianRupee, RefreshCw, Users } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import {
  DashboardSection,
  DashboardStatCard,
} from "../../components/dashboard/DashboardPrimitives";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { formatCurrency, formatDate, formatRelativeTime } from "../../utils/format";

function StatusPill({ status }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    authenticated: "bg-emerald-50 text-emerald-700",
    created: "bg-slate-100 text-slate-600",
    cancelled: "bg-rose-50 text-rose-700",
    halted: "bg-amber-50 text-amber-700",
    expired: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[status] || "bg-slate-100 text-slate-600"
      )}
    >
      {status?.replace(/_/g, " ") || "—"}
    </span>
  );
}

function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const analyticsQuery = useQuery({
    queryKey: adminKeys.subscriptionAnalytics(),
    queryFn: adminService.getSubscriptionAnalytics,
  });

  const plansQuery = useQuery({
    queryKey: adminKeys.subscriptionPlans(),
    queryFn: adminService.listSubscriptionPlans,
  });

  const listQuery = useQuery({
    queryKey: adminKeys.subscriptions({ page }),
    queryFn: () => adminService.listSubscriptions({ page, limit: 15 }),
  });

  const syncMutation = useMutation({
    mutationFn: adminService.syncPlanToRazorpay,
    onSuccess: () => {
      toast.success("Plan synced to Razorpay.");
      queryClient.invalidateQueries({ queryKey: adminKeys.subscriptionPlans() });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Razorpay sync failed.");
    },
  });

  const analytics = analyticsQuery.data || {};
  const plans = plansQuery.data || [];
  const items = listQuery.data?.items || [];
  const pagination = listQuery.data?.pagination || {};

  if (analyticsQuery.isLoading && listQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading subscriptions..." />
      </DashboardLayout>
    );
  }

  const proPlan = plans.find((p) => p.code === "pro");

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage technician plans, Razorpay sync, and subscription analytics.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            label="Active Pro"
            value={analytics.activeProSubscriptions ?? 0}
            icon={Crown}
            accent="amber"
          />
          <DashboardStatCard
            label="Free technicians"
            value={analytics.freeSubscriptions ?? 0}
            icon={Users}
            accent="indigo"
          />
          <DashboardStatCard
            label="Pro records"
            value={analytics.proSubscriptions ?? 0}
            icon={Users}
            accent="violet"
          />
          <DashboardStatCard
            label="Est. MRR"
            value={formatCurrency(analytics.estimatedMrr ?? 0)}
            icon={IndianRupee}
            accent="emerald"
          />
        </div>

        <DashboardSection
          title="Plans"
          subtitle="Default Free and Pro plans are auto-seeded on first use."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan._id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{plan.name}</p>
                    <p className="text-sm capitalize text-slate-500">
                      {plan.code} · {plan.interval}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(plan.price)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                {plan.razorpayPlanId ? (
                  <p className="mt-3 text-xs text-slate-400">
                    Razorpay: {plan.razorpayPlanId}
                  </p>
                ) : plan.code === "pro" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    loading={syncMutation.isPending}
                    onClick={() => syncMutation.mutate(plan._id)}
                  >
                    <RefreshCw size={14} className="mr-1.5" />
                    Sync to Razorpay
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {proPlan && !proPlan.razorpayPlanId ? (
            <p className="mt-3 text-sm text-amber-700">
              Sync the Pro plan to Razorpay before technicians can subscribe.
            </p>
          ) : null}
        </DashboardSection>

        <DashboardSection
          title="Technician subscriptions"
          subtitle="All subscription records across the platform."
        >
          {listQuery.isLoading ? (
            <Loader text="Loading subscriptions..." />
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">No subscriptions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="px-3 py-2 font-medium">Technician</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Claims</th>
                    <th className="px-3 py-2 font-medium">Period end</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id} className="border-b border-slate-50">
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900">
                          {item.technician?.name || "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.technician?.email}
                        </p>
                      </td>
                      <td className="px-3 py-3 capitalize">
                        {item.plan?.name || item.tier}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="px-3 py-3">
                        {item.jobsClaimedThisPeriod ?? 0}
                      </td>
                      <td className="px-3 py-3">
                        {formatDate(item.currentPeriodEnd)}
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {formatRelativeTime(item.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(pagination.hasPrevPage || pagination.hasNextPage) && (
            <div className="mt-4 flex justify-between">
              <Button
                size="sm"
                variant="outline"
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
}

export default AdminSubscriptionsPage;
