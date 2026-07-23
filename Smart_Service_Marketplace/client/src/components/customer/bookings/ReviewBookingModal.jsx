import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

import Modal from "../../ui/Modal";
import Button from "../../ui/Button";

function ReviewBookingModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  technicianName = "your technician",
  serviceName = "this service",
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setRating(0);
    setHovered(0);
    setTitle("");
    setComment("");
  }, [isOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      toast.error("Please select a rating from 1 to 5 stars.");
      return;
    }
    onSubmit({
      rating,
      title: title.trim() || undefined,
      comment: comment.trim() || undefined,
    });
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Rate your experience"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-600">
          How was {serviceName} with{" "}
          <span className="font-medium text-slate-800">{technicianName}</span>?
          Your feedback updates their public rating.
        </p>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Rating <span className="text-rose-500">*</span>
          </p>
          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHovered(0)}
          >
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= (hovered || rating);
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  onMouseEnter={() => setHovered(value)}
                  onClick={() => setRating(value)}
                  className="rounded-lg p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Star
                    size={32}
                    className={clsx(
                      active
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    )}
                  />
                </button>
              );
            })}
            {rating > 0 && (
              <span className="ml-2 text-sm font-semibold text-slate-700">
                {rating}/5
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            placeholder="Great service!"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Review (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Share details about the work quality, punctuality, and professionalism..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Maybe later
          </Button>
          <Button type="submit" loading={loading}>
            Submit review
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ReviewBookingModal;
