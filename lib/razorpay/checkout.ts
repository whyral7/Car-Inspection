// Browser-only: loads Razorpay Checkout on demand (only when the dealer taps Pay, to keep the
// credits page light on slow connections) and opens it for an order created on the server.
// https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export type CheckoutSuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
export type CheckoutFailure = { error: { code?: string; description?: string; reason?: string } };

export type CheckoutOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  image?: string;
  prefill?: { name?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: CheckoutSuccess) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
  retry?: { enabled: boolean; max_count?: number };
};

type CheckoutInstance = { open: () => void; on: (event: "payment.failed", cb: (response: CheckoutFailure) => void) => void };
type CheckoutConstructor = new (options: CheckoutOptions) => CheckoutInstance;

declare global {
  interface Window {
    Razorpay?: CheckoutConstructor;
  }
}

let loading: Promise<CheckoutConstructor> | null = null;

export function loadCheckout(): Promise<CheckoutConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise<CheckoutConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay not available")));
    script.onerror = () => {
      script.remove();
      reject(new Error("Could not load Razorpay Checkout"));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null; // let the next tap try again
    throw error;
  });
  return loading;
}
