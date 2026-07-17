import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { formatDate } from "../../utils/format";

const SECTIONS = [
  { id: "contact", label: "Contact" },
  { id: "commission", label: "Commission" },
  { id: "gst", label: "GST" },
  { id: "notifications", label: "Notifications" },
  { id: "banners", label: "Banners" },
  { id: "legal", label: "Terms & Privacy" },
  { id: "maintenance", label: "Maintenance" },
];

const EMPTY_BANNER = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  position: "home_hero",
  targetAudience: "all",
  isActive: true,
  sortOrder: "0",
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
    </label>
  );
}

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState("contact");
  const [form, setForm] = useState(null);
  const [terms, setTerms] = useState({ content: "", version: "" });
  const [privacy, setPrivacy] = useState({ content: "", version: "" });
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: "",
  });
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER);
  const [showBannerForm, setShowBannerForm] = useState(false);

  const settingsQuery = useQuery({
    queryKey: adminKeys.settings(),
    queryFn: () => adminService.getPlatformSettings(),
    retry: false,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const s = settingsQuery.data.settings || settingsQuery.data;
    setForm({
      platformName: s.platformName || "",
      supportEmail: s.supportEmail || "",
      supportPhone: s.supportPhone || "",
      currency: s.currency || "INR",
      commission: {
        defaultPercent: s.commission?.defaultPercent ?? 10,
        minimumPayoutAmount: s.commission?.minimumPayoutAmount ?? 0,
      },
      gst: {
        defaultRate: s.gst?.defaultRate ?? 18,
        companyName: s.gst?.companyName || "",
        gstin: s.gst?.gstin || "",
        address: s.gst?.address || "",
        city: s.gst?.city || "",
        state: s.gst?.state || "",
        postalCode: s.gst?.postalCode || "",
        email: s.gst?.email || "",
        phone: s.gst?.phone || "",
        pricesIncludeGst: s.gst?.pricesIncludeGst ?? false,
      },
      notifications: {
        emailEnabled: s.notifications?.emailEnabled ?? true,
        smsEnabled: s.notifications?.smsEnabled ?? false,
        pushEnabled: s.notifications?.pushEnabled ?? true,
        whatsappEnabled: s.notifications?.whatsappEnabled ?? false,
        bookingReminders: s.notifications?.bookingReminders ?? true,
        promotionalMessages: s.notifications?.promotionalMessages ?? false,
      },
    });
    setTerms({
      content: s.legal?.termsOfService?.content || "",
      version: s.legal?.termsOfService?.version || "1.0",
    });
    setPrivacy({
      content: s.legal?.privacyPolicy?.content || "",
      version: s.legal?.privacyPolicy?.version || "1.0",
    });
    setMaintenance({
      enabled: s.maintenance?.enabled ?? false,
      message: s.maintenance?.message || "",
    });
  }, [settingsQuery.data]);

  const banners = useMemo(() => {
    const data = settingsQuery.data;
    if (Array.isArray(data?.banners)) return data.banners;
    return [];
  }, [settingsQuery.data]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.settings() });

  const saveSettingsMutation = useMutation({
    mutationFn: (payload) => adminService.updatePlatformSettings(payload),
    onSuccess: () => {
      toast.success("Settings saved");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Save failed"),
  });

  const maintenanceMutation = useMutation({
    mutationFn: (payload) => adminService.updateMaintenanceSettings(payload),
    onSuccess: () => {
      toast.success("Maintenance settings updated");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Update failed"),
  });

  const termsMutation = useMutation({
    mutationFn: (payload) => adminService.updateTermsOfService(payload),
    onSuccess: () => {
      toast.success("Terms updated");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Update failed"),
  });

  const privacyMutation = useMutation({
    mutationFn: (payload) => adminService.updatePrivacyPolicy(payload),
    onSuccess: () => {
      toast.success("Privacy policy updated");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Update failed"),
  });

  const createBannerMutation = useMutation({
    mutationFn: (payload) => adminService.createBanner(payload),
    onSuccess: () => {
      toast.success("Banner created");
      setBannerForm(EMPTY_BANNER);
      setShowBannerForm(false);
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Create failed"),
  });

  const toggleBannerMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      adminService.updateBanner(id, { isActive }),
    onSuccess: () => {
      toast.success("Banner updated");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Update failed"),
  });

  const deleteBannerMutation = useMutation({
    mutationFn: (id) => adminService.deleteBanner(id),
    onSuccess: () => {
      toast.success("Banner deleted");
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Delete failed"),
  });

  if (settingsQuery.isLoading || !form) {
    return (
      <DashboardLayout>
        <Loader text="Loading settings..." />
      </DashboardLayout>
    );
  }

  if (settingsQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Settings unavailable
          </h1>
          <p className="mt-2 text-slate-500">
            {settingsQuery.error?.response?.data?.message ||
              "Could not load platform settings."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const saveContactCommissionGstNotifications = () => {
    saveSettingsMutation.mutate({
      platformName: form.platformName,
      supportEmail: form.supportEmail,
      supportPhone: form.supportPhone,
      currency: form.currency,
      commission: {
        defaultPercent: Number(form.commission.defaultPercent),
        minimumPayoutAmount: Number(form.commission.minimumPayoutAmount),
      },
      gst: {
        ...form.gst,
        defaultRate: Number(form.gst.defaultRate),
      },
      notifications: form.notifications,
    });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Platform settings
          </h1>
          <p className="mt-1 text-slate-500">
            Commission, GST, notifications, banners, legal pages, and
            maintenance mode.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={clsx(
                "whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                section === s.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {(section === "contact" ||
          section === "commission" ||
          section === "gst" ||
          section === "notifications") && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {section === "contact" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.platformName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platformName: e.target.value }))
                  }
                  placeholder="Platform name"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currency: e.target.value }))
                  }
                  placeholder="Currency (INR)"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={form.supportEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supportEmail: e.target.value }))
                  }
                  placeholder="Support email"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={form.supportPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supportPhone: e.target.value }))
                  }
                  placeholder="Support phone"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>
            )}

            {section === "commission" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-600">
                  Default commission %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.commission.defaultPercent}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        commission: {
                          ...f.commission,
                          defaultPercent: e.target.value,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Minimum payout amount
                  <input
                    type="number"
                    min="0"
                    value={form.commission.minimumPayoutAmount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        commission: {
                          ...f.commission,
                          minimumPayoutAmount: e.target.value,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </label>
              </div>
            )}

            {section === "gst" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={form.gst.defaultRate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gst: { ...f.gst, defaultRate: e.target.value },
                    }))
                  }
                  placeholder="Default GST %"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={form.gst.companyName}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gst: { ...f.gst, companyName: e.target.value },
                    }))
                  }
                  placeholder="Company name"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={form.gst.gstin}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gst: { ...f.gst, gstin: e.target.value },
                    }))
                  }
                  placeholder="GSTIN"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={form.gst.email}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gst: { ...f.gst, email: e.target.value },
                    }))
                  }
                  placeholder="GST email"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={form.gst.address}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gst: { ...f.gst, address: e.target.value },
                    }))
                  }
                  placeholder="Address"
                  className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={form.gst.city}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gst: { ...f.gst, city: e.target.value },
                    }))
                  }
                  placeholder="City"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={form.gst.state}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gst: { ...f.gst, state: e.target.value },
                    }))
                  }
                  placeholder="State"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <Toggle
                  label="Prices include GST"
                  checked={form.gst.pricesIncludeGst}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      gst: { ...f.gst, pricesIncludeGst: v },
                    }))
                  }
                />
              </div>
            )}

            {section === "notifications" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["emailEnabled", "Email notifications"],
                  ["smsEnabled", "SMS notifications"],
                  ["pushEnabled", "Push notifications"],
                  ["whatsappEnabled", "WhatsApp notifications"],
                  ["bookingReminders", "Booking reminders"],
                  ["promotionalMessages", "Promotional messages"],
                ].map(([key, label]) => (
                  <Toggle
                    key={key}
                    label={label}
                    checked={Boolean(form.notifications[key])}
                    onChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        notifications: { ...f.notifications, [key]: v },
                      }))
                    }
                  />
                ))}
              </div>
            )}

            <Button
              className="mt-5"
              size="sm"
              loading={saveSettingsMutation.isPending}
              onClick={saveContactCommissionGstNotifications}
            >
              Save settings
            </Button>
          </div>
        )}

        {section === "banners" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setShowBannerForm((v) => !v)}
              >
                <Plus size={16} />
                Add banner
              </Button>
            </div>

            {showBannerForm && (
              <form
                className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm"
                onSubmit={(e) => {
                  e.preventDefault();
                  createBannerMutation.mutate({
                    title: bannerForm.title.trim(),
                    subtitle: bannerForm.subtitle.trim() || undefined,
                    imageUrl: bannerForm.imageUrl.trim(),
                    linkUrl: bannerForm.linkUrl.trim() || undefined,
                    position: bannerForm.position,
                    targetAudience: bannerForm.targetAudience,
                    isActive: bannerForm.isActive,
                    sortOrder: Number(bannerForm.sortOrder) || 0,
                  });
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={bannerForm.title}
                    onChange={(e) =>
                      setBannerForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="Title *"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                  <input
                    required
                    value={bannerForm.imageUrl}
                    onChange={(e) =>
                      setBannerForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                    placeholder="Image URL *"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                  <input
                    value={bannerForm.subtitle}
                    onChange={(e) =>
                      setBannerForm((f) => ({ ...f, subtitle: e.target.value }))
                    }
                    placeholder="Subtitle"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                  <input
                    value={bannerForm.linkUrl}
                    onChange={(e) =>
                      setBannerForm((f) => ({ ...f, linkUrl: e.target.value }))
                    }
                    placeholder="Link URL"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                  <select
                    value={bannerForm.position}
                    onChange={(e) =>
                      setBannerForm((f) => ({ ...f, position: e.target.value }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="home_hero">Home hero</option>
                    <option value="dashboard">Dashboard</option>
                    <option value="checkout">Checkout</option>
                  </select>
                  <select
                    value={bannerForm.targetAudience}
                    onChange={(e) =>
                      setBannerForm((f) => ({
                        ...f,
                        targetAudience: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="all">All</option>
                    <option value="customer">Customers</option>
                    <option value="technician">Technicians</option>
                  </select>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    loading={createBannerMutation.isPending}
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBannerForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {banners.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <Megaphone className="mx-auto text-slate-300" size={36} />
                  <p className="mt-3 text-sm text-slate-500">No banners yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {banners.map((banner) => (
                    <div
                      key={banner._id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {banner.title}
                        </p>
                        <p className="text-sm text-slate-500">
                          {banner.position} · {banner.targetAudience}
                          {banner.isActive ? " · Active" : " · Inactive"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={banner.isActive ? "secondary" : "success"}
                          onClick={() =>
                            toggleBannerMutation.mutate({
                              id: banner._id,
                              isActive: !banner.isActive,
                            })
                          }
                        >
                          {banner.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (window.confirm("Delete this banner?")) {
                              deleteBannerMutation.mutate(banner._id);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {section === "legal" && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Terms of service
              </h2>
              <input
                value={terms.version}
                onChange={(e) =>
                  setTerms((t) => ({ ...t, version: e.target.value }))
                }
                placeholder="Version"
                className="mt-3 w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <textarea
                value={terms.content}
                onChange={(e) =>
                  setTerms((t) => ({ ...t, content: e.target.value }))
                }
                rows={8}
                placeholder="Terms content"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <Button
                className="mt-3"
                size="sm"
                loading={termsMutation.isPending}
                onClick={() => termsMutation.mutate(terms)}
              >
                Save terms
              </Button>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Privacy policy
              </h2>
              <input
                value={privacy.version}
                onChange={(e) =>
                  setPrivacy((t) => ({ ...t, version: e.target.value }))
                }
                placeholder="Version"
                className="mt-3 w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <textarea
                value={privacy.content}
                onChange={(e) =>
                  setPrivacy((t) => ({ ...t, content: e.target.value }))
                }
                rows={8}
                placeholder="Privacy policy content"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <Button
                className="mt-3"
                size="sm"
                loading={privacyMutation.isPending}
                onClick={() => privacyMutation.mutate(privacy)}
              >
                Save privacy policy
              </Button>
            </section>
          </div>
        )}

        {section === "maintenance" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Toggle
              label="Maintenance mode enabled"
              checked={maintenance.enabled}
              onChange={(v) =>
                setMaintenance((m) => ({ ...m, enabled: v }))
              }
            />
            <textarea
              value={maintenance.message}
              onChange={(e) =>
                setMaintenance((m) => ({ ...m, message: e.target.value }))
              }
              rows={3}
              placeholder="Maintenance message shown to users"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <p className="mt-2 text-xs text-slate-400">
              Last settings sync: {formatDate(settingsQuery.dataUpdatedAt)}
            </p>
            <Button
              className="mt-4"
              size="sm"
              loading={maintenanceMutation.isPending}
              onClick={() =>
                maintenanceMutation.mutate({
                  enabled: maintenance.enabled,
                  message: maintenance.message,
                })
              }
            >
              Save maintenance mode
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminSettingsPage;
