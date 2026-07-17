import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import Button from "../../ui/Button";
import Input from "../../ui/Input";
import * as customerService from "../../../services/customer.service";
import { customerKeys } from "../../../lib/queryClient";

function EmergencyContactSection({ profile }) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      relationship: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.emergencyContact?.name || "",
        phone: profile.emergencyContact?.phone || "",
        relationship: profile.emergencyContact?.relationship || "",
      });
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (data) =>
      customerService.updateProfile({
        fullName: profile.fullName,
        emergencyContact: data,
      }),
    onSuccess: () => {
      toast.success("Emergency contact saved");
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not save contact");
    },
  });

  const onSubmit = (data) => {
    mutation.mutate({
      name: data.name.trim(),
      phone: data.phone.trim(),
      relationship: data.relationship.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <p className="text-sm text-slate-500">
        Add someone we can reach in case of an emergency during a service visit.
      </p>

      <Input
        label="Contact name"
        error={errors.name?.message}
        register={register("name", { required: "Name is required" })}
      />

      <Input
        label="Phone number"
        type="tel"
        error={errors.phone?.message}
        register={register("phone", {
          required: "Phone is required",
          pattern: {
            value: /^[0-9]{10}$/,
            message: "Enter a 10-digit phone number",
          },
        })}
      />

      <Input
        label="Relationship"
        placeholder="e.g. Spouse, Parent, Friend"
        error={errors.relationship?.message}
        register={register("relationship", {
          required: "Relationship is required",
        })}
      />

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={isSubmitting || mutation.isPending}
          disabled={!isDirty}
        >
          Save contact
        </Button>
      </div>
    </form>
  );
}

export default EmergencyContactSection;
