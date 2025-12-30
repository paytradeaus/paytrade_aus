import React, { Fragment, useEffect, useState } from "react";
import { fetchMatchedTransactions } from "./otherPayments.functions";
import { convertPositiveDecimalTwoDigit, formatDate } from "@/utils";
import DynamicTable from "@/components/Table";
import {
  matchTransactionListHeaders,
  matchTransactionRenderData,
} from "./otherPayments.constants";

export default function ShowMatchTxnTable(props: any) {
  const { paymentId } = props;
  const [matchedTransactions, setMatchedTransactions] = useState([]);
  const [tableLoader, setTableLoader] = useState(false);

  useEffect(() => {
    getMatchedTransactions();
  }, []);

  async function getMatchedTransactions() {
    try {
      setTableLoader(true);
      const postData = {
        payload: {
          payment_id: +paymentId,
        },
      };
      const response: any = await fetchMatchedTransactions(postData);
      if (response) {
        let modifiedData = response.map((eachItem: any) => {
          return {
            ...eachItem,
            transaction_date: eachItem?.transaction_date
              ? formatDate(eachItem?.transaction_date)
              : "",
            spent:
              eachItem?.txn_amount < 0
                ? `$ ${convertPositiveDecimalTwoDigit(
                    eachItem?.txn_amount,
                    true
                  )}`
                : "",
            received:
              eachItem?.txn_amount > 0
                ? `$ ${convertPositiveDecimalTwoDigit(
                    eachItem?.txn_amount,
                    true
                  )}`
                : "",
          };
        });
        setMatchedTransactions(modifiedData);
      } else {
        setMatchedTransactions([]);
      }
    } catch (error) {
      setMatchedTransactions([]);
    } finally {
      setTableLoader(false);
    }
  }

  return (
    <DynamicTable
      headers={matchTransactionListHeaders}
      gridData={matchedTransactions?.length > 0 ? matchedTransactions : []}
      showLoader={tableLoader}
      loaderColSpan={10}
      renderRowList={matchTransactionRenderData}
      // currentPage={currentPage}
      // entriesPerPage={entriesPerPage}
      // onEntriesPerPageChange={setEntriesPerPage}
      // onPageChange={setCurrentPage}
      // totalEntries={totalRows}
    />
  );
}
