"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import styles from "./bookKeepingList.module.scss";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
} from "@/common/commonFunctions";
import FormButton from "@/components/Button/button";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { DD_MM_YYYY } from "@/common/constants/general";
import { AppModal } from "@/components/model/model";

import { getCookie, setCookie } from "cookies-next";
import debounce from "lodash/debounce";

import { Button } from "react-bootstrap";
import {
  DeleteTransactions,
  FetchAllBankAccounts,
  FetchAllTransactions,
} from "../bankTrustAccount/backTrustAccount.functions";
import { ITransactions } from "../bankTrustAccount/bankTrustAccount.types";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import Radio from "@/components/radio/radio";
import CryptoJS from "crypto-js";
import { ExcludeTransactions } from "../bankTrustAccount/bankTrustAccountOverview/matchTransactions/matchTransactions.functions";
import { toast } from "@/app/Toaster";
import CustomSubHeader from "./customSubHeader";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";

const BookKeepingList = (props: any) => {
  const routePath = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedToggle, setSelectedToggle] = useState<string>(
    screenDetails?.selectTab || "To Review"
  );
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityDate, setActivityDate] = useState("");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "",
    label: "All Dates",
  });
  const [bankNameOptions, setBankNameOptions] = useState<any>([]);
  const [bankNameOptionsOnly, setBankNameOptionsOnly] = useState<any>([]);
  const [selectedBank, setSelectedBank] = useState<any>();
  const [bankId, setBankId] = useState<any>("");
  const [isOptSelected, setIsOptSelected] = useState("");
  const [isTxnBtnClicked, setIsTxnBtnClicked] = useState(false);
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [selectedRowsInGrid, setSelectedRowsInGrid] = useState([]);
  const [btnDisabled, setBtnDisabled] = useState<boolean>(true);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [openExcludeCheck, setOpenExcludeCheck] = useState(false);
  const [warningModal, setWarningModal] = useState(false);
  // const resetFilters  {
  //   setSearch("");
  //   setBankId(null);
  //   setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
  //   setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
  //   setIsCustomDate(false);
  //   setActivityDate("");
  //   setSelectedRowsInGrid([]);
  //   setPage(1); // Reset to the first page
  // }

  // // Checking if any filter is active
  // const isAnyFilterActive =  search !== "" || selectedToggle !== "" || bankId !== "",
  const resetFilters = () => {
    setSearch("");
    setBankId("");
    setSingleActivyDate({ value: "", label: "All Dates" });
    setIsCustomDate(false);
    setActivityDate("");
    setSelectedBank(null);
    setSelectedRowsInGrid([]);
    setPage(1); // Reset to the first page
  };

  const isAnyFilterActive =
    search !== "" || bankId !== "" || singleActivyDate.label !== "All Dates";

  useEffect(() => {
    (async () => {
      let bankOptionsRes = await FetchAllBankAccounts({
        account_type: null,
        company_id: selectedCompanyId || null,
        items_per_page: null,
        page: 1 || null,
        search: null,
        status: null,
        is_alphabetical_order: true,
      });
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
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  useEffect(() => {
    getListAllAdminArticles(page, perPage);
  }, [
    debouncedSearch,
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
    selectedToggle,
    bankId,
  ]);

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
        bank_account_id: bankId || null,
        date_filter: activityDate || null,
        date_from: isCustomDate ? activityLogStartDate : null,
        date_to: isCustomDate ? activityLogEndDate : null,
        company_id: selectedCompanyId || null,
      },
      setLoading
    );
    setTransactionData(transactionsResponse?.transactions_list || []);
    setTotalRows(transactionsResponse?.total_count || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = transactionsResponse?.transactions_list?.map(
      (user: ITransactions) => {
        return {
          unique_txn_id: user.unique_txn_id,
          description: user.description,
          status: user.status,
          matched_to: user.matched_to,
          spent_amount: user?.spent_amount
            ? `$ ${convertPositiveDecimalTwoDigit(user?.spent_amount)}`
            : "",
          received_amount: user?.received_amount
            ? `$ ${convertPositiveDecimalTwoDigit(user?.received_amount)}`
            : "",
          txn_date: user?.txn_date
            ? formatDate(user?.txn_date, DD_MM_YYYY)
            : "N/A",
        };
      }
    );

    setPrintDocumentData(printDataObjCreation);
  };

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearch(inputvalue);
  }, []);

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getListAllAdminArticles(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getListAllAdminArticles(page, newPerPage);
  };

  const handleContractChange = (selectedValue: any) => {
    setSelectedRowsInGrid([]);
    setTimeKey(new Date().getTime());
    setSelectedBank(selectedValue);
    setBankId(selectedValue.value);
    // Perform any other actions based on the selected value
  };
  const handleOptionClick = async (
    data: {
      id: string;
      option: string;
      status: string;
      name: string;
    },
    row: ITransactions
  ) => {
    const { option } = data;

    if (option === "Matched") {
      let multiOfSingleCheck = false;
      if (selectedRowsInGrid?.length > 1) {
        multiOfSingleCheck = selectedRowsInGrid.some(
          (each: any) => each === row?.id
        );
      }
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify({
          TransactionIDS: multiOfSingleCheck ? selectedRowsInGrid : [row?.id],
          bankAccountId: row?.bank_account_id || null,
        }),
        "transactions-IDS"
      ).toString();

      router.push(
        `${ApplicationURLS.USER_MATCH_TRANSACTIONS}/${encryptedData}`
      );
    }
    if (option === "Excluded") {
      if (selectedRowsInGrid?.length === 2) {
        let multiOfSingleCheck = false;
        multiOfSingleCheck = selectedRowsInGrid.some(
          (each: any) => each === row?.id
        );
        if (multiOfSingleCheck) {
          setActionData(data);
          setBtnDisabled(false);
          setOpenModal(!openModal);
          setPopupMessage((prev) => ({
            headerMsg: "",
            subHeaderMsg: "Are you sure you wish to Exclude this transactions?",
          }));
        } else {
          toast.warning("Please click selected transactions only.");
          return;
        }
      } else {
        if (selectedRowsInGrid?.length === 0 && !bankId) {
          setWarningModal(true);
          return;
        }
        setOpenExcludeCheck(true);
        // toast.warning(
        //   "You can perform Exclude action with Two transactions only."
        // );
      }
    }
    if (option === "Unmatched") {
      setActionData({ ...data, bankId: row?.bank_account_id });
      setBtnDisabled(false);
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to Unmatch this transactions?",
      }));
    }
    if (option === "Delete") {
      setActionData(data);
      setBtnDisabled(false);
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to Delete this transactions?",
      }));
    }
  };
  const handleModalPopUpFunction = async () => {
    if (actionData.option === "Excluded") {
      setBtnDisabled(true);
      let selectedTransactions: any = [];
      selectedRowsInGrid.forEach((each) => {
        let data = transactionData.find((eachOne) => eachOne?.id === each);
        if (data) {
          selectedTransactions.push(data);
        }
      });

      if (selectedTransactions.length !== 2) {
        setOpenModal(!openModal);
        setOpenExcludeCheck(true);
        return;
      }

      const [transaction1, transaction2] = selectedTransactions;
      if (
        (Math.abs(transaction1.received_amount) ||
          0 === Math.abs(transaction2.spent_amount) ||
          0) &&
        (Math.abs(transaction1.spent_amount) ||
          0 === Math.abs(transaction2.received_amount) ||
          0)
      ) {
        let payload = {
          payload: {
            exclude_txn_id: selectedRowsInGrid[0],
            txn_id: selectedRowsInGrid[1],
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
      let multiOfSingleCheck = false;
      if (selectedRowsInGrid?.length > 1) {
        multiOfSingleCheck = selectedRowsInGrid.some(
          (each: any) => each === actionData?.id
        );
      }
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify({
          TransactionIDS: multiOfSingleCheck
            ? selectedRowsInGrid
            : [actionData?.id],
          bankAccountId: actionData?.bankId,
        }),
        "transactions-IDS"
      ).toString();

      router.push(
        `${ApplicationURLS.USER_UNMATCH_TRANSACTIONS}/${encryptedData}`
      );
    }
    if (actionData.option === "Delete") {
      setBtnDisabled(true);
      if (selectedRowsInGrid?.length > 1) {
        let multiOfSingleCheck = false;
        multiOfSingleCheck = selectedRowsInGrid.some(
          (each: any) => each === actionData?.id
        );
        if (multiOfSingleCheck) {
          let payload = {
            transactionIds: selectedRowsInGrid,
          };
          let deleteTxnResponse = await DeleteTransactions(payload);
          if (deleteTxnResponse) {
            getListAllAdminArticles(page, perPage);
            setOpenModal(!openModal);
            setSelectedRowsInGrid([]);
            dispatch(
              setScreenDetails({
                fromScreen: "",
                toScreen: "bankOverView",
                mainActiveTab: "Transactions",
                selectTab: selectedToggle,
              })
            );
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
            dispatch(
              setScreenDetails({
                fromScreen: "",
                toScreen: "bankOverView",
                mainActiveTab: "Transactions",
                selectTab: selectedToggle,
              })
            );
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
          dispatch(
            setScreenDetails({
              fromScreen: "",
              toScreen: "bankOverView",
              mainActiveTab: "Transactions",
              selectTab: selectedToggle,
            })
          );
        }
      }
    }
  };
  const handleActivityChange = (selectedValue: any) => {
    setSelectedRowsInGrid([]);
    setTimeKey(new Date().getTime());
    setSingleActivyDate(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue.value); // Perform any other actions based on the selected value
  };

  const handleChange = (state: any) => {
    // let selectedRows=unique_txn_id
    let gridSelectedRows = state?.selectedRows.map(
      (row: ITransactions) => row?.id
    );
    setSelectedRowsInGrid(gridSelectedRows);
  };

  const columns = [
    {
      name: "Date",
      maxWidth: "120px",
      wrap: true,
      selector: (row: ITransactions) =>
        row?.txn_date ? formatDate(row?.txn_date, DD_MM_YYYY) : "N/A",
    },
    {
      name: "Description",
      // maxWidth: "300px",
      wrap: true,
      selector: (row: ITransactions) => row?.description || "",
    },
    {
      name: "Spent",
      minWidth: "150px",
      right: true,
      selector: (row: ITransactions) =>
        row?.spent_amount
          ? `$ ${convertPositiveDecimalTwoDigit(row?.spent_amount, true)}`
          : "",
    },
    {
      name: "Received",
      right: true,
      minWidth: "150px",
      selector: (row: ITransactions) =>
        row?.received_amount
          ? `$ ${convertPositiveDecimalTwoDigit(row?.received_amount, true)}`
          : "",
      wrap: true,
    },
    {
      name: "Matched To?",
      minWidth: "180px",
      // fixed: "right",
      wrap: true,
      grow: true,
      selector: (row: ITransactions) => row?.matched_to || "",
    },
    {
      name: "Status",
      maxWidth: "150px",
      selector: (row: ITransactions) =>
        row?.status === "To Review" ? "For Review" : row?.status || "",
    },
    ...(selectedToggle !== "Excluded"
      ? [
          {
            name: "Actions",
            maxWidth: "100px",
            center: true,
            cell: (row: ITransactions, index: number) => (
              <Overlays
                trigger="click"
                placement={"auto"}
                overlay={<span></span>}
                popoverActions={[
                  ...(row?.status === "Matched"
                    ? [{ label: "Unmatch", value: "Unmatched" }]
                    : [
                        ...(selectedRowsInGrid.length > 1
                          ? []
                          : [{ label: " Match", value: "Matched" }]),
                        {
                          label: " Exclude",
                          value: "Excluded",
                        },
                        {
                          label: " Delete",
                          value: "Delete",
                          isDelete: true,
                        },
                      ]),
                ]}
                popoverTypes={"tableActions"}
                optionClick={(data) => {
                  handleOptionClick(data, row);
                }}
                cellData={{
                  id: row?.id,
                }}
                popperConfig={{
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [20, 10], // Adjust the offset as needed
                      },
                    },
                  ],
                }}
              >
                {row?.status !== "Excluded" ? (
                  <div style={{ cursor: "pointer" }}>
                    <ThreeDots />
                  </div>
                ) : (
                  <></>
                )}
              </Overlays>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {!isTxnBtnClicked && (
        <div className={styles.dataContainer}>
          <ReusableBreadcrumb
            items={[
              {
                href: ApplicationURLS.USER_DASHBOARD,
                label: "Home",
                active: routePath === ApplicationURLS.USER_DASHBOARD,
              },
              {
                href: "",
                label: "Book Keeping",
                active: true,
              },
            ]}
            separator={<span className={styles.separatorStyle}>&gt;</span>}
          />
          <div className={styles.headerAndButtonCon}>
            <span className={styles.headerText}>Transaction List</span>
            <FormButton
              className={styles.buttonStyles}
              onClick={() => setIsTxnBtnClicked(true)}
            >
              + Transactions
            </FormButton>
          </div>

          <ReusableDataTable
            key={timeKey}
            columns={columns}
            data={transactionData}
            subHeader
            selectableRows={(selectedToggle === "To Review" && bankId) || false}
            subHeaderComponent={
              <CustomSubHeader
                search={search}
                onInputChange={onInputChange}
                selectedToggle={selectedToggle}
                setSelectedToggle={setSelectedToggle}
                bankNameOptions={bankNameOptions}
                selectedBank={selectedBank}
                isCustomDate={isCustomDate}
                activityLogStartDate={activityLogStartDate}
                setActivityLogStartDate={setActivityLogStartDate}
                activityLogEndDate={activityLogEndDate}
                setActivityLogEndDate={setActivityLogEndDate}
                singleActivyDate={singleActivyDate}
                printDocumentData={printDocumentData}
                handleActivityChange={handleActivityChange}
                handleContractChange={handleContractChange}
                setSelectedRowsInGrid={setSelectedRowsInGrid}
                setTimeKey={setTimeKey}
                resetFilters={resetFilters}
                isAnyFilterActive={isAnyFilterActive} // Pass filter active state to child
              />
            }
            pagination
            progressPending={loading}
            paginationServer
            paginationTotalRows={totalRows}
            onChangeRowsPerPage={handlePerRowsChange}
            onChangePage={handlePageChange}
            onSelectedRowsChange={handleChange}
          />
          <AppModal
            show={openModal}
            onHide={() => setOpenModal(false)}
            secondButtonLabel="No"
            firstButtonLabel="Yes"
            disabled={btnDisabled}
            modalHeading={popupMessage?.headerMsg || ""}
            modalBodyContent={popupMessage?.subHeaderMsg || ""}
            onConfirm={() => {
              handleModalPopUpFunction();
            }}
          />
          <AppModal
            show={openExcludeCheck}
            onHide={() => setOpenExcludeCheck(false)}
            firstButtonLabel="Ok"
            modalHeading="Exclude Error"
            modalBodyTitle=""
            modalBodyContent={
              <div className={styles.errorModalColor}>
                <h2>Validation error</h2>
                <p>
                  Please ensure two equal and opposite transactions are selected
                  form the transaction lists to exclude.
                </p>
              </div>
            }
            onConfirm={() => {
              setOpenExcludeCheck(false);
            }}
          />
          <AppModal
            show={warningModal}
            onHide={() => setWarningModal(false)}
            firstButtonLabel="Ok"
            modalHeading={""}
            modalBodyContent={
              "Select the 'Account Name' filter to view correct transactions to exclude"
            }
            onConfirm={() => {
              setWarningModal(false);
            }}
          />
        </div>
      )}
      {isTxnBtnClicked && (
        <div className={styles.bankDetailsEntireCon}>
          <div className={styles.bankDetailsCon}>
            <h5 className={styles.title}>
              Select a Bank Account to Update Transactions
            </h5>

            <div>
              {bankNameOptionsOnly?.map((each: any, index: number) => {
                return (
                  <Radio
                    key={index}
                    checked={isOptSelected === each?.value}
                    label={each?.label}
                    onChange={() => setIsOptSelected(each?.value)}
                    className={styles.radioStyles}
                  />
                );
              })}
            </div>
            <div className={styles.buttonsContainer}>
              <FormButton
                className={styles.buttonStyles}
                onClick={() => {
                  if (isOptSelected) {
                    router.push(
                      `${ApplicationURLS.USER_UPLOAD_TRANSACTIONS}/${isOptSelected}`
                    );
                  } else {
                    toast.error("Please select a Bank account");
                  }
                }}
              >
                {"Continue"}
              </FormButton>

              <Button
                className={styles.CancelButtonStyles}
                type="button"
                onClick={() => {
                  setIsOptSelected("");
                  setIsTxnBtnClicked(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookKeepingList;
