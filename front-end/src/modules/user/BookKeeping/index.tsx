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
import { DeleteTransactions } from "../BankAccountOverview/BankAccountsOverview.function";
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

  const resetFilters = () => {
    setSearch("");
    setBankId("");
    setSingleActivyDate({ value: "", label: "All dates" });
    setIsCustomDate(false);
    setActivityDate("");
    setSelectedBank(null);
    setSelectedRowsInGrid([]);
    setPage(1); // Reset to the first page
  };

  const isAnyFilterActive =
    search !== "" || bankId !== "" || singleActivyDate.label !== "All dates";

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
        setBankNameOptions([{ label: "All", value: "" }, ...modifiedContracts]);
        setBankNameOptionsOnly(modifiedContracts);
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
                headers={
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
                    : BookKeepingpdfheaderNames
                }
                gridData={transactionData.length > 0 ? transactionData : []}
                gridActions={actions}
                displayAllStaticActions={
                  selectedToggle === "All" ? false : true
                }
                onRowClick={(data: any) => {}}
                showLoader={loading}
                loaderColSpan={10}
                renderRowList={BookKeepingRenderData}
                currentPage={page}
                entriesPerPage={perPage}
                hoverOnRowClick
                onEntriesPerPageChange={setPerPage}
                onTableDataClick={(rowData: any) =>
                  handlePaymentsNavigation(rowData)
                }
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
    </>
  );
};

export default BookKeepingList;
