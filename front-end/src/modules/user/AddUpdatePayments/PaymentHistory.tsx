import React from "react";
import PaymentNotices from "./PaymentNotices";
import { usePaymentsContext } from "./PaymentContextProvider";
import { EDIT, VIEW } from "@/shared/constant/general";
import PaymentTransactions from "./PaymentsTransactions";
import JournalEntries from "./JournalEntries";
import TrustJournals from "./TrustJournals";

export default function PaymentHistory() {
  const { screenMode, patchData }: any = usePaymentsContext();
  const claimId = patchData?.payment_claim_id;
  return (
    <div className="pt_expandtable">
      <details>
        <summary>History</summary>
        <PaymentTransactions />
        {(screenMode === VIEW || screenMode === EDIT) && <PaymentNotices />}
        <TrustJournals paymentClaimId={claimId} />
        <JournalEntries paymentClaimId={claimId} />
      </details>
    </div>
  );
}
