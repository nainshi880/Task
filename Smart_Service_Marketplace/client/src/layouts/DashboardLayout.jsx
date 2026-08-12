import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, UserCircle } from "lucide-react";

import Sidebar from "../components/layout/Sidebar";
import Footer from "../components/layout/Footer";
import useAuth from "../hooks/useAuth";
import useChatSocket from "../hooks/useChatSocket";
import * as notificationService from "../services/notification.service";
import {
  notificationKeys,
  technicianKeys,
  bookingKeys,
  chatKeys,
  adminKeys,
} from "../lib/queryClient";
import { ROLES, isAdminRole } from "../constants/roles";
import { BOOKING_EVENTS, CHAT_EVENTS } from "../constants/chat";
import { playNotificationSound } from "../utils/notificationSound";
import toast from "react-hot-toast";

function notificationsPath(role) {
  if (role === ROLES.TECHNICIAN) return "/technician/notifications";
  if (isAdminRole(role)) return "/admin/notifications";
  return "/notifications";
}

function DashboardLayout({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout, role, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { on } = useChatSocket({
    enabled: Boolean(isAuthenticated),
  });

  const unreadQuery = useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => notificationService.getUnreadCount(),
    enabled: Boolean(isAuthenticated),
    refetchInterval: (query) => (query.state.error ? false : 30_000),
    retry: false,
  });

  useEffect(() => {
    if (role !== ROLES.TECHNICIAN) return undefined;

    const invalidateJobs = () => {
      queryClient.invalidateQueries({ queryKey: technicianKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    };

    const offAssigned = on(BOOKING_EVENTS.ASSIGNED, invalidateJobs);
    const offAvailable = on(BOOKING_EVENTS.AVAILABLE, invalidateJobs);
    const offClaimed = on(BOOKING_EVENTS.CLAIMED, invalidateJobs);
    const offExtra = on(BOOKING_EVENTS.EXTRA_CHARGE, invalidateJobs);

    return () => {
      offAssigned?.();
      offAvailable?.();
      offClaimed?.();
      offExtra?.();
    };
  }, [role, on, queryClient]);

  useEffect(() => {
    if (role !== ROLES.CUSTOMER) return undefined;

    const invalidateCustomer = () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    return on(BOOKING_EVENTS.EXTRA_CHARGE, (payload) => {
      invalidateCustomer();
      if (payload?.type === "extra_charge.pending") {
        toast("New extra charge request on your booking.", { icon: "💳" });
      }
    });
  }, [role, on, queryClient]);

  // Chat message → badge + toast (when not already inside that room)
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    return on(CHAT_EVENTS.MESSAGE_NEW, (payload) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: chatKeys.all });

      const roomId = String(
        payload?.roomId || payload?.message?.room || ""
      );
      const senderId = String(
        payload?.message?.sender?._id || payload?.message?.sender || ""
      );
      const myId = String(user?._id || user?.id || "");

      // Ignore own echoes
      if (senderId && myId && senderId === myId) return;

      const viewingThisRoom =
        roomId &&
        (location.pathname === `/chat/${roomId}` ||
          location.pathname.startsWith(`/chat/${roomId}/`));

      if (viewingThisRoom) return;

      const preview =
        payload?.message?.content ||
        (payload?.message?.type === "image" ? "📷 Image" : "New message");
      const senderName =
        payload?.message?.sender?.name ||
        payload?.message?.senderName ||
        "Chat";

      playNotificationSound();
      toast(
        (t) => (
          <button
            type="button"
            className="text-left"
            onClick={() => {
              toast.dismiss(t.id);
              if (roomId) navigate(`/chat/${roomId}`);
            }}
          >
            <span className="font-semibold">{senderName}</span>
            <span className="mt-0.5 block text-sm opacity-90">
              {String(preview).slice(0, 80)}
            </span>
          </button>
        ),
        {
          icon: "💬",
          duration: 6000,
          id: roomId ? `chat-${roomId}` : undefined,
        }
      );
    });
  }, [isAuthenticated, on, queryClient, location.pathname, user, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    return on("notification:new", (payload) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });

      if (isAdminRole(role) && payload?.technicianId) {
        queryClient.invalidateQueries({
          queryKey: [...adminKeys.all, "technicians"],
        });
        queryClient.invalidateQueries({
          queryKey: [...adminKeys.all, "dashboard"],
        });
      }

      if (payload?.type === "Chat") {
        // MESSAGE_NEW toast already covers chat; badge refresh is enough
        return;
      }

      if (payload?.title) {
        playNotificationSound();
        toast(
          (t) => (
            <button
              type="button"
              className="text-left"
              onClick={() => {
                toast.dismiss(t.id);
                if (payload.actionUrl) navigate(payload.actionUrl);
              }}
            >
              <span className="font-semibold">{payload.title}</span>
              {payload.message ? (
                <span className="mt-0.5 block text-sm opacity-90">
                  {String(payload.message).slice(0, 100)}
                </span>
              ) : null}
            </button>
          ),
          {
            icon: "🔔",
            duration: 6000,
          }
        );
      }
    });
  }, [isAuthenticated, on, queryClient, role, navigate]);

  const unread =
    unreadQuery.data?.unreadCount ??
    unreadQuery.data?.count ??
    (typeof unreadQuery.data === "number" ? unreadQuery.data : 0);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-slate-100">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 bg-white px-4 shadow sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="app-sidebar"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h1 className="text-lg font-bold text-indigo-600 sm:text-2xl">
            Smart Service Marketplace
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            to={notificationsPath(role)}
            className="relative rounded-lg p-1.5 text-slate-600 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={
              unread > 0
                ? `Notifications, ${unread} unread`
                : "Notifications"
            }
          >
            <Bell size={22} aria-hidden />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>

          <div className="hidden items-center gap-2 text-sm text-slate-700 sm:flex">
            <UserCircle size={28} aria-hidden />
            <span>{user?.name || "Account"}</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:px-3"
            aria-label="Log out"
          >
            <LogOut size={16} aria-hidden />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar id="app-sidebar" />
        </div>

        {/* Mobile drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu overlay"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative z-10 h-full w-72 max-w-[85vw] shadow-xl">
              <Sidebar
                id="app-sidebar"
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          </div>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-[calc(100vh-64px)] flex-1 p-4 sm:p-6"
        >
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default DashboardLayout;
