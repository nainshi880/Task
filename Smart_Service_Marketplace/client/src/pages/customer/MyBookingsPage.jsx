import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { SkeletonList } from "../../components/ui/Skeleton";
import BookingListCard from "../../components/customer/bookings/BookingListCard";
import * as bookingService from "../../services/booking.service";
import { bookingKeys } from "../../lib/queryClient";
import {
  BOOKING_TABS,
  bucketBookings,
} from "../../constants/bookingStatus";

const TAB_CONFIG = [
  { id: BOOKING_TABS.upcoming, label: "Upcoming" },
  { id: BOOKING_TABS.completed, label: "Completed" },
  { id: BOOKING_TABS.cancelled, label: "Cancelled" },
];

function MyBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = TAB_CONFIG.some((tab) => tab.id === tabParam)
    ? tabParam
    : BOOKING_TABS.upcoming;

  const bookingsQuery = useQuery({
    queryKey: bookingKeys.list({ scope: "mine", limit: 50 }),
    queryFn: () =>
      bookingService.getCustomerBookings({
        sortBy: "bookingDate",
        sortOrder: "desc",
        limit: 50,
        page: 1,
      }),
    retry: false,
  });

  const buckets = useMemo(
    () => bucketBookings(bookingsQuery.data?.items || []),
    [bookingsQuery.data]
  );

  const list = buckets[activeTab] || [];

  const setTab = (tab) => {
    setSearchParams(tab === BOOKING_TABS.upcoming ? {} : { tab });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Bookings</h1>
            <p className="mt-1 text-slate-500">
              Track upcoming jobs, past services, and cancellations.
            </p>
          </div>
          <Link to="/services">
            <Button>
              <CalendarPlus size={18} />
              Book a service
            </Button>
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" role="tablist" aria-label="Booking status">
          {TAB_CONFIG.map((tab) => {
            const count = buckets[tab.id]?.length || 0;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(tab.id)}
                className={clsx(
                  "flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {tab.label}
                <span
                  className={clsx(
                    "ml-2 rounded-full px-2 py-0.5 text-xs",
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {bookingsQuery.isLoading ? (
          <SkeletonList rows={4} />
        ) : bookingsQuery.isError ? (
          <ErrorState
            variant="auto"
            error={bookingsQuery.error}
            onRetry={() => bookingsQuery.refetch()}
            homeTo="/dashboard"
            homeLabel="Back to dashboard"
          />
        ) : list.length === 0 ? (
          <EmptyState
            preset="bookings"
            title={`No ${activeTab} bookings`}
            description={
              activeTab === BOOKING_TABS.upcoming
                ? "You don't have any active bookings. Browse services to get started."
                : activeTab === BOOKING_TABS.completed
                  ? "Completed services will show up here."
                  : "Cancelled bookings will appear in this tab."
            }
            actionLabel={
              activeTab === BOOKING_TABS.upcoming ? "Browse services" : undefined
            }
            actionTo={
              activeTab === BOOKING_TABS.upcoming ? "/services" : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((booking) => (
              <BookingListCard key={booking._id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default MyBookingsPage;
