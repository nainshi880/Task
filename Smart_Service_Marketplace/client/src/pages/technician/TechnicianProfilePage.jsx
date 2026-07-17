import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Award,
  FileText,
  MapPin,
  Pencil,
  Star,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as technicianService from "../../services/technician.service";
import { technicianKeys } from "../../lib/queryClient";
import { formatDate } from "../../utils/format";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

function TechnicianProfilePage() {
  const profileQuery = useQuery({
    queryKey: technicianKeys.profile(),
    queryFn: technicianService.getProfile,
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
            Complete technician setup to manage your profile.
          </p>
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

  const profile = profileQuery.data || {};
  const photo = profile.profilePhoto || profile.user?.avatar;
  const displayName = profile.fullName || profile.user?.name || "Technician";
  const categories = profile.serviceCategories || profile.skills || [];
  const certifications = profile.certifications || [];
  const serviceAreas = profile.serviceAreas || [];
  const hours = profile.workingHours || {};

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
            <p className="mt-1 text-slate-500">
              View your professional details, documents, and service settings.
            </p>
          </div>
          <Link to="/technician/profile/edit">
            <Button>
              <Pencil size={16} />
              Edit profile
            </Button>
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {photo ? (
              <img
                src={photo}
                alt=""
                className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-700 shadow-md">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">{displayName}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    profile.availabilityStatus
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {profile.availabilityStatus ? "Available" : "Unavailable"}
                </span>
              </div>
              <p className="mt-1 text-slate-500">
                {profile.user?.email || ""}
                {profile.phone ? ` · ${profile.phone}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Star size={16} className="text-amber-500" />
                  {Number(profile.rating || 0).toFixed(1)} rating
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={16} />
                  {profile.workingCity || "City not set"}
                </span>
                <span>
                  {profile.experienceYears ?? 0} yrs experience ·{" "}
                  {profile.workingRadius ?? 10} km radius
                </span>
              </div>
              {profile.bio && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <UserRound size={18} className="text-indigo-600" />
              Personal information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Full name" value={profile.fullName} />
              <InfoRow label="Phone" value={profile.phone} />
              <InfoRow label="Working city" value={profile.workingCity} />
              <InfoRow label="State" value={profile.state} />
              <InfoRow label="Address" value={profile.address} />
              <InfoRow label="Pincode" value={profile.pincode} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <FileText size={18} className="text-indigo-600" />
              Documents
            </h3>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">Identity proof</p>
                {profile.identityProofUrl ? (
                  <a
                    href={profile.identityProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-indigo-600 hover:underline"
                  >
                    View uploaded document
                  </a>
                ) : (
                  <p className="mt-1 text-slate-500">Not uploaded</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">
                  Certificates ({certifications.length})
                </p>
                {certifications.length === 0 ? (
                  <p className="mt-1 text-slate-500">No certificates yet</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {certifications.map((cert) => (
                      <li key={cert._id} className="text-slate-600">
                        {cert.name}
                        {cert.issuedBy ? ` · ${cert.issuedBy}` : ""}
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Award size={18} className="text-indigo-600" />
              Service categories
            </h3>
            {categories.length === 0 ? (
              <p className="text-sm text-slate-500">No categories selected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoRow
                label="Experience"
                value={`${profile.experienceYears ?? 0} years`}
              />
              <InfoRow
                label="Working radius"
                value={`${profile.workingRadius ?? 10} km`}
              />
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service areas
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {serviceAreas.length
                  ? serviceAreas.join(", ")
                  : profile.workingCity || "—"}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Working hours
            </h3>
            <ul className="space-y-2 text-sm">
              {WEEKDAYS.map((day) => {
                const slot = hours[day];
                return (
                  <li
                    key={day}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="capitalize text-slate-700">{day}</span>
                    <span className="font-medium text-slate-900">
                      {!slot || slot.isOff
                        ? "Off"
                        : `${slot.start || "—"} – ${slot.end || "—"}`}
                    </span>
                  </li>
                );
              })}
            </ul>
            {profile.applicationStatus && (
              <p className="mt-4 text-xs text-slate-500">
                Application: {profile.applicationStatus}
                {profile.verifiedAt
                  ? ` · Verified ${formatDate(profile.verifiedAt)}`
                  : ""}
              </p>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default TechnicianProfilePage;
