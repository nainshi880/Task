import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import Button from "../../ui/Button";
import Input from "../../ui/Input";
import * as customerService from "../../../services/customer.service";
import { customerKeys } from "../../../lib/queryClient";
import { toDateInputValue } from "../../../utils/format";

function PersonalInfoSection({ profile }) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      gender: "",
      dateOfBirth: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        gender: profile.gender || "",
        dateOfBirth: toDateInputValue(profile.dateOfBirth),
      });
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: customerService.updateProfile,
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: customerKeys.dashboard() });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Update failed");
    },
  });

  const onSubmit = (data) => {
    mutation.mutate({
      fullName: data.fullName.trim(),
      phone: data.phone?.trim() || undefined,
      gender: data.gender || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Input
        label="Full name"
        error={errors.fullName?.message}
        register={register("fullName", {
          required: "Full name is required",
          minLength: { value: 3, message: "At least 3 characters" },
        })}
      />

      <Input
        label="Email"
        value={profile?.user?.email || ""}
        disabled
        className="bg-slate-50"
      />

      <Input
        label="Phone"
        type="tel"
        error={errors.phone?.message}
        register={register("phone", {
          pattern: {
            value: /^[0-9]{10}$/,
            message: "Enter a 10-digit phone number",
          },
        })}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Gender</label>
        <select
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          {...register("gender")}
        >
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <Input
        label="Date of birth"
        type="date"
        register={register("dateOfBirth")}
      />

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={isSubmitting || mutation.isPending}
          disabled={!isDirty}
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}

export default PersonalInfoSection;
