"use client";
import React, { Fragment, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
import { useDispatch, useSelector } from "react-redux";
import CryptoJS from "crypto-js";
import {
  BookKeepingexcelColumnNames,
  BookKeepingpdfDataRow,
  BookKeepingpdfheaderNames,
  BookKeepingpdfheaders,
  BookKeepingRenderData,
  ITransactions,
  transactionsDateOptions,
} from "./booKeeping.constants";
import { FetchAllBankAccounts } from "../BankAccounts/bankAccount.functions";
import {
  ExcludeTransactions,
  FetchAllTransactions,
} from "./bookKeeping.functions";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import GridExportActions from "@/components/GridExportActions";
import TabSwitch from "@/components/TabSwitch";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType, NA } from "@/shared/constant/general";
import { format, isValid } from "date-fns";
import DynamicTable from "@/components/Table";
import Link from "next/link";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast, showWarningToast } from "@/components/Toaster";
import CustomButton from "@/components/CustomButton/CustomButton";
import {
  DeleteTransactions,
  FetchBatchSuggestedMatches,
  BatchMatchExactTransactions,
  BatchMatchSplitTransactions,
  QuickAdjustAndMatch,
  GetSmartMatchPreference,
  SetSmartMatchPreference,
} from "../BankAccountOverview/BankAccountsOverview.function";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import BaseModal from "@/components/BaseModal";
import { RootState } from "@/redux/store";
import { setMatchTransactions } from "@/redux/slices/subscribeRouteBackDetails";
import { connectWebSocket } from "@/utils";

const BookKeepingList = (props: any) => {
  const routePath = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [transactionData, setTransactionData] = useState<ITransactions[]>([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [selectedToggle, setSelectedToggle] = useState<string>(
    screenDetails?.selectTab || "To Review"
  );
  const [sortValues, setSortValues] = useState<any>("");

  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(0, 0, 0, 0)));
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityDate, setActivityDate] = useState("");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "",
    label: "All dates",
  });
  const [bankNameOptions, setBankNameOptions] = useState<any>([]);
  const [bankNameOptionsOnly, setBankNameOptionsOnly] = useState<any>([]);
  const [selectedBank, setSelectedBank] = useState<any>();
  const [bankId, setBankId] = useState<any>("");
  const [isOptSelected, setIsOptSelected] = useState("");
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [selectedRowsInGrid, setSelectedRowsInGrid] = useState<any>([]);
  const [btnDisabled, setBtnDisabled] = useState<boolean>(true);
  const [openExcludeCheck, setOpenExcludeCheck] = useState(false);
  const [warningModal, setWarningModal] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const [addTxnBtnClicked, setAddTxnBtnClicked] = useState(
    screenDetails?.selectUploadTab ? true : false
  );
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  // ───────────────────────── Smart Match ─────────────────────────
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

  // Load saved Smart Match preference once.
  useEffect(() => {
    (async () => {
      const pref = await GetSmartMatchPreference();
      setSmartMatchEnabled(pref);
    })();
  }, []);

  const firstBankValue = bankNameOptionsOnly?.[0]?.value;

  const resetFilters = () => {
    setSearch("");
    setSingleActivyDate({ value: "", label: "All dates" });
    setIsCustomDate(false);
    setActivityDate("");
    // Reset back to the first bank instead of clearing — Bookkeeping is
    // single-bank by design now.
    if (firstBankValue) {
      const firstOpt = bankNameOptionsOnly[0];
      setBankId(firstBankValue);
      setSelectedBank(firstOpt);
    }
    setSelectedRowsInGrid([]);
    setPage(1); // Reset to the first page
  };

  const isAnyFilterActive =
    search !== "" ||
    (bankId !== "" && String(bankId) !== String(firstBankValue ?? "")) ||
    singleActivyDate.label !== "All dates";

  useEffect(() => {
    (async () => {
      dispatch(setMatchTransactions({}));
      const postData = {
        payload: {
          account_type: null,
          company_id: getCompanyIdFromStorage(),
          items_per_page: null,
          page: 1 || null,
          search: null,
          status: null,
          is_alphabetical_order: true,
        },
      };
      let bankOptionsRes = await FetchAllBankAccounts(postData);
      if (bankOptionsRes && bankOptionsRes?.extendedBankAccounts?.length > 0) {
        let modifiedContracts = bankOptionsRes?.extendedBankAccounts?.map(
          (contract: any) => {
            return {
              label: contract?.account_name,
              value: contract?.bank_account_id,
            };
          }
        );
        // Bookkeeping is single-bank: no "All" option. Default to the
        // first bank so the page always loads a meaningful view.
        setBankNameOptions(modifiedContracts);
        setBankNameOptionsOnly(modifiedContracts);
        if (!bankId) {
          setBankId(modifiedContracts[0].value);
          setSelectedBank(modifiedContracts[0]);
        }
      }
    })();
  }, []);

  useEffect(() => {
    getListAllAdminArticles(page, perPage);
  }, [
    search,
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
    selectedToggle,
    bankId,
    page,
    perPage,
    sortValues,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
    selectedToggle,
    bankId,
  ]);

  function handlePaymentsNavigation(rowData: any) {
    if (rowData?.matched_payment_claims?.length) {
      router.push(
        `${AppRoutes.USER_VIEW_CLAIMS}/${rowData?.matched_payment_claims[0].payment_claim_id}?mode=view&payment=${rowData?.matched_payment_claims[0]?.payment_id}`
      );
    }
  }

  // ─────────────────────── Smart Match helpers ───────────────────────
  // Smart Match only applies to the For-Review tab and requires a
  // single bank account to be selected (Bookkeeping is single-bank).
  const fetchSmartMatches = useCallback(async () => {
    if (!smartMatchEnabled || selectedToggle !== "To Review" || !bankId) {
      setSuggestedMatches(null);
      setMatchesMap({});
      setSplitsMap({});
      return;
    }
    setSmartMatchLoading(true);
    try {
      const data = await FetchBatchSuggestedMatches({
        bank_account_id: Number(bankId),
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
  }, [smartMatchEnabled, selectedToggle, bankId]);

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
      setSplitsMap({});
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
        getListAllAdminArticles(page, perPage);
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
        getListAllAdminArticles(page, perPage);
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
        getListAllAdminArticles(page, perPage);
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
        getListAllAdminArticles(page, perPage);
        fetchSmartMatches();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBatchMatchAllExact() {
    if (!suggestedMatches?.matches) return;
    const exactMatches = suggestedMatches.matches.filter(
      (m: any) => m.match_quality === "exact" && m.suggested_payment
    );
    if (exactMatches.length === 0) {
      showWarningToast("No exact matches available.");
      return;
    }
    setShowBatchConfirm(false);
    setLoading(true);
    try {
      const result = await BatchMatchExactTransactions({
        transaction_ids: exactMatches.map((m: any) => m.transaction_id),
        sub_payment_ids: exactMatches.map((m: any) => [
          m.suggested_payment.sub_payment_id,
        ]),
      });
      if (result) {
        if (result.failed > 0 && result.succeeded > 0) {
          showWarningToast(
            `${result.succeeded} matched, ${result.failed} failed.`
          );
        }
        getListAllAdminArticles(page, perPage);
        fetchSmartMatches();
      }
    } finally {
      setLoading(false);
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

  const renderExpandedRow = (row: any) => {
    if (
      !smartMatchEnabled ||
      selectedToggle !== "To Review" ||
      expandedTxnId !== row?.id
    )
      return null;
    const match = matchesMap[row?.id];
    const split = splitsMap[row?.id];
    const isLoading = actionLoading === row?.id;

    // BULK
    if (match?.match_quality === "bulk" && match.suggested_payments?.length) {
      const legs = match.suggested_payments;
      const totalAmt = legs.reduce(
        (acc: number, p: any) => acc + Math.abs(Number(p.amount) || 0),
        0
      );
      return (
        <tr className="pt_expandtable">
          <td colSpan={11} className="pt_records">
            <div className="pt_expandtable">
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                Bulk match — {legs.length} sub-payments totalling $
                {convertPositiveDecimalTwoDigit(totalAmt)}
                {match.review_needed && (
                  <span
                    className="contrast smallbutton"
                    style={{ marginLeft: 8 }}
                  >
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
              </div>
            </div>
          </td>
        </tr>
      );
    }

    // SPLIT
    if (split) {
      const { group, total } = split;
      const sp = group.sub_payment;
      const legs = group.transactions || [];
      return (
        <tr className="pt_expandtable">
          <td colSpan={11} className="pt_records">
            <div className="pt_expandtable">
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                Split match — 1 payment split across {total} bank lines
                {group.review_needed && (
                  <span
                    className="contrast smallbutton"
                    style={{ marginLeft: 8 }}
                  >
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
                        $
                        {convertPositiveDecimalTwoDigit(
                          Math.abs(leg.txn_amount)
                        )}
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
        <td colSpan={11} className="pt_records">
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
                  {sp.project_name && <span>{sp.project_name}</span>}
                  {sp.contract_name && <span> / {sp.contract_name}</span>}
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
                    onClick={() => handleExactMatch(row.id, sp.sub_payment_id)}
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
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const smartMatchActive =
    smartMatchEnabled && selectedToggle === "To Review" && !!bankId;

  const getListAllAdminArticles = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const transactionsResponse = await FetchAllTransactions(
      {
        page: page,
        items_per_page: rowsPerPage,
        search: search || null,
        status:
          selectedToggle === "All"
            ? null
            : selectedToggle === "To Review"
            ? "ToMatch"
            : selectedToggle || null,
        bank_account_id: Number(bankId) || null,
        date_filter: activityDate || null,
        date_from: isCustomDate ? activityLogStartDate : null,
        date_to: isCustomDate ? activityLogEndDate : null,
        company_id: selectedCompanyId || null,
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      },
      setLoading
    );
    setTotalRows(transactionsResponse?.total_count || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = transactionsResponse?.transactions_list?.map(
      (user: ITransactions) => {
        return {
          ...user,
          unique_txn_id: user.unique_txn_id,
          description: user.description,
          status:
            user?.status === "To Review" ? "For Review" : user?.status || "",
          matched_to: user.matched_to,

          receivedAmount: user?.spent_amount,
          spentAmount: user?.received_amount,
          spent_amount: user?.spent_amount
            ? `$ ${convertPositiveDecimalTwoDigit(user?.spent_amount, true)}`
            : "",
          received_amount: user?.received_amount
            ? `$ ${convertPositiveDecimalTwoDigit(user?.received_amount, true)}`
            : "",
          txn_date: user?.txn_date ? formatDate(user?.txn_date) : NA,
        };
      }
    );
    setTransactionData(printDataObjCreation || []);
    setPrintDocumentData(printDataObjCreation);
    setDisableExcelBtn(false);
    dispatch(setScreenDetails({}));
  };

  const handleModalActionFunction = async () => {
    if (actionData.option === "Excluded") {
      if (selectedRowsInGrid.length !== 2) {
        setOpenModal(!openModal);
        setOpenExcludeCheck(true);
        return;
      }

      if (
        (Math.abs(selectedRowsInGrid[0]?.receivedAmount) ||
          0 === Math.abs(selectedRowsInGrid[1]?.spentAmount) ||
          0) &&
        (Math.abs(selectedRowsInGrid[0]?.spentAmount) ||
          0 === Math.abs(selectedRowsInGrid[1]?.receivedAmount) ||
          0)
      ) {
        let payload = {
          payload: {
            exclude_txn_id: selectedRowsInGrid[0]?.id,
            txn_id: selectedRowsInGrid[1]?.id,
          },
        };
        let response = await ExcludeTransactions(payload);
        if (response) {
          setSelectedToggle("Excluded");
          setOpenModal(!openModal);
          setSelectedRowsInGrid([]);
        }
      } else {
        setOpenModal(!openModal);
        setOpenExcludeCheck(true);
        return;
      }
    }
    if (actionData?.option === "Unmatched") {
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify({
          TransactionIDS: [actionData?.id],
          bankAccountId: actionData?.bank_account_id,
        }),
        "transactions-IDS"
      ).toString();

      router.push(`${AppRoutes.USER_UNMATCH_TRANSACTIONS}/${encryptedData}`);
      setBtnDisabled(false);
      setOpenModal(!openModal);
    }

    if (actionData.option === "Delete") {
      if (selectedRowsInGrid?.length > 1) {
        let multiOfSingleCheck = false;
        multiOfSingleCheck = selectedRowsInGrid.some(
          (each: any) => each?.id === actionData?.id
        );
        if (multiOfSingleCheck) {
          let payload = {
            transactionIds: selectedRowsInGrid.map((x: any) => x?.id),
          };
          let deleteTxnResponse = await DeleteTransactions(payload);
          if (deleteTxnResponse) {
            getListAllAdminArticles(page, perPage);
            setOpenModal(!openModal);
            setSelectedRowsInGrid([]);
          }
        } else {
          let payload = {
            transactionIds: [actionData?.id],
          };

          let deleteTxnResponse = await DeleteTransactions(payload);
          if (deleteTxnResponse) {
            getListAllAdminArticles(page, perPage);
            setOpenModal(!openModal);
            setSelectedRowsInGrid([]);
          }
        }
      } else {
        let payload = {
          transactionIds: [actionData?.id],
        };
        let deleteTxnResponse = await DeleteTransactions(payload);
        if (deleteTxnResponse) {
          getListAllAdminArticles(page, perPage);
          setOpenModal(!openModal);
          setSelectedRowsInGrid([]);
        }
      }
    }
  };

  const handleContractChange = (selectedValue: any) => {
    setSelectedRowsInGrid([]);
    setSelectedBank(selectedValue);
    setBankId(selectedValue);
    // Perform any other actions based on the selected value
  };

  const handleActivityChange = (selectedValue: any) => {
    setSelectedRowsInGrid([]);
    setSingleActivyDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue); // Perform any other actions based on the selected value
  };

  // Define actions dynamically
  const actions: any = [
    ...(selectedToggle === "Matched"
      ? [
          {
            label: "Unmatch",
            icon: "fa-light fa-arrows-from-line",

            onClick: (row: any) => {
              setActionData({ ...row, option: "Unmatched" });
              setBtnDisabled(false);
              setOpenModal(!openModal);
              setPopupMessage({
                headerMsg: "",
                subHeaderMsg:
                  "Are you sure you wish to unmatch this transaction?",
              });
            },
          },
        ]
      : selectedToggle === "To Review"
      ? [
          ...(selectedRowsInGrid.length > 1
            ? []
            : [
                {
                  label: "Match",
                  icon: "fa-light fa-arrows-to-line",
                  onClick: (row: any) => {
                    const encryptedData = CryptoJS.AES.encrypt(
                      JSON.stringify({
                        TransactionIDS: [row?.id],
                        bankAccountId: row?.bank_account_id || null,
                      }),
                      "transactions-IDS"
                    ).toString();
                    router.push(
                      `${AppRoutes.USER_MATCH_TRANSACTIONS}/${encryptedData}`
                    );
                  },
                },
              ]),

          {
            label: "Exclude",

            icon: "fa-light fa-arrows-from-dotted-line",

            onClick: (row: ITransactions) => {
              if (selectedRowsInGrid?.length === 2) {
                let multiOfSingleCheck = false;
                multiOfSingleCheck = selectedRowsInGrid.some(
                  (each: ITransactions) => each?.id === row?.id
                );
                if (multiOfSingleCheck) {
                  setActionData({ ...row, option: "Excluded" });
                  setBtnDisabled(false);
                  setOpenModal(!openModal);
                  setPopupMessage((prev) => ({
                    headerMsg: "tranactions exclude modal",
                    subHeaderMsg:
                      "Are you sure you wish to exclude this transactions?",
                  }));
                } else {
                  showWarningToast("Please click selected transactions only.");
                  return;
                }
              } else {
                if (selectedRowsInGrid?.length === 0 && !bankId) {
                  setWarningModal(true);
                  return;
                }
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
              setOpenModal(true);
              setBtnDisabled(false);
            },
          },
        ]
      : selectedToggle === "All"
      ? [
          {
            label: "Unmatch",
            icon: "fa-light fa-arrows-from-line",
            comparisonRowKey: "status",
            conditionalComparisonData: "Matched",
            onClick: (row: any) => {
              setActionData({ ...row, option: "Unmatched" });
              setBtnDisabled(false);
              setOpenModal(!openModal);
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
                  bankAccountId: row?.bank_account_id || null,
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
                  bankAccountId: row?.bank_account_id || null,
                }),
                "transactions-IDS"
              ).toString();
              router.push(
                `${AppRoutes.USER_MATCH_TRANSACTIONS}/${encryptedData}`
              );
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
              setOpenModal(true);
              setBtnDisabled(false);
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
              setOpenModal(true);
              setBtnDisabled(false);
            },
          },
        ]
      : []),
  ];

  const handleToggleChange = (e: any) => {
    setSelectedToggle(e.target.value);
    setSelectedRowsInGrid([]);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "transaction",
        search: search || null,
        status:
          selectedToggle === "All"
            ? null
            : selectedToggle === "To Review"
            ? "ToMatch"
            : selectedToggle || null,
        bank_account_id: Number(bankId) || null,
        date_filter: activityDate || null,
        date_from: isCustomDate ? activityLogStartDate : null,
        date_to: isCustomDate ? activityLogEndDate : null,
        company_id: selectedCompanyId || null,
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisableExcelBtn(false);
    }
  };

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "transaction",
        search: search || null,
        status:
          selectedToggle === "All"
            ? null
            : selectedToggle === "To Review"
            ? "ToMatch"
            : selectedToggle || null,
        bank_account_id: Number(bankId) || null,
        date_filter: activityDate || null,
        date_from: isCustomDate ? activityLogStartDate : null,
        date_to: isCustomDate ? activityLogEndDate : null,
        company_id: selectedCompanyId || null,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  return (
    <>
      {!addTxnBtnClicked && (
        <div className="container-fluid">
          <div className="pt_title">
            <div className="pt_breadcrumbs">
              <BreadCrumbs
                routePaths={[
                  {
                    name: "Dashboard",
                    path: AppRoutes.USER_DASHBOARD,
                  },
                ]}
                activeRoute={"Bookkeeping"}
              />
            </div>
            <div className="grid pt_topfilters">
              <div className="pt_pagetitle">
                <h1>Transaction list</h1>
              </div>
              <div className="pt_pageactions">
                <Link href={""} passHref legacyBehavior>
                  <a className="pt_addnewbutton">
                    <button
                      className="secondary"
                      onClick={() => setAddTxnBtnClicked(true)}
                    >
                      <i className="fa-light fa-hexagon-plus"></i>Add
                      transaction
                    </button>
                  </a>
                </Link>
              </div>
            </div>
          </div>

          <div className="pt_filtergroup">
            <div className="grid pt_topfilters align_view_activity">
              <div className="pt_pageactions">
                <div className="actionbuttons">
                  <GridExportActions
                    excelFile={{
                      sheetName: "transaction List",
                      tableData: transactionData,
                      LabelAndValueKey: BookKeepingexcelColumnNames,
                    }}
                    pdfFile={{
                      fileName: "transaction List",
                      headerRow: BookKeepingpdfheaders,
                      tableData: transactionData,
                      dataRow: BookKeepingpdfDataRow,
                    }}
                    resetFilterFunction={() => {
                      resetFilters();
                    }}
                    hideExcelButton={transactionData.length > 0 ? false : true}
                    hidePdfButton={transactionData.length > 0 ? false : true}
                    hideResetButton={!isAnyFilterActive}
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
              </div>
            </div>
            <div className="pt_filtergroup pt_toggles pt_filters">
              <fieldset>
                <input
                  type="radio"
                  id="payments"
                  name="paymentstype"
                  value="To Review"
                  checked={selectedToggle === "To Review"}
                  onChange={handleToggleChange}
                />
                <label htmlFor="claims">For Review</label>

                <input
                  type="radio"
                  id="receivable"
                  name="paymentstype"
                  value="Matched"
                  checked={selectedToggle === "Matched"}
                  onChange={handleToggleChange}
                />
                <label htmlFor="Receivable">Matched</label>

                <input
                  type="radio"
                  id="billable"
                  name="paymenttype"
                  value="Excluded"
                  checked={selectedToggle === "Excluded"}
                  onChange={handleToggleChange}
                />
                <label htmlFor="Billable">Excluded</label>

                <input
                  type="radio"
                  id="billable"
                  name="paymenttype"
                  value="All"
                  checked={selectedToggle === "All"}
                  onChange={handleToggleChange}
                />
                <label htmlFor="Billable">All</label>
              </fieldset>
              {selectedToggle === "To Review" && !!bankId && (
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
                  {smartMatchActive && suggestedMatches && (
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
                  {smartMatchActive &&
                    suggestedMatches?.exact_match_count > 0 && (
                      <CustomButton
                        buttonType={buttonType.PRIMARY}
                        actionType="button"
                        buttonName={`Match All Exact (${suggestedMatches.exact_match_count})`}
                        iconClassName="fa-light fa-check-double"
                        onClick={() => setShowBatchConfirm(true)}
                      />
                    )}
                </div>
              )}
            </div>
            <div className="pt_filteroptions">
              <FormikControl
                placeholder={"Search by description"}
                control={InputType.SEARCH}
                value={search}
                onChange={(value: any) => {
                  if (page !== 1) setPage(1);
                  setSearch(value);
                }}
              />

              <FormikControl
                placeholder={"Select an account name"}
                name="Account Name"
                options={bankNameOptions}
                onChange={handleContractChange}
                control={InputType.SELECT}
                value={selectedBank}
                renderKey="label"
                valueKey="value"
              />

              <FormikControl
                placeholder={"Dates"}
                name="Dates"
                options={transactionsDateOptions}
                onChange={handleActivityChange}
                control={InputType.SELECT}
                value={singleActivyDate}
                renderKey="label"
                valueKey="value"
              />
            </div>
          </div>
          {isCustomDate && (
            <div className="grid">
              <div>
                <FormikControl
                  label="From date"
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
                  onChange={(selectedDate: any) => {
                    if (!selectedDate) {
                      setActivityLogStartDate(null);
                      return;
                    }

                    let fromDate = new Date(
                      new Date(selectedDate).setHours(0, 0, 0, 0)
                    );
                    if (fromDate > activityLogEndDate) {
                      setSelectedRowsInGrid([]);
                      setActivityLogStartDate(fromDate);
                      // setActivityLogEndDate(fromDate);
                      setActivityLogEndDate(new Date(selectedDate));
                    } else {
                      setSelectedRowsInGrid([]);
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
                  name="To date"
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
                    if (toDate < activityLogStartDate) {
                      return;
                    } else {
                      setSelectedRowsInGrid([]);
                      setActivityLogEndDate(toDate);
                    }
                  }}
                  maxDate=""
                  disabled={false}
                />
              </div>
            </div>
          )}

          <div className="grid">
            <div className="pt_box">
              <DynamicTable
                headers={(() => {
                  const base =
                    selectedToggle === "To Review" || selectedToggle === "All"
                      ? [
                          ...BookKeepingpdfheaderNames,
                          { title: "Actions", restrictSorting: true },
                        ]
                      : selectedToggle === "Matched"
                      ? [
                          ...BookKeepingpdfheaderNames,
                          { title: "Unmatch", restrictSorting: true },
                        ]
                      : BookKeepingpdfheaderNames;
                  return smartMatchActive
                    ? [
                        ...base,
                        { title: "Match", restrictSorting: true },
                      ]
                    : base;
                })()}
                gridData={transactionData.length > 0 ? transactionData : []}
                gridActions={actions}
                displayAllStaticActions={
                  selectedToggle === "All" ? false : true
                }
                onRowClick={(data: any) => {}}
                showLoader={loading}
                loaderColSpan={smartMatchActive ? 11 : 10}
                renderRowList={
                  smartMatchActive
                    ? [
                        ...BookKeepingRenderData,
                        {
                          key: "_smart_match",
                          render: (row: any) => getMatchBadge(row?.id),
                        },
                      ]
                    : BookKeepingRenderData
                }
                renderExpandedRow={
                  smartMatchActive ? renderExpandedRow : undefined
                }
                currentPage={page}
                entriesPerPage={perPage}
                hoverOnRowClick
                onEntriesPerPageChange={setPerPage}
                onTableDataClick={(rowData: any) => {
                  const m = matchesMap[rowData?.id];
                  const hasExpandableMatch =
                    smartMatchActive &&
                    ((m &&
                      m.match_quality &&
                      m.match_quality !== "none") ||
                      !!splitsMap[rowData?.id]);
                  if (hasExpandableMatch) {
                    setExpandedTxnId(
                      expandedTxnId === rowData?.id ? null : rowData?.id
                    );
                    return;
                  }
                  handlePaymentsNavigation(rowData);
                }}
                onPageChange={setPage}
                totalEntries={totalRows}
                enableCheckbox={
                  (selectedToggle === "To Review" && bankId) || false
                }
                onGridCheckboxChange={(selectedData: any) => {
                  setSelectedRowsInGrid(selectedData);
                }}
                selectedCheckboxRows={selectedRowsInGrid}
                onSortChange={(sortConfig) => {
                  if (transactionData?.length > 0) {
                    setSortValues(sortConfig);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
      {addTxnBtnClicked && (
        <main>
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="pt_login">
                    <h3>Update transaction</h3>
                    <p>Select a bank account to update transactions</p>
                    <br />
                    <fieldset>
                      {bankNameOptionsOnly?.map((each: any, index: number) => {
                        return (
                          <label>
                            <input
                              type="radio"
                              key={index}
                              name="account"
                              checked={isOptSelected === each?.value}
                              onChange={() => setIsOptSelected(each?.value)}
                            />
                            {each?.label}
                          </label>
                        );
                      })}
                    </fieldset>

                    <br />
                    <br />
                    <div className="grid">
                      <CustomButton
                        actionType="button"
                        buttonType={buttonType.OUTLINE_CONTRAST}
                        buttonName={"Cancel"}
                        onClick={() => {
                          setIsOptSelected("");
                          dispatch(setScreenDetails({}));
                          setAddTxnBtnClicked(false);
                        }}
                        inputButton
                      />
                      <CustomButton
                        actionType="button"
                        buttonType={buttonType.SECONDARY}
                        buttonName={"Continue"}
                        onClick={() => {
                          if (isOptSelected) {
                            router.push(
                              `${AppRoutes.USER_UPLOAD_TRANSACTIONS}/${isOptSelected}`
                            );
                          } else {
                            showErrorToast("Please select a Bank account");
                          }
                        }}
                        inputButton
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="paytradeffectwrap">
              <div className="paytradeffect">
                <div className="themeshade"></div>
                <div className="oceanshade"></div>
                <div className="crabshade"></div>
              </div>
            </div>
            <div className="noise"></div>
          </div>
        </main>
      )}
      {openModal && (
        <BaseModal
          modalId={popupMessage?.headerMsg}
          displayModal={openModal}
          disableSecondButton={btnDisabled}
          onHeaderIconClose={() => setOpenModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setOpenModal(false)}
          onConfirm={() => {
            setBtnDisabled(true);
            handleModalActionFunction();
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
          onHeaderIconClose={() => setOpenExcludeCheck(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setOpenExcludeCheck(false)}
          onConfirm={() => {
            setOpenExcludeCheck(false);
            return true;
          }}
          hideFirstButton
          secondButtonName="Ok"
        >
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
      {warningModal && (
        <BaseModal
          modalId={"Open warning check modal"}
          displayModal={warningModal}
          // disableSecondButton={btnDisabled}
          onHeaderIconClose={() => setWarningModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setWarningModal(false)}
          onConfirm={() => {
            setWarningModal(false);
            return true;
          }}
          // firstButtonName="No"
          hideFirstButton
          secondButtonName="Ok"
        >
          <h4 className="text_center">
            Select the 'Account name' filter to view correct transactions to
            exclude
          </h4>
        </BaseModal>
      )}
      {showBatchConfirm && (
        <BaseModal
          displayModal={showBatchConfirm}
          onClose={() => setShowBatchConfirm(false)}
          title="Match all exact suggestions?"
          firstButtonName="Cancel"
          secondButtonName={`Match ${
            suggestedMatches?.exact_match_count || 0
          }`}
          onConfirm={handleBatchMatchAllExact}
        >
          <h4 className="text_center">
            This will match {suggestedMatches?.exact_match_count || 0} bank
            transaction
            {(suggestedMatches?.exact_match_count || 0) === 1 ? "" : "s"} to
            their suggested payments. You can unmatch individual rows
            afterwards if needed.
          </h4>
        </BaseModal>
      )}
    </>
  );
};

export default BookKeepingList;
