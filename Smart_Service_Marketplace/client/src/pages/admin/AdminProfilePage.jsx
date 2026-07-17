import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Shield } from "lucide-react";
import toast from "react-hot-toast";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import PasswordStrength from "../../components/ui/PasswordStrength";
import * as adminService from "../../services/admin.service";
import useAuth from "../../hooks/useAuth";
import { adminKeys, authKeys } from "../../lib/queryClient";
import { validateStrongPassword } from "../../utils/password";
import { isAdminRole } from "../../constants/roles";

function AdminProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout, setUser, login, role } = useAuth();

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    avatar: "",
    department: "",
    designation: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const profileQuery = useQuery({
    queryKey: adminKeys.profile(),
    queryFn: () => adminService.getProfile(),
    enabled: isAdminRole(role),
    retry: false,
  });

  useEffect(() => {
    const data = profileQuery.data;
    if (!data) return;
    const profile = data.profile || {};
    const u = data.user || user || {};
    setProfileForm({
      fullName: profile.fullName || u.name || "",
      phone: profile.phone || u.phone || "",
      avatar: profile.avatar || "",
      department: profile.department || "",
      designation: profile.designation || "",
    });
  }, [profileQuery.data, user]);

  const updateMutation = useMutation({
    mutationFn: (payload) => adminService.updateAdminProfile(payload),
    onSuccess: (data) => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: adminKeys.profile() });
      if (data?.user) {
        setUser({ ...user, ...data.user, name: data.user.name || data.profile?.fullName });
        queryClient.setQueryData(authKeys.me(), (prev) => ({
          ...(prev || {}),
          ...data.user,
          name: data.user.name || data.profile?.fullName || prev?.name,
        }));
      }
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Update failed"),
  });

  const passwordMutation = useMutation({
    mutationFn: (payload) => adminService.changeAdminPassword(payload),
    onSuccess: (data) => {
      toast.success("Password changed");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      const nextToken = data?.token || data?.accessToken;
      if (nextToken && (data?.user || user)) {
        login(data.user || user, nextToken);
      }
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Password change failed"),
  });

  const handleLogout = async () => {
    try {
      await adminService.logout();
    } catch {
      // fall through
    }
    try {
      await logout();
    } catch {
      // ignore
    }
    navigate("/admin/login", { replace: true });
  };

  if (profileQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading profile..." />
      </DashboardLayout>
    );
  }

  const profileUser = profileQuery.data?.user || user;
  const profile = profileQuery.data?.profile;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin profile</h1>
            <p className="mt-1 text-slate-500">
              View and update your account, change password, or log out.
            </p>
          </div>
          <Button size="sm" variant="danger" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </Button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Shield size={22} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {profile?.fullName || profileUser?.name || "Admin"}
              </p>
              <p className="text-sm text-slate-500">{profileUser?.email}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {profileUser?.role}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Update profile
          </h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({
                fullName: profileForm.fullName.trim(),
                phone: profileForm.phone.trim() || undefined,
                avatar: profileForm.avatar.trim() || undefined,
                department: profileForm.department.trim() || undefined,
                designation: profileForm.designation.trim() || undefined,
              });
            }}
          >
            <input
              required
              value={profileForm.fullName}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, fullName: e.target.value }))
              }
              placeholder="Full name"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <input
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="Phone"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <input
              value={profileForm.department}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, department: e.target.value }))
              }
              placeholder="Department"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <input
              value={profileForm.designation}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, designation: e.target.value }))
              }
              placeholder="Designation"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <input
              value={profileForm.avatar}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, avatar: e.target.value }))
              }
              placeholder="Avatar URL"
              className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" loading={updateMutation.isPending}>
                Save profile
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Change password
          </h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const check = validateStrongPassword(passwordForm.newPassword);
              if (check !== true) {
                toast.error(check);
                return;
              }
              if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                toast.error("Passwords do not match");
                return;
              }
              passwordMutation.mutate(passwordForm);
            }}
          >
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({
                  ...f,
                  currentPassword: e.target.value,
                }))
              }
              placeholder="Current password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <input
              type="password"
              required
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({
                  ...f,
                  newPassword: e.target.value,
                }))
              }
              placeholder="New password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <PasswordStrength password={passwordForm.newPassword} />
            <input
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({
                  ...f,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <Button
              type="submit"
              size="sm"
              loading={passwordMutation.isPending}
            >
              Update password
            </Button>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AdminProfilePage;
