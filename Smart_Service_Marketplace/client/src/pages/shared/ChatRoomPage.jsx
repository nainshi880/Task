import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ImagePlus,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as chatService from "../../services/chat.service";
import useAuth from "../../hooks/useAuth";
import useChatSocket from "../../hooks/useChatSocket";
import { chatKeys, notificationKeys } from "../../lib/queryClient";
import { CHAT_EVENTS } from "../../constants/chat";
import { ROLES } from "../../constants/roles";
import { formatDateTime, formatRelativeTime } from "../../utils/format";

function peerFromRoom(room, myId) {
  if (!room) return { label: "Chat", user: null, id: null };
  const customerId = String(room.customer?._id || room.customer || "");
  if (customerId === String(myId)) {
    return {
      user: room.technician,
      label: room.technician?.name || "Technician",
      id: room.technician?._id || room.technician,
    };
  }
  return {
    user: room.customer,
    label: room.customer?.name || "Customer",
    id: room.customer?._id || room.customer,
  };
}

function Receipt({ status }) {
  if (status === "read") {
    return <CheckCheck size={14} className="text-sky-500" />;
  }
  if (status === "delivered") {
    return <CheckCheck size={14} className="text-slate-400" />;
  }
  return <Check size={14} className="text-slate-400" />;
}

function ChatRoomPage() {
  const { conversationId } = useParams();
  const roomId = conversationId;
  const { user, role } = useAuth();
  const myId = String(user?._id || user?.id || "");
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const fileInputRef = useRef(null);

  const [draft, setDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [messages, setMessages] = useState([]);

  const clearChatNotifications = () => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };
  const {
    connected,
    isOnline,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    markRead,
    markDelivered,
    on,
  } = useChatSocket({ enabled: Boolean(roomId) });

  const roomQuery = useQuery({
    queryKey: chatKeys.room(roomId),
    queryFn: () => chatService.getChatRoom(roomId),
    enabled: Boolean(roomId),
    retry: false,
  });

  const messagesQuery = useQuery({
    queryKey: chatKeys.messages(roomId, { page: 1, limit: 50 }),
    queryFn: () =>
      chatService.getChatMessages(roomId, { page: 1, limit: 50 }),
    enabled: Boolean(roomId),
    retry: false,
  });

  useEffect(() => {
    const items = messagesQuery.data?.items || [];
    // API may return newest-first; normalize to chronological
    const sorted = [...items].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    setMessages(sorted);
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!roomId || !connected) return undefined;

    let active = true;
    joinRoom(roomId)
      .then(() => {
        if (!active) return;
        chatService
          .markRoomRead(roomId)
          .then(() => clearChatNotifications())
          .catch(() => {});
        markRead({ roomId });
      })
      .catch(() => {});

    return () => {
      active = false;
      leaveRoom(roomId);
      stopTyping(roomId);
    };
  }, [roomId, connected, joinRoom, leaveRoom, markRead, stopTyping, queryClient]);

  useEffect(() => {
    const offNew = on(CHAT_EVENTS.MESSAGE_NEW, (payload) => {
      const message = payload?.message || payload;
      const msgRoom = String(message?.room || payload?.roomId || "");
      if (msgRoom && msgRoom !== String(roomId)) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });

      const senderId = String(message?.sender?._id || message?.sender || "");
      if (senderId && senderId !== myId) {
        markDelivered(message._id);
        markRead({ messageId: message._id });
        // Recipient is viewing this chat — clear chat notification badge
        chatService
          .markRoomRead(roomId)
          .then(() => clearChatNotifications())
          .catch(() => {});
      }

      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    });

    const offTypingStart = on(CHAT_EVENTS.TYPING_START, (payload) => {
      if (String(payload?.roomId) !== String(roomId)) return;
      if (String(payload?.userId) === myId) return;
      setPeerTyping(true);
    });

    const offTypingStop = on(CHAT_EVENTS.TYPING_STOP, (payload) => {
      if (String(payload?.roomId) !== String(roomId)) return;
      setPeerTyping(false);
    });

    const offRead = on(CHAT_EVENTS.MESSAGE_READ, (payload) => {
      if (payload?.messageIds) {
        setMessages((prev) =>
          prev.map((m) =>
            payload.messageIds.includes(m._id)
              ? { ...m, deliveryStatus: "read" }
              : m
          )
        );
        return;
      }
      if (payload?.messageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === payload.messageId
              ? { ...m, deliveryStatus: "read" }
              : m
          )
        );
      }
    });

    const offDelivered = on(CHAT_EVENTS.MESSAGE_DELIVERED, (payload) => {
      if (!payload?.messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === payload.messageId
            ? {
                ...m,
                deliveryStatus: payload.deliveryStatus || "delivered",
              }
            : m
        )
      );
    });

    const offDeleted = on(CHAT_EVENTS.MESSAGE_DELETED, (payload) => {
      if (!payload?.messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === payload.messageId
            ? { ...m, isDeleted: true, content: "Message deleted" }
            : m
        )
      );
    });

    return () => {
      offNew();
      offTypingStart();
      offTypingStop();
      offRead();
      offDelivered();
      offDeleted();
    };
  }, [on, roomId, myId, markDelivered, markRead, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  const room = roomQuery.data?.room || roomQuery.data;
  const peer = useMemo(() => peerFromRoom(room, myId), [room, myId]);
  const bookingLink = room?.booking?._id
    ? role === ROLES.TECHNICIAN
      ? `/technician/jobs/${room.booking._id}`
      : `/bookings/${room.booking._id}`
    : null;

  const sendMutation = useMutation({
    mutationFn: async ({ content, attachments }) => {
      try {
        const ack = await sendMessage({
          roomId,
          content,
          type: attachments?.length ? "image" : "text",
          attachments,
        });
        return ack?.message;
      } catch {
        return chatService.sendChatMessage(roomId, {
          content,
          type: attachments?.length ? "image" : "text",
          attachments,
        });
      }
    },
    onSuccess: (message) => {
      if (message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
      setDraft("");
      stopTyping(roomId);
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || err.message || "Send failed"),
  });

  const uploadMutation = useMutation({
    mutationFn: (files) => chatService.uploadChatAttachments(roomId, files),
    onSuccess: async (data) => {
      const attachments = data?.attachments || data?.files || data || [];
      const list = Array.isArray(attachments) ? attachments : [attachments];
      await sendMutation.mutateAsync({
        content: "",
        attachments: list,
      });
      toast.success("Image sent");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Upload failed"),
  });

  const onDraftChange = (value) => {
    setDraft(value);
    if (!roomId) return;
    startTyping(roomId);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(roomId), 1200);
  };

  const submit = (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    sendMutation.mutate({ content });
  };

  if (roomQuery.isLoading || messagesQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading conversation..." />
      </DashboardLayout>
    );
  }

  if (roomQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Conversation not found
          </h1>
          <p className="mt-2 text-slate-500">
            {roomQuery.error?.response?.data?.message ||
              "You may not have access to this chat."}
          </p>
          <Link
            to="/chat"
            className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:underline"
          >
            Back to messages
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-3xl flex-col" style={{ minHeight: "70vh" }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <Link
              to="/chat"
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft size={16} />
              Messages
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{peer.label}</h1>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  isOnline(peer.id)
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {isOnline(peer.id) ? "Online" : "Offline"}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {room?.booking?.serviceName ||
                room?.booking?.serviceCategory ||
                "Booking conversation"}
              {!connected ? " · Reconnecting…" : ""}
            </p>
          </div>
          {bookingLink && (
            <Link
              to={bookingLink}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              View booking
            </Link>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "55vh" }}>
            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Say hello to start the conversation.
              </p>
            ) : (
              messages.map((msg) => {
                const senderId = String(msg.sender?._id || msg.sender || "");
                const mine = senderId === myId;
                const attachments = msg.attachments || [];

                return (
                  <div
                    key={msg._id}
                    className={clsx(
                      "flex",
                      mine ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={clsx(
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                        mine
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-800"
                      )}
                    >
                      {msg.isDeleted ? (
                        <p className="italic opacity-70">Message deleted</p>
                      ) : (
                        <>
                          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                          {attachments.map((att, idx) => (
                            <a
                              key={att.publicId || att.url || idx}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block overflow-hidden rounded-xl"
                            >
                              <img
                                src={att.url}
                                alt={att.fileName || "Attachment"}
                                className="max-h-48 w-full object-cover"
                              />
                            </a>
                          ))}
                        </>
                      )}
                      <div
                        className={clsx(
                          "mt-1 flex items-center justify-end gap-1 text-[10px]",
                          mine ? "text-indigo-100" : "text-slate-400"
                        )}
                      >
                        <span>
                          {formatRelativeTime(msg.createdAt) ||
                            formatDateTime(msg.createdAt)}
                        </span>
                        {mine && <Receipt status={msg.deliveryStatus} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {peerTyping && (
              <p className="text-xs text-slate-400">{peer.label} is typing…</p>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={submit}
            className="flex items-end gap-2 border-t border-slate-100 p-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length) uploadMutation.mutate(files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={uploadMutation.isPending || sendMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={18} />
            </Button>
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              rows={1}
              placeholder="Type a message…"
              className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="sm"
              loading={sendMutation.isPending}
              disabled={!draft.trim()}
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ChatRoomPage;
