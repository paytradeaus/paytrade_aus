"use client";

import React, { useEffect, useState } from "react";
import BreadCrumbs from "@/components/BreadCrumbs";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { connectWebSocket, formatDate } from "@/utils";

import debounce from "lodash/debounce";
import {
  compliancesListHeaders,
  compliancesRenderData,
  ptaDropdownOptions,
  rtaDropdownOptions,
} from "../compliancesList.constant";
import { fetchCompliancesList } from "@/modules/user/Compliances/compliances.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { fetchFiltersForAdminCompliance } from "../compliancesList.functions";
import { IMastersListDetail } from "../../masters/mastersList/mastersList.types";
import { useRouter } from "next/navigation";
import { ICompliancesListDetails } from "@/modules/user/Compliances/compliances.types";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { NA } from "@/shared/constant/general";

export default function AdminCompliancesList() {
  const router = useRouter();

  const [adminMastersListData, setAdminMastersListData] = useState<
    IMastersListDetail[]
  >([]);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [search, setSearch] = useState("");
  const [statusType, setStatusType] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState<any>([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPta, setSelectedPta] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedCompany, setSelectedCompany] = useState<any>("");
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [companyList, setCompanyList] = useState<any[]>([]);
  const [accountList, setAccountList] = useState<any[]>([]);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [accountType, setAccountType] = useState<any>([]);
  const [selectedRta, setSelectedRta] = useState<any>(null);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");

  const [gridList, setGridList] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Determine if any filter is active
  const isAnyFilterActive =
    selectedCompany?.value ||
    selectedProject?.value ||
    selectedAccount?.value ||
    selectedAccountType?.value ||
    selectedPta?.value ||
    selectedRta?.value;

  const handleResetFilters = () => {
    setSelectedCompany("All");
    setSelectedProject("All");
    setSelectedAccount("All");
    setSelectedAccountType("All");
    setSelectedPta("All");
    setSelectedRta("All");
    setCurrentPage(1);
    setEmptySearchField(true);
  };

  function navigateToOverview(gridRow: any) {
    router.push(
      `${AppRoutes.ADMIN_COMPLIANCE_VIEW}?project=${gridRow?.project_id}&st=${
        gridRow?.status
      }&page=${"admin"}`
    );
  }

  const handleRowClick = (row: ICompliancesListDetails) => {
    console.log("Row clicked:", row);

    navigateToOverview(row);
  };

  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        navigateToOverview(row);
      },
    },
  ];

  // Fetch data when filters, pagination, or entries per page change
  useEffect(() => {
    getComplianceList();
  }, [
    selectedAccount,
    selectedAccountType,
    selectedCompany,
    selectedProject,
    selectedPta,
    selectedRta,
    entriesPerPage,
    currentPage,
    sortValues,
  ]);
  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);
  useEffect(() => {
    getAllDropdowns();
  }, [selectedAccount, selectedAccountType, selectedCompany, selectedProject]);
  function mapDropdownOptions(
    arrOptions: any[],
    labelValue: string,
    dataValue: string
  ) {
    if (arrOptions?.length > 0) {
      return arrOptions.map((data: any) => {
        return { label: data?.[labelValue], value: data?.[dataValue] };
      });
    } else {
      return [];
    }
  }
  async function getAllDropdowns() {
    const postData = {
      payload: {
        bank_account_id: selectedAccount?.value
          ? Number(selectedAccount?.value)
          : null,
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null,
        project_id: selectedProject?.value
          ? Number(selectedProject?.value)
          : null,
      },
    };

    const response: any = await fetchFiltersForAdminCompliance(postData);

    if (response) {
      setCompanyList(
        response?.company_list?.length > 0
          ? [
              { label: "All", value: "" },
              ...mapDropdownOptions(response?.company_list, "name", "value"),
            ]
          : []
      );

      setProjectList(
        response?.project_list?.length > 0
          ? [
              { label: "All", value: "" },
              ...mapDropdownOptions(response?.project_list, "name", "value"),
            ]
          : []
      );

      setAccountList(
        response?.account_list?.length > 0
          ? [
              { label: "All", value: "" },
              ...mapDropdownOptions(response?.account_list, "name", "value"),
            ]
          : []
      );

      setAccountType(
        response?.account_type_list?.length > 0
          ? [
              { label: "All", value: "" },
              ...mapDropdownOptions(
                response?.account_type_list,
                "name",
                "value"
              ),
            ]
          : []
      );
    }
  }
  // Fetch compliances list data
  async function getComplianceList() {
    try {
      setLoading(true);

      const postData = {
        payload: {
          account_type: selectedAccountType?.value || null,
          bank_account_id: selectedAccount?.value
            ? Number(selectedAccount?.value)
            : null,
          company_id: selectedCompany?.value
            ? Number(selectedCompany?.value)
            : null,
          items_per_page: entriesPerPage,
          page_number: currentPage,
          pta_compliance: selectedPta?.value || null,
          rta_compliance: selectedRta?.value || null,
          project_id: selectedProject?.value
            ? Number(selectedProject?.value)
            : null,
          date_filter: null,
          end_date: null,
          start_date: null,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
        },
      };

      const response: any = await fetchCompliancesList(postData);

      if (response?.results?.length > 0) {
        const modifiedGridData = response?.results.map((listObj: any) => {
          return {
            ...listObj,
            pta_compliance_modified: (
              <span
                style={{
                  color: listObj?.pta_compliance === "Ok" ? "green" : "red",
                }}
              >
                {listObj?.pta_compliance}
              </span>
            ),
            rta_compliance__modified: (
              <span
                style={{
                  color: listObj?.rta_compliance === "Ok" ? "green" : "red",
                }}
              >
                {listObj?.rta_compliance}
              </span>
            ),
            project_added_on_date: listObj?.project_added_on_date
              ? formatDate(listObj?.project_added_on_date)
              : NA,
          };
        });

        setGridList(modifiedGridData);
      } else {
        setGridList([]);
      }
      setTotalRows(response?.total_count || 0);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
    }
  }

  // Reset filters
  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "compliance",
        account_type: selectedAccountType?.value || null,
        bank_account_id: selectedAccount?.value
          ? Number(selectedAccount?.value)
          : null,
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null,
        items_per_page: entriesPerPage,
        page_number: currentPage,
        pta_compliance: selectedPta?.value || null,
        rta_compliance: selectedRta?.value || null,
        project_id: selectedProject?.value
          ? Number(selectedProject?.value)
          : null,
        date_filter: null,
        end_date: null,
        start_date: null,
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

  async function handleDownloadPdfFile() {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "compliance",
        account_type: selectedAccountType?.value || null,
        bank_account_id: selectedAccount?.value
          ? Number(selectedAccount?.value)
          : null,
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null,
        items_per_page: entriesPerPage,
        page_number: currentPage,
        pta_compliance: selectedPta?.value || null,
        rta_compliance: selectedRta?.value || null,
        project_id: selectedProject?.value
          ? Number(selectedProject?.value)
          : null,
        date_filter: null,
        end_date: null,
        start_date: null,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  }

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
            activeRoute={"Compliances"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Compliances</h1>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters align_view_activity">
          <div className="pt_pageactions">
            <GridExportActions
              resetFilterFunction={handleResetFilters}
              hideExcelButton={gridList?.length == 0}
              hidePdfButton={gridList?.length == 0}
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
            placeholder="Select a business profile"
            name="companyProfile"
            options={companyList}
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setSelectedCompany(selectedValue);
            }}
            selectedData={selectedCompany}
            renderKey="label"
            valueKey="value"
          />
          <SearchableSelect
            placeholder="Select a project name"
            name="profileName"
            options={projectList}
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setSelectedProject(selectedValue);
            }}
            selectedData={selectedProject}
            renderKey="label"
            valueKey="value"
          />
          <SearchableSelect
            placeholder="Select an account name"
            name="accountName"
            options={accountList}
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setSelectedAccount(selectedValue);
            }}
            selectedData={selectedAccount}
            renderKey="label"
            valueKey="value"
          />

          <SearchableSelect
            placeholder="Select a PTA"
            name="ptaStatus"
            options={ptaDropdownOptions}
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setSelectedPta(selectedValue);
            }}
            selectedData={selectedPta}
            renderKey="label"
            valueKey="value"
          />
          <SearchableSelect
            placeholder="Select a RTA"
            name="rtaStatus"
            options={rtaDropdownOptions}
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setSelectedRta(selectedValue);
            }}
            selectedData={selectedRta}
            renderKey="label"
            valueKey="value"
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={compliancesListHeaders}
            gridData={gridList?.length > 0 ? gridList : []}
            gridActions={actions}
            displayAllStaticActions
            onRowClick={handleRowClick}
            showLoader={loading}
            loaderColSpan={8}
            hoverOnRowClick
            renderRowList={compliancesRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (gridList?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
