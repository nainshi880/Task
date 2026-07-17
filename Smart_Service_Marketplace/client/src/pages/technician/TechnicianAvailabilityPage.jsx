import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Plane, Power } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as technicianService from "../../services/technician.service";
import { technicianKeys } from "../../lib/queryClient";
import { toDateInputValue } from "../../utils/format";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DEFAULT_HOURS = {
  monday: { isOff: false, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  tuesday: { isOff: false, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  wednesday: { isOff: false, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  thursday: { isOff: false, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  friday: { isOff: false, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  saturday: { isOff: false, start: "09:00", end: "14:00", breakStart: "", breakEnd: "" },
  sunday: { isOff: true, start: "00:00", end: "00:00", breakStart: "", breakEnd: "" },
};

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function TechnicianAvailabilityPage() {
  const queryClient = useQueryClient();

  const [workingHours, setWorkingHours] = useState(DEFAULT_HOURS);
  const [serviceAreasText, setServiceAreasText] = useState("");
  const [acceptingJobs, setAcceptingJobs] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationStart, setVacationStart] = useState("");
  const [vacationEnd, setVacationEnd] = useState("");
  const [vacationReason, setVacationReason] = useState("");

  const availabilityQuery = useQuery({
    queryKey: technicianKeys.availability(),
    queryFn: technicianService.getAvailability,
    retry: false,
  });

  useEffect(() => {
    if (!availabilityQuery.data) return;
    const data = availabilityQuery.data;
    setWorkingHours({ ...DEFAULT_HOURS, ...(data.workingHours || {}) });
    setServiceAreasText((data.serviceAreas || []).join(", "));
    setAcceptingJobs(data.availabilityStatus ?? true);
    setVacationMode(Boolean(data.vacationMode));
    setVacationStart(toDateInputValue(data.vacationStart));
    setVacationEnd(toDateInputValue(data.vacationEnd));
    setVacationReason(data.vacationReason || "");
  }, [availabilityQuery.data]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: technicianKeys.availability() }),
      queryClient.invalidateQueries({ queryKey: technicianKeys.profile() }),
      queryClient.invalidateQueries({ queryKey: technicianKeys.dashboard() }),
    ]);
  };

  const onlineMutation = useMutation({
    mutationFn: (onlineStatus) => technicianService.setOnlineStatus(onlineStatus),
    onSuccess: async () => {
      toast.success("Online status updated");
      await invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not update online status");
    },
  });

  const acceptingMutation = useMutation({
    mutationFn: (availabilityStatus) =>
      technicianService.updateAvailability(availabilityStatus),
    onSuccess: async () => {
      toast.success("Job availability updated");
      await invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not update availability");
    },
  });

  const vacationMutation = useMutation({
    mutationFn: technicianService.setVacationMode,
    onSuccess: async () => {
      toast.success("Vacation settings saved");
      await invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not update vacation mode");
    },
  });

  const hoursMutation = useMutation({
    mutationFn: technicianService.updateWorkingHours,
    onSuccess: async () => {
      toast.success("Weekly schedule saved");
      await invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not save schedule");
    },
  });

  const areasMutation = useMutation({
    mutationFn: technicianService.updateServiceAreas,
    onSuccess: async () => {
      toast.success("Service areas saved");
      await invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not save service areas");
    },
  });

  if (availabilityQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading availability..." />
      </DashboardLayout>
    );
  }

  if (availabilityQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Availability unavailable
          </h1>
          <p className="mt-2 text-slate-500">
            {availabilityQuery.error?.response?.data?.message ||
              "Complete your technician profile first."}
          </p>
          <Link
            to="/technician/profile"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Go to profile
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const data = availabilityQuery.data || {};
  const isOnline = data.isOnline ?? data.onlineStatus;

  const updateHour = (day, field, value) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            to="/technician/dashboard"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Availability</h1>
          <p className="mt-1 text-slate-500">
            Control online status, weekly hours, breaks, vacation, and service areas.
          </p>
        </div>

        <Section title="Online / Offline" description="Go offline to stop receiving new live assignments.">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  isOnline
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                <Power size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {isOnline ? "You're online" : "You're offline"}
                </p>
                <p className="text-sm text-slate-500">
                  Available for jobs:{" "}
                  {data.isAvailableForJobs ? "Yes" : "No"}
                </p>
              </div>
            </div>
            <Button
              loading={onlineMutation.isPending}
              variant={isOnline ? "outline" : "success"}
              onClick={() => onlineMutation.mutate(!isOnline)}
            >
              {isOnline ? "Go offline" : "Go online"}
            </Button>
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={acceptingJobs}
              onChange={(e) => {
                setAcceptingJobs(e.target.checked);
                acceptingMutation.mutate(e.target.checked);
              }}
            />
            Accepting new job requests
          </label>
        </Section>

        <Section
          title="Vacation mode"
          description="Pause bookings for a date range while you are away."
        >
          <label className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={vacationMode}
              onChange={(e) => setVacationMode(e.target.checked)}
            />
            <span className="inline-flex items-center gap-2">
              <Plane size={16} />
              Enable vacation mode
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <input
                type="date"
                value={vacationStart}
                onChange={(e) => setVacationStart(e.target.value)}
                disabled={!vacationMode}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">End date</label>
              <input
                type="date"
                value={vacationEnd}
                onChange={(e) => setVacationEnd(e.target.value)}
                disabled={!vacationMode}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:opacity-50"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700">Reason (optional)</label>
            <textarea
              rows={2}
              value={vacationReason}
              onChange={(e) => setVacationReason(e.target.value)}
              disabled={!vacationMode}
              maxLength={500}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:opacity-50"
              placeholder="e.g. Family trip"
            />
          </div>
          <Button
            className="mt-4"
            loading={vacationMutation.isPending}
            onClick={() =>
              vacationMutation.mutate({
                vacationMode,
                vacationStart: vacationMode && vacationStart
                  ? new Date(vacationStart).toISOString()
                  : null,
                vacationEnd: vacationMode && vacationEnd
                  ? new Date(vacationEnd).toISOString()
                  : null,
                vacationReason: vacationReason.trim() || undefined,
              })
            }
          >
            Save vacation settings
          </Button>
        </Section>

        <Section
          title="Weekly schedule & break time"
          description="Set working hours and optional lunch/break windows for each day."
        >
          <div className="space-y-3">
            {WEEKDAYS.map((day) => {
              const slot = workingHours[day] || DEFAULT_HOURS[day];
              return (
                <div
                  key={day}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="capitalize text-sm font-semibold text-slate-800">
                      {day}
                    </p>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(slot.isOff)}
                        onChange={(e) =>
                          updateHour(day, "isOff", e.target.checked)
                        }
                      />
                      Day off
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="mb-1 text-xs text-slate-500">Start</p>
                      <input
                        type="time"
                        disabled={slot.isOff}
                        value={slot.start || "09:00"}
                        onChange={(e) => updateHour(day, "start", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-slate-500">End</p>
                      <input
                        type="time"
                        disabled={slot.isOff}
                        value={slot.end || "18:00"}
                        onChange={(e) => updateHour(day, "end", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-slate-500">Break start</p>
                      <input
                        type="time"
                        disabled={slot.isOff}
                        value={slot.breakStart || ""}
                        onChange={(e) =>
                          updateHour(day, "breakStart", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-slate-500">Break end</p>
                      <input
                        type="time"
                        disabled={slot.isOff}
                        value={slot.breakEnd || ""}
                        onChange={(e) =>
                          updateHour(day, "breakEnd", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            className="mt-4"
            loading={hoursMutation.isPending}
            onClick={() => hoursMutation.mutate(workingHours)}
          >
            Save weekly schedule
          </Button>
        </Section>

        <Section
          title="Service area"
          description="Neighborhoods or cities you cover, comma-separated."
        >
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={16} className="text-indigo-600" />
            Working city: {data.workingCity || "Not set"}
          </div>
          <textarea
            rows={3}
            value={serviceAreasText}
            onChange={(e) => setServiceAreasText(e.target.value)}
            placeholder="e.g. Andheri, Bandra, Juhu"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <Button
            className="mt-4"
            loading={areasMutation.isPending}
            onClick={() => {
              const areas = serviceAreasText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              if (!areas.length) {
                toast.error("Add at least one service area");
                return;
              }
              areasMutation.mutate(areas);
            }}
          >
            Save service areas
          </Button>
        </Section>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianAvailabilityPage;
