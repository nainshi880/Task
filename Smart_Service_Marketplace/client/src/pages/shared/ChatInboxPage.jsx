import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Circle } from "lucide-react";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { SkeletonList } from "../../components/ui/Skeleton";
import * as chatService from "../../services/chat.service";
import useAuth from "../../hooks/useAuth";
import useChatSocket from "../../hooks/useChatSocket";
import { chatKeys } from "../../lib/queryClient";
import { ROLES } from "../../constants/roles";
import { formatRelativeTime } from "../../utils/format";

function peerFromRoom(room, myId) {
  const customerId = room.customer?._id || room.customer;
  const technicianId = room.technician?._id || room.technician;
  if (String(customerId) === String(myId)) {
    return {
      user: room.technician,
      label: room.technician?.name || "Technician",
    };
  }
  return {
    user: room.customer,
    label: room.customer?.name || "Customer",
  };
}

function unreadFor(room, role) {
  if (role === ROLES.TECHNICIAN) return room.technicianUnreadCount || 0;
  return room.customerUnreadCount || 0;
}

function ChatInboxPage() {
  const { user, role, isAuthenticated, token } = useAuth();
  const myId = user?._id || user?.id;
  const canFetch = Boolean(isAuthenticated && token);
  const { connected, isOnline } = useChatSocket({ enabled: canFetch });

  const roomsQuery = useQuery({
    queryKey: chatKeys.rooms({ page: 1, limit: 40 }),
    queryFn: () => chatService.listChatRooms({ page: 1, limit: 40 }),
    enabled: canFetch,
    retry: false,
    refetchInterval: (query) => {
      if (!canFetch || query.state.error) return false;
      return 20_000;
    },
  });

  const rooms = roomsQuery.data?.items || [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Messages</h1>
            <p className="mt-1 text-slate-500">
              Chat with your{" "}
              {role === ROLES.TECHNICIAN ? "customers" : "technicians"} about
              bookings.
            </p>
          </div>
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              connected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            <Circle
              size={8}
              fill="currentColor"
              className={connected ? "text-emerald-500" : "text-slate-400"}
            />
            {connected ? "Online" : "Connecting…"}
          </span>
        </div>

        {roomsQuery.isLoading ? (
          <SkeletonList rows={4} />
        ) : roomsQuery.isError ? (
          <ErrorState
            variant="auto"
            error={roomsQuery.error}
            onRetry={() => roomsQuery.refetch()}
            homeTo={
              role === ROLES.TECHNICIAN ? "/technician/dashboard" : "/dashboard"
            }
            homeLabel="Back to dashboard"
          />
        ) : rooms.length === 0 ? (
          <EmptyState
            preset="chat"
            actionLabel={
              role === ROLES.TECHNICIAN ? "View jobs" : "View bookings"
            }
            actionTo={
              role === ROLES.TECHNICIAN ? "/technician/jobs" : "/bookings"
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {rooms.map((room) => {
                const peer = peerFromRoom(room, myId);
                const peerId = peer.user?._id || peer.user;
                const unread = unreadFor(room, role);
                const serviceName =
                  room.booking?.serviceName ||
                  room.booking?.serviceCategory ||
                  "Booking chat";

                return (
                  <Link
                    key={room._id}
                    to={`/chat/${room._id}`}
                    className="flex items-center gap-3 p-4 transition hover:bg-slate-50"
                  >
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                      {(peer.label || "?").charAt(0).toUpperCase()}
                      <span
                        className={clsx(
                          "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
                          isOnline(peerId) ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-slate-900">
                          {peer.label}
                        </p>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatRelativeTime(
                            room.lastMessageAt || room.updatedAt
                          )}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-400">
                        {serviceName}
                      </p>
                      <p
                        className={clsx(
                          "mt-0.5 truncate text-sm",
                          unread > 0
                            ? "font-medium text-slate-800"
                            : "text-slate-500"
                        )}
                      >
                        {room.lastMessagePreview || "No messages yet"}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ChatInboxPage;
