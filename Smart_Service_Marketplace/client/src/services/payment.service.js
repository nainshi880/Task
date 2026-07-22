import * as paymentApi from "../api/payment.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const createOrder = async (data) =>
  unwrap(await paymentApi.createOrder(data));

export const verifyPayment = async (data) =>
  unwrap(await paymentApi.verifyPayment(data));

export const reportPaymentFailure = async (data) =>
  unwrap(await paymentApi.reportPaymentFailure(data));

export const getPaymentByBooking = async (bookingId) =>
  unwrap(await paymentApi.getPaymentByBooking(bookingId));

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay is only available in the browser."));
      return;
    }
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Razorpay checkout."))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

/**
 * Create order → open Razorpay checkout → verify signature on success.
 */
export async function payForBooking({
  bookingId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  description,
}) {
  const order = await createOrder({ bookingId, amount });

  const Razorpay = await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const options = {
      key: order.razorpayKeyId,
      amount: order.amountInPaise,
      currency: order.currency || "INR",
      name: "Smart Service Marketplace",
      description: description || "Booking payment",
      order_id: order.razorpayOrderId,
      prefill: {
        name: customerName || "",
        email: customerEmail || "",
        contact: customerPhone || "",
      },
      notes: {
        bookingId: String(bookingId),
      },
      handler: async (response) => {
        try {
          const verified = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          resolve(verified);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => {
          reject(new Error("Payment cancelled."));
        },
      },
    };

    const checkout = new Razorpay(options);
    checkout.on("payment.failed", async (event) => {
      try {
        await reportPaymentFailure({
          razorpay_order_id: event?.error?.metadata?.order_id || order.razorpayOrderId,
          razorpay_payment_id: event?.error?.metadata?.payment_id,
          failureReason: event?.error?.description || "Payment failed",
          failureCode: event?.error?.code,
        });
      } catch {
        // non-blocking
      }
      reject(
        new Error(event?.error?.description || "Payment failed. Please try again.")
      );
    });
    checkout.open();
  });
}
