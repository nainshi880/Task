import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  StickyNote,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import Stepper from "../../components/ui/Stepper";
import * as serviceService from "../../services/service.service";
import * as customerService from "../../services/customer.service";
import {
  customerKeys,
  serviceKeys,
} from "../../lib/queryClient";
import { formatCurrency, formatDate } from "../../utils/format";
import { saveBookingDraft, loadBookingDraft } from "../../utils/bookingDraft";
import { TIME_SLOTS, formatTimeSlot } from "../../constants/timeSlots";

const STEPS = [
  { id: "address", label: "Address" },
  { id: "schedule", label: "Date & time" },
  { id: "notes", label: "Notes" },
];

function todayInputValue() {
  return new Date().toISOString().split("T")[0];
}

function formatAddressLine(address) {
  if (!address) return "";
  return [address.street, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");
}

function BookServicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const serviceId = searchParams.get("serviceId") || "";
  const categoryParam = searchParams.get("category") || "";
  const serviceNameParam = searchParams.get("serviceName") || "";

  const [step, setStep] = useState(0);
  const [addressId, setAddressId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    if (draftHydrated) return;
    const draft = loadBookingDraft();
    if (!draft) {
      setDraftHydrated(true);
      return;
    }
    if (draft.addressId) setAddressId(draft.addressId);
    if (draft.bookingDate) setBookingDate(String(draft.bookingDate).slice(0, 10));
    if (draft.bookingTime) setBookingTime(draft.bookingTime);
    if (draft.notes) setNotes(draft.notes);
    if (draft.description) setDescription(draft.description);
    setDraftHydrated(true);
  }, [draftHydrated]);

  const serviceQuery = useQuery({
    queryKey: serviceKeys.detail(serviceId),
    queryFn: () => serviceService.getServiceById(serviceId),
    enabled: Boolean(serviceId),
    retry: false,
  });

  const profileQuery = useQuery({
    queryKey: customerKeys.profile(),
    queryFn: customerService.getProfile,
    retry: false,
  });

  const service = serviceQuery.data?.service;
  const category = service?.category || categoryParam;
  const serviceName = service?.name || serviceNameParam;
  const amount = service?.basePrice ?? 0;

  const addresses = profileQuery.data?.addresses || [];

  useEffect(() => {
    if (!addressId && addresses.length) {
      const defaultAddr =
        addresses.find((item) => item.isDefault) || addresses[0];
      setAddressId(defaultAddr._id);
    }
  }, [addresses, addressId]);

  const selectedAddress = useMemo(
    () => addresses.find((item) => String(item._id) === String(addressId)),
    [addresses, addressId]
  );

  const canContinue = () => {
    if (step === 0) return Boolean(addressId);
    if (step === 1) return Boolean(bookingDate && bookingTime);
    if (step === 2) return true;
    return false;
  };

  const goNext = () => {
    if (!canContinue()) {
      if (step === 0) toast.error("Select a service address.");
      if (step === 1) toast.error("Select a date and time slot.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((prev) => Math.max(prev - 1, 0));

  const goToConfirm = () => {
    if (!serviceName || !category) {
      toast.error("Service details are missing. Start from a service page.");
      return;
    }
    if (!addressId || !bookingDate || !bookingTime) {
      toast.error("Complete address, date, and time before continuing.");
      return;
    }

    const draft = {
      serviceId: service?._id || serviceId || null,
      serviceCategory: category,
      serviceName,
      amount,
      durationMinutes: service?.durationMinutes || null,
      addressId,
      address: selectedAddress || null,
      bookingDate,
      bookingTime,
      notes: notes.trim(),
      description: description.trim(),
    };

    saveBookingDraft(draft);
    navigate("/booking/confirm");
  };

  if (serviceId && serviceQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading booking..." />
      </DashboardLayout>
    );
  }

  if (!serviceName || !category) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Choose a service</h1>
          <p className="mt-2 text-slate-500">
            Pick a service first, then continue to the booking flow.
          </p>
          <Link
            to="/services"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Browse services
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (profileQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Profile required</h1>
          <p className="mt-2 text-slate-500">
            Complete your customer profile before booking a service.
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

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            to={serviceId ? `/services/${serviceId}` : "/services"}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to service
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Book service</h1>
          <p className="mt-1 text-slate-500">
            {serviceName} · {category}
            {amount > 0 ? ` · from ${formatCurrency(amount)}` : ""}
          </p>
        </div>

        <Stepper steps={STEPS} currentStep={step} />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 text-indigo-600" size={20} />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Select address
                  </h2>
                  <p className="text-sm text-slate-500">
                    Where should the technician come?
                  </p>
                </div>
              </div>

              {profileQuery.isLoading ? (
                <Loader text="Loading addresses..." />
              ) : addresses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-600">
                    You don&apos;t have any saved addresses yet.
                  </p>
                  <Link
                    to="/profile/addresses"
                    className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Add an address
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address._id}
                      className={clsx(
                        "flex cursor-pointer gap-3 rounded-xl border p-4 transition",
                        String(addressId) === String(address._id)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-indigo-200"
                      )}
                    >
                      <input
                        type="radio"
                        name="address"
                        className="mt-1"
                        checked={String(addressId) === String(address._id)}
                        onChange={() => setAddressId(address._id)}
                      />
                      <div>
                        <p className="font-medium text-slate-900">
                          {address.label}
                          {address.isDefault && (
                            <span className="ml-2 text-xs font-semibold text-indigo-600">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatAddressLine(address)}
                        </p>
                      </div>
                    </label>
                  ))}
                  <Link
                    to="/profile/addresses"
                    className="inline-flex text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Manage addresses
                  </Link>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 text-indigo-600" size={20} />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Select date & time
                  </h2>
                  <p className="text-sm text-slate-500">
                    Pick a convenient slot for the visit
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Date
                </label>
                <input
                  type="date"
                  min={todayInputValue()}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock3 size={16} />
                  Time slot
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setBookingTime(slot)}
                      className={clsx(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                        bookingTime === slot
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-slate-200 text-slate-700 hover:border-indigo-300"
                      )}
                    >
                      {formatTimeSlot(slot)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <StickyNote className="mt-0.5 text-indigo-600" size={20} />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Add notes
                  </h2>
                  <p className="text-sm text-slate-500">
                    Share any details that help the technician prepare
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Issue description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Describe the issue or what you need done..."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Additional notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Gate code, parking tips, preferred contact..."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">Address:</span>{" "}
                  {formatAddressLine(selectedAddress) || "—"}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-slate-800">When:</span>{" "}
                  {bookingDate ? formatDate(bookingDate) : "—"}
                  {bookingTime ? ` · ${formatTimeSlot(bookingTime)}` : ""}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-slate-800">Assignment:</span>{" "}
                  Available {category || "matching"} technicians will be notified
                  after payment
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 0}
            >
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext} disabled={!canContinue()}>
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={goToConfirm}>
                Review booking
              </Button>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default BookServicePage;
