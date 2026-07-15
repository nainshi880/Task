import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import Button from "../ui/Button";
import Input from "../ui/Input";
import PasswordStrength from "../ui/PasswordStrength";

import * as authService from "../../services/auth.service";

function RegisterForm() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch("password", "");

  const onSubmit = async (data) => {
    try {
      await authService.register(data);

      toast.success("Registration Successful");

      navigate("/login");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Registration Failed"
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      <Input
        label="Full Name"
        placeholder="Enter your name"
        register={register("name", {
          required: "Name is required",
        })}
        error={errors.name?.message}
      />

      <Input
        label="Email"
        type="email"
        placeholder="Enter your email"
        register={register("email", {
          required: "Email is required",
          pattern: {
            value:
              /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
            message: "Invalid email",
          },
        })}
        error={errors.email?.message}
      />

      <Input
        label="Password"
        type="password"
        placeholder="Create password"
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
        placeholder="Confirm password"
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
          ? "Creating Account..."
          : "Register"}
      </Button>
    </form>
  );
}

export default RegisterForm;