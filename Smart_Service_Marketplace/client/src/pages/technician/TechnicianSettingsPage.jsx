import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Lock, LogOut, Shield } from "lucide-react";
import toast from "react-hot-toast";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import PasswordStrength from "../../components/ui/PasswordStrength";
import * as technicianService from "../../services/technician.service";
import * as notificationService from "../../services/notification.service";
import useAuth from "../../hooks/useAuth";
import { technicianKeys, notificationKeys } from "../../lib/queryClient";
import { validateStrongPassword } from "../../utils/password";

const PREF_FIELDS = [
  { key: "inAppNotification", label: "In-app notifications" },
  { key: "emailNotification", label: "Email notifications" },
  { key: "smsNotification", label: "SMS notifications" },
  { key: "pushNotification", label: "Push notifications" },
  { key: "bookingNotifications", label: "Booking notifications" },
  { key: "paymentNotifications", label: "Payment notifications" },
  { key: "systemNotifications", label: "System notifications" },
  { key: "promotionalNotifications", label: "Promotional notifications" },
];

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function TechnicianSettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState({});
  const [privacy, setPrivacy] = useState({
    showPhone: true,
    showEmail: false,
    shareLocation: true,
  });
  const [loggingOut, setLoggingOut] = useState(false);

  const profileQuery = useQuery({
    queryKey: technicianKeys.profile(),
    queryFn: technicianService.getProfile,
    retry: false,
  });

  const prefsQuery = useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: notificationService.getPreferences,
    retry: false,
  });

  useEffect(() => {
    if (prefsQuery.data) setPrefs(prefsQuery.data);
  }, [prefsQuery.data]);

  useEffect(() => {
    if (profileQuery.data?.privacy) {
      setPrivacy({
        showPhone: profileQuery.data.privacy.showPhone ?? true,
        showEmail: profileQuery.data.privacy.showEmail ?? false,
        shareLocation: profileQuery.data.privacy.shareLocation ?? true,
      });
    }
  }, [profileQuery.data]);

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

  const passwordMutation = useMutation({
    mutationFn: technicianService.changePassword,
    onSuccess: (result) => {
      toast.success(result?.message || "Password changed successfully");
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not change password");
    },
  });

  const prefsMutation = useMutation({
    mutationFn: notificationService.updatePreferences,
    onSuccess: async () => {
      toast.success("Notification preferences saved");
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not save preferences");
    },
  });

  const privacyMutation = useMutation({
    mutationFn: (data) => technicianService.updateProfile({ privacy: data }),
    onSuccess: async () => {
      toast.success("Privacy settings saved");
      await queryClient.invalidateQueries({
        queryKey: technicianKeys.profile(),
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not save privacy settings");
    },
  });

  const onPasswordSubmit = (data) => {
    const check = validateStrongPassword(data.newPassword);
    if (check !== true) {
      toast.error(check);
      return;
    }
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    passwordMutation.mutate(data);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  if (profileQuery.isLoading || prefsQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading settings..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            to="/technician/dashboard"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-slate-500">
            Password, notification preferences, privacy, and account logout.
          </p>
        </div>

        <Section
          icon={Lock}
          title="Change password"
          description="Use a strong password with uppercase, lowercase, numbers, and symbols."
        >
          <form
            onSubmit={handleSubmit(onPasswordSubmit)}
            className="max-w-md space-y-4"
            noValidate
          >
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
            <Button
              type="submit"
              loading={isSubmitting || passwordMutation.isPending}
            >
              Update password
            </Button>
          </form>
        </Section>

        <Section
          icon={Bell}
          title="Notification preferences"
          description="Choose which alerts you want to receive."
        >
          <div className="space-y-3">
            {PREF_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                <span>{field.label}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(prefs[field.key])}
                  onChange={(e) =>
                    setPrefs((prev) => ({
                      ...prev,
                      [field.key]: e.target.checked,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <Button
            className="mt-4"
            loading={prefsMutation.isPending}
            onClick={() => prefsMutation.mutate(prefs)}
          >
            Save notification preferences
          </Button>
        </Section>

        <Section
          icon={Shield}
          title="Privacy settings"
          description="Control what customers can see about you."
        >
          <div className="space-y-3">
            {[
              { key: "showPhone", label: "Show phone number on jobs" },
              { key: "showEmail", label: "Show email to customers" },
              { key: "shareLocation", label: "Share live location when on the way" },
            ].map((field) => (
              <label
                key={field.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                <span>{field.label}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(privacy[field.key])}
                  onChange={(e) =>
                    setPrivacy((prev) => ({
                      ...prev,
                      [field.key]: e.target.checked,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <Button
            className="mt-4"
            loading={privacyMutation.isPending}
            onClick={() => privacyMutation.mutate(privacy)}
          >
            Save privacy settings
          </Button>
        </Section>

        <Section
          icon={LogOut}
          title="Logout"
          description="Sign out of your technician account on this device."
        >
          <Button
            variant="danger"
            loading={loggingOut}
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </Button>
        </Section>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianSettingsPage;
