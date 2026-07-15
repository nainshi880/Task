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
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  return (
    <div className="space-y-2">

      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">

        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {leftIcon}
          </div>
        )}

        <input
          type={
            isPassword
              ? showPassword
                ? "text"
                : "password"
              : type
          }
          placeholder={placeholder}
          {...register}
          {...props}
          className={clsx(
            "w-full rounded-xl border border-slate-300 bg-white py-3 outline-none transition-all",
            leftIcon ? "pl-11" : "pl-4",
            isPassword || rightIcon ? "pr-12" : "pr-4",
            "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100",
            error && "border-red-500 focus:ring-red-100",
            className
          )}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() =>
              setShowPassword(!showPassword)
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          >
            {showPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        )}

        {!isPassword && rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightIcon}
          </div>
        )}

      </div>

      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}

    </div>
  );
}

export default Input;