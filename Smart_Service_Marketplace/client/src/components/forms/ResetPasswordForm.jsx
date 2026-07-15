import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import Button from "../ui/Button";
import Input from "../ui/Input";
import PasswordStrength from "../ui/PasswordStrength";

import * as authService from "../../services/auth.service";

function ResetPasswordForm() {

  const navigate = useNavigate();

  const { token } = useParams();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch("password", "");

  const onSubmit = async (data) => {

    try {

      await authService.reset(token, {
        password: data.password,
      });

      toast.success(
        "Password reset successfully."
      );

      navigate("/login");

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
          "Password reset failed."
      );

    }

  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >

      <Input
        label="New Password"
        type="password"
        register={register("password", {
          required: "Password is required",
          minLength: {
            value: 8,
            message: "Minimum 8 characters",
          },
        })}
        error={errors.password?.message}
      />

      <PasswordStrength password={password} />

      <Input
        label="Confirm Password"
        type="password"
        register={register("confirmPassword", {
          validate: (value) =>
            value === password ||
            "Passwords do not match",
        })}
        error={errors.confirmPassword?.message}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Updating..."
          : "Reset Password"}
      </Button>

    </form>
  );
}

export default ResetPasswordForm;