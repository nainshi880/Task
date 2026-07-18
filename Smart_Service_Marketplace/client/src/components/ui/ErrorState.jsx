import { Link } from "react-router-dom";
import {
  AlertTriangle,
  FileWarning,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import clsx from "clsx";

import Button from "./Button";

const VARIANTS = {
  network: {
    icon: WifiOff,
    title: "Connection problem",
    description:
      "We couldn’t reach the server. Check your internet connection and try again.",
  },
  server: {
    icon: AlertTriangle,
    title: "Something went wrong",
    description:
      "An unexpected server error occurred. Please try again in a moment.",
  },
  notFound: {
    icon: FileWarning,
    title: "Page not found",
    description: "The page you’re looking for doesn’t exist or was moved.",
  },
  generic: {
    icon: AlertTriangle,
    title: "Unable to load",
    description: "Something went wrong while loading this content.",
  },
};

export function getErrorVariant(error) {
  if (!error) return "generic";
  if (!error.response) return "network";
  const status = error.response?.status;
  if (status >= 500) return "server";
  if (status === 404) return "notFound";
  return "generic";
}

function ErrorState({
  variant = "generic",
  title,
  description,
  error,
  onRetry,
  retryLabel = "Try again",
  homeTo = "/",
  homeLabel = "Go home",
  className = "",
}) {
  const resolved = variant === "auto" ? getErrorVariant(error) : variant;
  const config = VARIANTS[resolved] || VARIANTS.generic;
  const Icon = config.icon;
  const message =
    description ||
    error?.response?.data?.message ||
    error?.message ||
    config.description;

  return (
    <div
      className={clsx(
        "mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm",
        className
      )}
      role="alert"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <Icon size={28} aria-hidden />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        {title || config.title}
      </h1>
      <p className="mt-2 text-slate-500">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw size={16} aria-hidden />
            {retryLabel}
          </Button>
        )}
        <Link to={homeTo}>
          <Button variant="outline">{homeLabel}</Button>
        </Link>
      </div>
    </div>
  );
}

export default ErrorState;
