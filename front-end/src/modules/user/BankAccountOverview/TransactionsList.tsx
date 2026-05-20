import GridExportActions from "@/components/GridExportActions";
import TabSwitch from "@/components/TabSwitch";
import { buttonType, InputType, NA, TabType } from "@/shared/constant/general";
import React, { Fragment, useCallback, useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import {
  TransactionExcelColumnNames,
  transactionPdfDataRow,
  transactionPdfHeaders,
  transactionsHeader,
  transactionsRenderData,
  transactionsTabOptions,
} from "./BankAccountOverview.constants";
import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import CustomButton from "@/components/CustomButton/CustomButton";
import FormikControl from "@/components/FormikControl";
import { filterByDuration } from "@/shared/constant/data";
import { format, isValid } from "date-fns";
import { ITransactions } from "../BankAccounts/bankTrustAccount.types";
import {
  connectWebSocket,
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import { useBankAccountOverviewContext } from "./BankAccountOverviewContext";
import {
  DeleteTransactions,
  FetchAllTransactions,
  FetchBatchSuggestedMatches,
  BatchMatchExactTransactions,
  BatchMatchSplitTransactions,
  QuickAdjustAndMatch,
  GetSmartMatchPreference,
  SetSmartMatchPreference,
} from "./BankAccountsOverview.function";
import DynamicTable from "@/components/Table";
import BaseModal from "@/components/BaseModal";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast, showWarningToast } from "@/components/Toaster";
import { ExcludeTransactions } from "../BookKeeping/bookKeeping.functions";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";

export default function Transactions() {
  const { getBankAccountId, setRefreshOverview, complianceProjectId }: any =
    useBankAccountOverviewContext();
  const router = useRouter();
  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );

  const queryParamsStatus = useSearchParams().get("status");

  const [transactionTab, setTransactionTab] = useState(
    screenDetails?.selectTab
      ? transactionsTabOptions.some(
          (option) => option.value === screenDetails?.selectTab
        )
        ? screenDetails?.selectTab
        : "To Review"
      : "To Review"
  );
  const [currentPage, setCurrentPage] = useState(1);

  const [isCustomDate, setIsCustomDate] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchValue, setSearchValue] = useState("");
  const [selectedDate, setSelectedDate] = useState<any>("All");

  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(0, 0, 0, 0)));
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));
  const [transactionData, setTransactionData] = useState<ITransactions[]>([]);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [loader, setLoader] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [emptySearchField, setEmptySearchField] = useState(false);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<any>([]);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [openExcludeCheck, setOpenExcludeCheck] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [smartMatchEnabled, setSmartMatchEnabled] = useState(false);
  const [suggestedMatches, setSuggestedMatches] = useState<any>(null);
  const [matchesMap, setMatchesMap] = useState<Record<string, any>>({});
  const [splitsMap, setSplitsMap] = useState<
    Record<string, { group: any; index: number; total: number }>
  >({});
  const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);
  const [smartMatchLoading, setSmartMatchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  useEffect(() => {
    if (queryParamsStatus == "Matched") {
      setTransactionTab(queryParamsStatus);
    }
  }, []);

  useEffect(() => {
    GetSmartMatchPreference().then((val) => setSmartMatchEnabled(val));
  }, []);

  // Define actions dynamically
  const gridActions: any = [
    ...(transactionTab === "Matched"
      ? [
          {
            label: "Unmatch",
            icon: "fa-light fa-arrows-from-line",

            onClick: (row: any) => {
              setActionData({ ...row, option: "Unmatched" });
              setDisplayConfirmationModal(true);
              setPopupMessage({
                headerMsg: "",
                subHeaderMsg:
                  "Are you sure you wish to unmatch this transaction?",
              });
            },
          },
        ]
      : transactionTab === "To Review"
      ? [
          ...(selectedRows.length > 1
            ? []
            : [
                {
                  label: "Match",
                  icon: "fa-light fa-arrows-to-line",
                  onClick: (row: any) => {
                    // setActionData(row);
                    // setDisplayConfirmationModal(true);

                    const encryptedData = CryptoJS.AES.encrypt(
                      JSON.stringify({
                        TransactionIDS: [row?.id],
                        bankAccountId: getBankAccountId(),
                        triggerFrom: "bankOverView",
                      }),
                      "transactions-IDS"
                    ).toString();

                    let dynamicRoute = `${AppRoutes.USER_MATCH_TRANSACTIONS}/${encryptedData}`;
                    if (complianceProjectId) {
                      dynamicRoute = `${AppRoutes.USER_MATCH_TRANSACTIONS}/${encryptedData}?complianceProjectId=${complianceProjectId}`;
                    }
                    router.push(dynamicRoute);
                  },
                },
              ]),

          {
            label: "Exclude",

            icon: "fa-light fa-arrows-from-dotted-line",

            onClick: (row: ITransactions) => {
              if (selectedRows?.length === 2) {
                let multiOfSingleCheck = false;
                multiOfSingleCheck = selectedRows.some(
                  (each: ITransactions) => each?.id === row?.id
                );
                if (multiOfSingleCheck) {
                  setActionData({ ...row, option: "Excluded" });
                  setDisplayConfirmationModal(!displayConfirmationModal);
                  setPopupMessage((prev) => ({
                    headerMsg: "",
                    subHeaderMsg:
                      "Are you sure you wish to exclude this transactions?",
                  }));
                } else {
                  showWarningToast("Please click selected transactions only.");
                  return;
                }
              } else {
                setOpenExcludeCheck(true);
              }
            },
          },
          {
            label: "Delete",
            style: "contrast",
            icon: "fa-light fa-trash",

            onClick: (row: any) => {
              setPopupMessage((prev) => ({
                headerMsg: "transactions delete modal",
                subHeaderMsg:
                  "Are you sure you wish to delete this transaction?",
              }));
              setActionData({ ...row, option: "Delete" });
              setDisplayConfirmationModal(true);
            },
          },
        ]
      : transactionTab === "All"
      ? [
          {
            label: "Unmatch",
            icon: "fa-light fa-arrows-from-line",
            comparisonRowKey: "status",
            conditionalComparisonData: "Matched",
            onClick: (row: any) => {
              setActionData({ ...row, option: "Unmatched" });
              setDisplayConfirmationModal(true);
              setPopupMessage({
                headerMsg: "",
                subHeaderMsg:
                  "Are you sure you wish to unmatch this transaction?",
              });
            },
          },
          {
            label: "Match",
            icon: "fa-light fa-arrows-to-line",
            comparisonRowKey: "status",
            conditionalComparisonData: "For Review",
            onClick: (row: any) => {
              const encryptedData = CryptoJS.AES.encrypt(
                JSON.stringify({
                  TransactionIDS: [row?.id],
                  bankAccountId: getBankAccountId(),
                  triggerFrom: "bankOverView",
                }),
                "transactions-IDS"
              ).toString();
              router.push(
                `${AppRoutes.USER_MATCH_TRANSACTIONS}/${encryptedData}`
              );
            },
          },
          {
            label: "Match",
            icon: "fa-light fa-arrows-to-line",
            comparisonRowKey: "status",
            conditionalComparisonData: "Unmatched",
            onClick: (row: any) => {
              const encryptedData = CryptoJS.AES.encrypt(
                JSON.stringify({
                  TransactionIDS: [row?.id],
                  bankAccountId: getBankAccountId(),
                  triggerFrom: "bankOverView",
                }),
                "transactions-IDS"
              ).toString();

              let dynamicRoute = `${AppRoutes.USER_MATCH_TRANSACTIONS}/${encryptedData}`;
              if (complianceProjectId) {
                dynamicRoute = `${AppRoutes.USER_MATCH_TRANSACTIONS}/${encryptedData}?complianceProjectId=${complianceProjectId}`;
              }
              router.push(dynamicRoute);
            },
          },
          {
            label: "Delete",
            style: "contrast",
            icon: "fa-light fa-trash",
            comparisonRowKey: "status",
            conditionalComparisonData: "For Review",

            onClick: (row: any) => {
              setPopupMessage((prev) => ({
                headerMsg: "transactions delete modal",
                subHeaderMsg:
                  "Are you sure you wish to delete this transaction?",
              }));
              setActionData({ ...row, option: "Delete" });
              setDisplayConfirmationModal(true);
            },
          },
          {
            label: "Delete",
            style: "contrast",
            icon: "fa-light fa-trash",
            comparisonRowKey: "status",
            conditionalComparisonData: "Unmatched",

            onClick: (row: any) => {
              setPopupMessage((prev) => ({
                headerMsg: "transactions delete modal",
                subHeaderMsg:
                  "Are you sure you wish to delete this transaction?",
              }));
              setActionData({ ...row, option: "Delete" });
              setDisplayConfirmationModal(true);
            },
          },
        ]
      : []),
  ];

  useEffect(() => {
    getListAllAdminArticles();
  }, [
    transactionTab,
    searchValue,
    selectedDate,
    activityLogStartDate,
    activityLogEndDate,
    sortValues,
  ]);

  function handleSearch(searchedValue: any) {
    if (currentPage != 1) {
      setCurrentPage(1);
    }
    if (entriesPerPage != 10) {
      setEntriesPerPage(10);
    }
    setSearchValue(searchedValue);
  }

  function handleActivityChange(selectedValue: any) {
    if (selectedDate === "Custom") {
      setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
      setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
    }
    setSelectedDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
  }

  function handlePageChange(value: any) {
    setCurrentPage(value);
    getListAllAdminArticles(value, entriesPerPage);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    getListAllAdminArticles(1, value);
  }

  async function getListAllAdminArticles(
    page: number = 1,
    rowsPerPage: number = 10
  ) {
    try {
      setLoader(true);
      if (emptySearchField) {
        setEmptySearchField(false);
      }
      const transactionsResponse = await FetchAllTransactions({
        page: page,
        items_per_page: rowsPerPage,
        search: searchValue ?? null,
        status:
          transactionTab === "All"
            ? null
            : transactionTab === "To Review"
            ? "ToMatch"
            : transactionTab || null,
        bank_account_id: getBankAccountId(),
        date_filter:
          (!selectedDate || selectedDate) === "All" ? null : selectedDate,
        date_from: isCustomDate ? activityLogStartDate : null,
        date_to: isCustomDate ? activityLogEndDate : null,
        company_id: getCompanyIdFromStorage(),
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      });
      const formattedData = transactionsResponse?.transactions_list?.map(
        (txn: ITransactions) => {
          return {
            ...txn,
            status:
              txn?.status === "To Review" ? "For Review" : txn?.status || "",
          };
        }
      );
      setTransactionData(formattedData || []);

      let printDataObjCreation = transactionsResponse?.transactions_list?.map(
        (user: ITransactions) => {
          return {
            unique_txn_id: user.unique_txn_id,
            description: user.description,
            status:
              user?.status === "To Review" ? "For Review" : user?.status || "",
            matched_to: user.matched_to,
            spent_amount: user?.spent_amount
              ? `$ ${convertPositiveDecimalTwoDigit(user?.spent_amount)}`
              : "",
            received_amount: user?.received_amount
              ? `$ ${convertPositiveDecimalTwoDigit(user?.received_amount)}`
              : "",
            txn_date: user?.txn_date ? formatDate(user?.txn_date) : NA,
          };
        }
      );
      setTotalRows(transactionsResponse?.total_count || 0);
      setPrintDocumentData(printDataObjCreation);
      dispatch(setScreenDetails({}));
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  const fetchSmartMatches = useCallback(async () => {
    if (!smartMatchEnabled || transactionTab !== "To Review") {
      setSuggestedMatches(null);
      setMatchesMap({});
      setSplitsMap({});
      return;
    }
    const bankAccId = getBankAccountId();
    if (!bankAccId) return;

    setSmartMatchLoading(true);
    try {
      const data = await FetchBatchSuggestedMatches({
        bank_account_id: bankAccId,
      });
      if (data) {
        setSuggestedMatches(data);
        const map: Record<string, any> = {};
        data.matches?.forEach((m: any) => {
          map[m.transaction_id] = m;
        });
        setMatchesMap(map);

        const splitMap: Record<
          string,
          { group: any; index: number; total: number }
        > = {};
        data.split_matches?.forEach((group: any) => {
          const total = group.transactions?.length || 0;
          group.transactions?.forEach((leg: any, idx: number) => {
            splitMap[leg.id] = { group, index: idx + 1, total };
          });
        });
        setSplitsMap(splitMap);
      }
    } catch {
    } finally {
      setSmartMatchLoading(false);
    }
  }, [smartMatchEnabled, transactionTab]);

  useEffect(() => {
    fetchSmartMatches();
  }, [fetchSmartMatches]);

  function handleToggleSmartMatch() {
    const newVal = !smartMatchEnabled;
    setSmartMatchEnabled(newVal);
    SetSmartMatchPreference(newVal);
    if (!newVal) {
      setExpandedTxnId(null);
      setSuggestedMatches(null);
      setMatchesMap({});
    }
  }

  async function handleExactMatch(txnId: string, subPaymentId: number) {
    setActionLoading(txnId);
    try {
      const result = await BatchMatchExactTransactions({
        transaction_ids: [txnId],
        sub_payment_ids: [[subPaymentId]],
      });
      if (result) {
        setExpandedTxnId(null);
        getListAllAdminArticles(1, 10);
        setRefreshOverview(new Date().getTime());
        fetchSmartMatches();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAdjustAndMatch(txnId: string, subPaymentId: number) {
    setActionLoading(txnId);
    try {
      const result = await QuickAdjustAndMatch({
        transaction_id: txnId,
        sub_payment_id: subPaymentId,
      });
      if (result) {
        setExpandedTxnId(null);
        getListAllAdminArticles(1, 10);
        setRefreshOverview(new Date().getTime());
        fetchSmartMatches();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkMatch(txnId: string, subPaymentIds: number[]) {
    setActionLoading(txnId);
    try {
      const result = await BatchMatchExactTransactions({
        transaction_ids: [txnId],
        sub_payment_ids: [subPaymentIds],
      });
      if (result) {
        setExpandedTxnId(null);
        getListAllAdminArticles(1, 10);
        setRefreshOverview(new Date().getTime());
        fetchSmartMatches();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSplitMatch(
    triggeringTxnId: string,
    subPaymentId: number,
    transactionIds: string[]
  ) {
    setActionLoading(triggeringTxnId);
    try {
      const result = await BatchMatchSplitTransactions({
        sub_payment_ids: [subPaymentId],
        transaction_ids: [transactionIds],
      });
      if (result) {
        setExpandedTxnId(null);
        getListAllAdminArticles(1, 10);
        setRefreshOverview(new Date().getTime());
        fetchSmartMatches();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBatchMatchAllExact() {
    if (!suggestedMatches?.matches) return;
    // "Match All Exact" covers both 1-to-1 exact matches and bulk matches
    // (1 bank line ↔ N PT sub-payments summing to the bank amount).
    const eligibleMatches = suggestedMatches.matches.filter(
      (m: any) =>
        (m.match_quality === "exact" && m.suggested_payment) ||
        (m.match_quality === "bulk" &&
          Array.isArray(m.suggested_payments) &&
          m.suggested_payments.length > 0)
    );
    if (eligibleMatches.length === 0) {
      showWarningToast("No exact matches available.");
      return;
    }
    setShowBatchConfirm(false);
    setLoader(true);
    try {
      const result = await BatchMatchExactTransactions({
        transaction_ids: eligibleMatches.map((m: any) => m.transaction_id),
        sub_payment_ids: eligibleMatches.map((m: any) =>
          m.match_quality === "bulk"
            ? m.suggested_payments.map((p: any) => p.sub_payment_id)
            : [m.suggested_payment.sub_payment_id]
        ),
      });
      if (result) {
        if (result.failed > 0 && result.succeeded > 0) {
          showWarningToast(
            `${result.succeeded} matched, ${result.failed} failed.`
          );
        }
        getListAllAdminArticles(1, 10);
        setRefreshOverview(new Date().getTime());
        fetchSmartMatches();
      }
    } finally {
      setLoader(false);
    }
  }

  function getMatchBadge(txnId: string) {
    if (smartMatchLoading) return null;
    const match = matchesMap[txnId];
    const split = splitsMap[txnId];

    const toggle = (e: any) => {
      e.stopPropagation();
      setExpandedTxnId(expandedTxnId === txnId ? null : txnId);
    };

    if (match?.match_quality === "bulk") {
      const legCount = match.suggested_payments?.length || 0;
      return (
        <span className="valid smallbutton" onClick={toggle}>
          Bulk · {legCount} payments
        </span>
      );
    }
    if (match?.match_quality === "exact") {
      return (
        <span className="valid smallbutton" onClick={toggle}>
          Exact Match
        </span>
      );
    }
    if (match?.match_quality === "near") {
      return (
        <span className="contrast smallbutton" onClick={toggle}>
          Near Match (${Math.abs(match.difference_amount).toFixed(2)})
        </span>
      );
    }
    if (split) {
      return (
        <span className="contrast smallbutton" onClick={toggle}>
          Split · {split.index} of {split.total}
        </span>
      );
    }
    return <span className="smallbutton rivertext">—</span>;
  }

  function handleResetFilters() {
    setTransactionTab("To Review");
    setSelectedDate("All");
    setIsCustomDate(false);
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
    setEmptySearchField(true);
  }

  async function handleDownloadExcelFile() {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "transaction",
        account_type: null,
        company_id: getCompanyIdFromStorage(),
        search: searchValue || null,
        status: null,
        bank_account_id: getBankAccountId(),
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch {
      setDisableExcelBtn(false);
    } finally {
      setDisableExcelBtn(false);
    }
  }

  async function handleModalPopUpFunction() {
    if (actionData.option === "Excluded") {
      try {
        setLoader(true);
        if (selectedRows.length !== 2) {
          setDisplayConfirmationModal(!displayConfirmationModal);
          setOpenExcludeCheck(true);
          return;
        }

        if (
          (Math.abs(selectedRows[0]?.received_amount) ||
            0 === Math.abs(selectedRows[1].spent_amount) ||
            0) &&
          (Math.abs(selectedRows[0].spent_amount) ||
            0 === Math.abs(selectedRows[1]?.received_amount) ||
            0)
        ) {
          let payload = {
            payload: {
              exclude_txn_id: selectedRows[0]?.id,
              txn_id: selectedRows[1]?.id,
            },
          };
          let response = await ExcludeTransactions(payload);
          if (response) {
            setTransactionTab("Excluded");
            setDisplayConfirmationModal(!displayConfirmationModal);
            setSelectedRows([]);
          }
        } else {
          setDisplayConfirmationModal(!displayConfirmationModal);
          setOpenExcludeCheck(true);
          return;
        }
      } catch (err: any) {
      } finally {
        setLoader(false);
      }
    }

    if (actionData?.option === "Unmatched") {
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify({
          TransactionIDS: [actionData?.id],
          bankAccountId: actionData?.bank_account_id,
          triggerFrom: "bankOverView",
        }),
        "transactions-IDS"
      ).toString();

      router.push(`${AppRoutes.USER_UNMATCH_TRANSACTIONS}/${encryptedData}`);
      setDisplayConfirmationModal(false);
    }

    if (actionData.option === "Delete") {
      try {
        setLoader(true);
        if (selectedRows?.length > 1) {
          let multiOfSingleCheck = false;

          multiOfSingleCheck = selectedRows.some(
            (each: any) => each?.id == actionData?.id
          );

          if (multiOfSingleCheck) {
            let payload = {
              transactionIds: selectedRows.map((x: any) => x?.id),
            };
            let deleteTxnResponse = await DeleteTransactions(payload);
            if (deleteTxnResponse) {
              getListAllAdminArticles(1, 10);
              setDisplayConfirmationModal(false);
              setSelectedRows([]);
              setRefreshOverview(new Date().getTime());
            }
          } else {
            let payload = {
              transactionIds: [actionData?.id],
            };

            let deleteTxnResponse = await DeleteTransactions(payload);
            if (deleteTxnResponse) {
              getListAllAdminArticles(1, 10);
              setDisplayConfirmationModal(false);
              setSelectedRows([]);
              setRefreshOverview(new Date().getTime());
            }
          }
        } else {
          let payload = {
            transactionIds: [actionData?.id],
          };
          let deleteTxnResponse = await DeleteTransactions(payload);
          if (deleteTxnResponse) {
            getListAllAdminArticles(1, 10);
            setDisplayConfirmationModal(false);
            setSelectedRows([]);
            setRefreshOverview(new Date().getTime());
          }
        }
        setLoader(false);
      } catch (err: any) {
        setLoader(false);
      }
    }
  }

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "transaction",
        account_type: null,
        company_id: getCompanyIdFromStorage(),
        search: searchValue || null,
        status: null,
        bank_account_id: getBankAccountId(),
      });
      setDisablePDFBtn(false);
    } catch {
    } finally {
      setDisablePDFBtn(false);
    }
  };

  function handlePaymentsNavigation(rowData: any) {
    if (rowData?.matched_payment_claims?.length) {
      router.push(
        `${AppRoutes.USER_VIEW_CLAIMS}/${rowData?.matched_payment_claims[0].payment_claim_id}?mode=view&payment=${rowData?.matched_payment_claims[0]?.payment_id}`
      );
    }
  }

  const smartMatchRenderData =
    smartMatchEnabled && transactionTab === "To Review"
      ? [
          ...transactionsRenderData,
          {
            key: "_smart_match",
            render: (row: any) => getMatchBadge(row?.id),
          },
        ]
      : transactionsRenderData;

  const smartMatchHeaders =
    smartMatchEnabled && transactionTab === "To Review"
      ? [...transactionsHeader, { title: "Match", restrictSorting: true }]
      : transactionsHeader;

  const renderExpandedRow = (row: any) => {
    if (!smartMatchEnabled || expandedTxnId !== row?.id) return null;
    const match = matchesMap[row?.id];
    const split = splitsMap[row?.id];
    const isLoading = actionLoading === row?.id;

    // BULK: one bank line ↔ many sub-payments
    if (match?.match_quality === "bulk" && match.suggested_payments?.length) {
      const legs = match.suggested_payments;
      const totalAmt = legs.reduce(
        (acc: number, p: any) => acc + Math.abs(Number(p.amount) || 0),
        0
      );
      return (
        <tr className="pt_expandtable">
          <td colSpan={10} className="pt_records">
            <div className="pt_expandtable">
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                Bulk match — {legs.length} sub-payments totalling $
                {convertPositiveDecimalTwoDigit(totalAmt)}
                {match.review_needed && (
                  <span className="contrast smallbutton" style={{ marginLeft: 8 }}>
                    Review needed
                  </span>
                )}
              </div>
              <table style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Payment Type</th>
                    <th>Client / Supplier</th>
                    <th>Project / Contract</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {legs.map((p: any) => (
                    <tr key={p.sub_payment_id}>
                      <td>{p.payment_type || "—"}</td>
                      <td>{p.client_supplier_name || "—"}</td>
                      <td>
                        {p.project_name || "—"}
                        {p.contract_name ? ` / ${p.contract_name}` : ""}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        ${convertPositiveDecimalTwoDigit(Math.abs(p.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <CustomButton
                  buttonType={buttonType.PRIMARY}
                  actionType="button"
                  buttonName={isLoading ? "Matching..." : "Match Bulk"}
                  iconClassName="fa-light fa-check-double"
                  onClick={() =>
                    handleBulkMatch(
                      row.id,
                      legs.map((p: any) => p.sub_payment_id)
                    )
                  }
                  disabled={isLoading}
                />
                <Link
                  href={`${AppRoutes.USER_MATCH_TRANSACTIONS}?bankAccountId=${getBankAccountId}`}
                  className="smallbutton secondary"
                >
                  Full Match Screen &rarr;
                </Link>
              </div>
            </div>
          </td>
        </tr>
      );
    }

    // SPLIT: one sub-payment ↔ many bank lines (this row is one leg)
    if (split) {
      const { group, total } = split;
      const sp = group.sub_payment;
      const legs = group.transactions || [];
      return (
        <tr className="pt_expandtable">
          <td colSpan={10} className="pt_records">
            <div className="pt_expandtable">
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                Split match — 1 payment split across {total} bank lines
                {group.review_needed && (
                  <span className="contrast smallbutton" style={{ marginLeft: 8 }}>
                    Review needed
                  </span>
                )}
              </div>
              <div className="pt_records" style={{ marginBottom: 8 }}>
                <div>
                  <small className="rivertext">Payment Type</small>
                  <div>{sp.payment_type || "—"}</div>
                  <small className="rivertext">
                    {sp.client_supplier_name || ""}
                  </small>
                </div>
                <div>
                  <small className="rivertext">Total Amount</small>
                  <div>
                    ${convertPositiveDecimalTwoDigit(Math.abs(sp.amount))}
                  </div>
                </div>
                <div>
                  <small className="rivertext">Details</small>
                  <div>
                    {sp.project_name || "—"}
                    {sp.contract_name ? ` / ${sp.contract_name}` : ""}
                  </div>
                </div>
              </div>
              <table style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {legs.map((leg: any) => (
                    <tr
                      key={leg.id}
                      style={leg.id === row.id ? { fontWeight: 600 } : {}}
                    >
                      <td>{formatDate(leg.txn_date)}</td>
                      <td>{leg.description || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        ${convertPositiveDecimalTwoDigit(Math.abs(leg.txn_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <CustomButton
                  buttonType={buttonType.PRIMARY}
                  actionType="button"
                  buttonName={isLoading ? "Matching..." : "Match Split"}
                  iconClassName="fa-light fa-code-branch"
                  onClick={() =>
                    handleSplitMatch(
                      row.id,
                      sp.sub_payment_id,
                      legs.map((l: any) => l.id)
                    )
                  }
                  disabled={isLoading}
                />
                <Link
                  href={`${AppRoutes.USER_MATCH_TRANSACTIONS}?bankAccountId=${getBankAccountId}`}
                  className="smallbutton secondary"
                >
                  Full Match Screen &rarr;
                </Link>
              </div>
            </div>
          </td>
        </tr>
      );
    }

    // EXACT / NEAR (1-to-1)
    if (!match || !match.suggested_payment) return null;

    const sp = match.suggested_payment;
    const isExact = match.match_quality === "exact";

    return (
      <tr className="pt_expandtable">
        <td colSpan={10} className="pt_records">
          <div className="pt_expandtable">
            <div className="pt_records">
              <div>
                <small className="rivertext">Payment Type</small>
                <div>{sp.payment_type || "—"}</div>
                <small className="rivertext">
                  {sp.client_supplier_name || ""}
                </small>
              </div>
              <div>
                <small className="rivertext">Amount</small>
                <div>
                  $ {convertPositiveDecimalTwoDigit(Math.abs(sp.amount))}
                </div>
                {!isExact && (
                  <small className="contrast">
                    Difference: $
                    {Math.abs(match.difference_amount).toFixed(2)}
                  </small>
                )}
              </div>
              <div>
                <small className="rivertext">Details</small>
                <div>
                  {sp.project_name && (
                    <span>{sp.project_name}</span>
                  )}
                  {sp.contract_name && (
                    <span> / {sp.contract_name}</span>
                  )}
                </div>
                <small className="rivertext">
                  {sp.payment_from_account_name || ""} →{" "}
                  {sp.payment_to_account_name || ""}
                </small>
              </div>
              <div>
                {isExact ? (
                  <CustomButton
                    buttonType={buttonType.PRIMARY}
                    actionType="button"
                    buttonName={isLoading ? "Matching..." : "Match"}
                    iconClassName="fa-light fa-check"
                    onClick={() =>
                      handleExactMatch(row.id, sp.sub_payment_id)
                    }
                    disabled={isLoading}
                  />
                ) : (
                  <CustomButton
                    buttonType={buttonType.SECONDARY}
                    actionType="button"
                    buttonName={
                      isLoading ? "Processing..." : "Adjust & Match"
                    }
                    iconClassName="fa-light fa-sliders"
                    onClick={() =>
                      handleAdjustAndMatch(row.id, sp.sub_payment_id)
                    }
                    disabled={isLoading}
                  />
                )}
                <Link
                  href={`${AppRoutes.USER_MATCH_TRANSACTIONS}?bankAccountId=${getBankAccountId}`}
                  className="smallbutton secondary"
                >
                  Full Match Screen &rarr;
                </Link>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <Fragment>
      <div className="pt_pageactions">
        <Link
          href={`${AppRoutes.USER_UPLOAD_TRANSACTIONS}/${getBankAccountId()}`}
          className="pt_addnewbutton"
        >
          <CustomButton
            buttonType={buttonType.SECONDARY}
            actionType={"button"}
            buttonName={"Add transaction"}
            iconClassName="fa-light fa-hexagon-plus"
          />
        </Link>
      </div>

      <div className="grid pt_topfilters">
        <div className="pt_filters pt_toggles">
          <TabSwitch
            typeOfTab={TabType.radioSwitch}
            tabOptions={transactionsTabOptions}
            onChange={(value: any) => {
              setSelectedRows([]);
              setExpandedTxnId(null);
              setTransactionTab(value);
            }}
            tabValue={transactionTab}
          />
          {transactionTab === "To Review" && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                marginLeft: "16px",
                gap: "6px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: smartMatchEnabled ? "#2563eb" : "#6b7280",
                }}
              >
                <input
                  type="checkbox"
                  checked={smartMatchEnabled}
                  onChange={handleToggleSmartMatch}
                  style={{ cursor: "pointer" }}
                />
                Smart Match
              </label>
              {smartMatchEnabled && suggestedMatches && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    marginLeft: "4px",
                  }}
                >
                  ({suggestedMatches.exact_match_count} exact
                  {suggestedMatches.near_match_count > 0 &&
                    `, ${suggestedMatches.near_match_count} near`}
                  {suggestedMatches.bulk_match_count > 0 &&
                    `, ${suggestedMatches.bulk_match_count} bulk`}
                  {suggestedMatches.split_match_count > 0 &&
                    `, ${suggestedMatches.split_match_count} split`}
                  )
                </span>
              )}
              {smartMatchEnabled &&
                (suggestedMatches?.exact_match_count > 0 ||
                  suggestedMatches?.bulk_match_count > 0) && (
                  <CustomButton
                    buttonType={buttonType.PRIMARY}
                    actionType="button"
                    buttonName={`Match All Exact (${
                      (suggestedMatches?.exact_match_count || 0) +
                      (suggestedMatches?.bulk_match_count || 0)
                    })`}
                    iconClassName="fa-light fa-check-double"
                    onClick={() => setShowBatchConfirm(true)}
                  />
                )}
            </div>
          )}
        </div>
        <GridExportActions
          excelFile={{
            sheetName: "transactions list",
            tableData: printDocumentData,
            LabelAndValueKey: TransactionExcelColumnNames,
          }}
          pdfFile={{
            fileName: "transactions",
            headerRow: transactionPdfHeaders,
            tableData: printDocumentData,
            dataRow: transactionPdfDataRow,
          }}
          resetFilterFunction={handleResetFilters}
          hideResetButton={
            (!transactionTab || transactionTab === "To Review") &&
            !searchValue &&
            selectedDate == "All"
          }
          hideExcelButton={printDocumentData?.length === 0}
          hidePdfButton={printDocumentData?.length === 0}
          handleDownloadExcelFile={() => {
            handleDownloadExcelFile();
          }}
          disabledOnExcel={disableExcelBtn}
          exportFromAPI={true}
          disabledPDF={disablePDFBtn}
          handleDownloadPrintPDF={() => {
            handleDownloadPdfFile();
          }}
        />
      </div>

      <div className="pt_filteroptions">
        <FormikControl
          control={InputType.SEARCH}
          onChange={(value: any) => handleSearch(value)}
          clearSearch={emptySearchField}
          placeholder={"Search by description"}
        />

        <FormikControl
          placeholder={"Activity Range"}
          name="Activity Range"
          options={filterByDuration}
          onChange={handleActivityChange}
          control={InputType.SELECT}
          value={selectedDate}
          renderKey="label"
          valueKey="value"
        />
      </div>
      {isCustomDate && (
        <div className="grid">
          <div>
            <FormikControl
              label="From date"
              name="activityLogStartDate"
              control={InputType.DATE_PICKER}
              type="date"
              // value={
              //   activityLogStartDate
              //     ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
              //     : ""
              // }
              value={
                activityLogStartDate && isValid(new Date(activityLogStartDate))
                  ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                  : ""
              }
              onChange={(selectedDate: any) => {
                if (!selectedDate) {
                  setActivityLogStartDate(null);
                  return;
                }
                const fromDate = new Date(
                  new Date(selectedDate).setHours(0, 0, 0, 0)
                );

                if (fromDate > activityLogEndDate) {
                  setActivityLogStartDate(fromDate);
                  // setActivityLogEndDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));
                } else {
                  setActivityLogStartDate(fromDate);
                }
              }}
              minDate="" // Set any minimum date if needed
              // maxDate={format(new Date(activityLogEndDate), "yyyy-MM-dd")}
              disabled={false}
            />
          </div>
          <div>
            <FormikControl
              label="To date"
              name="activityLogEndDate"
              type="date"
              control={InputType.DATE_PICKER}
              // value={
              //   activityLogEndDate
              //     ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
              //     : ""
              // }
              value={
                activityLogEndDate && isValid(new Date(activityLogEndDate))
                  ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                  : ""
              }
              onChange={(selectedDate: any) => {
                if (!selectedDate) {
                  setActivityLogEndDate(null);
                  return;
                }

                const toDate = new Date(
                  new Date(selectedDate).setHours(23, 59, 59, 999)
                );

                // Ensure end date is not before start date
                if (toDate >= activityLogStartDate) {
                  setActivityLogEndDate(toDate);
                }
              }}
              minDate={
                activityLogStartDate
                  ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                  : ""
              }
              maxDate="" // Set any maximum date if needed
              disabled={false}
            />
          </div>
        </div>
      )}

      <DynamicTable
        headers={
          transactionTab === "To Review" || transactionTab === "All"
            ? [
                ...(smartMatchEnabled && transactionTab === "To Review"
                  ? smartMatchHeaders
                  : transactionsHeader),
                { title: "Actions", restrictSorting: true },
              ]
            : transactionTab === "Matched"
            ? [
                ...transactionsHeader,
                { title: "Unmatch", restrictSorting: true },
              ]
            : transactionsHeader
        }
        gridData={transactionData ?? []}
        renderRowList={
          smartMatchEnabled && transactionTab === "To Review"
            ? smartMatchRenderData
            : transactionsRenderData
        }
        showLoader={loader || smartMatchLoading}
        gridActions={gridActions || []}
        displayAllStaticActions={transactionTab === "All" ? false : true}
        enableCheckbox={transactionTab === "To Review" || false}
        loaderColSpan={
          smartMatchEnabled && transactionTab === "To Review" ? 11 : 10
        }
        currentPage={currentPage}
        onGridCheckboxChange={(selectedData: any) => {
          setSelectedRows(selectedData);
        }}
        hoverOnRowClick
        onTableDataClick={(rowData: any) => {
          if (
            smartMatchEnabled &&
            transactionTab === "To Review" &&
            ((matchesMap[rowData?.id] &&
              matchesMap[rowData?.id].match_quality !== "none") ||
              splitsMap[rowData?.id])
          ) {
            setExpandedTxnId(
              expandedTxnId === rowData?.id ? null : rowData?.id
            );
          } else {
            handlePaymentsNavigation(rowData);
          }
        }}
        onSortChange={(sortConfig) => {
          if (transactionData?.length > 0) {
            setSortValues(sortConfig);
          }
        }}
        entriesPerPage={entriesPerPage}
        onEntriesPerPageChange={(value: any) => handleRowsPerPageChange(value)}
        onPageChange={(value: any) => handlePageChange(value)}
        totalEntries={totalRows}
        selectedCheckboxRows={selectedRows}
        renderExpandedRow={
          smartMatchEnabled && transactionTab === "To Review"
            ? renderExpandedRow
            : undefined
        }
      />
      {displayConfirmationModal && (
        <BaseModal
          modalId={popupMessage?.headerMsg || "transactions delete modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            handleModalPopUpFunction();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">{popupMessage?.subHeaderMsg}</h4>
        </BaseModal>
      )}

      {openExcludeCheck && (
        <BaseModal
          modalId={"open exclude check"}
          title="Exclude Error"
          displayModal={openExcludeCheck}
          // disableSecondButton={btnDisabled}
          onHeaderIconClose={() => setOpenExcludeCheck(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setOpenExcludeCheck(false)}
          onConfirm={() => {
            setOpenExcludeCheck(false);
            return true;
          }}
          // firstButtonName="No"
          hideFirstButton
          secondButtonName="Ok"
        >
          {/* <h4 className="text_center">{popupMessage?.subHeaderMsg}</h4> */}
          <h3 className="text_center" style={{ color: "#e23b30" }}>
            Validation error
          </h3>
          <p
            style={{
              color: "#e23b30",
              textAlign: "center",
              textWrap: "initial",
            }}
          >
            Please ensure two equal and opposite transactions are selected form
            the transaction lists to exclude.
          </p>
        </BaseModal>
      )}

      {showBatchConfirm && (
        <BaseModal
          modalId="batch-match-confirm"
          displayModal={showBatchConfirm}
          onHeaderIconClose={() => setShowBatchConfirm(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setShowBatchConfirm(false)}
          onConfirm={() => {
            handleBatchMatchAllExact();
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Match All"
        >
          <h4 className="text_center">
            Match{" "}
            {(suggestedMatches?.exact_match_count || 0) +
              (suggestedMatches?.bulk_match_count || 0)}{" "}
            transaction
            {(suggestedMatches?.exact_match_count || 0) +
              (suggestedMatches?.bulk_match_count || 0) !==
            1
              ? "s"
              : ""}
            {suggestedMatches?.bulk_match_count > 0
              ? ` (${suggestedMatches.exact_match_count || 0} exact, ${
                  suggestedMatches.bulk_match_count
                } bulk)`
              : ""}
            ?
          </h4>
          <p style={{ textAlign: "center", fontSize: "13px", color: "#6b7280" }}>
            This will match all transactions where the amount exactly equals the
            payment amount, including bulk matches where one bank line equals
            the sum of multiple PayTrade payments.
          </p>
        </BaseModal>
      )}
    </Fragment>
  );
}
