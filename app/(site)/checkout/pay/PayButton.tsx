"use client";

import { useEffect, useState } from "react";

type Props = { keyId: string; subscriptionId: string; description: string; callbackUrl: string; cancelUrl: string };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function PayButton({ keyId, subscriptionId, description, callbackUrl, cancelUrl }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.Razorpay) return setReady(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);

  function open() {
    if (!window.Razorpay) return;
    new window.Razorpay({
      key: keyId,
      subscription_id: subscriptionId,
      name: "Nirakar Media",
      description,
      callback_url: callbackUrl,
      redirect: true,
      theme: { color: "#8B5CF6" },
      modal: { ondismiss: () => (window.location.href = cancelUrl) },
    }).open();
  }

  // Open automatically once the script is ready; the button is a fallback.
  useEffect(() => {
    if (ready) open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <button type="button" className="btn btn-primary" onClick={open} disabled={!ready}>
      {ready ? "Authorise monthly payment" : "Loading secure checkout…"}
    </button>
  );
}
