import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import Button from "../../ui/Button";
import Input from "../../ui/Input";
import PasswordStrength from "../../ui/PasswordStrength";
import * as customerService from "../../../services/customer.service";
import { validateStrongPassword } from "../../../utils/password";

function ChangePasswordSection() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword", "");

  const mutation = useMutation({
    mutationFn: customerService.changePassword,
    onSuccess: (result) => {
      toast.success(result?.message || "Password changed successfully");
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not change password");
    },
  });

  const onSubmit = (data) => {
    const check = validateStrongPassword(data.newPassword);
    if (check !== true) {
      toast.error(check);
      return;
    }
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    mutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-5" noValidate>
      <p className="text-sm text-slate-500">
        Use a strong password with uppercase, lowercase, numbers, and symbols.
      </p>

      <Input
        label="Current password"
        type="password"
        error={errors.currentPassword?.message}
        register={register("currentPassword", {
          required: "Current password is required",
        })}
      />

      <Input
        label="New password"
        type="password"
        error={errors.newPassword?.message}
        register={register("newPassword", {
          required: "New password is required",
        })}
      />
      <PasswordStrength password={newPassword} />

      <Input
        label="Confirm new password"
        type="password"
        error={errors.confirmPassword?.message}
        register={register("confirmPassword", {
          required: "Please confirm your password",
        })}
      />

      <Button type="submit" loading={isSubmitting || mutation.isPending}>
        Update password
      </Button>
    </form>
  );
}

export default ChangePasswordSection;
