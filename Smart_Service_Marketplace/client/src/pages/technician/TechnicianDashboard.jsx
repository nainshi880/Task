import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase,
  CheckCircle2,
  Clock3,
  Star,
  Inbox,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import TechnicianJobCard from "../../components/technician/TechnicianJobCard";
import * as technicianService from "../../services/technician.service";
import * as notificationService from "../../services/notification.service";
import useAuth from "../../hooks/useAuth";
import { technicianKeys, notificationKeys } from "../../lib/queryClient";
import {
  formatRelativeTime,
  getGreeting,
} from "../../utils/format";

function StatCard({ label, value, icon: Icon, accent = "indigo" }) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
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

function isSameDay(dateValue, compare = new Date()) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  );
}

function EmptyList({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
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
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Finish profile setup
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const displayName = profile.name || user?.name || "Technician";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="h-16 w-16 rounded-full border-2 border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm text-indigo-100">{getGreeting()}</p>
                <h1 className="text-2xl font-bold md:text-3xl">
                  Welcome back, {displayName}
                </h1>
                <p className="mt-1 text-indigo-100">
                  {profile.workingCity
                    ? `Serving ${profile.workingCity}`
                    : "Your jobs at a glance"}
                  {profile.availability === false ? " · Currently unavailable" : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {profile.profileCompletion !== undefined && (
                <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-indigo-100">
                    Profile completion
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(profile.profileCompletion || 0)}%
                  </p>
                </div>
              )}
              <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-indigo-100">
                  Rating
                </p>
                <p className="flex items-center gap-1 text-2xl font-bold">
                  <Star size={20} className="fill-amber-300 text-amber-300" />
                  {Number(ratings.average || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Pending requests"
            value={overview.pendingRequests ?? 0}
            icon={Inbox}
            accent="amber"
          />
          <StatCard
            label="Active jobs"
            value={overview.activeJobs ?? 0}
            icon={Briefcase}
            accent="indigo"
          />
          <StatCard
            label="Completed"
            value={overview.completedJobs ?? 0}
            icon={CheckCircle2}
            accent="emerald"
          />
          <StatCard
            label="Workload"
            value={`${overview.currentWorkload ?? 0}/${overview.maxWorkload ?? 5}`}
            icon={Clock3}
            accent="sky"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Rating overview
            </h2>
            <div className="mt-4 flex items-end gap-3">
              <p className="text-4xl font-bold text-slate-900">
                {Number(ratings.average || 0).toFixed(1)}
              </p>
              <p className="mb-1 text-sm text-slate-500">
                from {ratings.totalJobsCompleted ?? 0} completed jobs
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link
                to="/technician/reviews"
                className="font-medium text-indigo-600 hover:underline"
              >
                View reviews
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Notifications
              </h2>
              <Link
                to="/technician/notifications"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            {notificationsQuery.isLoading ? (
              <Loader text="Loading notifications..." />
            ) : notifications.length === 0 ? (
              <EmptyList message="No notifications yet." />
            ) : (
              <ul className="space-y-3">
                {notifications.slice(0, 5).map((item) => (
                  <li
                    key={item._id}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                          {item.message}
                        </p>
                      </div>
                      {!item.isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Today&apos;s jobs
              </h2>
              <Link
                to="/technician/jobs"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                All jobs
              </Link>
            </div>
            {todayJobs.length === 0 ? (
              <EmptyList message="No jobs scheduled for today." />
            ) : (
              <div className="space-y-3">
                {todayJobs.map((job) => (
                  <TechnicianJobCard key={job._id} job={job} />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Pending requests
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {pendingRequests.length}
              </span>
            </div>
            {pendingRequests.length === 0 ? (
              <EmptyList message="No pending assignment requests." />
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((job) => (
                  <TechnicianJobCard key={job._id} job={job} />
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Upcoming jobs
            </h2>
            <Link
              to="/technician/jobs"
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Manage jobs
            </Link>
          </div>
          {upcomingJobs.length === 0 ? (
            <EmptyList message="No upcoming jobs on your calendar." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {upcomingJobs.map((job) => (
                <TechnicianJobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianDashboard;
