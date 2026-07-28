import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Crown,
  Inbox,
  MessageSquare,
  Settings2,
  Star,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import TechnicianJobCard from "../../components/technician/TechnicianJobCard";
import {
  DashboardEmpty,
  DashboardLink,
  DashboardMetaPill,
  DashboardQuickActions,
  DashboardSection,
  DashboardStatCard,
  DashboardWelcome,
  WorkloadBar,
} from "../../components/dashboard/DashboardPrimitives";
import * as technicianService from "../../services/technician.service";
import * as notificationService from "../../services/notification.service";
import useAuth from "../../hooks/useAuth";
import { technicianKeys, notificationKeys } from "../../lib/queryClient";
import { formatRelativeTime, getGreeting } from "../../utils/format";

function isSameDay(dateValue, compare = new Date()) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  );
}

function TechnicianDashboard() {
  const { user } = useAuth();

  const dashboardQuery = useQuery({
    queryKey: technicianKeys.dashboard(),
    queryFn: technicianService.getDashboard,
    retry: false,
  });

  const notificationsQuery = useQuery({
    queryKey: notificationKeys.list({ limit: 5 }),
    queryFn: () => notificationService.listNotifications({ limit: 5, page: 1 }),
    retry: false,
  });

  const data = dashboardQuery.data || {};
  const profile = data.profile || {};
  const overview = data.overview || {};
  const ratings = data.ratings || {};
  const lists = data.lists || {};

  const todayJobs = useMemo(() => {
    const pool = [
      ...(lists.activeJobs || []),
      ...(lists.upcomingJobs || []),
      ...(lists.pendingRequests || []),
    ];
    const seen = new Set();
    return pool.filter((job) => {
      if (!isSameDay(job.bookingDate) || seen.has(job._id)) return false;
      seen.add(job._id);
      return true;
    });
  }, [lists]);

  const upcomingJobs = lists.upcomingJobs || [];
  const pendingRequests = lists.pendingRequests || [];
  const notifications =
    notificationsQuery.data?.items ||
    notificationsQuery.data?.notifications ||
    [];

  if (dashboardQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading technician dashboard..." />
      </DashboardLayout>
    );
  }

  if (dashboardQuery.isError) {
    const isMissing = dashboardQuery.error?.response?.status === 404;
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UserRound size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isMissing ? "Complete your profile" : "Dashboard unavailable"}
          </h1>
          <p className="mt-2 text-slate-500">
            {isMissing
              ? "Finish technician setup to view your jobs."
              : dashboardQuery.error?.response?.data?.message ||
                "We could not load your dashboard right now."}
          </p>
          <Link
            to="/setup/technician"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Finish profile setup
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const displayName = profile.name || user?.name || "Technician";
  const isAvailable = profile.availability !== false;
  const ratingValue = Number(ratings.average || 0).toFixed(1);
  const subscription = data.subscription || {};
  const isPro = subscription.isPro;

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <DashboardWelcome
          greeting={getGreeting()}
          title={`Welcome back, ${displayName}`}
          subtitle={
            profile.workingCity
              ? `Serving ${profile.workingCity}${
                  isAvailable ? "" : " · Currently unavailable"
                }`
              : isAvailable
                ? "Your jobs and requests at a glance"
                : "You are marked unavailable for new jobs"
          }
          avatarUrl={profile.avatar}
          avatarFallback={displayName.charAt(0).toUpperCase()}
          actions={
            <Link
              to="/technician/jobs"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-indigo-50"
            >
              <Briefcase size={16} />
              Open jobs
            </Link>
          }
        >
          <div
            className={`rounded-xl border px-4 py-3 backdrop-blur-sm ${
              isAvailable
                ? "border-emerald-400/30 bg-emerald-400/15"
                : "border-white/10 bg-white/10"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Availability
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold">
              <span
                className={`h-2 w-2 rounded-full ${
                  isAvailable ? "bg-emerald-400" : "bg-slate-400"
                }`}
              />
              {isAvailable ? "Accepting jobs" : "Unavailable"}
            </p>
          </div>
          {profile.profileCompletion !== undefined ? (
            <DashboardMetaPill
              label="Profile"
              value={`${Math.round(profile.profileCompletion || 0)}%`}
            />
          ) : null}
          <DashboardMetaPill label="Rating" value={ratingValue} icon={Star} />
          <DashboardMetaPill
            label="Plan"
            value={isPro ? "Pro" : "Free"}
            icon={isPro ? Crown : undefined}
          />
        </DashboardWelcome>

        {!isPro ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">
                {subscription.remainingClaims != null
                  ? `${subscription.remainingClaims} free claim${subscription.remainingClaims !== 1 ? "s" : ""} left this month`
                  : "Upgrade to Pro for unlimited job claims"}
              </p>
              <p className="text-sm text-indigo-800/80">
                Pro technicians get priority matching and unlimited claims.
              </p>
            </div>
            <Link
              to="/technician/subscription"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Crown size={16} />
              View plans
            </Link>
          </div>
        ) : null}

        {!subscription.canClaimJobs && subscription.claimRestriction ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {subscription.claimRestriction}
          </div>
        ) : null}

        {pendingRequests.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {pendingRequests.length} open request
                {pendingRequests.length !== 1 ? "s" : ""} waiting
              </p>
              <p className="text-sm text-amber-800/80">
                Accept quickly — first technician to claim wins the job.
              </p>
            </div>
            <Link
              to="/technician/jobs"
              className="inline-flex shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Review requests
            </Link>
          </div>
        ) : null}

        <DashboardQuickActions
          actions={[
            {
              to: "/technician/jobs",
              label: "My jobs",
              description: "Active and upcoming work",
              icon: Briefcase,
              tone: "bg-indigo-50 text-indigo-600",
            },
            {
              to: "/technician/availability",
              label: "Availability",
              description: "Hours and online status",
              icon: CalendarClock,
              tone: "bg-emerald-50 text-emerald-600",
            },
            {
              to: "/technician/reviews",
              label: "Reviews",
              description: "Customer feedback",
              icon: Star,
              tone: "bg-amber-50 text-amber-600",
            },
            {
              to: "/technician/subscription",
              label: "Subscription",
              description: isPro ? "Manage Pro plan" : "Upgrade to Pro",
              icon: Crown,
              tone: "bg-amber-50 text-amber-600",
            },
            {
              to: "/chat",
              label: "Messages",
              description: "Chat with customers",
              icon: MessageSquare,
              tone: "bg-violet-50 text-violet-600",
            },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            label="Pending requests"
            value={overview.pendingRequests ?? 0}
            icon={Inbox}
            accent="amber"
            hint="Open offers you can claim"
          />
          <DashboardStatCard
            label="Active jobs"
            value={overview.activeJobs ?? 0}
            icon={Briefcase}
            accent="indigo"
          />
          <DashboardStatCard
            label="Completed"
            value={overview.completedJobs ?? 0}
            icon={CheckCircle2}
            accent="emerald"
          />
          <DashboardStatCard
            label="Workload"
            value={`${overview.currentWorkload ?? 0}/${overview.maxWorkload ?? 5}`}
            icon={Clock3}
            accent="sky"
            hint="Jobs currently assigned to you"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <DashboardSection
            title="Performance"
            subtitle="How customers rate your work"
            className="lg:col-span-1"
          >
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold tracking-tight text-slate-900">
                {ratingValue}
              </p>
              <div className="mb-1">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < Math.round(Number(ratings.average || 0))
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      }
                    />
                  ))}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {ratings.totalJobsCompleted ?? 0} completed jobs
                </p>
              </div>
            </div>

            <div className="mt-5">
              <WorkloadBar
                current={overview.currentWorkload ?? 0}
                max={overview.maxWorkload ?? 5}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <DashboardLink to="/technician/reviews">View reviews</DashboardLink>
              <DashboardLink to="/technician/availability">
                Update availability
              </DashboardLink>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Notifications"
            subtitle="Job offers and updates"
            action={
              <DashboardLink to="/technician/notifications">View all</DashboardLink>
            }
            className="lg:col-span-2"
          >
            {notificationsQuery.isLoading ? (
              <Loader text="Loading notifications..." />
            ) : notifications.length === 0 ? (
              <DashboardEmpty message="No notifications yet." />
            ) : (
              <ul className="space-y-2.5">
                {notifications.slice(0, 5).map((item) => (
                  <li
                    key={item._id}
                    className={`rounded-xl border px-4 py-3 ${
                      item.isRead
                        ? "border-slate-100 bg-slate-50/80"
                        : "border-indigo-100 bg-indigo-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                          {item.message}
                        </p>
                      </div>
                      {!item.isRead ? (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardSection
            title="Today's jobs"
            subtitle="On your schedule for today"
            action={<DashboardLink to="/technician/jobs">All jobs</DashboardLink>}
          >
            {todayJobs.length === 0 ? (
              <DashboardEmpty
                icon={Briefcase}
                message="No jobs scheduled for today."
                actionLabel="Check open requests"
                actionTo="/technician/jobs"
              />
            ) : (
              <div className="space-y-3">
                {todayJobs.map((job) => (
                  <TechnicianJobCard key={job._id} job={job} />
                ))}
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            title="Pending requests"
            subtitle="Claim before someone else does"
            action={
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {pendingRequests.length}
              </span>
            }
          >
            {pendingRequests.length === 0 ? (
              <DashboardEmpty
                icon={Inbox}
                message="No pending assignment requests."
              />
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((job) => (
                  <TechnicianJobCard key={job._id} job={job} />
                ))}
              </div>
            )}
          </DashboardSection>
        </div>

        <DashboardSection
          title="Upcoming jobs"
          subtitle="Your next confirmed and assigned work"
          action={
            <div className="flex items-center gap-3">
              <DashboardLink to="/technician/settings">
                <span className="inline-flex items-center gap-1">
                  <Settings2 size={14} />
                  Settings
                </span>
              </DashboardLink>
              <DashboardLink to="/technician/jobs">Manage jobs</DashboardLink>
            </div>
          }
        >
          {upcomingJobs.length === 0 ? (
            <DashboardEmpty
              icon={CalendarClock}
              message="No upcoming jobs on your calendar."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {upcomingJobs.map((job) => (
                <TechnicianJobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianDashboard;
