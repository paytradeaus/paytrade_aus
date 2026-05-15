"use client";

import React, { useMemo, useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import {
  attachAiBillingPaymentMethod,
  createAiBillingSetupIntent,
} from "./aiBilling.functions";

let liveStripePromise: Promise<Stripe | null> | null = null;
let testStripePromise: Promise<Stripe | null> | null = null;

const getStripePromise = (isSandbox: boolean) => {
  if (isSandbox) {
    if (!testStripePromise) {
      const key = process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY;
      if (!key) {
        console.error(
          "Sandbox mode active but NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY is not configured."
        );
        return null;
      }
      testStripePromise = loadStripe(key);
    }
    return testStripePromise;
  }
  if (!liveStripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured."
      );
      return null;
    }
    liveStripePromise = loadStripe(key);
  }
  return liveStripePromise;
};

interface Props {
  companyId: number;
  isSandbox: boolean;
  clientSecret: string;
  onClose: () => void;
  onAttached: () => void;
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modal: React.CSSProperties = {
  background: "#fff",
  borderRadius: 8,
  padding: 24,
  width: "100%",
  maxWidth: 480,
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
};

function CardForm({
  companyId,
  isSandbox,
  onClose,
  onAttached,
}: Omit<Props, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (error) {
        showErrorToast(error.message ?? "Card confirmation failed");
        return;
      }
      const pmId =
        typeof setupIntent?.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id;
      if (!pmId) {
        showErrorToast("Stripe did not return a payment method id");
        return;
      }
      await attachAiBillingPaymentMethod(companyId, pmId, isSandbox);
      showSuccessToast("Payment method attached");
      onAttached();
      onClose();
    } catch (err: any) {
      showErrorToast(err?.message ?? "Failed to attach payment method");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement options={{ layout: "tabs" }} />
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 16,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" disabled={!stripe || submitting}>
          {submitting ? "Saving…" : "Save card"}
        </button>
      </div>
    </form>
  );
}

export default function StripeCardModal({
  companyId,
  isSandbox,
  clientSecret,
  onClose,
  onAttached,
}: Props) {
  const stripePromise = useMemo(
    () => getStripePromise(isSandbox),
    [isSandbox]
  );

  if (!stripePromise) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={modal} onClick={(e) => e.stopPropagation()}>
          <h3>Stripe not configured</h3>
          <p>
            The Stripe publishable key is missing. Please contact your
            administrator.
          </p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>
          {isSandbox ? "Add test card (sandbox)" : "Add or replace card"}
        </h3>
        <p style={{ color: "#666", fontSize: 13 }}>
          Card details are entered directly into Stripe&rsquo;s secure form.
          PayTrade never sees your full card number.
        </p>
        <Elements
          key={isSandbox ? "ai-billing-test" : "ai-billing-live"}
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "stripe" } }}
        >
          <CardForm
            companyId={companyId}
            isSandbox={isSandbox}
            onClose={onClose}
            onAttached={onAttached}
          />
        </Elements>
      </div>
    </div>
  );
}

export async function openStripeCardModal(
  companyId: number,
  isSandbox: boolean
) {
  const intent = await createAiBillingSetupIntent(companyId, isSandbox);
  if (!intent?.client_secret) {
    throw new Error("Failed to create Stripe SetupIntent");
  }
  return intent.client_secret as string;
}
