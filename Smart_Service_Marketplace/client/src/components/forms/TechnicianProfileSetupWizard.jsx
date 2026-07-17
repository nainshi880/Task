import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import Button from "../ui/Button";
import Input from "../ui/Input";
import FileUpload from "../ui/FileUpload";
import Stepper from "../ui/Stepper";
import * as technicianService from "../../services/technician.service";
import * as authService from "../../services/auth.service";
import useAuth from "../../hooks/useAuth";
import { authKeys } from "../../lib/queryClient";
import { getRoleHome } from "../../constants/roles";
import { SERVICE_CATEGORIES } from "../../constants/serviceCategories";

const STEPS = [
  { id: "photo", label: "Photo" },
  { id: "identity", label: "ID Proof" },
  { id: "certs", label: "Certificates" },
  { id: "categories", label: "Categories" },
  { id: "radius", label: "Radius" },
  { id: "availability", label: "Availability" },
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

function TechnicianProfileSetupWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [identityFile, setIdentityFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [skipCert, setSkipCert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const certForm = useForm({
    defaultValues: { name: "", issuedBy: "" },
  });

  const radiusForm = useForm({
    defaultValues: {
      workingCity: user?.city || "",
      workingRadius: 10,
      experienceYears: 1,
    },
  });

  const availabilityForm = useForm({
    defaultValues: {
      availabilityStatus: true,
      workingHours: DEFAULT_HOURS,
    },
  });

  const subtitle = useMemo(() => {
    const messages = [
      "Upload a clear professional photo.",
      "Upload Aadhaar or PAN for verification.",
      "Add at least one skill certificate (optional to skip).",
      "Select the service categories you offer.",
      "Set your working city and service radius.",
      "Choose when you are available for jobs.",
    ];
    return messages[step];
  }, [step]);

  const refreshMe = async () => {
    const me = await authService.me();
    setUser(me);
    queryClient.setQueryData(authKeys.me(), me);
    return me;
  };

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const onPhotoNext = async () => {
    setFormError("");
    if (!photoFile) {
      setFormError("Please upload a profile photo.");
      return;
    }

    setSubmitting(true);
    try {
      await technicianService.uploadPhoto(photoFile);
      toast.success("Photo uploaded");
      setStep(1);
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not upload photo.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onIdentityNext = async () => {
    setFormError("");
    if (!identityFile) {
      setFormError("Please upload Aadhaar or PAN.");
      return;
    }

    setSubmitting(true);
    try {
      await technicianService.uploadIdentityProof(identityFile);
      toast.success("Identity proof uploaded");
      setStep(2);
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not upload identity proof.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onCertNext = async (data) => {
    setFormError("");

    if (skipCert) {
      setStep(3);
      return;
    }

    if (!certFile || !data.name?.trim()) {
      setFormError("Upload a certificate or choose Skip for now.");
      return;
    }

    setSubmitting(true);
    try {
      await technicianService.uploadCertification({
        file: certFile,
        name: data.name.trim(),
        issuedBy: data.issuedBy?.trim(),
      });
      toast.success("Certificate uploaded");
      setStep(3);
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not upload certificate.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onCategoriesNext = async () => {
    setFormError("");
    if (!selectedCategories.length) {
      setFormError("Select at least one service category.");
      return;
    }

    setSubmitting(true);
    try {
      await technicianService.updateServiceCategories(selectedCategories);
      toast.success("Categories saved");
      setStep(4);
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not save categories.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onRadiusNext = async (data) => {
    setFormError("");
    setSubmitting(true);
    try {
      const city = data.workingCity.trim();
      const radius = Number(data.workingRadius);

      await technicianService.updateProfile({
        workingCity: city,
        workingRadius: radius,
        experienceYears: Number(data.experienceYears),
        serviceCategories: selectedCategories,
        skills: selectedCategories,
      });

      await technicianService.updateServiceAreas([
        city,
        `${city} (${radius} km)`,
      ]);

      toast.success("Working radius saved");
      setStep(5);
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not save working radius.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onAvailabilitySubmit = async (data) => {
    setFormError("");
    setSubmitting(true);

    try {
      const workingHours = data.workingHours || DEFAULT_HOURS;

      const city = radiusForm.getValues("workingCity")?.trim();
      const radius = Number(radiusForm.getValues("workingRadius"));

      await technicianService.updateWorkingHours(workingHours);
      await technicianService.updateAvailability(Boolean(data.availabilityStatus));
      await technicianService.completeSetup({
        workingCity: city,
        workingRadius: radius,
        experienceYears: Number(radiusForm.getValues("experienceYears")),
        serviceCategories: selectedCategories,
        serviceAreas: [city, `${city} (${radius} km)`],
        availabilityStatus: Boolean(data.availabilityStatus),
        workingHours,
      });

      await refreshMe();
      toast.success("Profile setup complete");
      navigate(getRoleHome("technician"), { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not finish profile setup.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Technician profile setup</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <Stepper steps={STEPS} currentStep={step} />

      {formError && (
        <div
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      {step === 0 && (
        <div className="space-y-5">
          <FileUpload
            label="Professional photo"
            accept="image/jpeg,image/png,image/webp"
            hint="JPEG, PNG, or WEBP up to 5MB"
            file={photoFile}
            onChange={setPhotoFile}
          />
          <Button onClick={onPhotoNext} loading={submitting} className="w-full">
            Continue
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <FileUpload
            label="Aadhaar / PAN"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hint="Image or PDF up to 5MB"
            file={identityFile}
            onChange={setIdentityFile}
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={onIdentityNext} loading={submitting} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form
          onSubmit={certForm.handleSubmit(onCertNext)}
          className="space-y-5"
          noValidate
        >
          <FileUpload
            label="Certificate document"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hint="Optional — you can skip this step"
            file={certFile}
            onChange={(file) => {
              setSkipCert(false);
              setCertFile(file);
            }}
          />
          <Input
            label="Certificate name"
            register={certForm.register("name")}
            placeholder="e.g. Electrical License"
          />
          <Input
            label="Issued by"
            register={certForm.register("issuedBy")}
            placeholder="Issuing authority"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={skipCert}
              onChange={(event) => setSkipCert(event.target.checked)}
            />
            Skip for now
          </label>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICE_CATEGORIES.map((category) => {
              const selected = selectedCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={clsx(
                    "rounded-xl border px-4 py-3 text-left text-sm font-medium transition",
                    selected
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={onCategoriesNext} loading={submitting} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <form
          onSubmit={radiusForm.handleSubmit(onRadiusNext)}
          className="space-y-5"
          noValidate
        >
          <Input
            label="Working city"
            error={radiusForm.formState.errors.workingCity?.message}
            register={radiusForm.register("workingCity", {
              required: "Working city is required",
              minLength: { value: 2, message: "Enter a valid city" },
            })}
          />
          <Input
            label="Working radius (km)"
            type="number"
            error={radiusForm.formState.errors.workingRadius?.message}
            register={radiusForm.register("workingRadius", {
              required: "Radius is required",
              min: { value: 1, message: "Minimum 1 km" },
              max: { value: 100, message: "Maximum 100 km" },
              valueAsNumber: true,
            })}
          />
          <Input
            label="Years of experience"
            type="number"
            error={radiusForm.formState.errors.experienceYears?.message}
            register={radiusForm.register("experienceYears", {
              required: "Experience is required",
              min: { value: 0, message: "Cannot be negative" },
              valueAsNumber: true,
            })}
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === 5 && (
        <form
          onSubmit={availabilityForm.handleSubmit(onAvailabilitySubmit)}
          className="space-y-5"
          noValidate
        >
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              {...availabilityForm.register("availabilityStatus")}
            />
            Available for new jobs
          </label>

          <div className="space-y-3">
            {Object.keys(DEFAULT_HOURS).map((day) => (
              <div
                key={day}
                className="grid grid-cols-[100px_1fr_1fr_auto] items-center gap-2 rounded-lg border border-slate-100 p-2"
              >
                <span className="text-sm font-medium capitalize text-slate-700">
                  {day}
                </span>
                <Input
                  type="time"
                  register={availabilityForm.register(`workingHours.${day}.start`)}
                />
                <Input
                  type="time"
                  register={availabilityForm.register(`workingHours.${day}.end`)}
                />
                <label className="flex items-center gap-1 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    {...availabilityForm.register(`workingHours.${day}.isOff`)}
                  />
                  Off
                </label>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(4)}>
              Back
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Finish setup
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default TechnicianProfileSetupWizard;
