"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType, NA, VIEW } from "@/shared/constant/general";
import debounce from "lodash/debounce";
import { ICurrency } from "../journalList.types";
import {
  check,
  excelColumnNames,
  journalListHeaders,
  journalListPDFHeaders,
  journalRenderData,
  pdfDataRow,
  statusOptions,
} from "../journalList.constant";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import {
  BankAccountData,
  fetchBankAccountsForJournals,
  fetchFiltersForAdminTrustAccounting,
} from "../jornalList.functions";
import { useRouter, useSearchParams } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { connectWebSocket } from "@/utils";
interface RowData {
  account_name: string;
  account_type: string;
  balance_check: string;
  bank_account_id: string;
  closing_balance: number;
  company_id: string;
  company_name: string;
  id: string;
  status: string;
}
export default function AdminJournalsList() {
  const [search, setSearch] = useState("");
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [statusType, setStatusType] = useState<any>("");
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCheck, setSelectedCheck] = useState<any>("");
  const [accountOptions, setAccountOptions] = useState<any>([]);
  const [accountTypeOptions, setAccountTypeOptions] = useState<any>([]);
  const [companyOptions, setCompanyOptions] = useState<any>([]);
  const [page, setPage] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [data, setData] = useState<BankAccountData[]>([]);

  const [selectedCompany, setSelectedCompany] = useState<any>("");
  const [selectedAccName, setSelectedAccName] = useState<any>("");
  const [selectedAccType, setSelectedAccType] = useState<any>("");
  const [selectedStatus, setSelectedStatus] = useState<any>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [perPage, setPerPage] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryParams: any = useSearchParams();
  const [isInitialRender, setIsInitialRender] = useState(true);
  const balanceCheckStatus = queryParams.get("balance-check");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const isAnyFilterActive =
    selectedStatus?.value ||
    selectedCompany?.value ||
    selectedAccName?.value ||
    selectedAccType?.value ||
    selectedCheck?.value;
  const [currencyListData, setCurrencyListData] = useState<ICurrency[]>([]);
  const resetFilters = () => {
    setSelectedCompany("All");
    setSelectedAccName("All");
    setSelectedAccType("All");
    setSelectedCheck("All");
    setSelectedStatus("All");
    setCurrentPage(1);
    setEmptySearchField(true);
  };
  console.log("setStatusType", search, statusType);
  console.log("isAnyFilterActive==", isAnyFilterActive);

  const handleOptionClick = async (
    data: { option: string },
    row: BankAccountData
  ) => {
    const { option } = data;
    if (option === "View") {
      router.push(`${AppRoutes.ADMIN_TRUST_ACCOUNTING}`);
      setCookie("companyName", row?.company_name); // or use a state management solution like Redux
      setCookie("bankId", row?.bank_account_id);
      setCookie("compId", row?.company_id);
    }
  };
  const router = useRouter();
  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: RowData) =>
        handleOptionClick({ option: "View" }, row as BankAccountData),
    },
  ];
  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

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
    fetchData(currentPage, entriesPerPage);
  }, [
    selectedCompany,
    selectedAccName,
    selectedAccType,
    selectedStatus,
    selectedCheck,
    currentPage,
    sortValues,
  ]);

  const fetchData = async (currentPage: number, entriesPerPage: number) => {
    setTableLoader(true);
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
        page_number: currentPage,
        page_size: entriesPerPage,
        sorting_order: sortValues?.direction || "",
        sorting_field: sortValues?.sortKey || "",
      });

      if (response) {
        deleteCookie("bankId");
        deleteCookie("compId");

        setData(response?.account_list ?? []);
        setTotalRows(response?.total_count ?? 0);

        setPerPage(entriesPerPage);
      }
      setTableLoader(false);
    } catch {
      setTableLoader(false);
    } finally {
      setLoading(false);
      setDisableExcelBtn(false);
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

      // Extract company name based on selectedCompanyId
      const selectedCompanyData = result.company_list.find(
        (company: any) => company.value === selectedCompanyId
      );
      setCompanyName(selectedCompanyData ? selectedCompanyData.name : "");
    }
  };
  useEffect(() => {
    if (selectedCompanyId) {
      fetchFilters();
    }
  }, [selectedCompanyId]);

  const handlePageChange = async (currentPage: number) => {
    setPage(currentPage);
    await fetchData(currentPage, entriesPerPage);
  };

  const handleCompanyChange = (value: any) => {
    setCurrentPage(1);
    setSelectedCompany(value);
  };

  const handleNameChange = (selectedValue: any) => {
    setCurrentPage(1);
    setSelectedAccName(selectedValue);
  };

  const handleTypeChange = (selectedValue: any) => {
    setCurrentPage(1);
    setSelectedAccType(selectedValue);
  };

  const handleStatusChange = (selectedValue: any) => {
    setCurrentPage(1);
    setSelectedStatus(selectedValue);
  };

  const handleCheckChange = (selectedValue: any) => {
    setCurrentPage(1);
    setSelectedCheck(selectedValue);
  };

  // Row click handler
  const handleRowClick = (row: ICurrency) => {
    router.push(`${AppRoutes.ADMIN_TRUST_ACCOUNTING}`);
    setCookie("companyName", row?.company_name); // or use a state management solution like Redux
    setCookie("bankId", row?.bank_account_id);
    setCookie("compId", row?.company_id);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "journals",
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null, // Adjust as needed
        bank_account_id: selectedAccName?.value
          ? Number(selectedAccName?.value)
          : null, // Adjust as needed
        account_type: selectedAccType?.value || "", // Adjust as needed
        status: selectedStatus?.value || "", // Adjust as needed
        balance_check:
          isInitialRender && balanceCheckStatus === "error"
            ? "Error"
            : selectedCheck?.value || "", // Adjust as needed
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
        screen_name: "journals",
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null, // Adjust as needed
        bank_account_id: selectedAccName?.value
          ? Number(selectedAccName?.value)
          : null, // Adjust as needed
        account_type: selectedAccType?.value || "", // Adjust as needed
        status: selectedStatus?.value || "", // Adjust as needed
        balance_check:
          isInitialRender && balanceCheckStatus === "error"
            ? "Error"
            : selectedCheck?.value || "", // Adjust as needed
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
            ]}
            activeRoute={"Journals"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Trust account journals</h1>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters align_view_activity">
          <div className="pt_pageactions">
            <GridExportActions
              excelFile={{
                sheetName: "admin users list",
                tableData: currencyListData,
                LabelAndValueKey: excelColumnNames,
              }}
              pdfFile={{
                fileName: "admin users list",
                headerRow: journalListPDFHeaders,
                tableData: currencyListData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={() => {
                resetFilters();
              }}
              hideExcelButton={data.length === 0}
              hidePdfButton={data.length === 0}
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
        <div className="pt_filteroptions">
          <SearchableSelect
            placeholder={"Select a business profile"}
            name="companyProfile"
            options={companyOptions}
            selectedData={selectedCompany}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => handleCompanyChange(value)}
          />
          <SearchableSelect
            placeholder={"Select an account name"}
            name="accountName"
            options={accountOptions}
            selectedData={selectedAccName}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => handleNameChange(value)}
          />
          <SearchableSelect
            placeholder={"Select an account type"}
            name="accountType"
            options={[
              { label: "All", value: "All" },
              {
                value: "Cash Account",
                label: "Cash account",
              },
              {
                value: "Project Trust Account",
                label: "Project trust account",
              },
              {
                value: "Retention Trust Account",
                label: "Retention trust account",
              },
            ]}
            selectedData={selectedAccType}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => handleTypeChange(value)}
          />
          <SearchableSelect
            placeholder={"Select a status"}
            name="status"
            options={statusOptions}
            selectedData={selectedStatus}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => handleStatusChange(value)}
          />
          <SearchableSelect
            placeholder={"Select a balance check"}
            options={check}
            name="check"
            selectedData={selectedCheck}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => handleCheckChange(value)}
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={journalListHeaders}
            gridData={data?.length > 0 ? data : []}
            gridActions={actions}
            displayAllStaticActions
            onRowClick={handleRowClick}
            hoverOnRowClick
            showLoader={tableLoader}
            loaderColSpan={7}
            renderRowList={journalRenderData}
            currentPage={page}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={handlePageChange}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (data?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
