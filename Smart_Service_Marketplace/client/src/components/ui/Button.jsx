import clsx from "clsx";
import { Loader2 } from "lucide-react";

function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  "aria-label": ariaLabel,
  ...props
}) {
  const isDisabled = disabled || loading;

  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-slate-600 text-white hover:bg-slate-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-slate-400 text-slate-700 hover:bg-slate-100",
    ghost: "text-slate-700 hover:bg-slate-100",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-5 py-2.5",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      aria-label={ariaLabel}
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

export default Button;
