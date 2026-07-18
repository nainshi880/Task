import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import FileUpload from "../../components/ui/FileUpload";
import * as technicianService from "../../services/technician.service";
import { technicianKeys } from "../../lib/queryClient";
import { SERVICE_CATEGORIES } from "../../constants/serviceCategories";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DEFAULT_HOURS = {
  monday: { isOff: false, start: "09:00", end: "18:00" },
  tuesday: { isOff: false, start: "09:00", end: "18:00" },
  wednesday: { isOff: false, start: "09:00", end: "18:00" },
  thursday: { isOff: false, start: "09:00", end: "18:00" },
  friday: { isOff: false, start: "09:00", end: "18:00" },
  saturday: { isOff: false, start: "09:00", end: "14:00" },
  sunday: { isOff: true, start: "00:00", end: "00:00" },
};

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function TechnicianProfileEditPage() {
  const queryClient = useQueryClient();
  const photoInputRef = useRef(null);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [identityFile, setIdentityFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [serviceAreasText, setServiceAreasText] = useState("");
  const [workingHours, setWorkingHours] = useState(DEFAULT_HOURS);
  const [available, setAvailable] = useState(true);

  const profileQuery = useQuery({
    queryKey: technicianKeys.profile(),
    queryFn: technicianService.getProfile,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      bio: "",
      profession: "",
      workingCity: "",
      address: "",
      state: "",
      pincode: "",
      workingRadius: 10,
      experienceYears: 0,
    },
  });

  const certForm = useForm({
    defaultValues: { name: "", issuedBy: "" },
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    const profile = profileQuery.data;
    reset({
      fullName: profile.fullName || "",
      phone: profile.phone || "",
      bio: profile.bio || "",
      profession:
        profile.profession ||
        profile.serviceCategories?.[0] ||
        profile.skills?.[0] ||
        "",
      workingCity: profile.workingCity || "",
      address: profile.address || "",
      state: profile.state || "",
      pincode: profile.pincode || "",
      workingRadius: profile.workingRadius ?? 10,
      experienceYears: profile.experienceYears ?? 0,
    });
    setSelectedCategories(
      profile.serviceCategories?.length
        ? profile.serviceCategories
        : profile.skills || []
    );
    setServiceAreasText((profile.serviceAreas || []).join(", "));
    setWorkingHours({ ...DEFAULT_HOURS, ...(profile.workingHours || {}) });
    setAvailable(profile.availabilityStatus ?? true);
  }, [profileQuery.data, reset]);

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: technicianKeys.profile() });

  const updateMutation = useMutation({
    mutationFn: technicianService.updateProfile,
    onSuccess: async () => {
      toast.success("Profile updated");
      await invalidateProfile();
      queryClient.invalidateQueries({ queryKey: technicianKeys.dashboard() });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not update profile");
    },
  });

  const photoMutation = useMutation({
    mutationFn: technicianService.uploadPhoto,
    onSuccess: async () => {
      toast.success("Profile picture updated");
      setPhotoPreview(null);
      await invalidateProfile();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Photo upload failed");
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: technicianService.deletePhoto,
    onSuccess: async () => {
      toast.success("Profile picture removed");
      setPhotoPreview(null);
      await invalidateProfile();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not remove photo");
    },
  });

  const identityMutation = useMutation({
    mutationFn: technicianService.uploadIdentityProof,
    onSuccess: async () => {
      toast.success("Identity document uploaded");
      setIdentityFile(null);
      await invalidateProfile();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Identity upload failed");
    },
  });

  const certMutation = useMutation({
    mutationFn: technicianService.uploadCertification,
    onSuccess: async () => {
      toast.success("Certificate uploaded");
      setCertFile(null);
      certForm.reset();
      await invalidateProfile();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Certificate upload failed");
    },
  });

  const deleteCertMutation = useMutation({
    mutationFn: technicianService.deleteCertification,
    onSuccess: async () => {
      toast.success("Certificate removed");
      await invalidateProfile();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not remove certificate");
    },
  });

  const categoriesMutation = useMutation({
    mutationFn: technicianService.updateServiceCategories,
    onSuccess: async () => {
      toast.success("Service categories updated");
      await invalidateProfile();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not update categories");
    },
  });

  const areasMutation = useMutation({
    mutationFn: technicianService.updateServiceAreas,
    onSuccess: async () => {
      toast.success("Service areas updated");
      await invalidateProfile();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not update areas");
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: async ({ availabilityStatus, hours }) => {
      await technicianService.updateAvailability(availabilityStatus);
      return technicianService.updateWorkingHours(hours);
    },
    onSuccess: async () => {
      toast.success("Availability updated");
      await invalidateProfile();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not update availability");
    },
  });

  if (profileQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading profile editor..." />
      </DashboardLayout>
    );
  }

  if (profileQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Profile not found</h1>
          <Link
            to="/setup/technician"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Finish setup
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const profile = profileQuery.data;
  const photoUrl = photoPreview || profile.profilePhoto || profile.user?.avatar;
  const displayName = profile.fullName || "Technician";

  const onSavePersonal = (values) => {
    updateMutation.mutate({
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      bio: values.bio.trim(),
      profession: values.profession,
      workingCity: values.workingCity.trim(),
      address: values.address.trim(),
      state: values.state.trim(),
      pincode: values.pincode.trim(),
      workingRadius: Number(values.workingRadius),
      experienceYears: Number(values.experienceYears),
      serviceCategories: selectedCategories.length
        ? selectedCategories
        : values.profession
          ? [values.profession]
          : undefined,
      skills: selectedCategories.length
        ? selectedCategories
        : values.profession
          ? [values.profession]
          : undefined,
    });
  };

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const updateHour = (day, field, value) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            to="/technician/profile"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to profile
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Edit profile</h1>
          <p className="mt-1 text-slate-500">
            Update personal info, documents, categories, and availability.
          </p>
        </div>

        <Section
          title="Profile picture"
          description="Upload a clear professional photo customers will see."
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover shadow"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow"
                aria-label="Upload photo"
              >
                <Camera size={14} />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setPhotoPreview(URL.createObjectURL(file));
                  photoMutation.mutate(file);
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                loading={photoMutation.isPending}
                onClick={() => photoInputRef.current?.click()}
              >
                Upload photo
              </Button>
              {profile.profilePhoto && (
                <Button
                  type="button"
                  variant="ghost"
                  loading={deletePhotoMutation.isPending}
                  onClick={() => deletePhotoMutation.mutate()}
                >
                  <Trash2 size={16} />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </Section>

        <Section
          title="Personal & professional information"
          description="Name, occupation, contact, location, experience, and working radius."
        >
          <form
            onSubmit={handleSubmit(onSavePersonal)}
            className="space-y-4"
            noValidate
          >
            <Input
              label="Full name"
              error={errors.fullName?.message}
              register={register("fullName", {
                required: "Full name is required",
                minLength: { value: 2, message: "Enter a valid name" },
              })}
            />
            <div>
              <label
                htmlFor="profession"
                className="text-sm font-medium text-slate-700"
              >
                Occupation / profession
              </label>
              <select
                id="profession"
                className={clsx(
                  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
                  errors.profession && "border-red-500"
                )}
                {...register("profession", {
                  required: "Occupation is required",
                })}
              >
                <option value="">Select occupation</option>
                {SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.profession?.message && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.profession.message}
                </p>
              )}
            </div>
            <Input
              label="Phone"
              error={errors.phone?.message}
              register={register("phone", {
                required: "Phone is required",
              })}
            />
            <div>
              <label className="text-sm font-medium text-slate-700">Bio</label>
              <textarea
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Tell customers about your work experience and specialties"
                {...register("bio")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Working city"
                error={errors.workingCity?.message}
                register={register("workingCity", {
                  required: "Working city is required",
                })}
              />
              <Input label="State" register={register("state")} />
            </div>
            <Input label="Address" register={register("address")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Pincode" register={register("pincode")} />
              <Input
                label="Working radius (km)"
                type="number"
                error={errors.workingRadius?.message}
                register={register("workingRadius", {
                  required: "Radius is required",
                  min: { value: 1, message: "Minimum 1 km" },
                  max: { value: 100, message: "Maximum 100 km" },
                  valueAsNumber: true,
                })}
              />
            </div>
            <Input
              label="Years of experience"
              type="number"
              error={errors.experienceYears?.message}
              register={register("experienceYears", {
                min: { value: 0, message: "Cannot be negative" },
                valueAsNumber: true,
              })}
            />
            <Button
              type="submit"
              loading={updateMutation.isPending}
              disabled={!isDirty && !updateMutation.isPending}
            >
              Save profile details
            </Button>
          </form>
        </Section>

        <Section
          title="Identity document"
          description="Upload Aadhaar, PAN, or another government ID."
        >
          {profile.identityProofUrl && (
            <a
              href={profile.identityProofUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-4 inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              View current identity document
            </a>
          )}
          <FileUpload
            label="Identity proof"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hint="JPG, PNG, WEBP, or PDF"
            file={identityFile}
            onChange={setIdentityFile}
          />
          <Button
            className="mt-4"
            type="button"
            disabled={!identityFile}
            loading={identityMutation.isPending}
            onClick={() => identityMutation.mutate(identityFile)}
          >
            Upload identity document
          </Button>
        </Section>

        <Section
          title="Certificates"
          description="Add skill certificates to build customer trust."
        >
          <ul className="mb-4 space-y-2">
            {(profile.certifications || []).map((cert) => (
              <li
                key={cert._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{cert.name}</p>
                  <p className="text-slate-500">
                    {cert.issuedBy || "Certificate"}
                    {cert.documentUrl && (
                      <>
                        {" · "}
                        <a
                          href={cert.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          View
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={deleteCertMutation.isPending}
                  onClick={() => deleteCertMutation.mutate(cert._id)}
                >
                  <Trash2 size={16} />
                </Button>
              </li>
            ))}
          </ul>

          <form
            className="space-y-4"
            onSubmit={certForm.handleSubmit((values) => {
              if (!certFile) {
                toast.error("Choose a certificate file");
                return;
              }
              certMutation.mutate({
                file: certFile,
                name: values.name.trim(),
                issuedBy: values.issuedBy.trim(),
              });
            })}
            noValidate
          >
            <Input
              label="Certificate name"
              error={certForm.formState.errors.name?.message}
              register={certForm.register("name", {
                required: "Name is required",
              })}
            />
            <Input
              label="Issued by (optional)"
              register={certForm.register("issuedBy")}
            />
            <FileUpload
              label="Certificate file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              file={certFile}
              onChange={setCertFile}
            />
            <Button type="submit" loading={certMutation.isPending}>
              Upload certificate
            </Button>
          </form>
        </Section>

        <Section
          title="Service categories"
          description="Select the services you offer."
        >
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map((category) => {
              const active = selectedCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>
          <Button
            className="mt-4"
            type="button"
            loading={categoriesMutation.isPending}
            onClick={() => {
              if (!selectedCategories.length) {
                toast.error("Select at least one category");
                return;
              }
              categoriesMutation.mutate(selectedCategories);
            }}
          >
            Save categories
          </Button>
        </Section>

        <Section
          title="Service areas"
          description="Comma-separated areas or neighborhoods you cover."
        >
          <textarea
            rows={3}
            value={serviceAreasText}
            onChange={(e) => setServiceAreasText(e.target.value)}
            placeholder="e.g. Andheri, Bandra, Juhu"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <Button
            className="mt-4"
            type="button"
            loading={areasMutation.isPending}
            onClick={() => {
              const areas = serviceAreasText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              areasMutation.mutate(areas);
            }}
          >
            Save service areas
          </Button>
        </Section>

        <Section
          title="Availability & working hours"
          description="Control when customers can book you."
        >
          <label className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Available for new jobs
          </label>

          <div className="space-y-3">
            {WEEKDAYS.map((day) => {
              const slot = workingHours[day] || DEFAULT_HOURS[day];
              return (
                <div
                  key={day}
                  className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[7rem_auto_1fr_1fr]"
                >
                  <p className="self-center capitalize text-sm font-medium text-slate-800">
                    {day}
                  </p>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={Boolean(slot.isOff)}
                      onChange={(e) =>
                        updateHour(day, "isOff", e.target.checked)
                      }
                    />
                    Off
                  </label>
                  <input
                    type="time"
                    disabled={slot.isOff}
                    value={slot.start || "09:00"}
                    onChange={(e) => updateHour(day, "start", e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                  />
                  <input
                    type="time"
                    disabled={slot.isOff}
                    value={slot.end || "18:00"}
                    onChange={(e) => updateHour(day, "end", e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                  />
                </div>
              );
            })}
          </div>

          <Button
            className="mt-4"
            type="button"
            loading={availabilityMutation.isPending}
            onClick={() =>
              availabilityMutation.mutate({
                availabilityStatus: available,
                hours: workingHours,
              })
            }
          >
            Save availability
          </Button>
        </Section>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianProfileEditPage;
