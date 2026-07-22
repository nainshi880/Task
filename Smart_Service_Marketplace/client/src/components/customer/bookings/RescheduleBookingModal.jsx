import { useEffect, useState } from "react";
import clsx from "clsx";
import toast from "react-hot-toast";

import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import { TIME_SLOTS, formatTimeSlot } from "../../../constants/timeSlots";
import { toDateInputValue } from "../../../utils/format";

function todayInputValue() {
  return new Date().toISOString().split("T")[0];
}

function RescheduleBookingModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  booking,
}) {
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");

  useEffect(() => {
    if (!isOpen || !booking) return;
    setBookingDate(toDateInputValue(booking.bookingDate));
    setBookingTime(booking.bookingTime || "");
  }, [isOpen, booking]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!bookingDate || !bookingTime) {
      toast.error("Select a new date and time slot.");
      return;
    }
    onConfirm({
      bookingDate: new Date(bookingDate).toISOString(),
      bookingTime,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reschedule booking">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-600">
          Reschedule is available while the booking is awaiting payment, confirmed, or assigned.
        </p>

        <div>
          <label className="text-sm font-medium text-slate-700">New date</label>
          <input
            type="date"
            min={todayInputValue()}
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">New time slot</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setBookingTime(slot)}
                className={clsx(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition",
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

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save new schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RescheduleBookingModal;
