import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, Lock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../ui/Button";
import Input from "../ui/Input";
import * as authService from "../../services/auth.service";
import useAuth from "../../hooks/useAuth";
import { getRememberPreference } from "../../utils/authStorage";
import { getProfileSetupPath, getRoleHome, needsProfileSetup } from "../../constants/roles";

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: getRememberPreference(),
    },
  });

  const onSubmit = async (data) => {
    setFormError("");

    try {
      const response = await authService.login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      login(response.user, response.token || response.accessToken, {
        rememberMe: Boolean(data.rememberMe),
        refreshToken: response.refreshToken,
      });

      toast.success("Login successful");

      const setupPath = needsProfileSetup(response.user)
        ? getProfileSetupPath(response.user?.role)
        : null;

      const redirectTo =
        setupPath ||
        location.state?.from?.pathname ||
        getRoleHome(response.user?.role);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Invalid email or password. Please try again.";

      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {formError && (
        <div
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <Input
        id="login-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        leftIcon={<Mail size={18} />}
        register={register("email", {
          required: "Email is required",
          pattern: {
            value: EMAIL_PATTERN,
            message: "Enter a valid email address",
          },
        })}
        error={errors.email?.message}
      />

      <Input
        id="login-password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        autoComplete="current-password"
        leftIcon={<Lock size={18} />}
        register={register("password", {
          required: "Password is required",
          minLength: {
            value: 6,
            message: "Password must be at least 6 characters",
          },
        })}
        error={errors.password?.message}
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            {...register("rememberMe")}
          />
          Remember me
        </label>

        <Link
          to="/forgot-password"
          className="font-medium text-indigo-600 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-center text-sm text-slate-500">
        Prefer phone verification?{" "}
        <Link
          to="/verify-otp"
          className="font-medium text-indigo-600 hover:underline"
        >
          Verify OTP
        </Link>
      </p>
    </form>
  );
}

export default LoginForm;
