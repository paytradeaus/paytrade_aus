import React, { useEffect, useState } from "react";
import {
  fetchMatchedTransactions,
  fetchPaymentsTransactions,
} from "../AddUpdatePayments/Payment.functions";
import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";
import {
  matchedTransactionsTableHeaders,
  paymentsTransactionsTableHeaders,
} from "../AddUpdatePayments/Payments.constants";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { getCookie } from "cookies-next";
import { getNoticesListServices } from "./AddUpdateClaims.function";
import { useRouter } from "next/navigation";

export default function PaymentHistory() {
  const { paymentId, paymentsPatchData }: any = useAddUpdateClaimsContext();

  const [noticesList, setNoticesList] = useState([]);
  const router = useRouter();

  const [matchedTransactions, setMatchedTransactions] = useState([]);
  const [paymentsTransactions, setPaymentsTransactions] = useState([]);

  useEffect(() => {
    fetchMatchedTransactionsData();
    fetchNoticesData();
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
    } catch (error) {
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
    } catch (error) {
      console.error("Error fetching payments transactions:", error);
      setPaymentsTransactions([]);
    }
  }

  async function fetchNoticesData() {
    const companyId = getCookie("companyId")
      ? Number(getCookie("companyId"))
      : "";
    const postData = {
      company_id: companyId,
      payment_id: paymentId ? +paymentId : "",
      page: 1,
      items_per_page: 10,
    };

    try {
      const response = await getNoticesListServices(postData);
      if (response?.notices_list?.length > 0) {
        setNoticesList(response.notices_list);
      } else {
        setNoticesList([]);
      }
    } catch {
      setNoticesList([]);
    }
  }

  function navigateToNoticeDetail(notice: any) {
    router.push(`${AppRoutes.USER_NOTICES_VIEW}/${notice?.id}`);
  }

  function handleTransactionRoute(rowData: any) {
    let bankAccountId = 0;
    if (rowData?.status == "Auto matched") {
      return;
    } else if (
      paymentsPatchData?.retention_id &&
      paymentsPatchData?.retention_account
    ) {
      bankAccountId = paymentsPatchData?.retention_account;
    } else if (paymentsPatchData?.claim_type == "Billable") {
      bankAccountId = paymentsPatchData?.payment_from_account;
    } else if (paymentsPatchData?.claim_type == "Receivable") {
      bankAccountId = paymentsPatchData?.payment_to_account;
    }
    router.push(
      `${
        AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW
      }/${bankAccountId}/${getCompanyIdFromStorage()}?status=${rowData?.status}`
    );
  }

  return (
    <div className="pt_expandtable">
      <details>
        <summary>History</summary>

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
                        className={
                          txn.status == "Auto matched" ? "" : "cu-pointer"
                        }
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
        <h4>Notices</h4>
        <div className="table-wrapper">
          <div className="pt_table pt_formtable">
            <table className="dataTable compact stripe nowrap hover order-column">
              <thead>
                <tr>
                  <th>Notice Type</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {noticesList.length > 0 ? (
                  noticesList.map((notice: any, index: number) => (
                    <tr key={index}>
                      <td>{notice.notice_type}</td>
                      <td>
                        {notice.notice_date
                          ? formatDate(notice.notice_date)
                          : "-"}
                      </td>
                      <td>{notice.status}</td>
                      <td>
                        <a
                          style={{ textDecoration: "none", cursor: "pointer" }}
                          onClick={() => navigateToNoticeDetail(notice)}
                        >
                          View
                        </a>
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
      </details>
    </div>
  );
}
