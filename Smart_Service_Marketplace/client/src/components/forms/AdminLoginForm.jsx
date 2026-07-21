import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, Lock, AlertCircle, Shield } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../ui/Button";
import Input from "../ui/Input";
import * as adminService from "../../services/admin.service";
import useAuth from "../../hooks/useAuth";
import { getRememberPreference } from "../../utils/authStorage";
import {
  getPostLoginRedirect,
  isAdminRole,
} from "../../constants/roles";

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function AdminLoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, isAuthenticated, role, isLoading } = useAuth();
  const [formError, setFormError] = useState("");
  const [ready, setReady] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: getRememberPreference(),
    },
  });

  // Clear customer/technician session so admin login is not blocked
  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (isLoading) return;

      if (isAuthenticated && !isAdminRole(role)) {
        try {
          await logout();
        } catch {
          // ignore
        }
      } else if (isAuthenticated && isAdminRole(role)) {
        navigate(getPostLoginRedirect(role), { replace: true });
        return;
      }

      if (!cancelled) setReady(true);
    }

    prepare();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, role, logout, navigate]);

  const onSubmit = async (data) => {
    setFormError("");

    try {
      const response = await adminService.login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      login(response.user, response.token || response.accessToken, {
        rememberMe: Boolean(data.rememberMe),
        refreshToken: response.refreshToken,
      });

      toast.success("Admin login successful");

      const redirectTo = getPostLoginRedirect(
        response.user?.role,
        location.state?.from?.pathname
      );
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Invalid admin credentials. Please try again.";
      setFormError(message);
      toast.error(message);
    }
  };

  if (!ready || isLoading) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Preparing admin login...
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">
        <Shield size={18} />
        Admin portal — authorized staff only
      </div>

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
        label="Admin email"
        type="email"
        leftIcon={<Mail size={18} />}
        error={errors.email?.message}
        register={register("email", {
          required: "Email is required",
          pattern: { value: EMAIL_PATTERN, message: "Enter a valid email" },
        })}
      />

      <Input
        label="Password"
        type="password"
        leftIcon={<Lock size={18} />}
        error={errors.password?.message}
        register={register("password", {
          required: "Password is required",
        })}
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" {...register("rememberMe")} className="h-4 w-4" />
          Remember me
        </label>

        <Link
          to="/forgot-password?from=admin"
          className="font-medium text-indigo-600 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Sign in to Admin
      </Button>

      <p className="text-center text-sm text-slate-500">
        Customer or technician?{" "}
        <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
          Use the main login
        </Link>
      </p>
    </form>
  );
}

export default AdminLoginForm;
