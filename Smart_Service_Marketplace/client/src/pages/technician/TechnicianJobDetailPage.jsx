import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MessageSquare,
  Phone,
  StickyNote,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import BookingTimeline from "../../components/customer/bookings/BookingTimeline";
import JobStatusFlow from "../../components/technician/JobStatusFlow";
import RejectJobModal from "../../components/technician/RejectJobModal";
import * as technicianJobsService from "../../services/technicianJobs.service";
import * as bookingService from "../../services/booking.service";
import * as chatService from "../../services/chat.service";
import { technicianKeys, bookingKeys } from "../../lib/queryClient";
import { BOOKING_STATUS } from "../../constants/bookingStatus";
import { formatCurrency, formatDate } from "../../utils/format";
import { formatTimeSlot } from "../../constants/timeSlots";

function formatAddress(address) {
  if (!address) return "—";
  return [address.label, address.street, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");
}

function TechnicianJobDetailPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [workNote, setWorkNote] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [completionFiles, setCompletionFiles] = useState([]);

  const openChatMutation = useMutation({
    mutationFn: () => chatService.getOrCreateBookingRoom(bookingId),
    onSuccess: (data) => {
      const room = data?.room || data;
      const id = room?._id || room?.id;
      if (id) navigate(`/chat/${id}`);
      else toast.error("Could not open chat room");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Could not start chat for this job"
      );
    },
  });

  const jobQuery = useQuery({
    queryKey: technicianKeys.job(bookingId),
    queryFn: () => technicianJobsService.getJobById(bookingId),
    enabled: Boolean(bookingId),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return [
        BOOKING_STATUS.ASSIGNED,
        BOOKING_STATUS.ACCEPTED,
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.PAUSED,
      ].includes(status)
        ? 15_000
        : false;
    },
  });

  // Ensure chat room exists for this job (backfills if assign ran before chat wiring).
  useQuery({
    queryKey: ["chat", "booking-room", bookingId],
    queryFn: () => chatService.getOrCreateBookingRoom(bookingId),
    enabled: Boolean(bookingId && jobQuery.data),
    retry: false,
    staleTime: 60_000,
  });

  const timelineQuery = useQuery({
    queryKey: bookingKeys.timeline(bookingId),
    queryFn: () => bookingService.getBookingTimeline(bookingId),
    enabled: Boolean(bookingId),
    retry: false,
  });

  const timeline = useMemo(() => {
    const events = timelineQuery.data?.timeline || [];
    return [...events].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [timelineQuery.data]);

  const hasArriving = timeline.some((event) => event.event === "ARRIVING");

  const invalidateJob = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: technicianKeys.job(bookingId) }),
      queryClient.invalidateQueries({ queryKey: technicianKeys.jobs({}) }),
      queryClient.invalidateQueries({ queryKey: technicianKeys.all }),
      queryClient.invalidateQueries({ queryKey: bookingKeys.timeline(bookingId) }),
    ]);
  };

  const runAction = useMutation({
    mutationFn: async ({ action, payload }) => {
      switch (action) {
        case "accept":
          return technicianJobsService.acceptJob(bookingId);
        case "reject":
          return technicianJobsService.rejectJob(bookingId, {
            rejectionReason: payload,
          });
        case "arriving":
          return technicianJobsService.markArriving(bookingId);
        case "start":
          return technicianJobsService.startJob(bookingId);
        case "pause":
          return technicianJobsService.pauseJob(bookingId, {
            reason: payload || undefined,
          });
        case "resume":
          return technicianJobsService.resumeJob(bookingId);
        case "note":
          return technicianJobsService.addWorkNote(bookingId, { note: payload });
        case "images":
          return technicianJobsService.uploadCompletionImages(
            bookingId,
            payload
          );
        case "complete":
          return technicianJobsService.completeJob(bookingId, {
            workNotes: payload || undefined,
          });
        default:
          throw new Error("Unknown action");
      }
    },
    onSuccess: async (_data, variables) => {
      const messages = {
        accept: "Booking accepted",
        reject: "Booking rejected",
        arriving: "Marked as on the way",
        start: "Work started",
        pause: "Work paused",
        resume: "Work resumed",
        note: "Work note added",
        images: "Completion photos uploaded",
        complete: "Job marked complete",
      };
      toast.success(messages[variables.action] || "Updated");
      if (variables.action === "reject") {
        setRejectOpen(false);
        await invalidateJob();
        navigate("/technician/jobs");
        return;
      }
      if (variables.action === "note") setWorkNote("");
      if (variables.action === "images") setCompletionFiles([]);
      if (variables.action === "complete") setCompleteNotes("");
      await invalidateJob();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Action failed. Please try again."
      );
    },
  });

  if (jobQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading job details..." />
      </DashboardLayout>
    );
  }

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Job not found</h1>
          <p className="mt-2 text-slate-500">
            This job may have been reassigned or you don&apos;t have access.
          </p>
          <Button className="mt-6" onClick={() => navigate("/technician/jobs")}>
            Back to jobs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const job = jobQuery.data;
  const status = job.status;
  const busy = runAction.isPending;

  const canAccept = status === BOOKING_STATUS.ASSIGNED;
  const canArrive = status === BOOKING_STATUS.ACCEPTED && !hasArriving;
  const canStart = status === BOOKING_STATUS.ACCEPTED;
  const canPause = status === BOOKING_STATUS.IN_PROGRESS;
  const canResume = status === BOOKING_STATUS.PAUSED;
  const canUploadComplete =
    status === BOOKING_STATUS.IN_PROGRESS || status === BOOKING_STATUS.PAUSED;
  const canComplete =
    status === BOOKING_STATUS.IN_PROGRESS &&
    (job.completionImages?.length || 0) > 0;
  const canAddNote = [
    BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.IN_PROGRESS,
    BOOKING_STATUS.PAUSED,
  ].includes(status);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            to="/technician/jobs"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to jobs
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                {job.serviceCategory}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                {job.serviceName || job.serviceCategory}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <BookingStatusBadge status={job.status} />
                {hasArriving && status === BOOKING_STATUS.ACCEPTED && (
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                    On the way
                  </span>
                )}
                {job.amount > 0 && (
                  <span className="text-sm font-semibold text-slate-800">
                    {formatCurrency(job.amount)}
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              loading={openChatMutation.isPending}
              onClick={() => openChatMutation.mutate()}
            >
              <MessageSquare size={16} />
              Chat with customer
            </Button>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Booking status flow
          </h2>
          <JobStatusFlow status={status} hasArriving={hasArriving} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Update status
          </h2>
          <div className="flex flex-wrap gap-2">
            {canAccept && (
              <>
                <Button
                  loading={busy && runAction.variables?.action === "accept"}
                  onClick={() => runAction.mutate({ action: "accept" })}
                >
                  Accept booking
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject booking
                </Button>
              </>
            )}
            {canArrive && (
              <Button
                variant="secondary"
                loading={busy && runAction.variables?.action === "arriving"}
                onClick={() => runAction.mutate({ action: "arriving" })}
              >
                On the way
              </Button>
            )}
            {canStart && (
              <Button
                loading={busy && runAction.variables?.action === "start"}
                onClick={() => runAction.mutate({ action: "start" })}
              >
                Start work
              </Button>
            )}
            {canPause && (
              <Button
                variant="outline"
                loading={busy && runAction.variables?.action === "pause"}
                onClick={() => runAction.mutate({ action: "pause" })}
              >
                Pause
              </Button>
            )}
            {canResume && (
              <Button
                loading={busy && runAction.variables?.action === "resume"}
                onClick={() => runAction.mutate({ action: "resume" })}
              >
                Resume
              </Button>
            )}
            {canComplete && (
              <Button
                variant="success"
                loading={busy && runAction.variables?.action === "complete"}
                onClick={() =>
                  runAction.mutate({
                    action: "complete",
                    payload: completeNotes.trim() || undefined,
                  })
                }
              >
                Mark completed
              </Button>
            )}
            {!canAccept &&
              !canArrive &&
              !canStart &&
              !canPause &&
              !canResume &&
              !canComplete && (
                <p className="text-sm text-slate-500">
                  No status actions available for this booking right now.
                </p>
              )}
          </div>

          {canUploadComplete && (
            <div className="mt-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">
                Completion photos
                {(job.completionImages?.length || 0) === 0 && (
                  <span className="ml-2 text-xs font-normal text-amber-700">
                    Required before completing
                  </span>
                )}
              </p>
              {job.completionImages?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {job.completionImages.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-16 w-16 overflow-hidden rounded-lg border border-slate-200"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) =>
                  setCompletionFiles(Array.from(e.target.files || []))
                }
                className="block w-full text-sm text-slate-600"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!completionFiles.length}
                loading={busy && runAction.variables?.action === "images"}
                onClick={() =>
                  runAction.mutate({
                    action: "images",
                    payload: completionFiles,
                  })
                }
              >
                Upload photos
              </Button>
              {status === BOOKING_STATUS.IN_PROGRESS && (
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Completion notes (optional)
                  </label>
                  <textarea
                    value={completeNotes}
                    onChange={(e) => setCompleteNotes(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Summarize the work done..."
                  />
                </div>
              )}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Booking details
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 text-indigo-600" size={18} />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Schedule
                    </dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {formatDate(job.bookingDate)}
                      {job.bookingTime
                        ? ` · ${formatTimeSlot(job.bookingTime)}`
                        : ""}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 text-indigo-600" size={18} />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Service address
                    </dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {formatAddress(job.addressDetails)}
                    </dd>
                  </div>
                </div>
                {(job.description || job.notes) && (
                  <div className="flex gap-3">
                    <StickyNote className="mt-0.5 text-indigo-600" size={18} />
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Customer notes
                      </dt>
                      {job.description && (
                        <dd className="mt-1 text-slate-700">{job.description}</dd>
                      )}
                      {job.notes && (
                        <dd className="mt-1 text-slate-600">{job.notes}</dd>
                      )}
                    </div>
                  </div>
                )}
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <UserRound size={18} className="text-indigo-600" />
                Customer details
              </h2>
              <div className="space-y-2 text-sm">
                <p className="text-lg font-semibold text-slate-900">
                  {job.customer?.name || "Customer"}
                </p>
                {job.customer?.phone && (
                  <a
                    href={`tel:${job.customer.phone}`}
                    className="inline-flex items-center gap-2 font-medium text-indigo-600 hover:underline"
                  >
                    <Phone size={16} />
                    {job.customer.phone}
                  </a>
                )}
                {job.customer?.email && (
                  <p className="text-slate-600">{job.customer.email}</p>
                )}
                {job.customer?.city && (
                  <p className="text-slate-500">{job.customer.city}</p>
                )}
              </div>
            </section>

            {canAddNote && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Work notes
                </h2>
                {job.workNotesLog?.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {job.workNotesLog.map((entry, index) => (
                      <li
                        key={`${entry.createdAt}-${index}`}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        {entry.note}
                      </li>
                    ))}
                  </ul>
                )}
                <textarea
                  value={workNote}
                  onChange={(e) => setWorkNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Add an internal work note..."
                  className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <Button
                  className="mt-3"
                  type="button"
                  disabled={workNote.trim().length < 2}
                  loading={busy && runAction.variables?.action === "note"}
                  onClick={() =>
                    runAction.mutate({
                      action: "note",
                      payload: workNote.trim(),
                    })
                  }
                >
                  Add note
                </Button>
              </section>
            )}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Service timeline
            </h2>
            {timelineQuery.isLoading ? (
              <Loader text="Loading timeline..." />
            ) : (
              <BookingTimeline events={timeline} />
            )}
          </section>
        </div>
      </div>

      <RejectJobModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        loading={busy && runAction.variables?.action === "reject"}
        onConfirm={(reason) =>
          runAction.mutate({ action: "reject", payload: reason })
        }
      />
    </DashboardLayout>
  );
}

export default TechnicianJobDetailPage;
