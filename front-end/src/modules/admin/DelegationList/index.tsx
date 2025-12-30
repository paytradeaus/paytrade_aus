"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";

import React, { useEffect, useState } from "react";

import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  AccountDetails,
  ListAllDelegatedAccounts,
} from "./delegationList.function";
import { fetchFiltersForAdminJournals } from "../AdminJournals/jornalList.functions";
import {
  delegationListHeaders,
  delegationListPDFHeaders,
  delegationRenderData,
  excelColumnNames,
  pdfDataRow,
} from "./delegation.constants";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { connectWebSocket } from "@/utils";

export default function DelegationList() {
  const [delegationListData, setDelegationListData] = useState<
    AccountDetails[]
  >([]);

  const [totalRows, setTotalRows] = useState(0);
  const [tabStatus, setTabStatus] = useState("");
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [companyOptions, setCompanyOptions] = useState<any>([]);
  const [accountList, setAccountList] = useState<any>([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [selectedAccountName, setSelectedAccountName] = useState("");
  const [selectedCompanyNameObj, setSelectedCompanyNameObj] = useState("");
  const [selectedAccountNameObj, setSelectedAccountNameObj] = useState("");
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const isAnyFilterActive = selectedAccountName || selectedCompanyName;

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    const result = await fetchFiltersForAdminJournals({});
    if (result) {
      setAccountList([
        { value: "", label: "All Accounts" },
        ...result?.account_list.map(({ name, value }: any) => {
          return {
            label: name,
            value: Number(value),
          };
        }),
      ]);
      setCompanyOptions([
        { value: "", label: "All Business Names" },
        ...result?.company_list.map(({ name, value }: any) => {
          return { label: name, value: Number(value) };
        }),
      ]);
    }
  };

  useEffect(() => {
    fetchDelegationListData();
  }, [
    selectedAccountName,
    selectedCompanyName,
    currentPage,
    entriesPerPage,
    sortValues,
  ]);

  async function fetchDelegationListData() {
    try {
      setTableLoader(true);
      const payload = {
        company_id: selectedCompanyName || null,
        page: currentPage,
        items_per_page: entriesPerPage,
        bank_account_id: selectedAccountName || null,
        sorting_order: sortValues?.direction || "",
        sorting_field: sortValues?.sortKey || "",
      };
      const response = await ListAllDelegatedAccounts(payload);

      if (response?.account_list?.length > 0) {
        const modifiedGridData = response?.account_list.map((listObj: any) => {
          return {
            ...listObj,
          };
        });

        setDelegationListData(modifiedGridData);
      } else {
        setDelegationListData([]);
      }

      setTotalRows(response?.total_count || 0);
    } catch (err: any) {
    } finally {
      setTableLoader(false);
      setDisableExcelBtn(false);
    }
  }

  const handleResetFilters = () => {
    setSelectedAccountName("");
    setSelectedCompanyName("");
    setSelectedAccountNameObj("");
    setSelectedCompanyNameObj("");
    setCurrentPage(1);
    setEntriesPerPage(10);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "delegation",
        company_id: selectedCompanyName || null,
        bank_account_id: selectedAccountName || null,
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
        screen_name: "delegation",
        company_id: selectedCompanyName || null,
        bank_account_id: selectedAccountName || null,
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
                path: AppRoutes.USER_DASHBOARD,
              },
            ]}
            activeRoute={"Delegation list"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Delegation list</h1>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters align_view_activity">
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                excelFile={{
                  sheetName: "Delegation List",
                  tableData: delegationListData,
                  LabelAndValueKey: excelColumnNames,
                }}
                pdfFile={{
                  fileName: "Delegation List",
                  headerRow: delegationListPDFHeaders,
                  tableData: delegationListData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={delegationListData.length > 0 ? false : true}
                hidePdfButton={delegationListData.length > 0 ? false : true}
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
        <div className="pt_filteroptions">
          <SearchableSelect
            placeholder="Select a company profile"
            name="Company"
            options={companyOptions}
            onChange={(selected: any) => {
              setCurrentPage(1);
              setSelectedCompanyName(selected?.value);
              setSelectedCompanyNameObj(selected);
            }}
            selectedData={selectedCompanyNameObj}
            renderKey="label"
            valueKey="value"
          />

          <SearchableSelect
            placeholder="Select a account name"
            name="Account"
            options={accountList}
            onChange={(selected: any) => {
              setCurrentPage(1);
              setSelectedAccountName(selected?.value);
              setSelectedAccountNameObj(selected);
            }}
            selectedData={selectedAccountNameObj}
            renderKey="label"
            valueKey="value"
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <div className="grid">
            <h4>{tabStatus || "Current"}</h4>
          </div>
          <DynamicTable
            headers={delegationListHeaders}
            gridData={delegationListData?.length > 0 ? delegationListData : []}
            // onRowClick={handleRowClick}
            displayAllStaticActions
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={delegationRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (delegationListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
