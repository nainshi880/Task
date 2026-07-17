import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import Button from "../ui/Button";
import Input from "../ui/Input";
import PasswordStrength from "../ui/PasswordStrength";
import FileUpload from "../ui/FileUpload";
import * as authService from "../../services/auth.service";
import useAuth from "../../hooks/useAuth";
import { validateStrongPassword } from "../../utils/password";
import SERVICE_CATEGORIES from "../../constants/serviceCategories";
import { getProfileSetupPath } from "../../constants/roles";

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_PATTERN = /^[0-9+\-\s]{10,15}$/;
const PINCODE_PATTERN = /^[0-9]{4,12}$/;

const ROLE_TABS = [
  { id: "customer", label: "Customer" },
  { id: "technician", label: "Technician" },
];

function RegisterForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState("customer");
  const [formError, setFormError] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [identityProof, setIdentityProof] = useState(null);
  const [fileErrors, setFileErrors] = useState({});

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      profession: "",
      experience: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    },
  });

  const password = watch("password", "");

  const switchRole = (nextRole) => {
    setRole(nextRole);
    setFormError("");
    setFileErrors({});
    setProfileImage(null);
    setIdentityProof(null);
    reset();
  };

  const validateFiles = () => {
    if (role !== "technician") return true;

    const nextErrors = {};
    if (!profileImage) nextErrors.profileImage = "Profile image is required";
    if (!identityProof) nextErrors.identityProof = "Identity proof is required";
    setFileErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (data) => {
    setFormError("");

    if (!validateFiles()) {
      setFormError("Please upload the required documents.");
      return;
    }

    try {
      if (role === "customer") {
        const response = await authService.register({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          name: `${data.firstName.trim()} ${data.lastName.trim()}`,
          email: data.email.trim().toLowerCase(),
          phone: data.phone.trim(),
          password: data.password,
        });

        login(response.user, response.token || response.accessToken, {
          refreshToken: response.refreshToken,
        });
        toast.success("Account created successfully");
        navigate("/verify-email");
        return;
      }

      const formData = new FormData();
      formData.append("firstName", data.firstName.trim());
      formData.append("lastName", data.lastName.trim());
      formData.append("email", data.email.trim().toLowerCase());
      formData.append("phone", data.phone.trim());
      formData.append("password", data.password);
      formData.append("profession", data.profession);
      formData.append("experience", String(data.experience));
      formData.append("address", data.address.trim());
      formData.append("city", data.city.trim());
      formData.append("state", data.state.trim());
      formData.append("pincode", data.pincode.trim());
      formData.append("profileImage", profileImage);
      formData.append("identityProof", identityProof);

      const response = await authService.registerTechnician(formData);

      login(response.user, response.token || response.accessToken, {
        refreshToken: response.refreshToken,
      });
      toast.success("Technician application submitted. Awaiting approval.");
      navigate(getProfileSetupPath("technician") || "/setup/technician");
    } catch (error) {
      const message =
        error.response?.data?.message || "Registration failed. Please try again.";
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchRole(tab.id)}
            className={clsx(
              "rounded-lg px-4 py-2.5 text-sm font-semibold transition",
              role === tab.id
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {tab.label}
          </button>
        ))}
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

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="First name"
          placeholder="Jane"
          autoComplete="given-name"
          register={register("firstName", {
            required: "First name is required",
            minLength: { value: 1, message: "First name is required" },
          })}
          error={errors.firstName?.message}
        />

        <Input
          label="Last name"
          placeholder="Customer"
          autoComplete="family-name"
          register={register("lastName", {
            required: "Last name is required",
            minLength: { value: 1, message: "Last name is required" },
          })}
          error={errors.lastName?.message}
        />
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
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
        label="Phone number"
        type="tel"
        placeholder="9876543210"
        autoComplete="tel"
        register={register("phone", {
          required: "Phone number is required",
          pattern: {
            value: PHONE_PATTERN,
            message: "Enter a valid phone number",
          },
        })}
        error={errors.phone?.message}
      />

      {role === "technician" && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Profession
              </label>
              <select
                className={clsx(
                  "w-full rounded-xl border bg-white px-4 py-3 outline-none focus:ring-4",
                  errors.profession
                    ? "border-red-500 focus:ring-red-100"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                )}
                {...register("profession", {
                  required: "Profession is required",
                })}
              >
                <option value="">Select profession</option>
                {SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.profession && (
                <p className="text-sm text-red-500">{errors.profession.message}</p>
              )}
            </div>

            <Input
              label="Experience (years)"
              type="number"
              placeholder="3"
              register={register("experience", {
                required: "Experience is required",
                valueAsNumber: true,
                min: { value: 0, message: "Experience cannot be negative" },
                max: { value: 50, message: "Experience cannot exceed 50 years" },
              })}
              error={errors.experience?.message}
            />
          </div>

          <Input
            label="Address"
            placeholder="Street address"
            autoComplete="street-address"
            register={register("address", {
              required: "Address is required",
              minLength: { value: 5, message: "Enter a complete address" },
            })}
            error={errors.address?.message}
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <Input
              label="City"
              placeholder="City"
              autoComplete="address-level2"
              register={register("city", {
                required: "City is required",
              })}
              error={errors.city?.message}
            />

            <Input
              label="State"
              placeholder="State"
              autoComplete="address-level1"
              register={register("state", {
                required: "State is required",
              })}
              error={errors.state?.message}
            />

            <Input
              label="Pincode"
              placeholder="560001"
              autoComplete="postal-code"
              register={register("pincode", {
                required: "Pincode is required",
                pattern: {
                  value: PINCODE_PATTERN,
                  message: "Enter a valid pincode",
                },
              })}
              error={errors.pincode?.message}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FileUpload
              label="Profile image"
              accept="image/jpeg,image/png,image/webp"
              hint="JPEG, PNG or WEBP up to 5MB"
              file={profileImage}
              onChange={(file) => {
                setProfileImage(file);
                setFileErrors((prev) => ({ ...prev, profileImage: undefined }));
              }}
              error={fileErrors.profileImage}
            />

            <FileUpload
              label="Identity proof"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              hint="Aadhaar / PAN / License (image or PDF)"
              file={identityProof}
              onChange={(file) => {
                setIdentityProof(file);
                setFileErrors((prev) => ({ ...prev, identityProof: undefined }));
              }}
              error={fileErrors.identityProof}
            />
          </div>
        </>
      )}

      <Input
        label="Password"
        type="password"
        placeholder="Create a strong password"
        autoComplete="new-password"
        register={register("password", {
          required: "Password is required",
          validate: validateStrongPassword,
        })}
        error={errors.password?.message}
      />

      <PasswordStrength password={password} />

      <Input
        label="Confirm password"
        type="password"
        placeholder="Re-enter password"
        autoComplete="new-password"
        register={register("confirmPassword", {
          required: "Please confirm your password",
          validate: (value) => value === password || "Passwords do not match",
        })}
        error={errors.confirmPassword?.message}
      />

      <label className="flex items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          {...register("acceptTerms", {
            required: "You must accept the Terms & Privacy Policy",
          })}
        />
        <span>
          I accept the{" "}
          <Link to="/terms" className="font-medium text-indigo-600 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-medium text-indigo-600 hover:underline">
            Privacy Policy
          </Link>
        </span>
      </label>
      {errors.acceptTerms && (
        <p className="text-sm text-red-500">{errors.acceptTerms.message}</p>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? role === "technician"
            ? "Submitting application..."
            : "Creating account..."
          : role === "technician"
            ? "Apply as technician"
            : "Create customer account"}
      </Button>
    </form>
  );
}

export default RegisterForm;
