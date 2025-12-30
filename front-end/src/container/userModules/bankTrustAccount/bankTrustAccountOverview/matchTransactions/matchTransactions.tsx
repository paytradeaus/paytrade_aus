"use client";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import styles from "./matchTransactions.module.scss";
import { useParams, usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { Button, Col, Row, Table } from "react-bootstrap";
import { ModalFullScreen } from "@/components/ModalFullScreen/modalFullScreen";
import {
  commonCookies,
  DD_MM_YYYY,
  SubscriptionPlanTypes,
} from "@/common/constants/general";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
  getSubscriptionType,
} from "@/common/commonFunctions";
import CryptoJS from "crypto-js";
import { RowsPerPageInTable } from "@/common/constants";
import {
  FetchPaymentsToMatchTransactions,
  ListAllSubPayments,
  MatchTransactionsAPI,
} from "./matchTransactions.functions";
import { ISubPayment } from "./matchTransactions.types";
import debounce from "lodash/debounce";
import AddTransactionForMatch from "./addTransactionsForMatch/addTransactionForMatch";
import { TrashFill } from "react-bootstrap-icons";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { getCookie } from "cookies-next";
import { useDispatch } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { TriggerPaymentNotices } from "@/container/userModules/payApps/payments/payments.function";
import OtherPayment from "../../bankInterest/otherPayment";
import { AppModal } from "@/components/model/model";
import { ApplicationURLS } from "@/common/applicationURLS";
import { SUBSCRIPTION_UPGRADE } from "@/common/constants/messages";
import { useTokenDetails } from "@/common/commonHooks";
import _ from "lodash";
import { useAppSelector } from "@/redux/store";
import { setMatchTransactions } from "@/redux/slices/subscribeRouteBackDetails";

const MatchTransactions = (props: any) => {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const routePath = usePathname();
  const { decodeTokenData } = useTokenDetails();
  const [subscriptionPlanName, setSubscriptionPlanName] =
    useState<string>("Basic"); //company or user's current subscription plan

  //state contains retained data from subscriptions if any
  const retainedDataFromSubscription: any = useAppSelector(
    (state: any) => state?.retainedDataFromSubscription?.matchedTransactions
  );

  const [displaySubscriptionModal, setDisplaySubscriptionModal] =
    useState(false);

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [openFullScreen, setOpenFullScreen] = useState(true);
  const [isShowAllPayments, setIsShowAllPayments] = useState(false);
  const [commonAllPaymentsList, setCommonAllPaymentsList] = useState<any>([]);
  const [transactionIDs, setTransactionIDs] = useState<any>([]);
  const [transactionData, setTransactionData] = useState<any>([]);
  const [paymentsData, setPaymentsData] = useState<any>([]);

  const [amountShow, setAmountShow] = useState<any>(0);
  const [selectedPaymentData, setSelectedPaymentData] = useState<any[]>([]);
  const [disabledSaveBtn, setDisabledSaveBtn] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isShowAddTransaction, setIsShowTransaction] = useState(false);
  const [isShowAddOtherPayments, setIsShowAddOtherPayments] = useState(false);
  const [refetchLatestPayments, setRefetchLatestPayments] = useState(false);
  const [bankAccountId, setBankAccountId] = useState("");
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(
      new Date(new Date().setDate(new Date().getDate() - 7)).setHours(
        0,
        0,
        0,
        0
      )
    )
  );
  const [isRetainDataRendered, setIsRetainDataRendered] = useState(false);

  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );

  const [totalPayment, setTotalPayment] = useState(0);
  const [transactionType, setTransactionType] = useState(null); //if receivable it's true if billable it's false in transactions

  //update subscription type once component mount
  useEffect(() => {
    subscriptionConfiguration();
  }, []);

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
    // Check if there are transaction IDs available
    if (transactionIDs?.length > 0) {
      // If retained subscription data is empty or retained data has already been rendered
      if (_.isEmpty(retainedDataFromSubscription) || isRetainDataRendered) {
        // Fetch payments to match transactions
        getPaymentsToMatchTransactions();
      }
    }
  }, [transactionIDs]);

  useEffect(() => {
    let amountValue = selectedPaymentData.reduce(
      (acc: number, transaction: any) => {
        const { amount, payment_type } = transaction;

        // Define types that should result in a negative amount
        const negativeTypes = [
          "Underpayment from client",
          "Underpayment to supplier",
        ];

        // Check if the payment type is in the negativeTypes array
        if (negativeTypes.includes(payment_type)) {
          return acc - Math.abs(amount); // Make the amount negative
        } else {
          return acc + Math.abs(amount); // Make the amount positive for other types
        }
      },
      0
    );

    setTotalPayment(amountValue);
  }, [selectedPaymentData]);

  useEffect(() => {
    // If retained subscription data is empty or retained data has already been rendered
    if (
      _.isEmpty(retainedDataFromSubscription?.allPaymentsList) ||
      isRetainDataRendered
    ) {
      getPaymentsListData(page, perPage);
    }
  }, [
    bankAccountId,
    debouncedSearch,
    activityLogStartDate,
    activityLogEndDate,
    transactionType,
  ]);
  useEffect(() => {
    if (refetchLatestPayments) {
      setSelectedPaymentData([]);
      getPaymentsListData(page, perPage);
    }
  }, [refetchLatestPayments]);

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

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
    setSelectedPaymentData([]);
    setTransactionType(null);
    let payload = {
      transactionIds: transactionIDs,
    };
    let paymentTransactionsRes = await FetchPaymentsToMatchTransactions(
      payload
    );
    const totalAmount = paymentTransactionsRes?.transactions.reduce(
      (acc: number, transaction: any) => {
        return (
          acc +
          (Number(transaction?.received_amount) ||
            0 + Number(Math.abs(transaction?.spent_amount)) ||
            0)
        );
      },
      0
    );
    setAmountShow(totalAmount);
    setTransactionData(paymentTransactionsRes?.transactions);
    if (paymentTransactionsRes?.transactions?.length > 0) {
      setTransactionType(
        paymentTransactionsRes?.transactions[0]?.is_receivable ?? null
      );
    }
    setPaymentsData(paymentTransactionsRes?.payments);
  };
  const getPaymentsListData = async (page: number, rowsPerPage: number) => {
    if (transactionType === null) return;
    const adminUserList = await ListAllSubPayments({
      keyword: search || null,
      page_number: page,
      page_size: perPage,
      start_date: activityLogStartDate || null,
      date_filter: "Custom",
      end_date: activityLogEndDate || null,
      company_id: selectedCompanyId,
      status: "Unmatched",
      bank_account_id: bankAccountId || null,
      claim_type: transactionType ? "Receivable" : "Billable",
    });
    setCommonAllPaymentsList(adminUserList?.payments || []);
    setTotalRows(adminUserList?.total_count || 0);
    setPerPage(rowsPerPage);
    setRefetchLatestPayments(false);
  };
  const handlePageChange = async (page: number) => {
    setPage(page);
    await getPaymentsListData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getPaymentsListData(page, newPerPage);
  };
  async function onHandleMatchTransaction(skipSubscriptionUpgrade?: boolean) {
    if (selectedPaymentData?.length > 0) {
      //condition to show upgrade subscription modal
      if (
        subscriptionPlanName === SubscriptionPlanTypes.BASIC &&
        !skipSubscriptionUpgrade
      ) {
        setDisplaySubscriptionModal(true);
        return;
      }
      let payloadData = {
        paymentIds: selectedPaymentData?.map((each: any) => each?.id),
        transactionIds: transactionIDs,
      };

      let response = await MatchTransactionsAPI(payloadData);
      if (response?.status) {
        if (response?.payment_Ids.length > 0)
          await TriggerPaymentNotices({
            payment_ids: response?.payment_Ids,
          });
        dispatch(
          setScreenDetails({
            fromScreen: "addInterest",
            toScreen: "bankOverView",
            mainActiveTab: "Transactions",
            selectTab: "Matched",
          })
        );
        resetRetainedMatchedData();
        router.back();
      } else {
        setDisabledSaveBtn(false);
      }
    } else {
      setDisabledSaveBtn(false);
    }
  }

  const handleChange = (state: any) => {
    if (transactionIDs?.length > 1) {
      setSelectedPaymentData(
        state.selectedRows.map((row: any) => ({
          id: row.sub_payment_id,
          amount: row.amount,
          payment_type: row?.payment_type,
        })) || []
      );
      return;
    }
    setSelectedPaymentData((prev: any[]) => {
      let selectedRows = state.selectedRows.map((row: any) => ({
        id: row.sub_payment_id,
        amount: row.amount,
        payment_type: row?.payment_type,
      }));

      // Create a new array for selected payment data
      let newSelectedPaymentData = [...prev];

      // Add new selected rows that are not in prev
      selectedRows.forEach((row: any) => {
        if (!newSelectedPaymentData.some((item) => item.id === row.id)) {
          newSelectedPaymentData.push(row);
        }
      });

      // Remove any items from prev that are not in selectedRows
      newSelectedPaymentData = newSelectedPaymentData.filter((item) =>
        selectedRows.some((row: any) => row.id === item.id)
      );

      //not available data
      prev.forEach((row: any) => {
        if (
          !commonAllPaymentsList.some(
            (item: ISubPayment) => item.sub_payment_id === row.id
          )
        ) {
          newSelectedPaymentData.push(row);
        }
      });

      return newSelectedPaymentData;
    });
  };

  //FetchPaymentsToMatchTransactions
  const columns = [
    {
      name: "Payment Type",
      minWidth: "150px",
      wrap: true,
      center: true,
      selector: (row: ISubPayment) => row?.payment_type,
    },
    {
      name: "Payment From",
      minWidth: "200px",
      wrap: true,
      center: true,
      selector: (row: ISubPayment) => row?.payment_from_account_name,
    },
    {
      name: "Payment To",
      minWidth: "200px",
      wrap: true,
      center: true,
      selector: (row: ISubPayment) => row?.payment_to_account_name,
    },
    {
      name: "Date",
      selector: (row: ISubPayment) =>
        row?.payment_date ? formatDate(row?.payment_date, DD_MM_YYYY) : "N/A",
    },
    {
      name: "Project Name",
      minWidth: "200px",
      selector: (row: ISubPayment) => row?.project_name || "",
    },
    {
      name: "Contract Name",
      minWidth: "200px",
      selector: (row: ISubPayment) => row?.contract_name || "",
    },
    {
      name: "Claimed Amount",
      right: true,
      minWidth: "200px",
      fixed: "right",
      selector: (row: ISubPayment) =>
        row?.claim_amount
          ? `$ ${
              convertPositiveDecimalTwoDigit(row?.claim_amount, true) || 0.0
            }`
          : "",
    },
    {
      name: "Payment Amount",
      right: true,
      minWidth: "200px",
      selector: (row: ISubPayment) =>
        row.amount
          ? `$ ${convertPositiveDecimalTwoDigit(row?.amount, true)}`
          : "",
    },
    {
      name: "Payment Claim Id",
      minWidth: "200px",
      selector: (row: ISubPayment) => row?.payment_claim_id || "",
    },
  ];
  const onInputChange = useCallback((e: { target: { value: string } }) => {
    let inputValue = e?.target?.value?.trim()
      ? e?.target?.value
      : e?.target?.value?.trim();
    setSearch(inputValue);
  }, []);

  const preselectedFunction = (row: any) =>
    selectedPaymentData?.some((each: any) => each.id === row.sub_payment_id);

  /**
   * Patches transaction formData from retained redux state on route back from subscriptions.
   * and sets subscription plan type
   */
  function subscriptionConfiguration() {
    //update current subscription plan type to trigger notices on submit
    setSubscriptionPlanName(
      getSubscriptionType(decodeTokenData, selectedCompanyId)
    ); // Assuming setPlanName exists to store the plan name

    if (!_.isEmpty(retainedDataFromSubscription)) {
      setTransactionData(retainedDataFromSubscription?.transactions);
      setActivityLogStartDate(retainedDataFromSubscription?.startDate);
      setActivityLogEndDate(retainedDataFromSubscription?.endDate);
      setCommonAllPaymentsList(retainedDataFromSubscription?.allPaymentsList);
      setTransactionIDs(retainedDataFromSubscription?.transactionIds);
      setSelectedPaymentData(retainedDataFromSubscription?.selectedPaymentData);
      setAmountShow(retainedDataFromSubscription?.totalToMatch);
      setPaymentsData(retainedDataFromSubscription?.payments);
      setTransactionType(retainedDataFromSubscription?.transactionType);
      setIsShowAllPayments(retainedDataFromSubscription?.displayAllPayments);
      setTimeout(() => {
        setIsRetainDataRendered(true);
      });
    }
  }

  /**
   * On route to subscription from matched transactions page for subscription upgrade
   */
  function handleSubscription() {
    // Store the current route path in session storage for reference after navigation
    sessionStorage.setItem(commonCookies.NAVIGATED_FROM, routePath);
    // Dispatch an action to update the Redux store with subscription-related data
    dispatch(
      setMatchTransactions({
        transactions: transactionData,
        allPaymentsList: commonAllPaymentsList,
        startDate: activityLogStartDate,
        endDate: activityLogEndDate,
        transactionIds: transactionIDs,
        selectedPaymentData: selectedPaymentData,
        totalToMatch: amountShow,
        payments: paymentsData,
        transactionType: transactionType,
        displayAllPayments: isShowAllPayments,
      })
    );
    // Navigate the user to the subscription upgrade page
    router.push(ApplicationURLS.USER_SUBSCRIPTION_UPGRADE);
  }

  /**
   * Resets retained Matched Transactions data in the global state.
   * Checks if there is any retained matched data from a subscription and clears it if present.
   */
  function resetRetainedMatchedData() {
    if (!_.isEmpty(retainedDataFromSubscription)) {
      dispatch(setMatchTransactions({}));
    }
  }

  function handleModalClose() {
    setOpenFullScreen(false);
    if (!_.isEmpty(retainedDataFromSubscription)) {
      resetRetainedMatchedData();
    }
  }

  return (
    <ModalFullScreen
      displayFullScreenModal={openFullScreen}
      onClose={handleModalClose}
      disableOnCloseIcon={isShowAddTransaction || isShowAddOtherPayments}
      customButtons={true}
      btnConfig={
        <div className={styles.btnContainer}>
          <Button
            className={`${styles.modalpopupBtn} ${styles.cancelButton}`}
            onClick={handleModalClose}
            disabled={isShowAddTransaction || isShowAddOtherPayments}
          >
            Cancel
          </Button>
          <Button
            className={styles.modalpopupBtn}
            disabled={
              disabledSaveBtn || isShowAddTransaction || isShowAddOtherPayments
            }
            onClick={() => {
              setDisabledSaveBtn(true);
              onHandleMatchTransaction();
            }}
          >
            Match
          </Button>
        </div>
      }
    >
      <div className={styles.dataContainer}>
        {!isShowAddTransaction && !isShowAddOtherPayments && (
          <>
            <div className="mb-4 mt-3">Match Transactions</div>
            <div className={styles.matchContainer}>
              <Row>
                <Col lg={9} md={9} sm={12} xs={12}>
                  <Table bordered responsive>
                    <thead>
                      <tr>
                        <th> Date</th>
                        <th> Description</th>
                        <th> Spent</th>
                        <th> Received</th>
                        {transactionIDs?.length > 1 && <th> </th>}
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
                          <td style={{ whiteSpace: "nowrap" }} align="right">
                            {eachItem?.spent_amount
                              ? `$ ${convertPositiveDecimalTwoDigit(
                                  eachItem?.spent_amount,
                                  true
                                )}`
                              : ""}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }} align="right">
                            {eachItem?.received_amount
                              ? `$ ${convertPositiveDecimalTwoDigit(
                                  eachItem?.received_amount,
                                  true
                                )}`
                              : ""}
                          </td>
                          {transactionIDs?.length > 1 && (
                            <td
                              align="center"
                              onClick={() => {
                                setTransactionIDs((previous: Array<string>) => {
                                  return previous.filter(
                                    (each) => each !== eachItem?.id
                                  );
                                });
                              }}
                            >
                              <TrashFill />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Col>

                <Col lg={3} md={3} sm={12} xs={12}>
                  <div className={styles.receivedStyles}>
                    <FormButton
                      type={"button"}
                      onClick={() => setIsShowTransaction(true)}
                      className={styles.transactionBtn}
                      disabled={transactionType === null}
                    >
                      + Transactions
                    </FormButton>
                    <h5 className={styles.matchStyles}>
                      {`Total To Match - $ ${
                        convertPositiveDecimalTwoDigit(amountShow, true) || 0.0
                      }`}
                    </h5>
                  </div>
                </Col>
              </Row>
            </div>
            <div className={styles.matchContainer1}>
              <div className="d-flex mb-4">Matching Records Found</div>
              {paymentsData?.map((each: any) => {
                return (
                  <div className="d-flex mt-2" key={each?.sub_payment_id}>
                    <input
                      // type={transactionIDs?.length > 1 ? "radio" : "checkbox"}
                      type={"radio"}
                      checked={selectedPaymentData?.some(
                        (item: any) => item?.id === each?.sub_payment_id
                      )}
                      onChange={() => {
                        if (true) {
                          setSelectedPaymentData((prev: any[]) => {
                            let clickedRows = [
                              {
                                id: each?.sub_payment_id,
                                amount: each?.amount,
                                payment_type: each?.payment_type,
                              },
                            ];
                            const itemExists = prev.some(
                              (item: any) => item.id === clickedRows[0].id
                            );
                            let newData: any = [];
                            if (itemExists) {
                              // Remove the item if it exists
                              newData = [];
                            } else {
                              // Add the item if it does not exist
                              newData = clickedRows;
                            }
                            return newData;
                          });

                          return;
                        }
                      }}
                    ></input>
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
                              each?.payment_type ===
                                "Overpayment refund to client"
                            ? each?.payment_type
                            : "N/A"
                          : each?.claim_type === "Receivable"
                          ? each?.sub_payment_type === "Retention"
                            ? "Payment received to"
                            : each?.sub_payment_type === "Payment" &&
                              (each?.payment_type ===
                                "Overpayment from client" ||
                                each?.payment_type ===
                                  "Underpayment from client")
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
                              (each?.payment_type ===
                                "Overpayment to supplier" ||
                                each?.payment_type ===
                                  "Underpayment to supplier")
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
              {paymentsData?.length === 0 && (
                <span> No matching payments are available</span>
              )}
              <div className={styles.num}>
                <div className={styles.seperateLine}></div>
                <div className={styles.textSeperate}>OR</div>
                <div className={styles.seperateLine}></div>
              </div>
              <span
                onClick={() => setIsShowAllPayments(!isShowAllPayments)}
                className={styles.searchAllLink}
              >
                Search all payments - Link
              </span>
              {transactionType !== null && isShowAllPayments && (
                <>
                  <Row>
                    <span>Select payments to match</span>
                  </Row>

                  <Row className="mt-3 mb-3">
                    <Col lg={3}>
                      <TextField
                        placeholder="Account, claim id, amount etc"
                        labelText="Search"
                        value={search}
                        onChange={onInputChange}
                        type="text"
                        classNames={styles.inputFieldControl}
                      />
                    </Col>
                    <Col lg={3}>
                      <CustomDatePicker
                        label="From"
                        showIcon={true}
                        toggleCalendarOnIconClick
                        placeholderText="&nbsp;From date"
                        selected={activityLogStartDate}
                        value={activityLogStartDate}
                        onChange={(selectedDate: string) => {
                          let fromDate = new Date(
                            new Date(selectedDate).setHours(0, 0, 0, 0)
                          );
                          if (fromDate > activityLogEndDate) {
                            setSelectedPaymentData([]);
                            setActivityLogStartDate(fromDate);
                            setActivityLogEndDate(new Date(selectedDate));
                          } else {
                            setSelectedPaymentData([]);
                            setActivityLogStartDate(fromDate);
                          }
                        }}
                        disabled={false}
                        format={DD_MM_YYYY}
                        className={styles.DatePickerCustomStyles}
                      />
                    </Col>
                    <Col lg={3}>
                      <CustomDatePicker
                        label="To"
                        showIcon={true}
                        toggleCalendarOnIconClick
                        placeholderText="&nbsp;To date"
                        selected={activityLogEndDate}
                        value={activityLogEndDate}
                        onChange={(selectedDate: string) => {
                          let toDate = new Date(selectedDate);
                          if (toDate < activityLogStartDate) {
                            return;
                          } else {
                            setSelectedPaymentData([]);
                            setActivityLogEndDate(toDate);
                          }
                        }}
                        disabled={false}
                        format={DD_MM_YYYY}
                        className={styles.DatePickerCustomStyles}
                      />
                    </Col>
                    <Col
                      lg={3}
                      style={{
                        display: "flex",
                        padding: "5px 0px",
                        alignItems: "end",
                      }}
                    >
                      <FormButton
                        type={"button"}
                        onClick={() => setIsShowAddOtherPayments(true)}
                        className={styles.transactionBtn2}
                        disabled={transactionType === null}
                      >
                        + Other Payment
                      </FormButton>
                    </Col>
                  </Row>
                  <ReusableDataTable
                    key={selectedPaymentData?.length}
                    columns={columns}
                    data={commonAllPaymentsList}
                    selectableRows
                    pagination
                    paginationServer
                    progressPending={loading}
                    paginationTotalRows={totalRows}
                    onChangeRowsPerPage={handlePerRowsChange}
                    onChangePage={handlePageChange}
                    onSelectedRowsChange={handleChange}
                    selectableRowsSingle={transactionIDs?.length > 1}
                    clearSelectedRows={true}
                    selectableRowSelected={preselectedFunction}
                  />
                </>
              )}
              <h5
                className={styles.partEnd1}
              >{`Total Payments - $ ${totalPayment
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}</h5>
            </div>
          </>
        )}
        {isShowAddTransaction && (
          <AddTransactionForMatch
            setIsShowTransaction={setIsShowTransaction}
            setTransactionIDs={setTransactionIDs}
            bankAccountId={bankAccountId}
            transactionType={transactionType}
          />
        )}
        {isShowAddOtherPayments && (
          <div className={styles.gridMainContainer}>
            <OtherPayment
              fromMatchScreen={true}
              fromMatchScreenBankID={bankAccountId}
              setIsShowAddOtherPayments={setIsShowAddOtherPayments}
              setRefetchLatestPayments={setRefetchLatestPayments}
            />
          </div>
        )}
      </div>
      {displaySubscriptionModal && (
        <AppModal
          show={displaySubscriptionModal}
          cancelfnButtonLabel="Proceed with manual notices"
          firstButtonLabel="Upgrade now"
          modalHeading={"Upgrade Subscription"}
          onConfirm={handleSubscription}
          modalBodyContent={SUBSCRIPTION_UPGRADE}
          onCancel={async () => {
            setDisplaySubscriptionModal(false);
            onHandleMatchTransaction(true);
          }}
        />
      )}
    </ModalFullScreen>
  );
};
export default MatchTransactions;
