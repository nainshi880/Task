import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Check, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import Button from "../ui/Button";
import Input from "../ui/Input";
import PasswordStrength from "../ui/PasswordStrength";
import * as authService from "../../services/auth.service";
import { validateStrongPassword } from "../../utils/password";

const STEPS = [
  { id: "email", label: "Email" },
  { id: "otp", label: "OTP / Email" },
  { id: "reset", label: "Reset Password" },
  { id: "done", label: "Login" },
];

function Stepper({ currentStep }) {
  return (
    <ol className="mb-8 grid grid-cols-4 gap-2">
      {STEPS.map((step, index) => {
        const active = index === currentStep;
        const complete = index < currentStep;

        return (
          <li key={step.id} className="text-center">
            <div
              className={clsx(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                complete && "bg-emerald-500 text-white",
                active && "bg-indigo-600 text-white",
                !complete && !active && "bg-slate-200 text-slate-500"
              )}
            >
              {complete ? <Check size={16} /> : index + 1}
            </div>
            <p
              className={clsx(
                "mt-2 hidden text-xs font-medium sm:block",
                active ? "text-indigo-700" : "text-slate-500"
              )}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginPath =
    searchParams.get("from") === "admin" ? "/admin/login" : "/login";
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [formError, setFormError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const emailForm = useForm({ defaultValues: { email: "" } });
  const otpForm = useForm({ defaultValues: { code: "" } });
  const resetForm = useForm({
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = resetForm.watch("password", "");

  const subtitle = useMemo(() => {
    if (step === 0) return "Enter the email linked to your account.";
    if (step === 1) return "Enter the OTP from your email, or use the reset link.";
    if (step === 2) return "Choose a new secure password.";
    return "Your password has been updated.";
  }, [step]);

  const startCooldown = (seconds = 30) => {
    setCooldown(seconds);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendResetEmail = async (targetEmail) => {
    return authService.forgot(targetEmail);
  };

  const onEmailSubmit = async (data) => {
    setFormError("");
    const normalized = data.email.trim().toLowerCase();

    try {
      await sendResetEmail(normalized);
      setEmail(normalized);
      startCooldown(30);
      toast.success("Reset instructions sent to your email");
      setStep(1);
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to send reset email";
      setFormError(message);
      toast.error(message);
    }
  };

  const onResend = async () => {
    if (!email || cooldown > 0) return;
    setFormError("");

    try {
      await sendResetEmail(email);
      startCooldown(30);
      toast.success("A new OTP / reset email has been sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend");
    }
  };

  const onOtpSubmit = async (data) => {
    setFormError("");

    try {
      const result = await authService.verifyForgotOtp({
        email,
        code: data.code.trim(),
      });

      setResetToken(result.resetToken);
      toast.success("OTP verified");
      setStep(2);
    } catch (error) {
      const message = error.response?.data?.message || "Invalid OTP";
      setFormError(message);
      toast.error(message);
    }
  };

  const onResetSubmit = async (data) => {
    if (!resetToken) {
      setFormError("Reset token missing. Verify OTP again or use the email link.");
      return;
    }

    setFormError("");

    try {
      await authService.reset(resetToken, { password: data.password });
      toast.success("Password reset successfully");
      setStep(3);
    } catch (error) {
      const message =
        error.response?.data?.message || "Password reset failed";
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <Stepper currentStep={step} />

      <p className="text-center text-sm text-slate-500">{subtitle}</p>

      {formError && (
        <div
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      {step === 0 && (
        <form
          onSubmit={emailForm.handleSubmit(onEmailSubmit)}
          className="space-y-5"
          noValidate
        >
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            register={emailForm.register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                message: "Enter a valid email",
              },
            })}
            error={emailForm.formState.errors.email?.message}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={emailForm.formState.isSubmitting}
          >
            {emailForm.formState.isSubmitting
              ? "Sending..."
              : "Continue"}
          </Button>
        </form>
      )}

      {step === 1 && (
        <form
          onSubmit={otpForm.handleSubmit(onOtpSubmit)}
          className="space-y-5"
          noValidate
        >
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            We sent a reset link and OTP to <strong>{email}</strong>.
            Enter the OTP from your email below, or open the email link to continue.
          </div>

          <Input
            label="OTP code"
            type="text"
            placeholder="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            register={otpForm.register("code", {
              required: "OTP is required",
              minLength: { value: 4, message: "Enter a valid OTP" },
              maxLength: { value: 8, message: "Enter a valid OTP" },
            })}
            error={otpForm.formState.errors.code?.message}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={otpForm.formState.isSubmitting}
          >
            {otpForm.formState.isSubmitting ? "Verifying..." : "Verify OTP"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="font-medium text-slate-600 hover:text-slate-900"
              onClick={() => {
                setFormError("");
                setStep(0);
              }}
            >
              Change email
            </button>

            <button
              type="button"
              className="font-medium text-indigo-600 hover:underline disabled:opacity-50"
              disabled={cooldown > 0}
              onClick={onResend}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={resetForm.handleSubmit(onResetSubmit)}
          className="space-y-5"
          noValidate
        >
          <Input
            label="New password"
            type="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            register={resetForm.register("password", {
              required: "Password is required",
              validate: validateStrongPassword,
            })}
            error={resetForm.formState.errors.password?.message}
          />

          <PasswordStrength password={password} />

          <Input
            label="Confirm password"
            type="password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            register={resetForm.register("confirmPassword", {
              required: "Please confirm your password",
              validate: (value) =>
                value === password || "Passwords do not match",
            })}
            error={resetForm.formState.errors.confirmPassword?.message}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={resetForm.formState.isSubmitting}
          >
            {resetForm.formState.isSubmitting
              ? "Updating..."
              : "Reset password"}
          </Button>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check size={28} />
          </div>
          <h3 className="text-xl font-semibold text-slate-800">
            Password updated
          </h3>
          <p className="text-sm text-slate-500">
            You can now sign in with your new password.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate(loginPath)}>
            Go to login
          </Button>
        </div>
      )}

      {step < 3 && (
        <div className="text-center">
          <Link
            to={loginPath}
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            Back to login
          </Link>
        </div>
      )}
    </div>
  );
}

export default ForgotPasswordForm;
