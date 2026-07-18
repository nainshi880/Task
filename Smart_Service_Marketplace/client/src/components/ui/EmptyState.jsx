import { Link } from "react-router-dom";
import {
  BellOff,
  CalendarOff,
  FileSearch,
  Inbox,
  SearchX,
  StarOff,
} from "lucide-react";
import clsx from "clsx";

import Button from "./Button";

const PRESETS = {
  bookings: {
    icon: CalendarOff,
    title: "No bookings yet",
    description: "When you book a service, your appointments will show up here.",
  },
  notifications: {
    icon: BellOff,
    title: "No notifications",
    description: "Updates about bookings, payments, and chat will appear here.",
  },
  reviews: {
    icon: StarOff,
    title: "No reviews found",
    description: "There are no reviews to show for this filter right now.",
  },
  search: {
    icon: SearchX,
    title: "No search results",
    description: "Try a different keyword or clear your filters.",
  },
  chat: {
    icon: Inbox,
    title: "No conversations yet",
    description: "Chats open when a booking is assigned to a technician.",
  },
  default: {
    icon: FileSearch,
    title: "Nothing here yet",
    description: "There’s no content to display at the moment.",
  },
};

function EmptyState({
  preset = "default",
  icon: IconProp,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  className = "",
  children,
}) {
  const config = PRESETS[preset] || PRESETS.default;
  const Icon = IconProp || config.icon;

  return (
    <div
      className={clsx(
        "rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm",
        className
      )}
      role="status"
    >
      <Icon className="mx-auto text-slate-300" size={40} aria-hidden />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {title || config.title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {description || config.description}
      </p>
      {children}
      {(actionLabel && (actionTo || onAction)) && (
        <div className="mt-5">
          {actionTo ? (
            <Link to={actionTo}>
              <Button size="sm">{actionLabel}</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
