import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import Button from "../ui/Button";
import Input from "../ui/Input";

import * as authService from "../../services/auth.service";
import useAuth from "../../hooks/useAuth";

function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await authService.login(data);

      login(response.user, response.token);

      toast.success("Login Successful");

      navigate("/dashboard");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Login Failed"
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

      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        register={register("password", {
          required: "Password is required",
        })}
        error={errors.password?.message}
      />

      <div className="flex items-center justify-between">

        <label className="flex items-center gap-2 text-sm">

          <input
            type="checkbox"
            {...register("rememberMe")}
          />

          Remember Me

        </label>

        <Link
          to="/forgot-password"
          className="text-sm text-indigo-600 hover:underline"
        >
          Forgot Password?
        </Link>

      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Logging In..."
          : "Login"}
      </Button>
    </form>
  );
}

export default LoginForm;