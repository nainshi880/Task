import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import Button from "../ui/Button";
import Input from "../ui/Input";

import * as authService from "../../services/auth.service";

function ForgotPasswordForm() {

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();

  const onSubmit = async (data) => {

    try {

      await authService.forgot(data.email);

      toast.success(
        "Password reset email sent successfully."
      );

      reset();

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
          "Failed to send email."
      );

    }

  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >

      <Input
        label="Email"
        type="email"
        placeholder="Enter your email"
        register={register("email", {
          required: "Email is required",
        })}
        error={errors.email?.message}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Sending..."
          : "Send Reset Link"}
      </Button>

    </form>
  );
}

export default ForgotPasswordForm;