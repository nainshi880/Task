import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import Button from "../ui/Button";
import Input from "../ui/Input";
import PasswordStrength from "../ui/PasswordStrength";
import * as authService from "../../services/auth.service";
import { validateStrongPassword } from "../../utils/password";

function ResetPasswordForm() {
  const navigate = useNavigate();
  const { token } = useParams();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password", "");

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("Reset token is missing or invalid.");
      return;
    }

    try {
      await authService.reset(token, {
        password: data.password,
      });

      toast.success("Password reset successfully. Please sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Password reset failed");
    }
  };

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-slate-600">
          This reset link is incomplete. Request a new password reset email.
        </p>
        <Button className="w-full" onClick={() => navigate("/forgot-password")}>
          Request new link
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        You opened a secure email reset link. Set your new password below, then
        sign in.
      </div>

      <Input
        label="New password"
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

      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={isSubmitting}
      >
        {isSubmitting ? "Updating..." : "Reset password"}
      </Button>
    </form>
  );
}

export default ResetPasswordForm;
