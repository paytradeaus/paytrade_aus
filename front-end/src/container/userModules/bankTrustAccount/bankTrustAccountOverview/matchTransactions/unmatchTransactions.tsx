"use client";
import React, { useEffect, useLayoutEffect, useState } from "react";
import styles from "./matchTransactions.module.scss";
import { useParams, useRouter } from "next/navigation";
import { Button, Col, Row, Table } from "react-bootstrap";
import { ModalFullScreen } from "@/components/ModalFullScreen/modalFullScreen";
import { DD_MM_YYYY } from "@/common/constants/general";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
} from "@/common/commonFunctions";
import CryptoJS from "crypto-js";
import {
  MatchTransactionsAPI,
  unmatchTransactionsAPI,
} from "./matchTransactions.functions";
import { getCookie } from "cookies-next";
import { useDispatch } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { TriggerPaymentNotices } from "@/container/userModules/payApps/payments/payments.function";
import { RootState, useAppSelector } from "@/redux/store";
import { AppModal } from "@/components/model/model";

const UnMatchTransactions = (props: any) => {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );
  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;
  const userModes = reduxUserMode || localStorageUserMode;

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [openFullScreen, setOpenFullScreen] = useState(true);
  const [transactionIDs, setTransactionIDs] = useState<any>([]);
  const [transactionData, setTransactionData] = useState<any>([]);
  const [paymentsData, setPaymentsData] = useState<any>([]);
  const [disabledSaveBtn, setDisabledSaveBtn] = useState(false);
  const [bankAccountId, setBankAccountId] = useState("");
  const [relatedTransactionData, setRelatedTransactionData] = useState<any>([]);
  const [openModal, setOpenModal] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState<boolean>(false);

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
        // console.log(decryptedData, "decryptedData");
        setTransactionIDs(decryptedData?.TransactionIDS || []);
        setBankAccountId(decryptedData?.bankAccountId || "");
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

  useEffect(() => {
    if (!openFullScreen) {
      dispatch(
        setScreenDetails({
          fromScreen: "addInterest",
          toScreen: "bankOverView",
          mainActiveTab: "Transactions",
          selectTab: "To Review",
        })
      );
      router.back();
    }
  }, [openFullScreen]);
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
    if (transactionData?.length > 0) {
      let payloadData = {
        transactionId: transactionIDs[0],
        confirm: true,
      };
      let unMatchResponse = await unmatchTransactionsAPI(payloadData);
      if (unMatchResponse?.transactions?.length > 0) {
        dispatch(
          setScreenDetails({
            fromScreen: "addInterest",
            toScreen: "bankOverView",
            mainActiveTab: "Transactions",
            selectTab: "Matched",
          })
        );
        router.back();
      } else {
        setDisabledSaveBtn(false);
      }
    } else {
      setDisabledSaveBtn(false);
    }
  };

  return (
    <ModalFullScreen
      displayFullScreenModal={openFullScreen}
      onClose={() => setOpenFullScreen(false)}
      customButtons={true}
      btnConfig={
        <div className={styles.btnContainer}>
          <Button
            className={`${styles.modalpopupBtn} ${styles.cancelButton}`}
            onClick={() => setOpenFullScreen(false)}
          >
            Cancel
          </Button>
          <Button
            className={styles.modalpopupBtn}
            disabled={transactionData?.length === 0 || disabledSaveBtn}
            onClick={() => {
              setDisabledSaveBtn(true);
              onHandleMatchTransaction();
              // setOpenModal(true);
            }}
          >
            Unmatch
          </Button>
        </div>
      }
    >
      <div className={styles.dataContainer}>
        <div className="mb-4 mt-3" style={{ fontWeight: "bold" }}>
          Unmatch Transactions
        </div>
        <div className={styles.matchContainer}>
          <Row style={{ width: "80%" }}>
            <Col>
              <Table bordered responsive>
                <thead>
                  <tr>
                    <th> Date</th>
                    <th> Description</th>
                    <th> Spent</th>
                    <th> Received</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionData?.map((eachItem: any, index: number) => (
                    <tr key={eachItem?.id}>
                      <td width={"60px"}>
                        {eachItem?.txn_date
                          ? formatDate(eachItem?.txn_date, DD_MM_YYYY)
                          : ""}
                      </td>
                      <td>{eachItem?.description}</td>
                      <td
                        style={{ whiteSpace: "nowrap" }}
                        width={"100px"}
                        align="right"
                      >
                        {eachItem?.spent_amount
                          ? `$ ${convertPositiveDecimalTwoDigit(
                              eachItem?.spent_amount,
                              true
                            )}`
                          : ""}
                      </td>
                      <td
                        style={{ whiteSpace: "nowrap" }}
                        width={"100px"}
                        align="right"
                      >
                        {eachItem?.received_amount
                          ? `$ ${convertPositiveDecimalTwoDigit(
                              eachItem?.received_amount,
                              true
                            )}`
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Col>
          </Row>
        </div>
        {relatedTransactionData?.length > 0 && (
          <>
            <div className="d-flex mb-2 mt-2" style={{ fontWeight: "bold" }}>
              Few associated group transactions
            </div>
            <div className={styles.matchContainer}>
              <Row style={{ width: "80%" }}>
                <Col>
                  <Table bordered responsive>
                    <thead>
                      <tr>
                        <th> Date</th>
                        <th> Description</th>
                        <th> Spent</th>
                        <th> Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedTransactionData?.map(
                        (eachItem: any, index: number) => (
                          <tr key={eachItem?.id}>
                            <td width={"60px"}>
                              {eachItem?.txn_date
                                ? formatDate(eachItem?.txn_date, DD_MM_YYYY)
                                : ""}
                            </td>
                            <td>{eachItem?.description}</td>
                            <td
                              style={{ whiteSpace: "nowrap" }}
                              width={"100px"}
                              align="right"
                            >
                              {eachItem?.spent_amount
                                ? `$ ${convertPositiveDecimalTwoDigit(
                                    eachItem?.spent_amount,
                                    true
                                  )}`
                                : ""}
                            </td>
                            <td
                              style={{ whiteSpace: "nowrap" }}
                              width={"100px"}
                              align="right"
                            >
                              {eachItem?.received_amount
                                ? `$ ${convertPositiveDecimalTwoDigit(
                                    eachItem?.received_amount,
                                    true
                                  )}`
                                : ""}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </Table>
                </Col>
              </Row>
            </div>
          </>
        )}

        <div className={styles.matchContainer1}>
          <div className="d-flex mb-4" style={{ fontWeight: "bold" }}>
            Matched payments
          </div>
          {paymentsData?.map((each: any) => {
            return (
              <div className="d-flex mt-2" key={each?.sub_payment_id}>
                <label>
                  <span
                    className={styles.paid}
                  >{`Payment Id  ${each?.payment_id}  `}</span>
                  {`${
                    each?.payment_date
                      ? formatDate(each?.payment_date, DD_MM_YYYY)
                      : "N/A"
                  } - ${
                    each?.spent_amount
                      ? `$ ${Math.abs(each?.spent_amount)
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                      : each?.received_amount
                      ? `$ ${Math.abs(each?.received_amount)
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                      : "$  0.00"
                  } - ${
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
                          each?.payment_type === "Overpayment refund to client"
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
              </div>
            );
          })}
        </div>
        <div style={{ fontWeight: "bold", marginTop: "20px" }}>
          On clicking unmatch you will unmatch a group of payment against the
          transactions
        </div>
      </div>
    </ModalFullScreen>
  );
};
export default UnMatchTransactions;
