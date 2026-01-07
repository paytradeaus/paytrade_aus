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
import styles from "./journals.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  BankAccountData,
  fetchBankAccountsForJournals,
  fetchFiltersForAdminJournals,
  fetchFiltersForAdminTrustAccounting,
} from "./adminJournals.functions"; // Adjust the path to your service
import { check, statusOptions } from "./adminJournalsConstantData";
import {
  convertJsonToExcel,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { deleteCookie, setCookie } from "cookies-next";

const Journals = () => {
  const routePath = usePathname();
  const router = useRouter();
  const queryParams: any = useSearchParams();
  const balanceCheckStatus = queryParams.get("balance-check");

  const [selectedCompany, setSelectedCompany] = useState<any>("");
  const [selectedAccName, setSelectedAccName] = useState<any>("");
  const [selectedAccType, setSelectedAccType] = useState<any>("");
  const [selectedStatus, setSelectedStatus] = useState<any>("");
  const [selectedCheck, setSelectedCheck] = useState<any>("");
  const [data, setData] = useState<BankAccountData[]>([]);
  const [accountOptions, setAccountOptions] = useState<any>([]);
  const [accountTypeOptions, setAccountTypeOptions] = useState<any>([]);
  const [companyOptions, setCompanyOptions] = useState<any>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [isInitialRender, setIsInitialRender] = useState(true);

  //if balance check is error from query params update the dropdown data
  useEffect(() => {
    if (balanceCheckStatus === "error") {
      setSelectedCheck({ value: "Error", label: "Error" });
    }
    setIsInitialRender(false);
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [selectedCompany, selectedAccName, selectedAccType]);

  useEffect(() => {
    fetchData(page, perPage);
  }, [
    selectedCompany,
    selectedAccName,
    selectedAccType,
    selectedStatus,
    selectedCheck,
  ]);

  const resetFilters = () => {
    setSelectedCompany(null);
    setSelectedAccName(null);
    setSelectedAccType(null);
    setSelectedStatus(null);
    setSelectedCheck(null);
  };

  const isAnyFilterActive =
    selectedCompany?.value ||
    selectedAccName?.value ||
    selectedAccType?.value ||
    selectedStatus?.value ||
    selectedCheck?.value;

  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const response = await fetchBankAccountsForJournals({
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null, // Adjust as needed
        bank_account_id: selectedAccName?.value
          ? Number(selectedAccName?.value)
          : null, // Adjust as needed
        account_type: selectedAccType?.value || "", // Adjust as needed
        status: selectedStatus?.value || "", // Adjust as needed
        //on initial render with balance type error redirected from dashboard fetch only error data's
        balance_check:
          isInitialRender && balanceCheckStatus === "error"
            ? "Error"
            : selectedCheck?.value || "", // Adjust as needed
        page_number: page,
        page_size: rowsPerPage,
      });

      if (response) {
        deleteCookie("bankId");
        deleteCookie("compId");
        const responseData = JSON.parse(JSON.stringify(response));
        setData(response?.account_list || []);
        setTotalRows(response?.total_count || 0);

        setPerPage(rowsPerPage);
        const printDataObjCreation = responseData?.account_list?.map(
          (account: BankAccountData) => {
            return {
              company_name: account?.company_name,
              account_name: account?.account_name,
              account_type: account?.account_type,
              status: account?.status,
              balance_check: account?.balance_check,
            };
          }
        );

        setPrintDocumentData(printDataObjCreation);
      }
    } catch (error) {
      console.error("Error fetching bank accounts for journals:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    const result = await fetchFiltersForAdminTrustAccounting({
      company_id: selectedCompany?.value ? Number(selectedCompany.value) : null,
      bank_account_id: selectedAccName?.value
        ? Number(selectedAccName.value)
        : null,
      account_type: selectedAccType?.value || "",
    });

    if (result) {
      setAccountOptions([
        { label: "All", value: "" },
        ...result.account_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);

      setAccountTypeOptions([
        { label: "All", value: "" },
        ...result.account_type_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);

      setCompanyOptions([
        { label: "All", value: "" },
        ...result.company_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
    }
  };

  const handleCompanyChange = (selectedValue: any) => {
    setSelectedCompany(selectedValue);
  };

  const handleNameChange = (selectedValue: any) => {
    setSelectedAccName(selectedValue);
  };

  const handleTypeChange = (selectedValue: any) => {
    setSelectedAccType(selectedValue);
  };

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue);
  };

  const handleCheckChange = (selectedValue: any) => {
    setSelectedCheck(selectedValue);
  };

  const handleOptionClick = async (
    data: { option: string },
    row: BankAccountData
  ) => {
    const { option } = data;
    if (option === "View") {
      router.push(`${ApplicationURLS.ADMIN_TRUST_ACCOUNTING}`);
      setCookie("bankId", row?.bank_account_id);
      setCookie("compId", row?.company_id);
    }
  };

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((admin: any) => [
      admin?.company_name,
      admin?.account_name,
      admin?.account_type,
      admin?.status,
      admin?.balance_check,
    ]);
    let headerNames: string[] = [
      "Company Profile",
      "Account Name",
      "Account Type",
      "Status",
      "Balance Check",
    ];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "Trust Account Journals",
      true
    );
  };

  function downloadExcel() {
    const columnNames = [
      { value: "company_name", label: "Company Profile" },
      { value: "account_name", label: "Account Name" },
      { value: "account_type", label: "Account Type" },
      { value: "status", label: "Status" },
      { value: "balance_check", label: "Balance Check" },
    ];
    convertJsonToExcel(
      printDocumentData,
      "Trust Account Journals",
      columnNames
    );
  }

  const columns = [
    {
      name: "Company Profile",
      selector: (row: BankAccountData) => row?.company_name,
      wrap: true,
    },
    {
      name: "Account Name",
      selector: (row: BankAccountData) => row?.account_name,
      wrap: true,
    },
    {
      name: "Account Type",
      selector: (row: BankAccountData) => row?.account_type,
      wrap: true,
    },
    {
      name: "Status",
      selector: (row: BankAccountData) => row?.status,
      wrap: true,
    },
    {
      name: "Balance Check",
      selector: (row: BankAccountData) => row?.balance_check,
      cell: (row: BankAccountData) => (
        <span style={{ color: row?.balance_check === "Ok" ? "green" : "red" }}>
          {row?.balance_check}
        </span>
      ),
      wrap: true,
    },

    {
      name: "Action",
      cell: (row: BankAccountData) => {
        const actions: any = [{ value: "View", label: "View" }];

        return (
          <Overlays
            trigger="click"
            placement={"auto"}
            overlay={<span></span>}
            popoverTypes={"tableActions"}
            popoverActions={actions}
            optionClick={(data) => handleOptionClick(data, row)}
          >
            <div className={styles.dotsContainer}>
              <ThreeDots />
            </div>
          </Overlays>
        );
      },
    },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <SearchableSelect
          options={companyOptions}
          onChange={handleCompanyChange}
          disabled={false}
          selectedData={selectedCompany}
          placeholder="Company Profile"
        />
        <SearchableSelect
          options={accountOptions}
          onChange={handleNameChange}
          selectedData={selectedAccName}
          disabled={false}
          placeholder="Account Name"
        />
        <SearchableSelect
          options={accountTypeOptions}
          onChange={handleTypeChange}
          selectedData={selectedAccType}
          disabled={false}
          placeholder="Account Type"
        />
        <SearchableSelect
          options={statusOptions}
          onChange={handleStatusChange}
          selectedData={selectedStatus}
          disabled={false}
          placeholder="Status"
        />
        <SearchableSelect
          options={check}
          onChange={handleCheckChange}
          selectedData={selectedCheck}
          disabled={false}
          placeholder="Balance Check"
        />
        {isAnyFilterActive && (
          <button
            onClick={resetFilters}
            title="Reset Filters"
            className={styles.resetButton}
          >
            <ArrowClockwise className={styles.iconSpacing} />
            Reset Filters
          </button>
        )}
      </div>
      <div className={styles.headerIconCon}>
        {printDocumentData?.length > 0 && (
          <>
            <span
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
              onClick={() => {
                if (printDocumentData?.length) {
                  downloadExcel();
                }
              }}
              title="Export to Excel"
            >
              <FileEarmarkExcel />
            </span>
          </>
        )}
      </div>
    </div>
  );

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await fetchData(page, newPerPage);
  };

  const handleRowView = (row: BankAccountData) => {
    router.push(`${ApplicationURLS.ADMIN_TRUST_ACCOUNTING}`);
    setCookie("bankId", row?.bank_account_id);
    setCookie("compId", row?.company_id);
  };

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: "/admin/dashboard",
            label: "Home",
            active: routePath === "/admin/dashboard",
          },
          {
            href: "/admin/users",
            label: "Journals",
            active: routePath === "/admin/journals",
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Trust Account Journals</span>
      </div>

      <ReusableDataTable
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
        onRowClicked={(data: any) => handleRowView(data)}
      />
    </div>
  );
};

export default Journals;
