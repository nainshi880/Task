import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../ui/Button";
import Input from "../ui/Input";
import FileUpload from "../ui/FileUpload";
import Stepper from "../ui/Stepper";
import * as customerService from "../../services/customer.service";
import * as authService from "../../services/auth.service";
import useAuth from "../../hooks/useAuth";
import { authKeys } from "../../lib/queryClient";
import { getRoleHome } from "../../constants/roles";

const STEPS = [
  { id: "photo", label: "Photo" },
  { id: "address", label: "Address" },
  { id: "phone", label: "Phone" },
];

function CustomerProfileSetupWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  const [step, setStep] = useState(0);
  const [avatarFile, setAvatarFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState("");

  const photoForm = useForm({
    defaultValues: {
      fullName: user?.name || "",
      gender: "",
      dateOfBirth: "",
    },
  });

  const addressForm = useForm({
    defaultValues: {
      label: "Home",
      street: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
      isDefault: true,
    },
  });

  const phoneForm = useForm({
    defaultValues: {
      phone: user?.phone || "",
      code: "",
    },
  });

  const subtitle = useMemo(() => {
    if (step === 0) return "Add a profile photo and a few personal details.";
    if (step === 1) return "Where should technicians visit you?";
    return "Verify your phone number with a one-time code.";
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

  const refreshMe = async () => {
    const me = await authService.me();
    setUser(me);
    queryClient.setQueryData(authKeys.me(), me);
    return me;
  };

  const onPhotoSubmit = async (data) => {
    setFormError("");
    if (!avatarFile) {
      setFormError("Please upload a profile picture.");
      return;
    }

    try {
      await customerService.ensureProfile({
        fullName: data.fullName.trim(),
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
      });

      try {
        await customerService.updateProfile({
          fullName: data.fullName.trim(),
          gender: data.gender,
          dateOfBirth: data.dateOfBirth,
        });
      } catch {
        // Profile may already have matching data
      }

      await customerService.uploadAvatar(avatarFile);
      toast.success("Profile photo saved");
      setStep(1);
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not save profile photo.";
      setFormError(message);
      toast.error(message);
    }
  };

  const onAddressSubmit = async (data) => {
    setFormError("");
    try {
      await customerService.addAddress({
        label: data.label,
        street: data.street.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        country: data.country.trim(),
        postalCode: data.postalCode.trim(),
        isDefault: Boolean(data.isDefault),
      });
      toast.success("Address added");
      setStep(2);
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not save address.";
      setFormError(message);
      toast.error(message);
    }
  };

  const sendPhoneOtp = async () => {
    const phone = phoneForm.getValues("phone")?.trim();
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }

    try {
      const result = await authService.sendOtp({
        phone,
        purpose: "verify_phone",
      });
      if (result?.debugOtp) setDebugOtp(result.debugOtp);
      setOtpSent(true);
      startCooldown(30);
      toast.success("OTP sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    }
  };

  const onPhoneSubmit = async (data) => {
    setFormError("");
    try {
      await authService.verifyOtpCode({
        phone: data.phone.trim(),
        code: data.code.trim(),
        purpose: "verify_phone",
      });

      await customerService.updateProfile({
        phone: data.phone.trim(),
        fullName: photoForm.getValues("fullName")?.trim() || user?.name,
        gender: photoForm.getValues("gender"),
        dateOfBirth: photoForm.getValues("dateOfBirth"),
      });

      await refreshMe();
      toast.success("Profile setup complete");
      navigate(getRoleHome("customer"), { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message || "Phone verification failed.";
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Complete your profile</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <Stepper steps={STEPS} currentStep={step} />

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
          onSubmit={photoForm.handleSubmit(onPhotoSubmit)}
          className="space-y-5"
          noValidate
        >
          <FileUpload
            label="Profile picture"
            accept="image/jpeg,image/png,image/webp"
            hint="JPEG, PNG, or WEBP up to 5MB"
            file={avatarFile}
            onChange={setAvatarFile}
          />

          <Input
            label="Full name"
            error={photoForm.formState.errors.fullName?.message}
            register={photoForm.register("fullName", {
              required: "Full name is required",
              minLength: { value: 3, message: "At least 3 characters" },
            })}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Gender</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              {...photoForm.register("gender", { required: "Select gender" })}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {photoForm.formState.errors.gender && (
              <p className="text-sm text-red-500">
                {photoForm.formState.errors.gender.message}
              </p>
            )}
          </div>

          <Input
            label="Date of birth"
            type="date"
            error={photoForm.formState.errors.dateOfBirth?.message}
            register={photoForm.register("dateOfBirth", {
              required: "Date of birth is required",
            })}
          />

          <Button type="submit" loading={photoForm.formState.isSubmitting} className="w-full">
            Continue
          </Button>
        </form>
      )}

      {step === 1 && (
        <form
          onSubmit={addressForm.handleSubmit(onAddressSubmit)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Label</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              {...addressForm.register("label")}
            >
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <Input
            label="Street address"
            error={addressForm.formState.errors.street?.message}
            register={addressForm.register("street", {
              required: "Street is required",
            })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="City"
              error={addressForm.formState.errors.city?.message}
              register={addressForm.register("city", { required: "City is required" })}
            />
            <Input
              label="State"
              error={addressForm.formState.errors.state?.message}
              register={addressForm.register("state", { required: "State is required" })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Postal code"
              error={addressForm.formState.errors.postalCode?.message}
              register={addressForm.register("postalCode", {
                required: "Postal code is required",
              })}
            />
            <Input
              label="Country"
              register={addressForm.register("country", { required: true })}
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              type="submit"
              loading={addressForm.formState.isSubmitting}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
          className="space-y-5"
          noValidate
        >
          <Input
            label="Phone number"
            type="tel"
            error={phoneForm.formState.errors.phone?.message}
            register={phoneForm.register("phone", {
              required: "Phone is required",
              pattern: {
                value: /^[0-9]{10}$/,
                message: "Enter a 10-digit phone number",
              },
            })}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={sendPhoneOtp}
              disabled={cooldown > 0}
              className="flex-1"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : otpSent ? "Resend OTP" : "Send OTP"}
            </Button>
          </div>

          {debugOtp && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Dev OTP: <strong>{debugOtp}</strong>
            </p>
          )}

          <Input
            label="OTP code"
            error={phoneForm.formState.errors.code?.message}
            register={phoneForm.register("code", {
              required: "OTP is required",
              minLength: { value: 4, message: "Enter the OTP code" },
            })}
          />

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="submit"
              loading={phoneForm.formState.isSubmitting}
              className="flex-1"
            >
              Finish setup
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default CustomerProfileSetupWizard;
