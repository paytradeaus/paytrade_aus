"use client";
import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { FileEarmarkExcel, Printer } from "react-bootstrap-icons";
import styles from "./adminLedger.module.scss";
import { Col, Container, Row } from "react-bootstrap";

import {
  sampleData,
  UserData,
} from "../../../container/userModules/trustAccounting/ledger/adminConstantData";
import {
  convertJsonToViewExcel,
  generatePDF,
  getLedgerServices,
  LedgerType,
} from "../../../container/userModules/trustAccounting/ledger/ledger.funtions";
import { formatDate } from "@/common/commonFunctions";
import { getCookie } from "cookies-next";
import { RowsPerPageInTable } from "@/common/constants";
import { LedgerTable } from "../../../container/userModules/trustAccounting/ledger/ledgerTable";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { DD_MM_YYYY } from "@/common/constants/general";
import { transactionsDateOptions } from "../../../container/userModules/bankTrustAccount/bankTrustAccount.constant";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
interface HeaderBase {
  value: string;
  label: string;
}

interface MergedHeader extends HeaderBase {
  colspan: number;
  align: string;
}

type Header = {
  value: string;
  label: string;
  colspan?: number;
  align?: string;
};
const AdminLedger = () => {
  const QueryBankId = useSearchParams().get("bank");
  const router = useRouter();
  const routePath = usePathname();

  console.log("🚀 ~ AdminLedger ~ QueryBankId:", QueryBankId);
  const [selectedValue, setSelectedValue] = useState("");
  const [selectedRowsInGrid, setSelectedRowsInGrid] = useState([]);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityDate, setActivityDate] = useState("");
  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "",
    label: "All Dates",
  });
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [totalRows, setTotalRows] = useState(0);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<any>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<any>();
  const [ledgerListData, setLedgerListData] = useState<LedgerType[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
  };
  const generateFormatDate = (valueOfDate: any) =>
    valueOfDate ? formatDate(valueOfDate) : "";
  const handlePrintPDF = () => {
    // Define date range
    const startDate = isCustomDate ? formatDate(activityLogStartDate) : null;
    const endDate = isCustomDate ? formatDate(activityLogEndDate) : null;

    // Function to format data for PDF
    const formatDataForPDF = (ledgerListData: any[]) => {
      return ledgerListData.flatMap((ledger: any) => {
        // Prepare each row with consistent column data
        const rows = ledger.entries.map((entry: any) => [
          generateFormatDate(entry?.journal_date) || "", // Date
          entry?.journal_description || "", // Transaction
          entry?.journal_number ? `#${entry?.journal_number}` : "", // Reference
          entry?.debit_amount || "", // Debit
          entry?.credit_amount || "", // Credit
          entry?.balance_amount || "", // Balance
        ]);

        // Add summary rows
        rows.push([
          "", // Date
          `Total ${ledger?.account_name}` || "", // Transaction
          "", // Reference
          ledger?.total_debit_amount || "", // Debit
          ledger?.total_credit_amount || "", // Credit
          "", // Balance
        ]);

        rows.push([
          "", // Date
          "Net Movement", // Transaction
          "", // Reference
          ledger?.debit_net_movement || "", // Debit
          ledger?.credit_net_movement || "", // Credit
          "", // Balance
        ]);

        // Mark the last row of each set as bold
        return rows.map((row: any, index: any, array: any) => ({
          row,
          bold: index === array.length - 1,
        }));
      });
    };

    // Define header names and styles
    const headerNames = [
      "Date",
      "Transaction",
      "Reference",
      "Debit",
      "Credit",
      "Balance",
    ];
    const columnStyles = {
      3: { halign: "right" }, // Debit column (index 3)
      4: { halign: "right" }, // Credit column (index 4)
      5: { halign: "right" }, // Balance column (index 5)
      1: { halign: "left" }, // Account column (index 1)
    };

    const dateText = isCustomDate
      ? `Trust account ledger report\nRetention Trust Account\nFrom [${startDate}] To [${endDate}]`
      : `Trust account ledger report\nRetention Trust Account`;

    // Generate and print the PDF
    generatePDF(
      formatDataForPDF(ledgerListData),
      headerNames,
      "current-account-ledger",
      true,
      columnStyles,
      dateText
    );
  };

  const handleExportExcel = () => {
    if (printDocumentData?.length) {
      downloadExcel();
    }
  };

  const formatTextLine = (data: any[], keyName: string, isAmt = true) => {
    return data
      ?.map((v, i) =>
        v?.[keyName] === null || !v?.[keyName]
          ? ` ${data?.length === i + 1 ? "" : "\n"}`
          : `${keyName === "journal_number" ? "#" : ""}${v?.[keyName]}${
              data?.length === i + 1 ? "" : "\n"
            }`
      )
      ?.join("");
  };

  const downloadExcel = () => {
    // Define start and end dates based on custom date range
    const startDate = isCustomDate ? formatDate(activityLogStartDate) : null;
    const endDate = isCustomDate ? formatDate(activityLogEndDate) : null;

    // Function to format Excel data
    const formattedExcelData = () => {
      return ledgerListData.flatMap((ledger: any) => {
        const accountName = ledger?.account_name || "";
        const openingBalance = ledger?.opening_balance || "";
        const totalDebit = ledger?.total_debit_amount || "";
        const totalCredit = ledger?.total_credit_amount || "";
        const debitNetMovement = ledger?.debit_net_movement || "";
        const creditNetMovement = ledger?.credit_net_movement || "";

        // Create an initial row with the account name and opening balance
        const initialRow = {
          date: accountName,
          description: "",
          reference: "",
          debit: "",
          credit: "",
          balance: openingBalance,
        };

        // Map the rest of the entries
        const entryRows = ledger.entries.map((entry: any) => ({
          date: generateFormatDate(entry?.journal_date),
          description: entry?.journal_description || "",
          reference: entry?.journal_number ? `#${entry?.journal_number}` : "",
          debit: entry?.debit_amount || "",
          credit: entry?.credit_amount || "",
          balance: entry?.balance_amount || "",
        }));

        // Add total and net movement rows
        const totalRow = {
          date: "",
          description: `Total ${accountName}`,
          reference: "",
          debit: totalDebit,
          credit: totalCredit,
          balance: "",
        };

        const netMovementRow = {
          date: "",
          description: "Net movement",
          reference: "",
          debit: debitNetMovement,
          credit: creditNetMovement,
          balance: "",
        };

        // Return combined array
        return [initialRow, ...entryRows, totalRow, netMovementRow];
      });
    };

    // Define column names for the table
    const columnNames = [
      { value: "date", label: "Date" },
      { value: "description", label: "Transaction" },
      { value: "reference", label: "Reference" },
      { value: "debit", label: "Debit" },
      { value: "credit", label: "Credit" },
      { value: "balance", label: "Balance" },
    ];

    // Define the header row with additional merged headings
    const headers: Header[] = [
      {
        value: isCustomDate
          ? `Trust Account Ledger Report Example Retention Trust Account From [${startDate}] To [${endDate}]`
          : `Trust Account Ledger Report Example Retention Trust Account`,
        colspan: columnNames.length,
        align: "center",
        label: "",
      },
    ];

    // Convert JSON data to Excel with additional header
    convertJsonToViewExcel(
      formattedExcelData(),
      "current account ledger list",
      columnNames,
      headers // Pass the headers with the additional heading
    );
  };

  useEffect(() => {
    getBankAccountName();
  }, []);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem("companyId");

    if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
    }
  }, []);

  useEffect(() => {
    fetchData(page, perPage);
  }, [
    selectedValue,
    selectedAccountName,
    singleActivityDate,
    selectedBankAccount,
    activityLogStartDate,
    activityDate,
    activityLogEndDate,
    debouncedSearch,
  ]);

  useEffect(() => {
    fetchData(page, perPage);
  }, []);

  const handleActivityChange = (selectedValue: any) => {
    setSelectedRowsInGrid([]);
    setTimeKey(new Date().getTime());
    setSingleActivityDate(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue.value); // Perform any other actions based on the selected value
  };

  async function getBankAccountName() {
    const postData = {
      company_id: companyId,
    };
  }

  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const response = await getLedgerServices({
        page_number: page,
        page_size: rowsPerPage,
        bank_account_id: QueryBankId ? Number(QueryBankId) : "",
        date_filter: singleActivityDate?.value,
        start_date: isCustomDate
          ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
          : null,
        end_date: isCustomDate
          ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
          : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (response) {
        const responseData = JSON.parse(JSON.stringify(response));
        const newdata = response?.grid_entries?.map((prev: any) => {
          return {
            ...prev,
          };
        });
        setLedgerListData(newdata || []);

        setTotalRows(response?.total_count || 0);
        setPerPage(rowsPerPage);
        let printDataObjCreation = responseData?.grid_entries?.map(
          (ledger: LedgerType) => {
            return {
              date: ledger?.journal_date,
              account_name: ledger?.journal_description,
              credit: ledger?.activity_id,
              debit: ledger?.debit_amount,
              journal_description: ledger?.credit_amount,
              balance_amount: ledger?.balance_amount,
            };
          }
        );
        setPrintDocumentData(printDataObjCreation);
      } else {
        setLedgerListData([]);
        setTotalRows(0);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.customSubHeaderCon}>
        <div className={styles.dataContainer}>
          <ReusableBreadcrumb
            items={[
              {
                href: "/admin/dashboard",
                label: "Home",
                active: routePath === "/admin/dashboard",
              },
              {
                href: "/admin/journals",
                label: "Journals",
                active: routePath === "/admin/journals",
              },
              {
                href: "/admin/journals/account-ledger",
                label: "Account Ledger",
                active: routePath === "/admin/journals/account-ledger",
              },
            ]}
            separator={<span className={styles.separatorStyle}>&gt;</span>}
          />
          <div className={styles.headerAndButtonCon}>
            <span className={styles.headerText}>Account Ledger</span>
          </div>

          {/* <ReusableDataTable
        columns={columns}
        data={data}
        subHeader
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        subHeaderComponent={<CustomSubHeader />}
        pagination
        paginationServer
        progressPending={loading}
      /> */}
        </div>
        <div className={styles.textAndSelectCon}>
          <Row className="w-100">
            {/* <Col lg="3" md="6">
                <SearchableSelect
                  options={accountList}
                  onChange={(selectedOption: any) =>
                    setSelectedAccountName(selectedOption)
                  }
                  disabled={false}
                  placeholder="Select Trust Account"
                  selectedData={selectedAccountName}
                  className={styles.textFieldStyles}
                />
              </Col> */}
            <Col lg="4">
              <SearchableSelect
                options={transactionsDateOptions}
                onChange={handleActivityChange}
                disabled={false}
                placeholder="Dates"
                selectedData={singleActivityDate}
                className={styles.textFieldStyles}
              />
            </Col>
            <Col lg="4">
              <div className={styles.datepickerCustom}>
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
                          setSelectedRowsInGrid([]);
                          setTimeKey(new Date().getTime());
                          setActivityLogStartDate(fromDate);
                          setActivityLogEndDate(new Date(selectedDate));
                        } else {
                          setSelectedRowsInGrid([]);
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
                          setSelectedRowsInGrid([]);
                          setTimeKey(new Date().getTime());
                          setActivityLogEndDate(toDate);
                        }
                      }}
                      disabled={false}
                      format={DD_MM_YYYY}
                      className={styles.DatePickerCustomStyles}
                    />
                  </>
                )}
              </div>
            </Col>
            <Col lg="3"></Col>
            <Col lg="1" md="6">
              <div className={styles.headerIconCon}>
                <span
                  className={styles.iconStyles}
                  onClick={() => {
                    if (printDocumentData?.length) {
                      handlePrintPDF();
                    }
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
              </div>
            </Col>
          </Row>
        </div>
      </div>
      <div className={styles.mainContainer}>
        {ledgerListData.length === 0 ? (
          <p className={styles.noRecordStyle}>
            There are no records to display
          </p>
        ) : (
          <LedgerTable data={ledgerListData} />
        )}
      </div>
    </>
  );
};

export default AdminLedger;
