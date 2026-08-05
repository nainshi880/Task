import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  initialFocusSelector = null,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Only run focus trap setup when the dialog opens — not when onClose
  // identity changes (parent re-renders / child state updates while typing).
  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocus.current = document.activeElement;
    const node = dialogRef.current;
    const preferred = initialFocusSelector
      ? node?.querySelector(initialFocusSelector)
      : null;
    const focusable = node?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = preferred || focusable?.[0];
    first?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !node) return;

      const list = Array.from(
        node.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!list.length) return;

      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus?.();
    };
  }, [isOpen, initialFocusSelector]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={clsx(
          "w-full max-w-lg rounded-xl bg-white p-6 shadow-lg",
          className
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          {title ? (
            <h2 id={titleId} className="text-xl font-bold text-slate-900">
              {title}
            </h2>
          ) : (
            <span className="sr-only">Dialog</span>
          )}
          <button
            type="button"
            onClick={() => onCloseRef.current?.()}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close dialog"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
