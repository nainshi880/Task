import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import TechnicianJobCard from "../../components/technician/TechnicianJobCard";
import * as technicianJobsService from "../../services/technicianJobs.service";
import { technicianKeys } from "../../lib/queryClient";
import { JOB_TABS, bucketJobs } from "../../constants/technicianJobs";

const TAB_CONFIG = [
  { id: JOB_TABS.incoming, label: "Incoming" },
  { id: JOB_TABS.upcoming, label: "Upcoming" },
  { id: JOB_TABS.ongoing, label: "Ongoing" },
  { id: JOB_TABS.completed, label: "Completed" },
  { id: JOB_TABS.cancelled, label: "Cancelled" },
];

function TechnicianJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = TAB_CONFIG.some((tab) => tab.id === tabParam)
    ? tabParam
    : JOB_TABS.incoming;

  const jobsQuery = useQuery({
    queryKey: technicianKeys.jobs({ scope: "all", limit: 50 }),
    queryFn: () =>
      technicianJobsService.listJobs({
        sortBy: "bookingDate",
        sortOrder: "desc",
        limit: 50,
        page: 1,
      }),
    retry: false,
  });

  const buckets = useMemo(
    () => bucketJobs(jobsQuery.data?.items || []),
    [jobsQuery.data]
  );

  const list = buckets[activeTab] || [];

  const setTab = (tab) => {
    setSearchParams(tab === JOB_TABS.incoming ? {} : { tab });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Jobs</h1>
          <p className="mt-1 text-slate-500">
            Incoming includes open jobs matching your skills — accept first to
            claim the work.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {TAB_CONFIG.map((tab) => {
            const count = buckets[tab.id]?.length || 0;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={clsx(
                  "flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {tab.label}
                <span
                  className={clsx(
                    "ml-2 rounded-full px-2 py-0.5 text-xs",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {jobsQuery.isLoading ? (
          <Loader text="Loading jobs..." />
        ) : jobsQuery.isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">Could not load jobs</p>
            <p className="mt-1 text-sm text-red-600">
              {jobsQuery.error?.response?.data?.message ||
                jobsQuery.error?.message ||
                "Please try again."}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => jobsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No {activeTab} jobs
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {activeTab === JOB_TABS.incoming
                ? "New assignment requests will appear here."
                : "Nothing to show in this tab right now."}
            </p>
            <Link
              to="/technician/dashboard"
              className="mt-5 inline-flex text-sm font-medium text-indigo-600 hover:underline"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((job) => (
              <TechnicianJobCard
                key={job._id}
                job={job}
                linkTo={`/technician/jobs/${job._id}`}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default TechnicianJobsPage;
