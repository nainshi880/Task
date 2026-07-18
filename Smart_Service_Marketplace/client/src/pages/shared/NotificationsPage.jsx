import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { SkeletonList } from "../../components/ui/Skeleton";
import * as notificationService from "../../services/notification.service";
import useAuth from "../../hooks/useAuth";
import { notificationKeys } from "../../lib/queryClient";
import { ROLES, isAdminRole } from "../../constants/roles";
import { formatRelativeTime } from "../../utils/format";

const TABS = [
  { id: "all", label: "All", type: undefined },
  { id: "Booking", label: "Booking", type: "Booking" },
  { id: "Payment", label: "Payment", type: "Payment" },
  { id: "Chat", label: "Chat", type: "Chat" },
  { id: "System", label: "System", type: "System" },
];

const TYPE_STYLES = {
  Booking: "bg-indigo-50 text-indigo-700",
  Payment: "bg-emerald-50 text-emerald-700",
  System: "bg-slate-100 text-slate-700",
  Chat: "bg-sky-50 text-sky-700",
  Promotion: "bg-amber-50 text-amber-800",
};

function backPathForRole(role) {
  if (role === ROLES.TECHNICIAN) return "/technician/dashboard";
  if (isAdminRole(role)) return "/admin/dashboard";
  return "/dashboard";
}

function NotificationsPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const active = TABS.find((item) => item.id === tab) || TABS[0];

  const listQuery = useQuery({
    queryKey: notificationKeys.list({ type: active.type, page: 1, limit: 40 }),
    queryFn: () =>
      notificationService.listNotifications({
        type: active.type,
        page: 1,
        limit: 40,
      }),
    retry: false,
    refetchInterval: 30_000,
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
              to={backPathForRole(role)}
              className="mb-3 inline-flex text-sm font-medium text-indigo-600 hover:underline"
            >
              Back to dashboard
            </Link>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
              <Bell size={28} className="text-indigo-600" />
              Notifications
            </h1>
            <p className="mt-1 text-slate-500">
              Booking, payment, chat, and system updates · {unreadCount} unread
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
                "flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition",
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
          <SkeletonList rows={5} />
        ) : listQuery.isError ? (
          <ErrorState
            variant="auto"
            error={listQuery.error}
            onRetry={() => listQuery.refetch()}
            homeTo={backPathForRole(role)}
            homeLabel="Back to dashboard"
          />
        ) : items.length === 0 ? (
          <EmptyState preset="notifications" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const href = item.actionUrl || null;
                const content = (
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={clsx(
                          "font-semibold text-slate-900",
                          !item.isRead && "text-indigo-900"
                        )}
                      >
                        {item.title}
                      </p>
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          TYPE_STYLES[item.type] || TYPE_STYLES.System
                        )}
                      >
                        {item.type}
                      </span>
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                );

                return (
                  <div
                    key={item._id}
                    className={clsx(
                      "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between",
                      !item.isRead && "bg-indigo-50/40"
                    )}
                  >
                    {href ? (
                      <Link
                        to={href}
                        className="min-w-0 flex-1"
                        onClick={() => {
                          if (!item.isRead) markReadMutation.mutate(item._id);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          if (!item.isRead) markReadMutation.mutate(item._id);
                        }}
                      >
                        {content}
                      </button>
                    )}
                    <div className="flex gap-2">
                      {!item.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markReadMutation.mutate(item._id)}
                        >
                          Read
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item._id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default NotificationsPage;
