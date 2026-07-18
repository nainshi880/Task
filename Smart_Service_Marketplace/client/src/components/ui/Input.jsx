import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

function Input({
  label,
  type = "text",
  placeholder,
  error,
  register,
  leftIcon,
  rightIcon,
  className = "",
  id,
  required,
  hint,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputId =
    id || register?.name || label?.toLowerCase().replace(/\s+/g, "-");
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
          {required && (
            <span className="ml-0.5 text-rose-600" aria-hidden>
              *
            </span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          >
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          placeholder={placeholder}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...register}
          {...props}
          className={clsx(
            "w-full rounded-xl border border-slate-300 bg-white py-3 outline-none transition-all",
            leftIcon ? "pl-11" : "pl-4",
            isPassword || rightIcon ? "pr-12" : "pr-4",
            "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100",
            error && "border-red-500 focus:border-red-500 focus:ring-red-100",
            className
          )}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}

        {!isPassword && rightIcon && (
          <div
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            aria-hidden
          >
            {rightIcon}
          </div>
        )}
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
