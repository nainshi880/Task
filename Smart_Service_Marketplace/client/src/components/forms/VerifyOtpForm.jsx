import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import Button from "../ui/Button";
import Input from "../ui/Input";
import * as authService from "../../services/auth.service";

function VerifyOtpForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      phone: searchParams.get("phone") || "",
      code: "",
      purpose: searchParams.get("purpose") || "verify_phone",
    },
  });

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

  const handleSendOtp = async () => {
    const phone = getValues("phone")?.trim();
    const purpose = getValues("purpose") || "verify_phone";

    if (!phone || !/^[0-9+\-\s]{10,15}$/.test(phone)) {
      toast.error("Enter a valid phone number first");
      return;
    }

    try {
      await authService.sendOtp({ phone, purpose });
      setOtpSent(true);
      startCooldown(30);
      toast.success("OTP sent successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    }
  };

  const onSubmit = async (data) => {
    try {
      await authService.verifyOtpCode({
        phone: data.phone.trim(),
        code: data.code.trim(),
        purpose: data.purpose || "verify_phone",
      });

      toast.success("Phone verified successfully");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "OTP verification failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Input
        label="Phone number"
        type="tel"
        placeholder="9876543210"
        autoComplete="tel"
        register={register("phone", {
          required: "Phone number is required",
          pattern: {
            value: /^[0-9+\-\s]{10,15}$/,
            message: "Enter a valid phone number",
          },
        })}
        error={errors.phone?.message}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Purpose</label>
        <select
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          {...register("purpose")}
        >
          <option value="verify_phone">Verify phone</option>
          <option value="login">Login</option>
          <option value="booking">Booking</option>
          <option value="payment">Payment</option>
          <option value="general">General</option>
        </select>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={cooldown > 0}
        onClick={handleSendOtp}
      >
        {cooldown > 0
          ? `Resend OTP in ${cooldown}s`
          : otpSent
            ? "Resend OTP"
            : "Send OTP"}
      </Button>

      <Input
        label="OTP code"
        type="text"
        placeholder="Enter 4–8 digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        register={register("code", {
          required: "OTP code is required",
          minLength: { value: 4, message: "OTP must be at least 4 digits" },
          maxLength: { value: 8, message: "OTP must be at most 8 digits" },
        })}
        error={errors.code?.message}
      />

      <Button type="submit" className="w-full" disabled={isSubmitting || !otpSent}>
        {isSubmitting ? "Verifying..." : "Verify OTP"}
      </Button>

      {!otpSent && (
        <p className="text-center text-sm text-slate-500">
          Send an OTP to your phone, then enter the code above.
        </p>
      )}
    </form>
  );
}

export default VerifyOtpForm;
