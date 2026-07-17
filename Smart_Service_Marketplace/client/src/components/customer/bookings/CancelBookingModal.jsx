import { useState } from "react";
import toast from "react-hot-toast";

import Modal from "../../ui/Modal";
import Button from "../../ui/Button";

function CancelBookingModal({ isOpen, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed && trimmed.length < 3) {
      toast.error("Reason must be at least 3 characters.");
      return;
    }
    onConfirm(trimmed || undefined);
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cancel booking">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          You can cancel before the technician accepts. This cannot be undone.
        </p>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Tell us why you're cancelling..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Keep booking
          </Button>
          <Button type="submit" variant="danger" loading={loading}>
            Cancel booking
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CancelBookingModal;
