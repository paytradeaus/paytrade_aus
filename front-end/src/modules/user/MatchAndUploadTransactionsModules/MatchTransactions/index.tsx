"use client";

import { useTokenDetails } from "@/hooks";
import { useAppSelector } from "@/redux/store";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { Fragment, useEffect, useLayoutEffect, useState } from "react";
import CryptoJS from "crypto-js";
import { useDispatch } from "react-redux";
import {
  FetchPaymentsToMatchTransactions,
  ISubPayment,
  MatchTransactionsAPI,
} from "./matchTransactions.functions";
import _ from "lodash";
import { ListAllSubPayments } from "../../UserDashboard/userDashboardPage.function";
import { SubscriptionPlanTypes } from "../../AddUpdateClaims/AddUpdateClaims.constant";
import { TriggerPaymentNotices } from "../../PaymnetsToDo/paymentToDoList.functions";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
  getSubscriptionType,
} from "@/utils";
import { getCookie, setCookie } from "cookies-next";
import { setMatchTransactions } from "@/redux/slices/subscribeRouteBackDetails";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType, InputType, NA } from "@/shared/constant/general";
import BaseModal from "@/components/BaseModal";
import AddTransactionModal from "./addTransactionsModal";
import { useLoaderContext } from "@/context/useLoader";
import {
  paymentHeaderNames,
  paymentRenderData,
} from "./matchTransactions.constant";
import DynamicTable from "@/components/Table";
import FormikControl from "@/components/FormikControl";
import { format, isValid } from "date-fns";
import BreadCrumbs from "@/components/BreadCrumbs";
import AddOtherPaymentsModal from "./addOtherPaymentsModal";
import { toggleOptions } from "../../PayApps/payApps.constant";
import {
  FetchAllBankAccounts,
  SendMailForNotices,
  SendQbccMailForNotices,
} from "../../AddUpdateBankAccount/AddUpdateBankAccount.function";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  getSubscriptionDetailsByCompanyId,
  updateDelegatePowers,
} from "../../Subscriptions/subscriptions.function";

const AUTO_CLOSE_TIME = 30;

const MatchTransactions = () => {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const { decodeTokenData } = useTokenDetails();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const complianceProjectId = useSearchParams().get("complianceProjectId");

  const [subscriptionPlanName, setSubscriptionPlanName] =
    useState<string>("Basic"); //company or user's current subscription plan
  const [displayDelegationModel, setDisplayDelegationModel] = useState(false);

  //state contains retained data from subscriptions if any
  const retainedDataFromSubscription: any = useAppSelector(
    (state: any) => state?.retainedDataFromSubscription?.matchedTransactions
  );

  const [transactionIDs, setTransactionIDs] = useState<any>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccountsOptions, setBankAccountsOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [multiSelectedData, setMultiSelectedData] = useState<
    { label: string; value: number }[]
  >([]);
  const displayedOptions = isAllSelected
    ? [{ label: "All", value: -1 }]
    : multiSelectedData;

  const [isRetainDataRendered, setIsRetainDataRendered] = useState(false);
  const [amountShow, setAmountShow] = useState<any>(0);
  const [selectedPaymentData, setSelectedPaymentData] = useState<any[]>([]);

  const [totalPayment, setTotalPayment] = useState(0);
  const [transactionType, setTransactionType] = useState(null); //if receivable it's true if billable it's false in transactions
  const [transactionData, setTransactionData] = useState<any>([]);
  const [paymentsData, setPaymentsData] = useState<any>([]);
  const [commonAllPaymentsList, setCommonAllPaymentsList] = useState<any>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [refetchLatestPayments, setRefetchLatestPayments] = useState(false);
  const [page, setPage] = useState(1);
  const [displaySubscriptionModal, setDisplaySubscriptionModal] =
    useState(false);
  const [disabledSaveBtn, setDisabledSaveBtn] = useState(false);
  const [delegateAuthorityAllowed, setDelegateAuthorityAllowed] = useState<
    boolean | null
  >(null);
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(
    new Date(
      new Date(new Date().setDate(new Date().getDate() - 7)).setHours(
        0,
        0,
        0,
        0
      )
    )
  );
  const [search, setSearch] = useState("");
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));
  const [isShowAllPayments, setIsShowAllPayments] = useState(false);
  const [openFullScreen, setOpenFullScreen] = useState(true);
  const [isShowAddTransaction, setIsShowAddTransaction] = useState(false);
  const [isShowAddOtherPayments, setIsShowAddOtherPayments] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectPaymentsInGrid, setSelectPaymentsInGrid] = useState<any[]>([]);

  const [isTriggerFrom, setIsTriggerFrom] = useState("");
  const [delegatePlanName, setDelegatePlanName] = useState<string>(""); // Example state, set accordingly
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [noticeFiles, setNoticeFiles] = useState<any[]>([]);
  const [noticeMailUuids, setNoticeMailUuids] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIME);
  const [qbccNoticeFiles, setQbccNoticeFiles] = useState<any[]>([]);
  const [qbccNoticeUuids, setQbccNoticeUuids] = useState<string[]>([]);

  const handleFormCancelClick = () => {
    dispatch(setMatchTransactions({}));
    router.back(); // Send the user back to the previous page
  };
  //update subscription type once component mount
  useEffect(() => {
    subscriptionConfiguration();
  }, []);

  // 1️⃣ Fetch subscription on component mount or when needed
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const subscriptionResponse = await getSubscriptionDetailsByCompanyId();
        const delegateItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Delegate authority"
          ) || null;

        let isAllowed =
          delegateItem &&
          String(delegateItem.limit_value).toLowerCase() === "true";
        // setDelegateAuthorityAllowed(!!isAllowed);
        // 🔥 FREE PLAN OVERRIDE:
        // If is_free_plan_eligible = true → delegate authority must ALWAYS be allowed
        if (subscriptionResponse?.is_free_plan_eligible) {
          isAllowed = true;
        }

        // 🔹 Set final value
        setDelegateAuthorityAllowed(!!isAllowed);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setDelegateAuthorityAllowed(false); // fail-safe
      } finally {
        setLoader(false);
        setLoaderInfo("");
      }
    };

    fetchSubscription();
  }, []);

  // Reset timer when popup opens
  useEffect(() => {
    if (
      showNoticePopup &&
      (noticeFiles?.length > 0 || qbccNoticeFiles?.length > 0)
    ) {
      setTimeLeft(AUTO_CLOSE_TIME);
    }
  }, [showNoticePopup]);

  // Countdown effect
  useEffect(() => {
    if (!showNoticePopup) return;

    // 👉 Simulate confirm (same as clicking "Send Mail")
    if (timeLeft === 0) {
      const modal = document.getElementById(
        "Generated Notices"
      ) as HTMLDialogElement;

      if (modal) {
        const confirmBtn = modal.querySelector(
          "footer button:last-child"
        ) as HTMLButtonElement; // last button = confirm
        confirmBtn?.click();
      }
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, showNoticePopup]);

  const companyId: any =
    typeof window !== "undefined"
      ? Number(localStorage.getItem("companyId"))
      : null;

  useEffect(() => {
    // Check if decodeTokenData and companyId are available
    if (decodeTokenData && companyId) {
      // Filter to get the relevant company-specific role based on companyId
      const newData = decodeTokenData?.companySpecificRoles?.filter(
        (x: { companyId: number }) => String(x.companyId) === String(companyId)
      );

      // Check if the company role exists and contains subscription data
      const subscription = newData?.length > 0 ? newData[0].subscription : null;

      // Set the plan name from the subscription or default to "No plan"
      const planName = subscription?.plan_name;

      setDelegatePlanName(planName);
    }
  }, [companyId]);

  useLayoutEffect(() => {
    if (params?.id && Array.isArray(params?.id) && params?.id[0]) {
      let joinedString = params?.id?.join("/");
      // Decode the URL-encoded string
      const decodedString = decodeURIComponent(joinedString);

      // Decrypt the decoded string
      const decryptedString =
        CryptoJS.AES.decrypt(decodedString, "transactions-IDS")?.toString(
          CryptoJS.enc.Utf8
        ) || "";

      // Attempt to parse the decrypted string as JSON
      try {
        const decryptedData = JSON.parse(decryptedString);
        setTransactionIDs(decryptedData?.TransactionIDS || []);
        setBankAccountId(decryptedData?.bankAccountId || "");
        setIsTriggerFrom(decryptedData?.triggerFrom || "");
      } catch (error) {
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
    search,
    activityLogStartDate,
    activityLogEndDate,
    transactionType,
  ]);

  useEffect(() => {
    if (refetchLatestPayments) {
      getPaymentsListData(page, perPage);
    }
  }, [refetchLatestPayments]);

  useEffect(() => {
    if (delegatePlanName !== "" && delegatePlanName !== "Basic") {
      getFetchBankAccountsLists();
    }
  }, [delegatePlanName, bankAccountId]);

  async function getFetchBankAccountsLists() {
    const postData = {
      account_type: "Retention Trust Account, Project Trust Account",
      company_id: getCompanyIdFromStorage(),
      items_per_page: null,
      page: null,
      search: null,
      status: null,
      sorting_field: "",
      sorting_order: "",
      delegate_powers: "No",
    };
    const response = await FetchAllBankAccounts(postData);

    if (response?.extendedBankAccounts?.length > 0) {
      const bankAccountIds: string[] = Array.isArray(bankAccountId)
        ? bankAccountId
        : [];

      // Remove null/undefined values
      const validBankAccountIds = bankAccountIds.filter((id): id is string =>
        Boolean(id)
      );

      // Convert IDs to numbers and ensure uniqueness
      const uniqueBankAccountIds = Array.from(
        new Set(validBankAccountIds.map(Number))
      );

      // Filter response to match valid bank accounts
      const matchedAccounts = response.extendedBankAccounts.filter(
        (account: { bank_account_id: number }) =>
          uniqueBankAccountIds.includes(account.bank_account_id)
      );

      // Prepare options for dropdown
      const options =
        matchedAccounts.length > 0
          ? response.extendedBankAccounts.map(
              (account: {
                account_name: string;
                bank_account_id: string | number;
              }) => ({
                label: account.account_name,
                value: account.bank_account_id,
              })
            )
          : [];

      // Add "Select All" if multiple options exist
      const updatedOptions =
        options.length > 1
          ? [{ label: "Select All", value: -1 }, ...options]
          : options;

      setBankAccountsOptions(updatedOptions);
    } else {
      setBankAccountsOptions([]); // Set empty if no match
    }
  }

  const getPaymentsToMatchTransactions = async () => {
    setSelectedPaymentData([]);
    setTransactionType(null);
    let payload = {
      transactionIds: transactionIDs,
    };
    let paymentTransactionsRes = await FetchPaymentsToMatchTransactions(
      payload
    );
    const totalAmount = paymentTransactionsRes?.transactions?.reduce(
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
    setIsLoading(true);
    let payload = {
      payload: {
        keyword: search,
        page_number: page,
        page_size: null,
        start_date: activityLogStartDate,
        date_filter: "Custom",
        end_date: activityLogEndDate,
        company_id: selectedCompanyId,
        status: "Unmatched",
        bank_account_id: bankAccountId || null,
        claim_type: transactionType ? "Receivable" : "Billable",
      },
    };
    const adminUserList = await ListAllSubPayments(payload);
    const formatPayments = adminUserList?.payments.map((eachData: any) => {
      return {
        ...eachData,
        modified_amount: eachData.amount
          ? `$ ${convertPositiveDecimalTwoDigit(eachData?.amount, true)}`
          : "",
        claim_amount: eachData?.claim_amount
          ? `$ ${
              convertPositiveDecimalTwoDigit(eachData?.claim_amount, true) ||
              0.0
            }`
          : "",
        payment_date: eachData?.payment_date
          ? formatDate(eachData?.payment_date)
          : NA,
      };
    });

    // const filterMatchedPayments = formatPayments.filter(
    //   (eachItem1: any) =>
    //     !paymentsData.some(
    //       (eachItem2: any) =>
    //         eachItem1?.sub_payment_id == eachItem2?.sub_payment_id
    //     )
    // );
    setCommonAllPaymentsList(formatPayments || []);
    setTotalRows(adminUserList?.total_count || 0);
    setRefetchLatestPayments(false);
    setIsLoading(false);
    setSelectPaymentsInGrid([]);
    setSelectedPaymentData([]);
  };

  async function onHandleMatchTransaction(skipSubscriptionUpgrade?: boolean) {
    try {
      setLoader(true);
      if (selectedPaymentData?.length > 0) {
        // condition to show upgrade subscription modal
        // ✅ Replace BASIC plan check with delegate authority flag
        if (!delegateAuthorityAllowed && !skipSubscriptionUpgrade) {
          setDisplaySubscriptionModal(true); // show subscription modal if delegate not allowed
          return;
        } else if (
          delegateAuthorityAllowed &&
          bankAccountsOptions?.length > 0
        ) {
          setDisplayDelegationModel(true); // show delegation popup if allowed
          return;
        }
        let payloadData = {
          paymentIds: selectedPaymentData?.map((each: any) => each?.id),
          transactionIds: transactionIDs,
        };

        let response = await MatchTransactionsAPI(payloadData);
        if (response?.status) {
          // if (response?.payment_Ids.length > 0)
          //   setLoaderInfo("Generating notice...");
          // await TriggerPaymentNotices({
          //   payment_ids: response?.payment_Ids,
          // });
          if (response?.payment_Ids?.length > 0) {
            setLoaderInfo("Generating notice...");
            const noticeResponse = await TriggerPaymentNotices({
              payment_ids: response?.payment_Ids,
            });
            setLoaderInfo("");

            if (noticeResponse) {
              const { notice_previews = [], qbcc_notice_previews = [] } =
                noticeResponse;

              // Set standard notices
              setNoticeFiles(notice_previews.map((n: any) => n.file_details));
              setNoticeMailUuids(notice_previews.map((n: any) => n.mail_uuid));

              // Set QBCC notices
              setQbccNoticeFiles(
                qbcc_notice_previews.map((n: any) => n.qbcc_file_details)
              );
              setQbccNoticeUuids(
                qbcc_notice_previews.map((n: any) => n.notice_uuid)
              );

              // Show popup if any notices exist
              if (
                notice_previews.length > 0 ||
                qbcc_notice_previews.length > 0
              ) {
                setShowNoticePopup(true);
                return; // stop further routing, popup handles it
              }
            }
          }

          // 🚨 No previews → continue existing redirect
          dispatch(
            setScreenDetails({
              fromScreen: "addInterest",
              toScreen: "bankOverView",
              mainActiveTab: "Transactions",
              selectTab: "To Review",
            })
          );
          resetRetainedMatchedData();
          setLoaderInfo("");
          if (complianceProjectId) {
            router.push(
              `${AppRoutes.USER_COMPLIANCE_OVERVIEW}?project=${complianceProjectId}`
            );
          } else {
            router.back();
          }
        } else {
          setDisabledSaveBtn(false);
        }
      } else {
        setDisabledSaveBtn(false);
      }
    } catch {
    } finally {
      setLoader(false);
    }
  }

  const handleUpdateDelegatePowers = async () => {
    if (!multiSelectedData.length) {
      // alert("Please select at least one bank account.");
      return;
    }

    const selectedBankAccountIds = multiSelectedData.map(
      (account) => account.value
    );
    const payload = {
      account_ids: selectedBankAccountIds,
      company_id: getCompanyIdFromStorage(),
    };
    try {
      setLoader(true); // Show loader while calling API
      const response = await updateDelegatePowers(payload);
      if (response) {
        setDisplayDelegationModel(false); // Close modal on success
        onHandleMatchTransaction(true);
        return true;
      } else {
        console.warn("Failed to update delegate powers. Please try again.");
      }
    } catch (error) {
      console.warn("Something went wrong. Please try again.");
    } finally {
      setLoader(false); // Hide loader
    }
  };

  const handleSelectChange = (
    selectedOptions: { label: string; value: number }[] | null
  ) => {
    if (!selectedOptions) {
      setMultiSelectedData([]);
      setIsAllSelected(false);
      return;
    }

    const isSelectAllSelected = selectedOptions.some((opt) => opt.value === -1);

    if (isSelectAllSelected) {
      setMultiSelectedData(
        bankAccountsOptions.filter((opt) => opt.value !== -1)
      );
      setIsAllSelected(true);
    } else {
      setMultiSelectedData(selectedOptions);
      setIsAllSelected(false);
    }
  };

  const handleSelectedPayments = (state: any) => {
    setSelectPaymentsInGrid(state);
    if (transactionIDs?.length > 1) {
      setSelectedPaymentData(
        state.map((row: any) => ({
          id: row.sub_payment_id,
          amount: row.amount,
          payment_type: row?.payment_type,
        })) || []
      );
      return;
    }
    setSelectedPaymentData((prev: any[]) => {
      let selectedRows = state.map((row: any) => ({
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
    // sessionStorage.setItem(commonCookies.NAVIGATED_FROM, routePath);
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
    router.push(AppRoutes.SUBSCRIPTION_PRICING);
    // Navigate the user to the subscription upgrade page
    // router.push(AppRoutes.USER_SUBSCRIPTION_UPGRADE);
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

  function handleTransactionsRadioBtnChange(objData: any) {
    setSelectPaymentsInGrid((prev: any) => [...prev, objData]);
    setCommonAllPaymentsList(
      commonAllPaymentsList.map((x: any) => {
        return {
          ...x,
          checked: objData?.sub_payment_id == x?.sub_payment_id,
        };
      })
    );
    setSelectedPaymentData((prev: any[]) => {
      let clickedRows = [
        {
          id: objData?.sub_payment_id,
          amount: objData?.amount,
          payment_type: objData?.payment_type,
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
  }

  function handleViewFileFromPath(filePath: string, fileName: string) {
    const pdfWindow = window.open("");
    pdfWindow?.document.write(
      `<iframe width='100%' height='100%' src='${filePath}' title='${fileName}'></iframe>`
    );
  }

  // Send Mail
  const handleSendMail = async () => {
    const hasNoticeMails = noticeMailUuids?.length > 0;
    const hasQbccNotices = qbccNoticeUuids?.length > 0;

    if (!hasNoticeMails && !hasQbccNotices) {
      return false; // nothing to send
    }

    setLoader(true);
    setLoaderInfo("Sending mail...");

    let success = true;

    // 1️⃣ Send regular notices if present
    if (hasNoticeMails) {
      const res = await SendMailForNotices(noticeMailUuids);
      if (!res) success = false;
    }

    // 2️⃣ Send QBCC notices if present
    if (hasQbccNotices) {
      const res = await SendQbccMailForNotices(qbccNoticeUuids);
      if (!res) success = false;
    }

    setLoader(false);

    if (success) {
      cleanupNoticePopup();
      resetRetainedMatchedData();

      // 🔹 After sending mail → continue with existing redirect
      dispatch(
        setScreenDetails({
          fromScreen: "addInterest",
          toScreen: "bankOverView",
          mainActiveTab: "Transactions",
          selectTab: "To Review",
        })
      );

      if (complianceProjectId) {
        router.push(
          `${AppRoutes.USER_COMPLIANCE_OVERVIEW}?project=${complianceProjectId}`
        );
      } else {
        router.back();
      }

      return true;
    }

    return false;
  };

  // Cancel
  const handleCancelSendMail = async () => {
    const hasNoticeMails = noticeMailUuids?.length > 0;
    const hasQbccNotices = qbccNoticeUuids?.length > 0;

    if (!hasNoticeMails && !hasQbccNotices) {
      return false; // nothing to send
    }

    setLoader(true);
    setLoaderInfo("Sending mail...");

    let success = true;

    // 1️⃣ Send regular notices if present
    if (hasNoticeMails) {
      const res = await SendMailForNotices(noticeMailUuids);
      if (!res) success = false;
    }

    // 2️⃣ Send QBCC notices if present
    if (hasQbccNotices) {
      const res = await SendQbccMailForNotices(qbccNoticeUuids);
      if (!res) success = false;
    }

    setLoader(false);

    if (success) {
      cleanupNoticePopup();
      resetRetainedMatchedData();

      // 🔹 After sending mail → continue with existing redirect
      dispatch(
        setScreenDetails({
          fromScreen: "addInterest",
          toScreen: "bankOverView",
          mainActiveTab: "Transactions",
          selectTab: "To Review",
        })
      );

      if (complianceProjectId) {
        router.push(
          `${AppRoutes.USER_COMPLIANCE_OVERVIEW}?project=${complianceProjectId}`
        );
      } else {
        router.back();
      }

      return true;
    }

    return false;
  };

  // Common cleanup
  const cleanupNoticePopup = () => {
    setShowNoticePopup(false);
    setLoader(false);
    setLoaderInfo("");
    setNoticeFiles([]);
    setNoticeMailUuids([]);
    setQbccNoticeFiles([]);
    setQbccNoticeUuids([]);
  };

  return (
    <main>
      <div className="pt_fullpage">
        <div>
          <div>
            <div className="pt_crumbclose">
              <div className="pt_breadcrumbs">
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
                  activeRoute={"Match transactions"}
                />
              </div>
              <div className="pt_topfilters">
                <div className="pt_pageactions">
                  <a onClick={() => "history.back()"}>
                    <button
                      className="contrast smallbutton"
                      onClick={() => {
                        dispatch(setMatchTransactions({}));
                        router.back();
                      }}
                    >
                      <i className="fa-light fa-xmark-large"></i>Close
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="grid pt_data companyFlex">
            <div className="pt_data_clear">
              <h3>Match transactions</h3>
            </div>
            <div className="right">
              <h5>Total to match</h5>
              <h4>{`$ ${
                convertPositiveDecimalTwoDigit(amountShow, true) || 0.0
              }`}</h4>
            </div>
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
                    {transactionIDs?.length > 1 && <th> </th>}
                  </tr>
                </thead>
                <tbody>
                  {transactionData?.map((eachItem: any, index: number) => (
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
                      {transactionIDs?.length > 1 && (
                        <td align="center">
                          <CustomButton
                            buttonName={""}
                            buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                            iconClassName={"fa-light fa-trash"}
                            actionType="button"
                            onClick={() => {
                              setTransactionIDs((previous: Array<string>) => {
                                return previous.filter(
                                  (each) => each !== eachItem?.id
                                );
                              });
                            }}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="right">
            <a data-target="addtransaction">
              <button
                className="secondary smallbutton"
                onClick={() => setIsShowAddTransaction(true)}
              >
                <i className="fa-light fa-hexagon-plus"></i>Add transaction
              </button>
            </a>
          </div>

          {/*transkdfdmfk */}

          <div className="pt_infocol pt_records">
            <h4>Matching records found</h4>

            <fieldset>
              {paymentsData?.length > 0 &&
                paymentsData?.map((each: any, index: number) => {
                  return (
                    <Fragment key={index}>
                      <label>
                        <input
                          type={"radio"}
                          checked={selectedPaymentData?.some(
                            (item: any) => item?.id === each?.sub_payment_id
                          )}
                          onChange={() =>
                            handleTransactionsRadioBtnChange(each)
                          }
                        />
                        <b>
                          <span
                            className="rivertext text_underline"
                            onClick={() => navigateToViewMode(each)}
                          >
                            {`Payment ID  ${each?.payment_id}  `}
                          </span>
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
                    </Fragment>
                  );
                })}
              {paymentsData?.length === 0 && (
                <span> No matching payments are available</span>
              )}
            </fieldset>
          </div>

          <div className="pt_expandtable">
            <details>
              <summary>Search all payments</summary>
              <div className="grid pt_infocol">
                <div>
                  <h5>Payment terms</h5>
                  <FormikControl
                    placeholder={"Search"}
                    control={InputType.SEARCH}
                    value={search}
                    onChange={(value: any) => {
                      if (page !== 1) setPage(1);
                      setSearch(value);
                    }}
                  />
                </div>
                <div>
                  <h5>
                    Sent date<span className="required">*</span>
                  </h5>

                  <FormikControl
                    // label="From date"
                    name="From date"
                    control={InputType.DATE_PICKER}
                    type="date"
                    // value={
                    //   activityLogStartDate
                    //     ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    //     : ""
                    // }
                    value={
                      activityLogStartDate &&
                      isValid(new Date(activityLogStartDate))
                        ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(selectedDate: string) => {
                      if (!selectedDate) {
                        setActivityLogStartDate(null);
                        return;
                      }
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
                    minDate="" // Set any minimum date if needed
                    // maxDate={format(new Date(activityLogEndDate), "yyyy-MM-dd")}
                    disabled={false}
                  />
                </div>
                <div>
                  <h5>
                    Due date<span className="required">*</span>
                  </h5>
                  <FormikControl
                    // label="To date"
                    name="To date"
                    type="date"
                    control={InputType.DATE_PICKER}
                    // value={
                    //   activityLogEndDate
                    //     ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                    //     : ""
                    // }
                    value={
                      activityLogEndDate &&
                      isValid(new Date(activityLogEndDate))
                        ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(selectedDate: string) => {
                      if (!selectedDate) {
                        setActivityLogEndDate(null);
                        return;
                      }
                      let toDate = new Date(selectedDate);
                      if (toDate < activityLogStartDate) {
                        return;
                      } else {
                        setSelectedPaymentData([]);
                        setActivityLogEndDate(toDate);
                      }
                    }}
                    // minDate={
                    //   activityLogStartDate
                    //     ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    //     : ""
                    // }
                    maxDate=""
                    disabled={false}
                  />
                </div>
              </div>

              <button
                className="contrast smallbutton"
                style={{ marginBottom: "1.5rem" }}
                onClick={() => setIsShowAddOtherPayments(true)}
              >
                <i className="fa-light fa-hexagon-plus"></i>Add another payment
              </button>

              {/*added data for payments */}

              <div className="grid">
                <div className="pt_table pt_formtable">
                  <DynamicTable
                    headers={paymentHeaderNames}
                    gridData={
                      commonAllPaymentsList?.length > 0
                        ? commonAllPaymentsList
                        : []
                    }
                    gridActions={[]}
                    displayAllStaticActions
                    showLoader={isLoading}
                    loaderColSpan={10}
                    renderRowList={paymentRenderData}
                    // currentPage={currentPage}
                    // entriesPerPage={entriesPerPage}
                    // onEntriesPerPageChange={setEntriesPerPage}
                    // onPageChange={setCurrentPage}s
                    // totalEntries={totalRows}
                    enableCheckbox
                    selectableRowsSingle={transactionIDs?.length > 1}
                    onGridCheckboxChange={(selectedData: any) => {
                      handleSelectedPayments(selectedData);
                    }}
                    selectedCheckboxRows={selectPaymentsInGrid}
                    checkBoxId={"sub_payment_id"}
                  />
                </div>
              </div>

              <br />
              <br />
            </details>
          </div>

          <div className="grid pt_data companyFlex">
            <div className="pt_data_clear"></div>
            <div className="right">
              <h5>Total payments</h5>
              <h4>{` $ ${totalPayment
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}</h4>
            </div>
          </div>
        </div>

        <div>
          <div className="pt_fullpageactions">
            <div>
              <CustomButton
                buttonName={"Cancel"}
                buttonType={buttonType.CONTRAST}
                actionType="submit"
                onClick={handleFormCancelClick}
              />
            </div>
            {/* <div>
              <a>
                <button
                  className="contrast"
                  onClick={() => {
                    dispatch(setMatchTransactions({}));
                    router.back();
                  }}
                >
                  <i className="fa-light fa-xmark-large"></i>Cancel
                </button>
              </a>
            </div> */}
            <div>
              <a>
                <button
                  disabled={selectedPaymentData?.length < 1}
                  onClick={() => onHandleMatchTransaction()}
                >
                  <i className="fa-light fa-circle-check"></i>Match
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
      {isShowAddTransaction && (
        <AddTransactionModal
          modalId={"AddTransaction"}
          displayModal={isShowAddTransaction}
          onHeaderIconClose={() => setIsShowAddTransaction(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setIsShowAddTransaction(false)}
          onConfirm={() => {
            setIsShowAddTransaction(false);
            return true;
          }}
          bankAccountId={Number(bankAccountId) || 0}
          selectedCompanyId={selectedCompanyId}
          transactionType={transactionType}
          transactionIDs={transactionIDs}
          setTransactionIDs={setTransactionIDs}
        />
      )}
      {isShowAddOtherPayments && (
        <AddOtherPaymentsModal
          modalId={"Add other payments"}
          displayModal={isShowAddOtherPayments}
          onHeaderIconClose={() => setIsShowAddOtherPayments(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setIsShowAddOtherPayments(false)}
          onConfirm={() => {
            setIsShowAddOtherPayments(false);
            setRefetchLatestPayments(true);
            return true;
          }}
          bankAccountId={Number(bankAccountId) || 0}
        />
      )}
      {displaySubscriptionModal && (
        <BaseModal
          title="Upgrade Subscription"
          modalId={"upgrade Subscription"}
          displayModal={displaySubscriptionModal}
          onHeaderIconClose={() => setDisplaySubscriptionModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => {
            setDisplaySubscriptionModal(false);
            onHandleMatchTransaction(true);
          }}
          onConfirm={() => {
            handleSubscription();
            return true;
          }}
          firstButtonName="Proceed with manual notices"
          secondButtonName="Upgrade Now"
        >
          <h4 className="text_center">
            Please complete and send the required notices in the notices list or
            if you would like Pay Trade to auto submit for you, Upgrade now.
          </h4>
        </BaseModal>
      )}
      {displayDelegationModel && (
        <BaseModal
          displayModal={displayDelegationModel}
          onClose={(e: any) => {
            if (e === true) {
              setDisplayDelegationModel(false);
              onHandleMatchTransaction(true);
            }
          }}
          // halfScreenPopup={true}
          secondButtonName="Save"
          firstButtonName="Close"
          onConfirm={() => {
            handleUpdateDelegatePowers();
            // return true;
          }}
        >
          <p className="text_center">
            You need to authorize Pay Trade to act on your behalf to automate
            notices (also known as delegated authority). <br />
            For project trusts, this needs to be done on the QBCC portal. <br />
            Once done, you can confirm here, and we can issue notices on your
            behalf. <br />
            Do you want to enable it now?
          </p>
          <br />
          <div>
            <SearchableSelect
              placeholder={
                bankAccountsOptions.length > 1
                  ? "Select bank accounts"
                  : "Select a bank account"
              }
              label={
                bankAccountsOptions.length > 1
                  ? "Select bank accounts"
                  : "Select a bank account"
              }
              name="BankAccount"
              required
              isMulti={true}
              isInPopup={true}
              options={bankAccountsOptions}
              multiSelectedData={displayedOptions}
              onChange={handleSelectChange}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <br />
          <p className="text_center">
            <span className="pt_yellow">Note:</span> On close your notices will
            not be sent automatically. Visit the notices pages to send manually.
          </p>
        </BaseModal>
      )}
      {showNoticePopup && (
        <BaseModal
          modalId="Generated Notices"
          displayModal={showNoticePopup}
          title="Preview generated notices"
          hideHeaderCloseIcon={true}
          onClose={(e: any) => {
            // 👈 closing modal via "X" or backdrop = just close, no API
            if (e === true) {
              setShowNoticePopup(false);
              return handleCancelSendMail();
            }
          }}
          onConfirm={() => {
            setShowNoticePopup(false);
            return handleSendMail();
          }}
          // onCancel={handleCancelSendMail}
          firstButtonName="Close"
          secondButtonName="Send Mail"
        >
          <p className="">
            <span className="pt_yellow">Note:</span> We have generated the
            documents below, and they are available to view. The system will
            send an email with these documents attached in{" "}
            <b className="pt_green">{timeLeft}</b> seconds.
            {qbccNoticeFiles?.length > 0 && (
              <>
                <br />
                <span className="pt_red">
                  QBCC documents will be verified by Paytrade admin and
                  submitted on your behalf.
                </span>
              </>
            )}
          </p>
          <br></br>
          {noticeFiles.map((file: any, idx: number) => (
            <div key={idx} className="pt_itemwithremove">
              <span>{file.file_name}</span>
              <div>
                <CustomButton
                  buttonName="View"
                  buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                  iconClassName="fa-light fa-eye"
                  actionType="button"
                  onClick={
                    () => handleViewFileFromPath(file.file, file.file_name) // base64 PDF
                  }
                />
              </div>
            </div>
          ))}
          {qbccNoticeFiles?.length > 0 && (
            <>
              {qbccNoticeFiles.map((file: any, idx: number) => (
                <div key={idx} className="pt_itemwithremove">
                  <span>{file?.file_name}</span>
                  <div>
                    <CustomButton
                      buttonName="View"
                      buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                      iconClassName="fa-light fa-eye"
                      actionType="button"
                      onClick={() =>
                        handleViewFileFromPath(
                          file.file_path || file.file, // prefer path, fallback to base64
                          file.file_name
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </BaseModal>
      )}
    </main>
  );
};

export default MatchTransactions;
