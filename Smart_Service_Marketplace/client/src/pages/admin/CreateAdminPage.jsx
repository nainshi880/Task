import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, ShieldPlus } from "lucide-react";
import toast from "react-hot-toast";

import DashboardLayout from "../../layouts/DashboardLayout";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import PasswordStrength from "../../components/ui/PasswordStrength";
import * as adminService from "../../services/admin.service";
import useAuth from "../../hooks/useAuth";
import { isSuperAdmin } from "../../constants/roles";
import { validateStrongPassword } from "../../utils/password";
import { Navigate } from "react-router-dom";

function CreateAdminPage() {
  const { role } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [formError, setFormError] = useState("");
  const [loadingList, setLoadingList] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      department: "",
      designation: "Administrator",
    },
  });

  const password = watch("password", "");

  const loadAdmins = async () => {
    try {
      const result = await adminService.listAdmins();
      setAdmins(result.admins || result || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load admins");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin(role)) {
      loadAdmins();
    }
  }, [role]);

  if (!isSuperAdmin(role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const onSubmit = async (data) => {
    setFormError("");
    const passwordCheck = validateStrongPassword(data.password);
    if (passwordCheck !== true) {
      setFormError(passwordCheck);
      return;
    }

    try {
      await adminService.createAdmin({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        password: data.password,
        department: data.department.trim(),
        designation: data.designation.trim(),
      });
      toast.success("Admin account created");
      reset();
      await loadAdmins();
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not create admin account.";
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <ShieldPlus className="text-indigo-600" />
            Manage Admins
          </h1>
          <p className="mt-2 text-slate-500">
            Only the Super Admin can create additional admin accounts. There is
            no public admin registration.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <h2 className="text-lg font-semibold text-slate-800">Create admin</h2>

          {formError && (
            <div
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{formError}</p>
            </div>
          )}

          <Input
            label="Full name"
            error={errors.name?.message}
            register={register("name", { required: "Name is required" })}
          />
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            register={register("email", { required: "Email is required" })}
          />
          <Input
            label="Phone"
            register={register("phone")}
          />
          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            register={register("password", { required: "Password is required" })}
          />
          <PasswordStrength password={password} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Department" register={register("department")} />
            <Input label="Designation" register={register("designation")} />
          </div>

          <Button type="submit" loading={isSubmitting}>
            Create admin
          </Button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            Admin accounts
          </h2>
          {loadingList ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {admins.map((admin) => (
                <li
                  key={admin._id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{admin.name}</p>
                    <p className="text-slate-500">{admin.email}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
                    {admin.role?.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default CreateAdminPage;
