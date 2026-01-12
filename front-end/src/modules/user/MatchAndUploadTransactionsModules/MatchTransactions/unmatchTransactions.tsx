"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useLayoutEffect, useState } from "react";
import CryptoJS from "crypto-js";
import { unmatchTransactionsAPI } from "./matchTransactions.functions";
import _ from "lodash";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import { useLoaderContext } from "@/context/useLoader";

import BreadCrumbs from "@/components/BreadCrumbs";
import { NA } from "@/shared/constant/general";
import { setCookie } from "cookies-next";
import { toggleOptions } from "../../PayApps/payApps.constant";
import { useSearchParams } from "next/navigation";
import {
  checkAndCreateOverPaymentAndRefunds,
  CreateClaimInPaytrade,
} from "../../UserIntegrations/XeroDashboard/XeroSyncLogDetails/syncLog.functions";
import { viewXeroSyncLog } from "../../UserIntegrations/integration.functions";

const UnMatchTransactions = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const errorCode: any = searchParams.get("errorCode");

  const { setLoader }: any = useLoaderContext();

  const [transactionIDs, setTransactionIDs] = useState<any>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [selectedPaymentData, setSelectedPaymentData] = useState<any[]>([]);
  const [transactionData, setTransactionData] = useState<any>([]);
  const [paymentsData, setPaymentsData] = useState<any>([]);
  const [relatedTransactionData, setRelatedTransactionData] = useState<any>([]);
  const [isTriggerFrom, setIsTriggerFrom] = useState("");
  const [syncId, setSyncId] = useState("");

  useLayoutEffect(() => {
    if (params?.id && Array.isArray(params.id) && params.id[0]) {
      let joinedString = params?.id?.join("/");
      // Decode the URL-encoded string
      const decodedString = decodeURIComponent(joinedString);

      // Decrypt the decoded string
      const decryptedString = CryptoJS.AES.decrypt(
        decodedString,
        "transactions-IDS"
      ).toString(CryptoJS.enc.Utf8);

      // Attempt to parse the decrypted string as JSON
      try {
        const decryptedData = JSON.parse(decryptedString);
        setTransactionIDs(decryptedData?.TransactionIDS || []);
        setBankAccountId(decryptedData?.bankAccountId || "");
        setIsTriggerFrom(decryptedData?.triggerFrom || "");
        setSyncId(searchParams.get("syncId") || "");
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        console.error("Decrypted string:", decryptedString);
        router.back();
      }
    } else {
      router.back();
    }
  }, [params]);

  useEffect(() => {
    if (transactionIDs?.length > 0) getPaymentsToMatchTransactions();
  }, [transactionIDs]);

  const getPaymentsToMatchTransactions = async () => {
    let payload = {
      transactionId: transactionIDs[0],
      confirm: null,
    };
    let unMatchResponse = await unmatchTransactionsAPI(payload);

    if (unMatchResponse?.transactions?.length > 0) {
      setTransactionData(unMatchResponse?.transactions || []);
      setPaymentsData(unMatchResponse?.payments || []);
      setRelatedTransactionData(unMatchResponse?.related_transactions || []);
    }
  };

  const onHandleMatchTransaction = async () => {
    try {
      setLoader(true);
      if (transactionData?.length > 0) {
        let payloadData = {
          transactionId: transactionIDs[0],
          confirm: true,
        };
        let unMatchResponse = await unmatchTransactionsAPI(payloadData);
        if (unMatchResponse?.transactions?.length > 0) {
          if (syncId) {
            const data = await viewXeroSyncLog({
              viewXeroSyncLogId: syncId,
            });
            // ✅ Skip calling checkAndCreateOverPaymentAndRefunds when errorCode = WH_PAYMENT_CANNOT_BE_DELETED
            if (errorCode !== "WH_PAYMENT_CANNOT_BE_DELETED") {
              await checkAndCreateOverPaymentAndRefunds({
                contactId: data?.api_payload?.contact_id ?? null,
                tenantId: data?.api_payload?.tenant_id ?? null,
                associatedOverpaymentId:
                  data?.api_payload?.associated_overpayment_id ?? null,
                overpaymentId: data?.api_payload?.overpayment_id ?? null,
                associatedPaymentId:
                  data?.api_payload?.associated_payment_id ?? null,
                paymentClaimId: data?.api_payload?.payment_claim_id ?? null,
                projectId: data?.api_payload?.project_id ?? null,
                syncId: data?.id ?? null,
                isUnderPayment: data?.api_payload?.is_under_payment ?? null,
                syncRunType: data?.api_payload?.sync_run_type || null,
              });
            }
            if (
              errorCode == "WH_PAYMENT_CANNOT_BE_DELETED" ||
              errorCode == "SCHEDULER_PAYMENT_CANNOT_BE_DELETED"
            ) {
              await CreateClaimInPaytrade({
                associatedRetentionSubPaymentId: null,
                retentionId: null,
                invoiceId: data?.api_payload?.invoice_id || null,
                tenantId: data?.api_payload?.tenant_id || null,
                syncId: data?.id || syncId,
                syncRunType: data?.api_payload?.sync_run_type || null,
              });
            }
          }
          router.back();
        }
      }
    } catch (error) {
    } finally {
      setLoader(false);
    }
  };

  function navigateToViewMode(data: any) {
    setCookie("from_page", AppRoutes.USER_PAY_APPS);

    router.push(
      `${AppRoutes.USER_ADD_PAYMENT}?claim=${
        data?.payment_claim_id
      }&mode=view&payment=${data?.payment_id}&crt=${
        data?.cash_retention_type === toggleOptions[1]?.value
          ? "RetentionClaim"
          : ""
      }`
    );
  }

  return (
    <div className="pt_fullpage">
      <div>
        <div>
          <div className="pt_crumbclose">
            <div className="pt_breadcrumbs">
              {!syncId && (
                <BreadCrumbs
                  routePaths={[
                    {
                      name: "Dashboard",
                      path: AppRoutes.USER_DASHBOARD,
                    },
                    {
                      name: isTriggerFrom ? "Bank overview" : "Bookkeeping",
                      path: isTriggerFrom
                        ? `${
                            AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW
                          }/${bankAccountId}/${getCompanyIdFromStorage()}`
                        : AppRoutes.USER_BOOKKEEPING,
                    },
                  ]}
                  activeRoute={"Unmatch transactions"}
                />
              )}
            </div>
            <div className="pt_topfilters">
              <div className="pt_pageactions">
                <a onClick={() => "history.back()"}>
                  <button
                    className="contrast smallbutton"
                    onClick={() => router.back()}
                  >
                    <i className="fa-light fa-xmark-large"></i>Close
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className=" grid pt_data_clear">
          <h3>Unmatch transactions</h3>
        </div>

        {/* <h3>Unmatch transactions</h3> */}

        <div className="grid">
          <div className="pt_defaulttable_scroll">
            <table className="pt_defaulttable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Spent</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {transactionData?.map((eachItem: any, index: number) => (
                  <tr key={eachItem?.id}>
                    <td>
                      {eachItem?.txn_date ? formatDate(eachItem?.txn_date) : ""}
                    </td>
                    <td>{eachItem?.description}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {eachItem?.spent_amount
                        ? `$ ${convertPositiveDecimalTwoDigit(
                            eachItem?.spent_amount,
                            true
                          )}`
                        : "$0"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {eachItem?.received_amount
                        ? `$ ${convertPositiveDecimalTwoDigit(
                            eachItem?.received_amount,
                            true
                          )}`
                        : "$0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {relatedTransactionData?.length > 0 && (
          <>
            <div className=" grid pt_data_clear">
              <h3> Few associated group transactions</h3>
            </div>
            <div className="grid">
              <div className="pt_defaulttable_scroll">
                <table className="pt_defaulttable">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Spent</th>
                      <th>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedTransactionData?.map(
                      (eachItem: any, index: number) => (
                        <tr key={eachItem?.id}>
                          <td>
                            {eachItem?.txn_date
                              ? formatDate(eachItem?.txn_date)
                              : ""}
                          </td>
                          <td>{eachItem?.description}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {eachItem?.spent_amount
                              ? `$ ${convertPositiveDecimalTwoDigit(
                                  eachItem?.spent_amount,
                                  true
                                )}`
                              : "$0"}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {eachItem?.received_amount
                              ? `$ ${convertPositiveDecimalTwoDigit(
                                  eachItem?.received_amount,
                                  true
                                )}`
                              : "$0"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="pt_infocol pt_records">
          <h4>Matching records found</h4>

          <fieldset>
            {paymentsData?.length > 0 &&
              paymentsData?.map((each: any, index: number) => {
                return (
                  <label key={index}>
                    <b>
                      <span
                        className="rivertext text_underline cu-pointer"
                        onClick={() => navigateToViewMode(each)}
                      >{`Payment ID  ${each?.payment_id}  `}</span>
                      <span>
                        {`| ${
                          each?.payment_date
                            ? formatDate(each?.payment_date)
                            : NA
                        } | `}
                      </span>
                      <span className="valid">{` ${
                        each?.spent_amount
                          ? `$${Math.abs(each?.spent_amount)
                              .toFixed(2)
                              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                          : each?.received_amount
                          ? `$${Math.abs(each?.received_amount)
                              .toFixed(2)
                              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                          : "$0.00"
                      }  `}</span>
                      |
                    </b>

                    {` ${
                      each?.is_other_payment
                        ? each?.payment_type === "Interest Received" ||
                          each?.payment_type === "Bank Charge Top Up" ||
                          each?.payment_type === "Top Up" ||
                          each?.payment_type === "Top Up Retention"
                          ? `${each?.payment_type} to`
                          : each?.payment_type === "Interest Withdrawal" ||
                            each?.payment_type === "Overpayment Refund" ||
                            each?.payment_type === "Withdrawal"
                          ? `${each?.payment_type} from`
                          : each?.payment_type === "Bank Charge Applied"
                          ? `${each?.payment_type} on`
                          : each?.payment_type ===
                              "Overpayment refund from supplier" ||
                            each?.payment_type ===
                              "Overpayment refund to client"
                          ? each?.payment_type
                          : "N/A"
                        : each?.claim_type === "Receivable"
                        ? each?.sub_payment_type === "Retention"
                          ? "Payment received to"
                          : each?.sub_payment_type === "Payment" &&
                            (each?.payment_type === "Overpayment from client" ||
                              each?.payment_type === "Underpayment from client")
                          ? each?.payment_type || ""
                          : each?.sub_payment_type === "Payment"
                          ? "Payment received to"
                          : "N/A"
                        : each?.claim_type === "Billable"
                        ? each?.sub_payment_type === "Retention In"
                          ? "Retained payment received for beneficiary"
                          : each?.sub_payment_type === "Retention Out"
                          ? "Retained payment sent to RTA for beneficiary"
                          : each?.sub_payment_type === "Payment" &&
                            (each?.payment_type === "Overpayment to supplier" ||
                              each?.payment_type === "Underpayment to supplier")
                          ? each?.payment_type || ""
                          : each?.sub_payment_type === "Payment"
                          ? "Payment sent to"
                          : "N/A"
                        : "N/A"
                    }
                         ${
                           each?.is_other_payment
                             ? each?.payment_type === "Interest Received" ||
                               each?.payment_type === "Bank Charge Top Up" ||
                               each?.payment_type === "Top Up Retention" ||
                               each?.payment_type === "Top Up"
                               ? each?.payment_to_account_name || "N/A"
                               : each?.payment_type === "Interest Withdrawal" ||
                                 each?.payment_type === "Withdrawal"
                               ? `${
                                   each?.payment_from_account_name || "N/A"
                                 } to ${each?.payment_to_account_name || "N/A"}`
                               : each?.payment_type === "Bank Charge Applied"
                               ? `${each?.payment_from_account_name || "N/A"}`
                               : each?.payment_type === "Overpayment Refund"
                               ? `Supplier ${
                                   each?.client_supplier_name || "N/A"
                                 } to  ${
                                   each?.payment_to_account_name || "N/A"
                                 } `
                               : each?.payment_type ===
                                 "Overpayment refund to client"
                               ? `from ${each?.payment_from_account_name}` ||
                                 "N/A"
                               : each?.payment_type ===
                                 "Overpayment refund from supplier"
                               ? `to ${each?.payment_to_account_name}` || "N/A"
                               : "N/A"
                             : each?.claim_type === "Receivable"
                             ? each?.sub_payment_type === "Retention"
                               ? each?.payment_to_account_name || "N/A"
                               : each?.sub_payment_type === "Payment" &&
                                 (each?.payment_type ===
                                   "Overpayment from client" ||
                                   each?.payment_type ===
                                     "Underpayment from client")
                               ? `to ${each?.payment_to_account_name}` || "N/A"
                               : each?.sub_payment_type === "Payment"
                               ? each?.payment_to_account_name || "N/A"
                               : "N/A"
                             : each?.claim_type === "Billable"
                             ? each?.sub_payment_type === "Retention In"
                               ? each?.client_supplier_name || "N/A"
                               : each?.sub_payment_type === "Retention Out"
                               ? each?.client_supplier_name || "N/A"
                               : each?.sub_payment_type === "Payment" &&
                                 (each?.payment_type ===
                                   "Overpayment to supplier" ||
                                   each?.payment_type ===
                                     "Underpayment to supplier")
                               ? `from ${each?.payment_from_account_name}` ||
                                 "N/A"
                               : each?.sub_payment_type === "Payment"
                               ? each?.payment_to_account_name || "N/A"
                               : "N/A"
                             : "N/A"
                         }`}
                  </label>
                );
              })}
            {paymentsData?.length === 0 && (
              <span> No matching payments are available</span>
            )}
          </fieldset>
        </div>

        <div style={{ fontWeight: "bold" }}>
          On clicking unmatch you will unmatch a group of payment against the
          transactions
        </div>
      </div>

      <div>
        <div className="pt_fullpageactions">
          <div>
            <a>
              <button className="contrast" onClick={() => router.back()}>
                <i className="fa-light fa-xmark-large"></i>Cancel
              </button>
            </a>
          </div>
          <div>
            <a>
              <button onClick={() => onHandleMatchTransaction()}>
                <i className="fa-light fa-circle-check"></i>Unmatch
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnMatchTransactions;
