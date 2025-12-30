"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import styles from "./transactionList.module.scss";
import { useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  convertPositiveDecimalTwoDigit,
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import FormButton from "@/components/Button/button";
import { RowsPerPageInTable } from "@/common/constants";
import { DD_MM_YYYY } from "@/common/constants/general";
import { AppModal } from "@/components/model/model";

import { getCookie } from "cookies-next";
import debounce from "lodash/debounce";

import {
  DeleteTransactions,
  FetchAllTransactions,
} from "../../backTrustAccount.functions";
import { ITransactions } from "../../bankTrustAccount.types";
import { ApplicationURLS } from "@/common/applicationURLS";
import CryptoJS from "crypto-js";
import { ExcludeTransactions } from "../matchTransactions/matchTransactions.functions";
import { toast } from "@/app/Toaster";
import CustomSubHeader from "./customSubHeader";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";

const TransactionList = (props: any) => {
  const { bankAccountId, setRefreshOverviewOnAction } = props;
  const router = useRouter();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
  const dispatch = useDispatch();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
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
  const [selectedRowsInGrid, setSelectedRowsInGrid] = useState([]);
  const [btnDisabled, setBtnDisabled] = useState<boolean>(true);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [openExcludeCheck, setOpenExcludeCheck] = useState(false);

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
        bank_account_id: bankAccountId || null,
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
          bankAccountId: bankAccountId,
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
        setOpenExcludeCheck(true);
        // toast.warning(
        //   "You can perform Exclude action with Two transactions only."
        // );
      }
    }
    if (option === "Unmatched") {
      setActionData(data);
      setBtnDisabled(false);
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to unmatch this transactions?",
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

    if (actionData.option === "Unmatched") {
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
          bankAccountId: bankAccountId,
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
            setRefreshOverviewOnAction &&
              setRefreshOverviewOnAction(new Date().getTime());
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
            setRefreshOverviewOnAction &&
              setRefreshOverviewOnAction(new Date().getTime());
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
          setRefreshOverviewOnAction &&
            setRefreshOverviewOnAction(new Date().getTime());
        }
      }
    }
  };

  const handleChange = (state: any) => {
    // let selectedRows=unique_txn_id
    let gridSelectedRows = state?.selectedRows.map(
      (row: ITransactions) => row?.id
    );
    setSelectedRowsInGrid(gridSelectedRows);
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
  function downloadExcel() {
    const columnNames = [
      { value: "unique_txn_id", label: "Txn ID" },
      { value: "description", label: "Description" },
      { value: "status", label: "Status" },
      { value: "matched_to", label: "Matched to" },
      { value: "spent_amount", label: "Spent Amount" },
      { value: "received_amount", label: "Received Amount" },
      { value: "txn_date", label: "Txn Date" },
    ];
    convertJsonToExcel(printDocumentData, "Transactions list", columnNames);
  }
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((txn: any) => [
      txn?.unique_txn_id,
      txn?.description,
      txn?.status,
      txn?.matched_to,
      txn?.spent_amount,
      txn?.received_amount,
      txn?.txn_date,
    ]);
    let headerNames: string[] = [
      "Txn ID",
      "Description",
      "Status",
      "Matched to",
      "Spent Amount",
      "Received Amount",
      "Txn Date",
    ];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "Transactions list",
      true
    );
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
      minWidth: "150px",
      selector: (row: ITransactions) =>
        row?.received_amount
          ? `$ ${convertPositiveDecimalTwoDigit(row?.received_amount, true)}`
          : "",
      wrap: true,
      right: true,
    },

    {
      name: "Matched To?",
      minWidth: "180px",
      // fixed: "left",
      wrap: true,
      grow: true,
      selector: (row: ITransactions) => row?.matched_to || "",
    },
    {
      name: "Status",
      maxWidth: "150px",
      fixed: "right",
      grow: true,
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
    <div className={styles.gridMainContainer}>
      <div className={styles.headerAndButtonCon}>
        {/* <span className={styles.headerText}>Blog</span> */}
        <FormButton
          className={styles.buttonStyles}
          onClick={() =>
            router.push(
              `${ApplicationURLS.USER_UPLOAD_TRANSACTIONS}/${bankAccountId}`
            )
          }
        >
          + Transactions
        </FormButton>
      </div>

      <ReusableDataTable
        key={timeKey}
        columns={columns}
        data={transactionData}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            search={search}
            onInputChange={onInputChange}
            selectedToggle={selectedToggle}
            setSelectedToggle={setSelectedToggle}
            singleActivyDate={singleActivyDate}
            handleActivityChange={handleActivityChange}
            isCustomDate={isCustomDate}
            activityLogStartDate={activityLogStartDate}
            setActivityLogStartDate={setActivityLogStartDate}
            activityLogEndDate={activityLogEndDate}
            setActivityLogEndDate={setActivityLogEndDate}
            printDocumentData={printDocumentData}
            handlePrintPDF={handlePrintPDF}
            downloadExcel={downloadExcel}
            setSelectedRowsInGrid={setSelectedRowsInGrid}
            setTimeKey={setTimeKey}
          />
        }
        pagination
        selectableRows={selectedToggle === "To Review" || false}
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
    </div>
  );
};

export default TransactionList;
