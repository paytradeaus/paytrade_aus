import React, { useEffect, useState } from "react";
import DynamicTable from "@/components/Table";
import {
  matchPaymentsListHeaders,
  matchPaymentsRenderData,
} from "./otherPayments.constants";
import { fetchPaymentsTransactions } from "../AddUpdatePayments/Payment.functions";

export default function ShowPaymentTxnTable(props: any) {
  const { paymentId } = props;
  const [paymentsTransactions, setPaymentsTransactions] = useState([]);
  const [tableLoader, setTableLoader] = useState(false);

  useEffect(() => {
    getPaymentTransactions();
  }, []);

  async function getPaymentTransactions() {
    try {
      setTableLoader(true);
      const postData = {
        payload: {
          payment_id: +paymentId,
        },
      };
      const response: any = await fetchPaymentsTransactions(postData);
      if (response?.length > 0) {
        setPaymentsTransactions(response || []);
      } else {
        setPaymentsTransactions([]);
      }
    } catch (error) {
      setPaymentsTransactions([]);
    } finally {
      setTableLoader(false);
    }
  }

  return (
    <DynamicTable
      headers={matchPaymentsListHeaders}
      gridData={paymentsTransactions?.length > 0 ? paymentsTransactions : []}
      showLoader={tableLoader}
      loaderColSpan={10}
      renderRowList={matchPaymentsRenderData}
    />
  );
}
