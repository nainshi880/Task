import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Modal from "../../ui/Modal";
import * as customerService from "../../../services/customer.service";
import { customerKeys } from "../../../lib/queryClient";

const EMPTY_ADDRESS = {
  label: "Home",
  street: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  isDefault: false,
};

function AddressForm({ defaultValues, onSubmit, onCancel, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Label</label>
        <select
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
          {...register("label")}
        >
          <option value="Home">Home</option>
          <option value="Office">Office</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <Input
        label="Street address"
        error={errors.street?.message}
        register={register("street", { required: "Street is required" })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="City"
          error={errors.city?.message}
          register={register("city", { required: "City is required" })}
        />
        <Input
          label="State"
          error={errors.state?.message}
          register={register("state", { required: "State is required" })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Postal code"
          error={errors.postalCode?.message}
          register={register("postalCode", { required: "Postal code is required" })}
        />
        <Input label="Country" register={register("country", { required: true })} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" {...register("isDefault")} className="h-4 w-4" />
        Set as default address
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Save address
        </Button>
      </div>
    </form>
  );
}

function AddressManager({ addresses = [] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    queryClient.invalidateQueries({ queryKey: customerKeys.addresses() });
  };

  const addMutation = useMutation({
    mutationFn: customerService.addAddress,
    onSuccess: () => {
      toast.success("Address added");
      invalidate();
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not add address");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customerService.updateAddress(id, data),
    onSuccess: () => {
      toast.success("Address updated");
      invalidate();
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not update address");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: customerService.deleteAddress,
    onSuccess: () => {
      toast.success("Address removed");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not delete address");
    },
  });

  const defaultMutation = useMutation({
    mutationFn: customerService.setDefaultAddress,
    onSuccess: () => {
      toast.success("Default address updated");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not set default");
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (address) => {
    setEditing(address);
    setModalOpen(true);
  };

  const handleSave = (data) => {
    const payload = {
      label: data.label,
      street: data.street.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      country: data.country.trim(),
      postalCode: data.postalCode.trim(),
      isDefault: Boolean(data.isDefault),
    };

    if (editing?._id) {
      updateMutation.mutate({ id: editing._id, data: payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  const isSaving = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Manage delivery and service locations for your bookings.
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} />
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <MapPin className="mx-auto text-slate-400" size={32} />
          <p className="mt-2 text-sm text-slate-500">No addresses saved yet.</p>
          <Button size="sm" className="mt-4" onClick={openAdd}>
            Add your first address
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address._id}
              className={clsx(
                "rounded-xl border p-4",
                address.isDefault
                  ? "border-indigo-200 bg-indigo-50/40"
                  : "border-slate-200 bg-white"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {address.label}
                    </span>
                    {address.isDefault && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{address.street}</p>
                  <p className="text-sm text-slate-600">
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p className="text-sm text-slate-500">{address.country}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(address)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Edit address"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this address?")) {
                        deleteMutation.mutate(address._id);
                      }
                    }}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label="Delete address"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {!address.isDefault && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full"
                  loading={defaultMutation.isPending}
                  onClick={() => defaultMutation.mutate(address._id)}
                >
                  <Star size={14} />
                  Set as default
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit address" : "Add address"}
      >
        <AddressForm
          defaultValues={
            editing
              ? {
                  label: editing.label || "Home",
                  street: editing.street || "",
                  city: editing.city || "",
                  state: editing.state || "",
                  country: editing.country || "India",
                  postalCode: editing.postalCode || "",
                  isDefault: Boolean(editing.isDefault),
                }
              : EMPTY_ADDRESS
          }
          onSubmit={handleSave}
          onCancel={closeModal}
          loading={isSaving}
        />
      </Modal>
    </div>
  );
}

export default AddressManager;
