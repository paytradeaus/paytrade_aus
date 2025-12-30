"use client";
import React, { useCallback, useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import Overlays from "@/components/Overlayes/Overlayes";
import { ArrowClockwise, ThreeDots } from "react-bootstrap-icons";
import styles from "./audit.module.scss";
import { useRouter, useSearchParams } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { Col, Container, Row } from "react-bootstrap";
import { getAllAuditReportList } from "./audit.functions"; // Adjust the import path as needed
import { getCookie } from "cookies-next";
import { formatDate } from "@/common/commonFunctions";
import {
  AccountTypeList,
  AuditReportType,
  DateOptions,
} from "./adminConstantData";
import FormButton from "@/components/Button/button";
import { DD_MM_YYYY } from "@/common/constants/general";
import { FetchAllBankAccounts } from "../../bankTrustAccount/backTrustAccount.functions";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { addDays, format, lastDayOfMonth } from "date-fns";
import { RowsPerPageInTable } from "@/common/constants";
import { ApplicationURLS } from "@/common/applicationURLS";
import { jwtDecode } from "jwt-decode";

const Audit = () => {
  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const AdminCompanyId = getCookie("compId");
  const router = useRouter();
  const [accountList, setAccountList] = useState<any[]>([]);
  const [selectedAccountName, setSelectedAccountName] = useState<any>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<any>("");
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [activityDate, setActivityDate] = useState("");
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "",
    label: "All Dates",
  });
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );

  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [data, setData] = useState<AuditReportType[]>([]);
  const [filter, setFilter] = useState<AuditReportType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<string | null>(null);

  const [bankAccountID, setBankAccID] = useState(Number(BankAccId));

  useEffect(() => {
    const token = localStorage.getItem("accessToken"); // Adjust according to your token storage
    if (token) {
      const decodedToken: any = jwtDecode(token);
      setRole(decodedToken?.role);
    }
  }, []);

  const selectedAccId = BankAccId
    ? Number(BankAccId)
    : selectedAccountName?.value
    ? Number(selectedAccountName?.value)
    : 0;

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
        response?.extendedBankAccounts?.length > 0
      ) {
        const customOption = response.extendedBankAccounts.map((data: any) => ({
          label: data.account_name,
          value: data.bank_account_id.toString(),
          data: data,
        }));
        // setSelectedAccountName(customOption?.[0]);
        setAccountList(customOption || []);
        if (BankAccId) {
          const selectedOption = customOption.find(
            (option: any) => option.value === BankAccId
          );
          setSelectedAccountName(selectedOption || null);
        } else {
          setSelectedAccountName(customOption?.[0]);
        }
      }
    })();
  }, [AdminCompanyId, BankAccId, selectedCompanyId]);

  useEffect(() => {
    if (bankAccountID) {
      fetchAuditReports(page, perPage);
    }
  }, [
    selectedCompanyId,
    bankAccountID,
    activityLogStartDate,
    activityLogEndDate,
    singleActivityDate,
    selectedCompanyId,
    selectedAccountType,
  ]);

  const fetchAuditReports = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const result = await getAllAuditReportList(
        {
          company_id: AdminCompanyId
            ? Number(AdminCompanyId)
            : selectedCompanyId || 0,
          bank_account_id: Number(bankAccountID) || null,
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
        },
        setLoading
      );

      if (result) {
        setData(result.report_list);
        setFilter(result.report_list);
      }
    } catch (error) {
      console.error("Error fetching audit reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (selectedValue: any) => {
    setSelectedAccountName(selectedValue);
  };

  const handleTypeChange = (selectedType: any) => {
    setSelectedAccountType(selectedType);
  };

  const handleActivityChange = (selectedValue: any) => {
    setTimeKey(new Date().getTime());
    setSingleActivityDate(selectedValue);
    setIsCustomDate(selectedValue.value === "Custom");
    setActivityDate(selectedValue.value);
  };

  const handleAddNewClick = () => {
    if (role === "PORTAL ADMIN") {
      const bankId = getCookie("bankId");
      const compId = getCookie("compId");
      router.push(
        `${ApplicationURLS?.ADMIN_AUDIT_ADD}?bank=${bankId}&company=${compId}`
      );
    } else {
      router.push(ApplicationURLS?.USER_AUDIT_ADD);
    }
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchAuditReports(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await fetchAuditReports(page, newPerPage);
  };

  const handleOptionClick = async (data: { option: string; id: string }) => {
    const { id, option } = data;

    if (option === "Edit") {
      if (role === "PORTAL ADMIN") {
        router.push(`${ApplicationURLS.ADMIN_AUDIT_EDIT}/${id}`);
      } else {
        router.push(`${ApplicationURLS.USER_AUDIT_EDIT}/${id}`);
      }
    } else if (option === "View") {
      if (role === "PORTAL ADMIN") {
        router.push(`${ApplicationURLS.ADMIN_AUDIT_VIEW}/${id}`);
      } else {
        router.push(`${ApplicationURLS.USER_AUDIT_VIEW}/${id}`);
      }
    }
  };

  const handleRowView = (row: AuditReportType) => {
    router.push(`${ApplicationURLS.USER_AUDIT_VIEW}/${row?.id}`);
  };

  const handleFileDownload = (base64String: any, fileName: any) => {
    // Decode the base64 string (remove the data URL prefix)
    const base64Data = base64String.split(",")[1];

    // Convert base64 string to a binary string
    const binaryString = window.atob(base64Data);

    // Create an array of 8-bit unsigned integers
    const bytes = new Uint8Array(binaryString?.length);
    for (let i = 0; i < binaryString?.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create a Blob from the bytes array
    const blob = new Blob([bytes], { type: "application/pdf" });

    // Create a link element and trigger a download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName; // Use the provided file name
    document.body.appendChild(link);
    link.click();

    // Clean up and remove the link element
    document.body.removeChild(link);
  };

  const handleTrustAccountingRowClick = (tab: string, row: AuditReportType) => {
    const tabParam = new URLSearchParams({
      tab,
    }).toString();
    if (role === "PORTAL ADMIN") {
      router.push(
        `/admin/journals/trust-accounting?${tabParam}&bank=${row?.bank_account_id}&comp=${row?.company_id}`
      );
    } else {
      router.push(
        `/user/trust-accounting?${tabParam}&bank=${row?.bank_account_id}`
      );
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
  const handleBankRowClick = (tab: string, row: AuditReportType) => {
    const tabParam = new URLSearchParams({
      tab,
    }).toString();
    if (role === "PORTAL ADMIN") {
      router.push(
        `/admin/journals/trust-accounting//bank?screen=view&company=${
          AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId
        }&bank=${row?.bank_account_id}&account=${
          row?.bank_account_id
        }&statement=${row?.statement_id}`
      );
    } else {
      router.push(
        `/user/bank-accounts/overview/bank-statement?screen=view&company=${
          AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId
        }&bank=${row?.bank_account_id}&account=${
          row?.bank_account_id
        }&statement=${row?.statement_id}`
      );
    }
  };

  const columns = [
    {
      name: "Date",
      maxWidth: "66px",
      wrap: true,
      center: true,
      selector: (row: AuditReportType) =>
        row?.audit_date ? formatDate(row?.audit_date) : null,
    },
    {
      name: "Bank Account Name",
      selector: (row: AuditReportType) => row.account_name,
      wrap: true,
    },
    {
      name: "Bank Statement",
      cell: (row: AuditReportType) => (
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleBankRowClick("bank-statements", row);
          }}
          className={styles.link}
        >
          View
        </a>
      ),
      wrap: true,
      center: true,
    },
    {
      name: "Ledger Journals",
      cell: (row: AuditReportType) => (
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleTrustAccountingRowClick("Journals", row);
          }}
          className={styles.link}
        >
          View
        </a>
      ),
      wrap: true,
      center: true,
    },
    {
      name: "Ledger",
      cell: (row: AuditReportType) => (
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleTrustAccountingRowClick("Account Ledger", row);
          }}
          className={styles.link}
        >
          View
        </a>
      ),
      wrap: true,
      center: true,
    },
    {
      name: "Trial Balance Statement",
      cell: (row: AuditReportType) => (
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleTrustAccountingRowClick("Trial Balance Statement", row);
          }}
          className={styles.link}
        >
          View
        </a>
      ),
      wrap: true,
      center: true,
    },
    {
      name: "Record of Deposit and Withdrawls",
      cell: (row: AuditReportType) => (
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleTrustAccountingRowClick(
              "Deposits and Withdrawals Report",
              row
            );
          }}
          className={styles.link}
        >
          View
        </a>
      ),
      wrap: true,
      center: true,
    },
    {
      name: "Reconciliation Record",
      cell: (row: AuditReportType) => (
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleTrustAccountingRowClick("Reconciliation Record", row);
          }}
          className={styles.link}
        >
          View
        </a>
      ),
      wrap: true,
      center: true,
    },
    {
      name: "Audit Report",
      cell: (row: AuditReportType) => (
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleFileDownload(row?.file, row?.file_name);
          }}
          className={styles.link}
        >
          View
        </a>
      ),
      wrap: true,
      center: true,
    },
    {
      name: "Action",
      cell: (row: AuditReportType, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            { label: "View", value: "View" },
            { label: "Edit", value: "Edit" },
          ]}
          cellData={{
            id: row?.id,
          }}
          optionClick={(data) => handleOptionClick({ ...data })}
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
          onChange={(data) => {
            setBankAccID(data.value);
            setSelectedAccountName(data);
          }}
          disabled={false}
          placeholder="Account Name"
          className={styles.textFieldStyles}
          singleSelectedData={selectedAccountName}
        />
        <SearchableSelect
          options={AccountTypeList}
          onChange={handleTypeChange}
          disabled={false}
          placeholder="Account Type"
          className={styles.textFieldStyles}
          singleSelectedData={selectedAccountType}
        />
        <SearchableSelect
          options={DateOptions}
          onChange={handleActivityChange}
          placeholder="Dates"
          singleSelectedData={singleActivityDate}
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
      </div>
    </div>
  );

  return (
    <>
      <Row className="mb-4">
        <Col lg={10}></Col>
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
          data={filter?.length > 0 ? filter : []}
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
      </div>
    </>
  );
};

export default Audit;
