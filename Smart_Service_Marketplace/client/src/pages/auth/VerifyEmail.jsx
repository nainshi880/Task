import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { CheckCircle2, Mail } from "lucide-react";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import * as authService from "../../services/auth.service";
import useAuth from "../../hooks/useAuth";
import {
  getProfileSetupPath,
  getRoleHome,
  needsProfileSetup,
} from "../../constants/roles";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token: authToken, user, setUser, logout, login } = useAuth();

  const [status, setStatus] = useState(
    user?.isVerified ? "success" : "pending"
  );
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const pendingEmail =
    user?.email || location.state?.email || searchParams.get("email") || "";

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: pendingEmail,
      code: "",
    },
  });

  useEffect(() => {
    if (pendingEmail) {
      setValue("email", pendingEmail);
    }
  }, [pendingEmail, setValue]);

  useEffect(() => {
    if (user?.isVerified) {
      setStatus("success");
    }
  }, [user?.isVerified]);

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

  const handleResend = async () => {
    try {
      setResending(true);
      const email = (getValues("email") || pendingEmail || "").trim().toLowerCase();

      if (!email) {
        toast.error("Enter your email to resend the OTP");
        return;
      }

      // Pending signups are not logged in — always resend by email
      const result = await authService.resendVerification(email);

      if (result?.alreadyVerified) {
        toast.success("Email is already verified. You can sign in.");
        setStatus("success");
        return;
      }

      startCooldown(30);
      toast.success(result?.message || "OTP sent to your email");
      setStatus("pending");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send verification OTP"
      );
    } finally {
      setResending(false);
    }
  };

  const onVerify = async (data) => {
    try {
      const result = await authService.verify({
        email: data.email.trim().toLowerCase(),
        code: data.code.trim(),
      });

      toast.success(result?.message || "Email verified successfully");

      const token = result?.token || result?.accessToken;
      if (result?.user && token) {
        login(result.user, token, {
          refreshToken: result.refreshToken,
        });
      } else if (result?.user && setUser) {
        setUser({ ...result.user, isVerified: true });
      }

      setStatus("success");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired OTP");
    }
  };

  const handleContinue = () => {
    const activeUser = user;
    if (!activeUser) {
      navigate("/login", { replace: true });
      return;
    }

    const setupPath = needsProfileSetup(activeUser)
      ? getProfileSetupPath(activeUser.role)
      : null;

    navigate(setupPath || getRoleHome(activeUser.role), { replace: true });
  };

  const handleBackToRegistration = async () => {
    try {
      if (authToken) await logout();
    } catch {
      // ignore logout errors
    }
    navigate("/register", { replace: true });
  };

  return (
    <AuthLayout
      title={status === "success" ? "Email verified" : "Verify your email"}
      subtitle={
        status === "success"
          ? "Your account is ready to use."
          : "Enter the OTP we sent to your email."
      }
      maxWidthClass="max-w-lg"
    >
      <Card className="text-center shadow-2xl">
        {status === "success" ? (
          <div className="space-y-5 py-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={34} />
            </div>
            <h2 className="text-3xl font-bold text-emerald-600">Success</h2>
            <p className="text-slate-600">
              Your email has been verified successfully. You can now continue
              setting up your account.
            </p>
            <div className="pt-2">
              {authToken ? (
                <Button className="w-full" size="lg" onClick={handleContinue}>
                  Continue
                </Button>
              ) : (
                <Link to="/login">
                  <Button className="w-full" size="lg">
                    Continue to login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Mail size={34} />
            </div>
            <h2 className="text-2xl font-semibold text-slate-800">
              Enter verification OTP
            </h2>
            <p className="text-slate-600">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-slate-800">
                {pendingEmail || "your email address"}
              </span>
              .
            </p>

            <form
              onSubmit={handleSubmit(onVerify)}
              className="space-y-4 pt-2 text-left"
              noValidate
            >
              {!authToken && (
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  register={register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                      message: "Enter a valid email",
                    },
                  })}
                  error={errors.email?.message}
                />
              )}

              <Input
                label="OTP code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                register={register("code", {
                  required: "OTP is required",
                  minLength: { value: 4, message: "Enter a valid OTP" },
                  maxLength: { value: 8, message: "Enter a valid OTP" },
                })}
                error={errors.code?.message}
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isSubmitting}
              >
                Verify email
              </Button>
            </form>

            <div className="space-y-3 pt-1">
              <Button
                variant="outline"
                className="w-full"
                loading={resending}
                disabled={resending || cooldown > 0}
                onClick={handleResend}
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={handleBackToRegistration}
              >
                Back to registration
              </Button>
            </div>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}

export default VerifyEmail;
