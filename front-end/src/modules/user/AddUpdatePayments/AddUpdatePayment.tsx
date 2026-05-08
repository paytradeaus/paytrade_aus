"use client";

import React from "react";
import PaymentHeaderContent from "./PaymentHeaderContent";
import ClaimSummary from "./ClaimSummary";
import AddPaymentSection from "./AddPaymentSection";
import PaymentFooterSection from "./PaymentFooterSection";
import PaymentHistory from "./PaymentHistory";
import { usePaymentsContext } from "./PaymentContextProvider";
import { EDIT, VIEW } from "@/shared/constant/general";
import XeroIntegration from "../AddUpdateClaims/XeroIntegration";

export default function AddUpdatePayments({ props }: any) {
  const { screenMode, patchData }: any = usePaymentsContext();
  const claimId = patchData?.payment_claim_id;
  return (
    <div className="pt_fullpage">
      <div>
        <PaymentHeaderContent />
        <ClaimSummary />
        <AddPaymentSection />
        {(screenMode === VIEW || screenMode === EDIT) && (
          <>
            <XeroIntegration paymentClaimId={claimId} />
            <PaymentHistory />
          </>
        )}
        <PaymentFooterSection />
      </div>
    </div>
  );
}
