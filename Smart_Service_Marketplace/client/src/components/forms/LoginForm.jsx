import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, Lock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import Button from "../ui/Button";
import Input from "../ui/Input";
import GoogleSignInButton from "../auth/GoogleSignInButton";
import * as authService from "../../services/auth.service";
import useAuth from "../../hooks/useAuth";
import { getRememberPreference } from "../../utils/authStorage";
import {
  getProfileSetupPath,
  getPostLoginRedirect,
  needsEmailVerification,
  needsProfileSetup,
} from "../../constants/roles";

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const ROLE_TABS = [
  { id: "customer", label: "Customer" },
  { id: "technician", label: "Technician" },
];

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formError, setFormError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleRole, setGoogleRole] = useState("customer");

  const {
    register,
    handleSubmit,
    getValues,
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

  const finishLogin = (response, { rememberMe } = {}) => {
    login(response.user, response.token || response.accessToken, {
      rememberMe: Boolean(rememberMe),
      refreshToken: response.refreshToken,
    });

    toast.success(
      response.isNewUser
        ? `Welcome! Signed up with Google as ${response.user?.role || "user"}.`
        : "Login successful"
    );

    if (needsEmailVerification(response.user)) {
      navigate("/verify-email", {
        replace: true,
        state: { email: response.user?.email },
      });
      return;
    }

    const setupPath = needsProfileSetup(response.user)
      ? getProfileSetupPath(response.user?.role)
      : null;

    const fromLocation = location.state?.from;
    const fromPath = fromLocation
      ? `${fromLocation.pathname || ""}${fromLocation.search || ""}`
      : null;

    const redirectTo =
      setupPath || getPostLoginRedirect(response.user?.role, fromPath);
    navigate(redirectTo, { replace: true });
  };

  const onSubmit = async (data) => {
    setFormError("");

    try {
      const response = await authService.login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      finishLogin(response, { rememberMe: Boolean(data.rememberMe) });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Invalid email or password. Please try again.";

      setFormError(message);
      toast.error(message);
    }
  };

  const onGoogleSuccess = async ({ idToken }) => {
    setFormError("");
    setGoogleLoading(true);
    try {
      const response = await authService.loginWithGoogle({
        idToken,
        role: googleRole,
        intent: "login",
      });
      finishLogin(response, {
        rememberMe: Boolean(getValues("rememberMe")),
      });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Google sign-in failed. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = isSubmitting || googleLoading;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={busy}
            onClick={() => setGoogleRole(tab.id)}
            className={clsx(
              "rounded-lg px-4 py-2.5 text-sm font-semibold transition",
              googleRole === tab.id
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
          disabled={busy}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>

        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-white px-3 text-slate-500">or</span>
            </div>
          </div>
          <GoogleSignInButton
            disabled={busy}
            onSuccess={onGoogleSuccess}
            label={
              googleRole === "technician"
                ? "Continue with Google"
                : "Continue with Google"
            }
          />
        </div>
      </form>
    </div>
  );
}

export default LoginForm;
