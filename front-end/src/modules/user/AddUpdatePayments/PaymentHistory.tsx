import React from "react";
import PaymentNotices from "./PaymentNotices";
import { usePaymentsContext } from "./PaymentContextProvider";
import { EDIT, VIEW } from "@/shared/constant/general";
import PaymentTransactions from "./PaymentsTransactions";

export default function PaymentHistory() {
  const { screenMode }: any = usePaymentsContext();
  return (
    <div className="pt_expandtable">
      <details>
        <summary>History</summary>
        {/* {isViewMode &&
          formik?.values?.payment_type !== tabTypes.PAY_LESS_ZERO &&
          formik?.values?.payment_type !== tabTypes.THIRD_PARTY && ( */}
        <PaymentTransactions />
        {/* )} */}
        {(screenMode === VIEW || screenMode === EDIT) && <PaymentNotices />}
      </details>
    </div>
  );
}
