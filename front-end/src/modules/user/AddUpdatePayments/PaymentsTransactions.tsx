"use client";
import React, { useEffect, useState } from "react";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import {
  fetchMatchedTransactions,
  fetchPaymentsTransactions,
} from "./Payment.functions";
import {
  matchedTransactionsTableHeaders,
  paymentsTransactionsTableHeaders,
} from "./Payments.constants";
import { usePaymentsContext } from "./PaymentContextProvider";
import { AppRoutes } from "@/shared/constant/appRoutes";

export default function PaymentTransactions({ props }: any) {
  const { paymentId, patchData, router }: any = usePaymentsContext();

  const [matchedTransactions, setMatchedTransactions] = useState([]);
  const [paymentsTransactions, setPaymentsTransactions] = useState([]);

  useEffect(() => {
    fetchMatchedTransactionsData();
    fetchPaymentsTransactionsData();
  }, []);

  async function fetchMatchedTransactionsData() {
    const postData = { payload: { payment_id: +paymentId } };

    try {
      const response = await fetchMatchedTransactions(postData);
      if (response?.length > 0) {
        setMatchedTransactions(response);
      } else {
        setMatchedTransactions([]);
      }
    } catch {
      setMatchedTransactions([]);
    }
  }

  async function fetchPaymentsTransactionsData() {
    const postData = { payload: { payment_id: +paymentId } };

    try {
      const response = await fetchPaymentsTransactions(postData);
      if (response?.length > 0) {
        setPaymentsTransactions(response);
      } else {
        setPaymentsTransactions([]);
      }
    } catch {
      setPaymentsTransactions([]);
    }
  }

  function handleTransactionRoute(rowData: any) {
    let bankAccountId = 0;
    if (rowData?.status == "Auto matched") {
      return;
    } else if (patchData?.retention_id && patchData?.retention_account) {
      bankAccountId = patchData?.retention_account;
    } else if (patchData?.claim_type == "Billable") {
      bankAccountId = patchData?.payment_from_account;
    } else if (patchData?.claim_type == "Receivable") {
      bankAccountId = patchData?.payment_to_account;
    }
    router.push(
      `${
        AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW
      }/${bankAccountId}/${getCompanyIdFromStorage()}?status=${rowData?.status}`
    );
  }

  return (
    <div>
      <h4>Matched Transactions</h4>
      <div className="table-wrapper">
        <div className="pt_table pt_formtable">
          <table className="dataTable compact stripe nowrap hover order-column">
            <thead>
              <tr>
                {matchedTransactionsTableHeaders.map((header) => (
                  <th key={header.id}>{header.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchedTransactions.length > 0 ? (
                matchedTransactions.map((txn: any, index: number) => (
                  <tr key={index}>
                    <td>
                      {txn.transaction_date
                        ? formatDate(txn.transaction_date)
                        : "-"}
                    </td>
                    <td>{txn.description}</td>
                    <td>
                      {txn.txn_amount < 0
                        ? `$ ${convertPositiveDecimalTwoDigit(
                            txn.txn_amount,
                            true
                          )}`
                        : "-"}
                    </td>
                    <td>
                      {txn.txn_amount > 0
                        ? `$ ${convertPositiveDecimalTwoDigit(
                            txn.txn_amount,
                            true
                          )}`
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    There are no records to display
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <br />

      <h4>Payment Transactions</h4>
      <div className="table-wrapper">
        <div className="pt_table pt_formtable">
          <table className="dataTable compact stripe nowrap hover order-column">
            <thead>
              <tr>
                {paymentsTransactionsTableHeaders.map((header) => (
                  <th key={header.id}>{header.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paymentsTransactions.length > 0 ? (
                paymentsTransactions.map((txn: any, index: number) => (
                  <tr
                    key={index}
                    onClick={() => handleTransactionRoute(txn)}
                    className={txn.status == "Auto matched" ? "" : "cu-pointer"}
                  >
                    <td>{txn.payment_transaction_id}</td>
                    <td>{txn.sub_payment_type}</td>
                    <td>{txn.payment_to_account_name}</td>
                    <td>
                      {txn.payment_amount
                        ? `$ ${convertPositiveDecimalTwoDigit(
                            txn.payment_amount,
                            true
                          )}`
                        : "-"}
                    </td>
                    <td>{txn.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    There are no records to display
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <br />
      <br />
    </div>
  );
}
