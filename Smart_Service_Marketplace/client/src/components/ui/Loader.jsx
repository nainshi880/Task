import clsx from "clsx";
import { Loader2 } from "lucide-react";

function Loader({
  text = "Loading...",
  fullPage = false,
  className = "",
  size = "md",
}) {
  const spinnerSize = size === "sm" ? "h-8 w-8 border-2" : "h-12 w-12 border-4";

  const content = (
    <div
      className={clsx(
        "flex flex-col items-center justify-center",
        fullPage ? "min-h-[50vh] py-16" : "py-20",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className={clsx(
          "animate-spin text-indigo-600",
          size === "sm" ? "h-8 w-8" : "h-12 w-12"
        )}
        aria-hidden
      />
      {/* Keep visual ring for older look if needed - use Loader2 only */}
      <span className="sr-only">{text}</span>
      <p className="mt-5 text-slate-600" aria-hidden>
        {text}
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-100/90 backdrop-blur-sm">
        <div className={clsx("flex flex-col items-center", className)}>
          <div
            className={clsx(
              "animate-spin rounded-full border-indigo-600 border-t-transparent",
              spinnerSize
            )}
            aria-hidden
          />
          <p className="mt-5 font-medium text-slate-700" role="status">
            {text}
          </p>
        </div>
      </div>
    );
  }

  return content;
}

export default Loader;
