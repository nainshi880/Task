import * as subscriptionApi from "../api/subscription.api";

const unwrap = (response) => response.data?.data ?? response.data;

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
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

export const listPlans = async () => unwrap(await subscriptionApi.listPlans());

export const getCurrent = async () => unwrap(await subscriptionApi.getCurrent());

export const createPro = async () => unwrap(await subscriptionApi.createPro());

export const verifySubscription = async (data) =>
  unwrap(await subscriptionApi.verify(data));

export const cancelSubscription = async (data = {}) =>
  unwrap(await subscriptionApi.cancel(data));

/**
 * Create Razorpay subscription → open checkout with customer prefill → verify.
 * Prefill (name/email/phone) avoids Razorpay validate/account failures in checkout.
 */
export async function payForProSubscription() {
  const session = await createPro();

  if (!session?.razorpaySubscriptionId || !session?.razorpayKeyId) {
    throw new Error("Could not start Razorpay subscription checkout.");
  }

  const Razorpay = await loadRazorpayScript();
  const prefill = session.prefill || {};

  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const options = {
      key: session.razorpayKeyId,
      subscription_id: session.razorpaySubscriptionId,
      name: "Smart Service Marketplace",
      description: session.plan?.name
        ? `${session.plan.name} subscription`
        : "Technician Pro subscription",
      // Prefer card in test mode — UPI QR often returns 400/500 on Razorpay test keys.
      method: {
        netbanking: true,
        card: true,
        upi: true,
        wallet: true,
      },
      prefill: {
        name: prefill.name || "",
        email: prefill.email || "",
        contact: prefill.contact || "",
      },
      notes: {
        subscriptionId: String(session.subscriptionId || ""),
        plan: session.plan?.code || "pro",
      },
      theme: {
        color: "#4f46e5",
      },
      handler: async (response) => {
        try {
          const result = await verifySubscription({
            razorpay_subscription_id:
              response.razorpay_subscription_id ||
              session.razorpaySubscriptionId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          settle(resolve, result);
        } catch (error) {
          settle(
            reject,
            error.response?.data?.message
              ? new Error(error.response.data.message)
              : error
          );
        }
      },
      modal: {
        ondismiss: () => settle(reject, new Error("Payment cancelled.")),
      },
    };

    try {
      const checkout = new Razorpay(options);
      checkout.on("payment.failed", (event) => {
        const description =
          event?.error?.description ||
          event?.error?.reason ||
          "Subscription payment failed.";
        settle(reject, new Error(description));
      });
      checkout.open();
    } catch (error) {
      settle(
        reject,
        new Error(
          error?.message ||
            "Could not open Razorpay checkout. Check your key and subscription plan."
        )
      );
    }
  });
}
