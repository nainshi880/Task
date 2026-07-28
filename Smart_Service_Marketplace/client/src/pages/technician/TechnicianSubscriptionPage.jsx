import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Check,
  Crown,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import { DashboardSection } from "../../components/dashboard/DashboardPrimitives";
import * as subscriptionService from "../../services/subscription.service";
import { technicianKeys } from "../../lib/queryClient";
import { formatCurrency, formatDate } from "../../utils/format";

function PlanFeature({ children }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-600">
      <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
      <span>{children}</span>
    </li>
  );
}

function TechnicianSubscriptionPage() {
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: technicianKeys.subscription(),
    queryFn: async () => {
      const [plans, current] = await Promise.all([
        subscriptionService.listPlans(),
        subscriptionService.getCurrent(),
      ]);
      return { plans, current };
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: subscriptionService.payForProSubscription,
    onSuccess: () => {
      toast.success("Pro subscription activated!");
      queryClient.invalidateQueries({ queryKey: technicianKeys.all });
    },
    onError: (error) => {
      const message =
        error.message ||
        error.response?.data?.message ||
        "Upgrade failed.";
      toast.error(message);
      if (/upi|qr|validate\/account|internal server/i.test(message)) {
        toast(
          "Tip: In Razorpay test mode, pay with Card — use 4111 1111 1111 1111, any future expiry, any CVV.",
          { duration: 6000, icon: "💳" }
        );
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionService.cancelSubscription(),
    onSuccess: () => {
      toast.success("Subscription will cancel at period end.");
      queryClient.invalidateQueries({ queryKey: technicianKeys.all });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Could not cancel subscription."
      );
    },
  });

  if (plansQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading subscription plans..." />
      </DashboardLayout>
    );
  }

  const { plans = [], current = {} } = plansQuery.data || {};
  const isPro = current.isPro;
  const proPlan = plans.find((p) => p.code === "pro");
  const freePlan = plans.find((p) => p.code === "free");

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-7">
        <div>
          <p className="text-sm font-medium text-indigo-600">Subscription</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Choose your technician plan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Free includes limited monthly job claims. Pro unlocks unlimited
            claims and priority matching.
          </p>
        </div>

        <DashboardSection
          title="Current plan"
          subtitle={
            isPro
              ? "You are on Pro — unlimited job claims enabled."
              : "You are on Free — upgrade for unlimited claims."
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={clsx(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
                isPro
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-700"
              )}
            >
              {isPro ? <Crown size={14} /> : <Sparkles size={14} />}
              {isPro ? "Pro" : "Free"}
            </span>
            {!isPro && current.remainingClaims != null ? (
              <span className="text-sm text-slate-500">
                {current.remainingClaims} claim
                {current.remainingClaims !== 1 ? "s" : ""} left this month
              </span>
            ) : null}
            {current.currentPeriodEnd ? (
              <span className="text-sm text-slate-500">
                Renews / ends {formatDate(current.currentPeriodEnd)}
              </span>
            ) : null}
            {current.cancelAtPeriodEnd ? (
              <span className="text-sm font-medium text-amber-700">
                Cancels at period end
              </span>
            ) : null}
          </div>

          {isPro && !current.cancelAtPeriodEnd ? (
            <Button
              variant="outline"
              className="mt-4"
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Cancel at period end
            </Button>
          ) : null}
        </DashboardSection>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Free</h2>
              <span className="text-2xl font-bold text-slate-900">₹0</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {freePlan?.description || "Get started with basic access."}
            </p>
            <ul className="mt-5 space-y-2">
              {(freePlan?.features || []).map((feature) => (
                <PlanFeature key={feature}>{feature}</PlanFeature>
              ))}
            </ul>
            {!isPro ? (
              <p className="mt-5 text-sm font-medium text-emerald-700">
                Current plan
              </p>
            ) : null}
          </div>

          <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
            <div className="absolute right-4 top-1.5 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              Recommended
            </div>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Crown size={18} className="text-amber-500" />
                Pro
              </h2>
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(proPlan?.price || 999)}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {proPlan?.description || "Unlimited claims and priority matching."}
            </p>
            <ul className="mt-5 space-y-2">
              {(proPlan?.features || []).map((feature) => (
                <PlanFeature key={feature}>{feature}</PlanFeature>
              ))}
            </ul>

            {isPro ? (
              <p className="mt-5 text-sm font-medium text-emerald-700">
                Current plan
              </p>
            ) : (
              <>
                <Button
                  className="mt-5 w-full"
                  loading={upgradeMutation.isPending}
                  onClick={() => upgradeMutation.mutate()}
                >
                  Upgrade to Pro
                </Button>
                <p className="mt-3 text-xs text-slate-500">
                  Test mode tip: prefer <strong>Card</strong> payment
                  (4111&nbsp;1111&nbsp;1111&nbsp;1111). UPI QR often fails on
                  Razorpay test keys.
                </p>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500">
          <Link to="/technician/dashboard" className="text-indigo-600 hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianSubscriptionPage;
