"use client";

import React from "react";
import PaymentHeaderContent from "./PaymentHeaderContent";
import ClaimSummary from "./ClaimSummary";
import AddPaymentSection from "./AddPaymentSection";
import PaymentFooterSection from "./PaymentFooterSection";
import PaymentHistory from "./PaymentHistory";
import { usePaymentsContext } from "./PaymentContextProvider";
import { EDIT, VIEW } from "@/shared/constant/general";

export default function AddUpdatePayments({ props }: any) {
  const { screenMode }: any = usePaymentsContext();
  return (
    <div className="pt_fullpage">
      <div>
        <PaymentHeaderContent />
        <ClaimSummary />
        <AddPaymentSection />
        {(screenMode === VIEW || screenMode === EDIT) && <PaymentHistory />}
        <PaymentFooterSection />
      </div>
    </div>
  );
}
