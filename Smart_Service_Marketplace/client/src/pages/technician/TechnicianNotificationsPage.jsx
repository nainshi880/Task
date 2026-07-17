import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, CheckCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as notificationService from "../../services/notification.service";
import { notificationKeys } from "../../lib/queryClient";
import { formatRelativeTime } from "../../utils/format";

const TABS = [
  { id: "all", label: "All", type: undefined },
  { id: "Booking", label: "Booking", type: "Booking" },
  { id: "Payment", label: "Payment", type: "Payment" },
  { id: "System", label: "System", type: "System" },
];

const TYPE_STYLES = {
  Booking: "bg-indigo-50 text-indigo-700",
  Payment: "bg-emerald-50 text-emerald-700",
  System: "bg-slate-100 text-slate-700",
  Chat: "bg-sky-50 text-sky-700",
  Promotion: "bg-amber-50 text-amber-800",
};

function TechnicianNotificationsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const active = TABS.find((item) => item.id === tab) || TABS[0];

  const listQuery = useQuery({
    queryKey: notificationKeys.list({ type: active.type, page: 1, limit: 30 }),
    queryFn: () =>
      notificationService.listNotifications({
        type: active.type,
        page: 1,
        limit: 30,
      }),
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });

  const markReadMutation = useMutation({
    mutationFn: notificationService.markNotificationRead,
    onSuccess: () => invalidate(),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllNotificationsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not mark all as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      toast.success("Notification removed");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not delete");
    },
  });

  const items = listQuery.data?.items || [];
  const unreadCount = listQuery.data?.unreadCount ?? 0;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              to="/technician/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="mt-1 text-slate-500">
              Booking, payment, and system updates · {unreadCount} unread
            </p>
          </div>
          <Button
            variant="outline"
            loading={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
            disabled={unreadCount === 0}
          >
            <CheckCheck size={16} />
            Mark all read
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={clsx(
                "flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                tab === item.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {listQuery.isLoading ? (
          <Loader text="Loading notifications..." />
        ) : listQuery.isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">Could not load notifications</p>
            <Button className="mt-4" variant="outline" onClick={() => listQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <Bell className="mx-auto text-slate-300" size={36} />
            <p className="mt-3 font-medium text-slate-900">No notifications</p>
            <p className="mt-1 text-sm text-slate-500">
              Updates for this filter will show up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item._id}
                className={clsx(
                  "rounded-2xl border bg-white p-4 shadow-sm transition",
                  item.isRead
                    ? "border-slate-100"
                    : "border-indigo-200 bg-indigo-50/40"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      if (!item.isRead) markReadMutation.mutate(item._id);
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          TYPE_STYLES[item.type] || TYPE_STYLES.System
                        )}
                      >
                        {item.type || "System"}
                      </span>
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                    <p className="mt-2 font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    loading={
                      deleteMutation.isPending &&
                      deleteMutation.variables === item._id
                    }
                    onClick={() => deleteMutation.mutate(item._id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-center text-sm text-slate-500">
          Manage alerts in{" "}
          <Link
            to="/technician/settings"
            className="font-medium text-indigo-600 hover:underline"
          >
            Settings
          </Link>
        </p>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianNotificationsPage;
