"use client";
import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  ThreeDots,
} from "react-bootstrap-icons";
import styles from "./reconciliation.module.scss";
import { useRouter, useSearchParams } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { Col, Container, Row } from "react-bootstrap";
import {
  deleteReconciliationReportDetails,
  generateAndPrintPDF,
  getAllReconciliationReportList,
  ReconciliationReportType,
} from "./reconciliation.functions";
import { getCookie } from "cookies-next";
import { FetchAllBankAccounts } from "../../bankTrustAccount/backTrustAccount.functions";
import { AccountTypeList, DateOptions, tabs } from "./adminConstantData";
import { DD_MM_YYYY } from "@/common/constants/general";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import FormButton from "@/components/Button/button";
import { format } from "date-fns";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import { ApplicationURLS } from "@/common/applicationURLS";
import TabContainer from "@/container/adminModules/addGroups/tabsContainer";
import { convertJsonToExcel, formatDate } from "@/common/commonFunctions";
import { jwtDecode } from "jwt-decode";

const Reconciliation = (props: any) => {
  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const AdminCompanyId = getCookie("compId");

  const { isArchived = false } = props;

  const router = useRouter();
  const [accountList, setAccountList] = useState<any[]>([]);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [selectedAccountName, setSelectedAccountName] = useState<any>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<any>("");
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [actionData, setActionData] = useState<any>();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [activityDate, setActivityDate] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [data, setData] = useState<ReconciliationReportType[]>([]);
  const [filter, setFilter] = useState<ReconciliationReportType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );

  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "",
    label: "All Dates",
  });

  const [activeTab, setActiveTab] = useState(
    isArchived ? tabs[1].id : tabs[0].id
  );

  const [statusValue, setStatusValue] = useState(isArchived ? true : "");

  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);

  const selectedAccId = selectedAccountName?.value
    ? Number(selectedAccountName.value)
    : 0;
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken"); // Adjust according to your token storage
    if (token) {
      const decodedToken: any = jwtDecode(token);
      setRole(decodedToken?.role);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const response = await FetchAllBankAccounts({
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        page: 1,
        items_per_page: null,
        is_alphabetical_order: true,
        account_type: AdminCompanyId
          ? null
          : "Project Trust Account, Retention Trust Account",
      });
      if (
        response?.extendedBankAccounts &&
        response?.extendedBankAccounts.length > 0
      ) {
        const customOption = response.extendedBankAccounts.map((data: any) => ({
          label: data.account_name,
          value: data.bank_account_id.toString(),
          data: data,
        }));
        setAccountList(customOption || []);
        // Check if BankAccId is present and set the corresponding account
        const selectedAccount = customOption.find(
          (option: any) => option.value === BankAccId
        );

        if (selectedAccount) {
          setSelectedAccountName(selectedAccount);
        } else {
          setSelectedAccountName(customOption?.[0]);
        }
      }
    })();
  }, [AdminCompanyId, selectedCompanyId, BankAccId]);

  const handleActivityChange = (selectedValue: any) => {
    setTimeKey(new Date().getTime());
    setSingleActivityDate(selectedValue);
    setIsCustomDate(selectedValue.value === "Custom");
    setActivityDate(selectedValue.value);
  };

  const handleSelectChange = (selectedValue: any) => {
    setSelectedAccountName(selectedValue);
  };

  const handleTypeChange = (selectedType: any) => {
    setSelectedAccountType(selectedType);
  };

  const handleAddNewClick = () => {
    if (role === "PORTAL ADMIN") {
      // Get the bankId and compId before clearing them
      const bankId = getCookie("bankId");
      const compId = getCookie("compId");
      router.push(
        `${ApplicationURLS.ADMIN_RECONCILIATION_ADD}?bank=${bankId}&company=${compId}`
      );
    } else {
      router.push(ApplicationURLS.USER_RECONCILIATION_ADD);
    }
  };

  const handleDeleteFunction = async (actionData: any) => {
    setOpenModal(false); // Close the modal
    try {
      await deleteReconciliationReportDetails({
        id: actionData?.id,
        report_status: "Deleted",
        report_id: actionData?.report_id,
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
      });
      // Refresh the project list after deletion
      fetchData(page, perPage);
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const response = await getAllReconciliationReportList(
      {
        company_id: AdminCompanyId
          ? Number(AdminCompanyId)
          : selectedCompanyId || null,
        bank_account_id: selectedAccId || null,
        account_type: selectedAccountType?.value || "",
        date_filter: singleActivityDate?.value,
        start_date: isCustomDate
          ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
          : null,
        end_date: isCustomDate
          ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
          : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        page_number: page,
        page_size: rowsPerPage,
        isArchived: statusValue,
      },
      setLoading
    );
    if (response) {
      setData(response.report_list);
      setFilter(response.report_list);
      setTotalRows(response?.total_count || 0);
      let printDataObjCreation = response.report_list?.map((report: any) => {
        return {
          month_end_date: formatDate(report?.month_end_date),
          account_name: report?.account_name,
          bank_statement_balance: report?.bank_statement_balance,
          adjustments: report?.adjustments,
          adjustment_comment: report?.adjustment_comment,
          expected_balance: report?.expected_balance,
          deposit_withdrawal_balance: report?.deposit_withdrawal_balance,
          account_ledger_balance: report?.account_ledger_balance,
          reconcile_status: report?.reconcile_status,
        };
      });
      setPrintDocumentData(printDataObjCreation);
    }
  };

  useEffect(() => {
    if (selectedAccId) {
      fetchData(page, perPage);
    }
  }, [
    selectedAccId,
    activityLogStartDate,
    activityLogEndDate,
    singleActivityDate,
    selectedCompanyId,
    selectedAccountType,
    statusValue,
  ]);

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await fetchData(page, newPerPage);
  };

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((report: any) => [
      report?.month_end_date,
      report?.account_name,
      report?.bank_statement_balance,
      report?.adjustments,
      report?.adjustment_comment,
      report?.expected_balance,
      report?.deposit_withdrawal_balance,
      report?.account_ledger_balance,
      report?.reconcile_status,
    ]);
    let headerNames: string[] = [
      "Date",
      "Bank Account Name",
      "Bank Statement Balance",
      "Adjustments",
      "Adjustment Comments",
      "Expected Balance",
      "Record of Deposit and Withdrawals Balance",
      "Trust Account Ledger Balance",
      "Reconcile Status",
    ];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "Reconciliation Record List",
      true
    );
  };

  function downloadExcel() {
    const columnNames = [
      { value: "month_end_date", label: "Date" },
      { value: "account_name", label: "Bank Account Name" },
      { value: "bank_statement_balance", label: "Bank Statement Balance" },
      { value: "adjustments", label: "Adjustments" },
      { value: "adjustment_comment", label: "Adjustment Comments" },
      { value: "expected_balance", label: "Expected Balance" },
      {
        value: "deposit_withdrawal_balance",
        label: "Record of Deposit and Withdrawals Balance",
      },
      {
        value: "account_ledger_balance",
        label: "Trust Account Ledger Balance",
      },
      { value: "reconcile_status", label: "Reconcile Status" },
    ];
    convertJsonToExcel(
      printDocumentData,
      "Reconciliation Record List",
      columnNames
    );
  }

  const handleExportExcel = () => {
    if (printDocumentData?.length) {
      downloadExcel();
    }
  };
  const resetFilters = () => {
    // Reset any filtering criteria here
    // setSelectedAccountName("");
    setSingleActivityDate({ value: "", label: "All Dates" });
    setIsCustomDate(false);
    setSelectedAccountName(accountList?.[0]);
    setSelectedAccountType("");

    // Trigger the reset in the table
  };
  const isAnyFilterActive =
    singleActivityDate.label !== "All Dates" ||
    selectedAccountType !== "" ||
    (accountList?.length > 0 &&
      selectedAccountName?.value &&
      accountList?.[0].value !== selectedAccountName?.value);
  const handleOptionClick = async (data: {
    report_id: string;
    option: string;
    id: string;
  }) => {
    const { id, report_id, option } = data;

    if (option === "Edit") {
      if (role === "PORTAL ADMIN") {
        router.push(`${ApplicationURLS.ADMIN_RECONCILIATION_EDIT}/${id}`);
      } else {
        router.push(`${ApplicationURLS.USER_RECONCILIATION_EDIT}/${id}`);
      }
    } else if (option === "Delete") {
      setOpenModal(true);
      setActionData(data);
    } else if (option === "View") {
      if (role === "PORTAL ADMIN") {
        router.push(`${ApplicationURLS.ADMIN_RECONCILIATION_VIEW}/${id}`);
      } else {
        router.push(`${ApplicationURLS.USER_RECONCILIATION_VIEW}/${id}`);
      }
    }
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    } else {
      setActiveTab(tabId);
      if (tabId === "ArchivedReports") {
        setStatusValue(true);
      } else {
        setStatusValue(false);
      }
    }
  };

  const handleRowView = (row: ReconciliationReportType) => {
    router.push(`${ApplicationURLS.USER_RECONCILIATION_VIEW}/${row?.id}`);
  };

  const columns = [
    {
      name: "Date",
      wrap: true,
      center: true,
      selector: (row: ReconciliationReportType) =>
        row?.month_end_date ? formatDate(row?.month_end_date) : null,
    },
    {
      name: "Bank Account Name",
      selector: (row: ReconciliationReportType) => row.account_name,
      wrap: true,
    },
    {
      name: "Bank Statement Balance",
      selector: (row: ReconciliationReportType) => row.bank_statement_balance,
      wrap: true,
      right: true,
    },
    {
      name: "Adjustments",
      selector: (row: ReconciliationReportType) => row.adjustments,
      wrap: true,
      right: true,
    },
    {
      name: "Adjustment Comments",
      selector: (row: ReconciliationReportType) => row.adjustment_comment,
      wrap: true,
    },
    {
      name: "Expected Balance",
      selector: (row: ReconciliationReportType) => row.expected_balance,
      wrap: true,
      right: true,
    },
    {
      name: "Record of Deposit and Withdrawals Balance",
      selector: (row: ReconciliationReportType) =>
        row.deposit_withdrawal_balance,
      wrap: true,
      right: true,
    },
    {
      name: "Trust Account Ledger Balance",
      selector: (row: ReconciliationReportType) => row.account_ledger_balance,
      wrap: true,
      right: true,
    },
    {
      name: "Reconcile Status",
      selector: (row: ReconciliationReportType) => row.reconcile_status,
      wrap: true,
      center: true,
    },
    {
      name: "Action",
      cell: (row: ReconciliationReportType, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          cellData={{
            report_id: row?.report_id,
            id: row?.id,
          }}
          optionClick={(data) => handleOptionClick({ ...data })}
          popoverActions={
            statusValue
              ? [{ label: "View", value: "View" }]
              : [
                  { label: "View", value: "View" },
                  { label: "Edit", value: "Edit" },
                  { label: "Delete", value: "Delete", isDelete: true },
                ]
          }
          popperConfig={{
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [20, 10],
                },
              },
            ],
          }}
        >
          <div className={styles.dotsContainer}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <SearchableSelect
          options={accountList}
          onChange={handleSelectChange}
          disabled={false}
          placeholder="Account Name"
          className={styles.textFieldStyles}
          selectedData={selectedAccountName}
        />

        <SearchableSelect
          options={AccountTypeList}
          onChange={handleTypeChange}
          disabled={false}
          placeholder="Account Type"
          className={styles.textFieldStyles}
          selectedData={selectedAccountType}
        />

        <SearchableSelect
          options={DateOptions}
          onChange={handleActivityChange}
          placeholder="Dates"
          selectedData={singleActivityDate}
          className={styles.textFieldStyles}
        />

        <div className={styles.datePickerIcon}>
          {isCustomDate && (
            <>
              <CustomDatePicker
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
                    setTimeKey(new Date().getTime());
                    setActivityLogStartDate(fromDate);
                    setActivityLogEndDate(new Date(selectedDate));
                  } else {
                    setTimeKey(new Date().getTime());
                    setActivityLogStartDate(fromDate);
                  }
                }}
                disabled={false}
                format={DD_MM_YYYY}
                className={styles.DatePickerCustomStyles}
              />
              <CustomDatePicker
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
                    setTimeKey(new Date().getTime());
                    setActivityLogEndDate(toDate);
                  }
                }}
                disabled={false}
                format={DD_MM_YYYY}
                maxDate={new Date()}
                className={styles.DatePickerCustomStyles}
              />
            </>
          )}
        </div>

        {isAnyFilterActive && (
          <div>
            <button onClick={resetFilters} className={styles.resetButton}>
              <ArrowClockwise /> Reset Filters
            </button>
          </div>
        )}

        <div className={styles.headerIconCon}>
          {printDocumentData?.length > 0 && (
            <>
              <span
                className={styles.iconStyles}
                onClick={() => {
                  handlePrintPDF();
                }}
                title="Print PDF"
              >
                <Printer />
              </span>
              <span
                className={styles.iconStyles}
                onClick={handleExportExcel}
                title="Export to Excel"
              >
                <FileEarmarkExcel />
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Row>
        <Col lg={10}>
          <TabContainer
            tabs={tabs}
            activeTab={activeTab}
            onTabClick={handleTabClick}
          />
        </Col>
        <Col lg={2}>
          <FormButton
            className={styles.buttonStyles}
            onClick={handleAddNewClick}
          >
            + New
          </FormButton>
        </Col>
      </Row>
      <div className={styles.dataContainer}>
        <ReusableDataTable
          columns={columns}
          data={filter}
          subHeader
          subHeaderComponent={<CustomSubHeader />}
          bottomText
          pagination
          paginationServer
          progressPending={loading}
          paginationTotalRows={totalRows}
          onChangeRowsPerPage={handlePerRowsChange}
          onChangePage={handlePageChange}
          onRowClicked={(data: any) => handleRowView(data)}
        />

        <AppModal
          show={openModal}
          onHide={() => setOpenModal(false)}
          firstButtonLabel="Yes"
          secondButtonLabel="No"
          modalHeading=""
          modalBodyTitle=""
          modalBodyContent={
            "Are you sure you wish to move the reconciliation record to the archive with status updated to Deleted?"
          }
          onConfirm={() => handleDeleteFunction(actionData)}
        />
      </div>
    </>
  );
};

export default Reconciliation;
