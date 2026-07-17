import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  FileText,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "../../utils/format";

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">
        {value ?? "—"}
      </span>
    </div>
  );
}

function ApplicationBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase",
        styles[status] || "bg-slate-100 text-slate-600"
      )}
    >
      {status || "unknown"}
    </span>
  );
}

function DocLink({ href, label }) {
  if (!href) {
    return <span className="text-sm text-slate-400">Not uploaded</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
    >
      <ExternalLink size={14} />
      {label}
    </a>
  );
}

function AdminTechnicianDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [reasonPrompt, setReasonPrompt] = useState(null);

  const detailQuery = useQuery({
    queryKey: adminKeys.technician(id),
    queryFn: () => adminService.getTechnicianDetails(id),
    enabled: Boolean(id),
    retry: false,
  });

  const earningsQuery = useQuery({
    queryKey: adminKeys.technicianEarnings(id, {}),
    queryFn: () => adminService.getTechnicianEarnings(id, { limit: 5 }),
    enabled: Boolean(id),
    retry: false,
  });

  const ratingsQuery = useQuery({
    queryKey: adminKeys.technicianRatings(id),
    queryFn: () => adminService.getTechnicianRatings(id),
    enabled: Boolean(id),
    retry: false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.technician(id) });
    queryClient.invalidateQueries({
      queryKey: [...adminKeys.all, "technicians"],
    });
    queryClient.invalidateQueries({
      queryKey: adminKeys.technicianRatings(id),
    });
  };

  const approveMutation = useMutation({
    mutationFn: () => adminService.approveTechnician(id),
    onSuccess: () => {
      toast.success("Technician approved");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Approve failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => adminService.rejectTechnician(id, { reason }),
    onSuccess: () => {
      toast.success("Application rejected");
      setReasonPrompt(null);
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Reject failed"),
  });

  const suspendMutation = useMutation({
    mutationFn: (reason) => adminService.suspendTechnician(id, { reason }),
    onSuccess: () => {
      toast.success("Technician suspended");
      setReasonPrompt(null);
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Suspend failed"),
  });

  const unsuspendMutation = useMutation({
    mutationFn: () => adminService.unsuspendTechnician(id),
    onSuccess: () => {
      toast.success("Technician unsuspended");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Unsuspend failed"),
  });

  const verifyMutation = useMutation({
    mutationFn: () => adminService.verifyTechnician(id),
    onSuccess: () => {
      toast.success("Documents verified");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Verify failed"),
  });

  if (detailQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading technician..." />
      </DashboardLayout>
    );
  }

  if (detailQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Technician not found
          </h1>
          <p className="mt-2 text-slate-500">
            {detailQuery.error?.response?.data?.message ||
              "Could not load this technician."}
          </p>
          <Link
            to="/admin/technicians"
            className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:underline"
          >
            Back to technicians
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const { user, profile } = detailQuery.data || {};
  const name = profile?.fullName || user?.name || "Technician";
  const summary = earningsQuery.data?.summary || {};
  const ratings = ratingsQuery.data || {};
  const certifications = profile?.certifications || [];
  const skills = profile?.skills || profile?.serviceCategories || [];
  const actionBusy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    suspendMutation.isPending ||
    unsuspendMutation.isPending ||
    verifyMutation.isPending;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to="/admin/technicians"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft size={16} />
              Technicians
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900">{name}</h1>
              <ApplicationBadge status={profile?.applicationStatus} />
              {profile?.isSuspended && (
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-rose-700">
                  Suspended
                </span>
              )}
              {user?.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-sky-700">
                  <BadgeCheck size={12} />
                  Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-slate-500">{user?.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!user?.isVerified && (
              <Button
                size="sm"
                variant="secondary"
                disabled={actionBusy}
                loading={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate()}
              >
                Verify documents
              </Button>
            )}
            {profile?.applicationStatus === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="success"
                  disabled={actionBusy}
                  loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={actionBusy}
                  onClick={() =>
                    setReasonPrompt({ type: "reject", reason: "" })
                  }
                >
                  Reject
                </Button>
              </>
            )}
            {profile?.applicationStatus === "approved" &&
              (profile?.isSuspended ? (
                <Button
                  size="sm"
                  variant="success"
                  disabled={actionBusy}
                  loading={unsuspendMutation.isPending}
                  onClick={() => unsuspendMutation.mutate()}
                >
                  Unsuspend
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={actionBusy}
                  onClick={() =>
                    setReasonPrompt({ type: "suspend", reason: "" })
                  }
                >
                  Suspend
                </Button>
              ))}
          </div>
        </div>

        {reasonPrompt && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="font-medium text-amber-900">
              {reasonPrompt.type === "reject"
                ? "Reject this application?"
                : "Suspend this technician?"}
            </p>
            <textarea
              value={reasonPrompt.reason}
              onChange={(e) =>
                setReasonPrompt((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows={2}
              placeholder="Reason (optional)"
              className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="danger"
                loading={
                  rejectMutation.isPending || suspendMutation.isPending
                }
                onClick={() => {
                  if (reasonPrompt.type === "reject") {
                    rejectMutation.mutate(reasonPrompt.reason);
                  } else {
                    suspendMutation.mutate(reasonPrompt.reason);
                  }
                }}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReasonPrompt(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Star size={18} />
              <span className="text-sm">Rating</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {Number(
                ratings.profileRating ??
                  profile?.rating ??
                  ratings.userRating ??
                  0
              ).toFixed(1)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {ratings.totalJobsCompleted ?? profile?.totalJobsCompleted ?? 0}{" "}
              jobs completed
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <IndianRupee size={18} />
              <span className="text-sm">Total earnings</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {earningsQuery.isLoading
                ? "…"
                : formatCurrency(summary.grossEarnings ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Available{" "}
              {formatCurrency(summary.availableForPayout ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <BadgeCheck size={18} />
              <span className="text-sm">Availability</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {profile?.availabilityStatus ? "Available" : "Unavailable"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {profile?.onlineStatus ? "Online" : "Offline"}
              {profile?.vacationMode ? " · On vacation" : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            <div className="mt-3">
              <InfoRow
                label="Phone"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={14} />
                    {profile?.phone || user?.phone || "—"}
                  </span>
                }
              />
              <InfoRow
                label="Email"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={14} />
                    {user?.email || "—"}
                  </span>
                }
              />
              <InfoRow
                label="Working city"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} />
                    {profile?.workingCity || user?.city || "—"}
                  </span>
                }
              />
              <InfoRow
                label="Experience"
                value={
                  profile?.yearsOfExperience != null
                    ? `${profile.yearsOfExperience} years`
                    : "—"
                }
              />
              <InfoRow
                label="Joined"
                value={formatDate(user?.createdAt || profile?.createdAt)}
              />
              <InfoRow
                label="Verified at"
                value={
                  profile?.verifiedAt
                    ? formatDateTime(profile.verifiedAt)
                    : "—"
                }
              />
              {profile?.rejectionReason && (
                <InfoRow
                  label="Rejection reason"
                  value={profile.rejectionReason}
                />
              )}
              {profile?.suspensionReason && (
                <InfoRow
                  label="Suspension reason"
                  value={profile.suspensionReason}
                />
              )}
            </div>

            <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Skills
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.length === 0 ? (
                <p className="text-sm text-slate-500">No skills listed.</p>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {skill}
                  </span>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <FileText size={18} />
              Documents
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <span className="text-sm text-slate-600">Identity proof</span>
                <DocLink
                  href={profile?.identityProofUrl}
                  label="View document"
                />
              </div>
              {certifications.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No certification documents uploaded.
                </p>
              ) : (
                certifications.map((cert, idx) => (
                  <div
                    key={cert._id || idx}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <span className="text-sm text-slate-600">
                      {cert.name || cert.title || `Certification ${idx + 1}`}
                    </span>
                    <DocLink
                      href={cert.documentUrl || cert.url}
                      label="View"
                    />
                  </div>
                ))
              )}
            </div>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Ratings summary
            </h3>
            {ratingsQuery.isLoading ? (
              <p className="mt-2 text-sm text-slate-500">Loading…</p>
            ) : (
              <div className="mt-2">
                <InfoRow
                  label="Profile rating"
                  value={Number(ratings.profileRating || 0).toFixed(1)}
                />
                <InfoRow
                  label="User rating"
                  value={Number(ratings.userRating || 0).toFixed(1)}
                />
                <InfoRow
                  label="Total assignments"
                  value={ratings.totalAssignments ?? "—"}
                />
                <InfoRow
                  label="Avg match score"
                  value={
                    ratings.averageMatchScore != null
                      ? Number(ratings.averageMatchScore).toFixed(1)
                      : "—"
                  }
                />
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Earnings summary
          </h2>
          {earningsQuery.isLoading ? (
            <div className="py-6">
              <Loader text="Loading earnings..." />
            </div>
          ) : earningsQuery.isError ? (
            <p className="mt-3 text-sm text-rose-600">
              {earningsQuery.error?.response?.data?.message ||
                "Could not load earnings."}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Gross", value: summary.grossEarnings },
                { label: "Paid jobs", value: summary.paidEarnings },
                { label: "Available", value: summary.availableForPayout },
                { label: "Paid out", value: summary.totalPaidOut },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatCurrency(stat.value ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AdminTechnicianDetailPage;
