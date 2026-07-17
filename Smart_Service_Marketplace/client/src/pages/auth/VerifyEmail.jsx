import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { CheckCircle2, XCircle, Mail, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import * as authService from "../../services/auth.service";
import useAuth from "../../hooks/useAuth";

function StatusIcon({ type }) {
  if (type === "success") {
    return (
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={34} />
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
        <XCircle size={34} />
      </div>
    );
  }

  if (type === "mail") {
    return (
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <Mail size={34} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-indigo-600">
      <Loader2 size={34} className="animate-spin" />
    </div>
  );
}

function VerifyEmail() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const { token: authToken, user, setUser } = useAuth();

  const [status, setStatus] = useState(token ? "loading" : "pending");
  const [errorMessage, setErrorMessage] = useState("");
  const [debugVerifyURL, setDebugVerifyURL] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: user?.email || searchParams.get("email") || "",
    },
  });

  useEffect(() => {
    if (user?.email) {
      setValue("email", user.email);
    }
  }, [user, setValue]);

  useEffect(() => {
    if (!token) return;

    let active = true;

    const verify = async () => {
      try {
        const result = await authService.verify(token);
        if (!active) return;

        setStatus("success");
        toast.success(result?.message || "Email verified successfully");

        if (user && setUser) {
          setUser({
            ...user,
            isVerified: true,
            ...(result?.user || {}),
          });
        }
      } catch (error) {
        if (!active) return;
        setStatus("invalid");
        setErrorMessage(
          error.response?.data?.message ||
            "This verification link is invalid or has expired."
        );
        toast.error(error.response?.data?.message || "Verification failed");
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleResendAuthenticated = async () => {
    try {
      setResending(true);
      const result = await authService.sendVerification();
      if (result?.debugVerifyURL) {
        setDebugVerifyURL(result.debugVerifyURL);
      }
      startCooldown(30);
      toast.success(result?.message || "Verification email sent");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send verification email"
      );
    } finally {
      setResending(false);
    }
  };

  const handleResendByEmail = async (data) => {
    try {
      setResending(true);
      const result = await authService.resendVerification(
        data.email.trim().toLowerCase()
      );

      if (result?.alreadyVerified) {
        toast.success("Email is already verified. You can sign in.");
        setStatus("success");
        return;
      }

      if (result?.debugVerifyURL) {
        setDebugVerifyURL(result.debugVerifyURL);
      }

      startCooldown(30);
      toast.success("If an account exists, a verification email was sent");
      setStatus("pending");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to resend verification email"
      );
    } finally {
      setResending(false);
    }
  };

  const title =
    status === "success"
      ? "Email verified"
      : status === "invalid"
        ? "Invalid link"
        : status === "loading"
          ? "Verifying email"
          : "Verify your email";

  const subtitle =
    status === "success"
      ? "Your account is ready to use."
      : status === "invalid"
        ? "Request a new verification email to continue."
        : status === "loading"
          ? "Please wait while we confirm your email."
          : "Check your inbox for a verification link.";

  return (
    <AuthLayout title={title} subtitle={subtitle} maxWidthClass="max-w-lg">
      <Card className="text-center shadow-2xl">
        {status === "loading" && (
          <div className="space-y-4 py-4">
            <StatusIcon type="loading" />
            <h2 className="text-2xl font-semibold text-slate-800">Verifying...</h2>
            <p className="text-slate-500">
              Confirming your email address. This only takes a moment.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-5 py-2">
            <StatusIcon type="success" />
            <h2 className="text-3xl font-bold text-emerald-600">Success</h2>
            <p className="text-slate-600">
              Your email has been verified successfully. You can now use all
              account features.
            </p>
            <div className="space-y-3 pt-2">
              <Link to="/login">
                <Button className="w-full" size="lg">
                  Continue to login
                </Button>
              </Link>
              {authToken && (
                <Link to="/dashboard">
                  <Button variant="outline" className="w-full">
                    Go to dashboard
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {status === "invalid" && (
          <div className="space-y-5 py-2">
            <StatusIcon type="error" />
            <h2 className="text-3xl font-bold text-red-600">Invalid link</h2>
            <p className="text-slate-600">
              {errorMessage ||
                "This verification link is invalid or has expired."}
            </p>

            <div className="space-y-4 pt-2 text-left">
              {authToken ? (
                <Button
                  className="w-full"
                  size="lg"
                  loading={resending}
                  disabled={resending || cooldown > 0}
                  onClick={handleResendAuthenticated}
                >
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Resend verification email"}
                </Button>
              ) : (
                <form
                  onSubmit={handleSubmit(handleResendByEmail)}
                  className="space-y-4"
                  noValidate
                >
                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    register={register("email", {
                      required: "Email is required",
                      pattern: {
                        value:
                          /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                        message: "Enter a valid email",
                      },
                    })}
                    error={errors.email?.message}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={resending}
                    disabled={resending || cooldown > 0}
                  >
                    {cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : "Resend verification email"}
                  </Button>
                </form>
              )}

              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Back to login
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div className="space-y-5 py-2">
            <StatusIcon type="mail" />
            <h2 className="text-2xl font-semibold text-slate-800">
              Check your inbox
            </h2>
            <p className="text-slate-600">
              We sent a verification link to{" "}
              <span className="font-medium text-slate-800">
                {user?.email || "your email address"}
              </span>
              . Open the link to activate your account.
            </p>

            <div className="space-y-4 pt-2 text-left">
              {authToken ? (
                <Button
                  className="w-full"
                  size="lg"
                  loading={resending}
                  disabled={resending || cooldown > 0}
                  onClick={handleResendAuthenticated}
                >
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Resend verification email"}
                </Button>
              ) : (
                <form
                  onSubmit={handleSubmit(handleResendByEmail)}
                  className="space-y-4"
                  noValidate
                >
                  <Input
                    label="Email for resend"
                    type="email"
                    placeholder="you@example.com"
                    register={register("email", {
                      required: "Email is required",
                      pattern: {
                        value:
                          /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                        message: "Enter a valid email",
                      },
                    })}
                    error={errors.email?.message}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={resending}
                    disabled={resending || cooldown > 0}
                  >
                    {cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : "Resend verification email"}
                  </Button>
                </form>
              )}

              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Back to login
                </Button>
              </Link>
            </div>
          </div>
        )}

        {debugVerifyURL && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            <p className="font-medium">Dev mode verification link</p>
            <a
              href={debugVerifyURL}
              className="mt-1 block break-all text-indigo-700 underline"
            >
              {debugVerifyURL}
            </a>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}

export default VerifyEmail;
