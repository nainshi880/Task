import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  UserRound,
  MapPin,
  Phone,
  Lock,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import ProfileAvatarSection from "../../components/customer/profile/ProfileAvatarSection";
import PersonalInfoSection from "../../components/customer/profile/PersonalInfoSection";
import AddressManager from "../../components/customer/profile/AddressManager";
import EmergencyContactSection from "../../components/customer/profile/EmergencyContactSection";
import ChangePasswordSection from "../../components/customer/profile/ChangePasswordSection";
import * as customerService from "../../services/customer.service";
import { customerKeys } from "../../lib/queryClient";
import { formatDate } from "../../utils/format";

const TABS = [
  { id: "personal", label: "Personal info", icon: UserRound },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "emergency", label: "Emergency contact", icon: Phone },
  { id: "security", label: "Security", icon: Lock },
];

function ProfileSummary({ profile }) {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <p className="text-slate-500">Gender</p>
        <p className="font-medium text-slate-900">{profile.gender || "—"}</p>
      </div>
      <div>
        <p className="text-slate-500">Date of birth</p>
        <p className="font-medium text-slate-900">
          {formatDate(profile.dateOfBirth)}
        </p>
      </div>
      <div>
        <p className="text-slate-500">Emergency contact</p>
        <p className="font-medium text-slate-900">
          {profile.emergencyContact?.name || "—"}
        </p>
      </div>
      <div>
        <p className="text-slate-500">Saved addresses</p>
        <p className="font-medium text-slate-900">
          {profile.addresses?.length || 0}
        </p>
      </div>
    </div>
  );
}

function CustomerProfilePage() {
  const [activeTab, setActiveTab] = useState("personal");

  const profileQuery = useQuery({
    queryKey: customerKeys.profile(),
    queryFn: customerService.getProfile,
    retry: false,
  });

  if (profileQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading profile..." />
      </DashboardLayout>
    );
  }

  if (profileQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Profile not found</h1>
          <p className="mt-2 text-slate-500">
            Complete your profile setup to manage personal information.
          </p>
          <Link
            to="/setup/customer"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Finish setup
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const profile = profileQuery.data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="mt-1 text-slate-500">
            View and update your account details, addresses, and security settings.
          </p>
        </div>

        {/* Profile header / view */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ProfileAvatarSection profile={profile} />
          <div className="mt-6 border-t border-slate-100 pt-6">
            <ProfileSummary profile={profile} />
          </div>
        </section>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition",
                activeTab === id
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeTab === "personal" && (
            <PersonalInfoSection profile={profile} />
          )}
          {activeTab === "addresses" && (
            <AddressManager addresses={profile.addresses || []} />
          )}
          {activeTab === "emergency" && (
            <EmergencyContactSection profile={profile} />
          )}
          {activeTab === "security" && <ChangePasswordSection />}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default CustomerProfilePage;
