"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { EDIT, InputType, NA } from "@/shared/constant/general";
import debounce from "lodash/debounce";
import {
  currencyListPDFHeaders,
  excelColumnNames,
  financialInstitutionListHeaders,
  financialInstitutionRenderData,
  pdfDataRow,
  statusOptions,
} from "../financialInstitutionList.constant";
import { AdminlistAllFinancialInstituion } from "../financialInstitutionList.functions";
import { BankAccount } from "@/modules/user/AddUpdateBankAccount/AddUpdateBankAccount.function";
import { formatDate } from "@/utils";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { useRouter } from "next/navigation";

export default function AdminFinancialInstitutionList() {
  const [search, setSearch] = useState("");
  const [statusType, setStatusType] = useState<any>();
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [perPage, setPerPage] = useState(10);
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [selectedData, setSingleSelectedData] = useState<any>();
  const isAnyFilterActive = statusType?.value || search;
  const [currencyListData, setCurrencyListData] = useState<BankAccount[]>([]);
  const [sortValues, setSortValues] = useState<any>("");

  const resetFilters = () => {
    setSearch(""); // Clear the search field
    setStatusType("All"); // Reset the status filter
    setEmptySearchField(true); // Set flag to clear search field
  };

  const actions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      style: "primary",
      onClick: (row: BankAccount) =>
        handleOptionClick({ ...row, option: EDIT }),
    },
  ];
  const handleOptionClick = async (data: any) => {
    const { id, option } = data;
    console.log("data: ", data, { option });
    if (option === EDIT) {
      router.push(`${AppRoutes.ADMIN_FINANCIAL_INSTITUTION_EDIT}/${id}`);
    }
  };
  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  useEffect(() => {
    getListAllAdminUsers(currentPage, perPage);
  }, [debouncedSearch, statusType, currentPage, sortValues]);

  const getListAllAdminUsers = async (page: number, rowsPerPage: number) => {
    setTableLoader(true);
    const financialInstituionList = await AdminlistAllFinancialInstituion(
      {
        page: page,
        perPage: rowsPerPage,
        keyword: search,
        status: statusType?.value === "All" ? "" : statusType?.value,
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      },
      setLoading
    );
    setTableLoader(false);
    setCurrencyListData(financialInstituionList?.institutions || []);
    setTotalRows(financialInstituionList?.totalCount || 0);
    setPerPage(rowsPerPage);
  };

  // Row click handler
  const handleRowClick = (row: BankAccount) => {
    router.push(`${AppRoutes.ADMIN_FINANCIAL_INSTITUTION_EDIT}/${row?.id}`);
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await getListAllAdminUsers(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getListAllAdminUsers(page, newPerPage);
  };

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue.value);
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              { name: "Dashboard", path: AppRoutes.ADMIN_DASHBOARD },
              {
                name: "Masters",
                path: AppRoutes.ADMIN_MASTERS_LIST,
              },
            ]}
            activeRoute={"Financial institution"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Financial institution</h1>
          </div>
          <div className="pt_pageactions">
            <Link
              href={"/admin/financial-institution/add"}
              passHref
              legacyBehavior
            >
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add financial
                  institution
                </button>
              </a>
            </Link>
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
                headerRow: currencyListPDFHeaders,
                tableData: currencyListData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={() => resetFilters()}
              hideExcelButton={currencyListData.length === 0}
              hidePdfButton={currencyListData.length === 0}
              hideResetButton={!isAnyFilterActive}
            />
          </div>
        </div>
        <div className="pt_filteroptions">
          <FormikControl
            placeholder={"Search by name"}
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearch(value);
            }}
            name={search}
            value={search}
            clearSearch={emptySearchField}
          />
          <SearchableSelect
            placeholder={"Select status"}
            name="status"
            options={statusOptions}
            selectedData={statusType}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => {
              setCurrentPage(1);
              setStatusType(value);
            }}
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={financialInstitutionListHeaders} // Use headers defined for the table
            gridData={currencyListData.map((item) => ({
              ...item,
              created_on: formatDate(item.created_on), // Format the created_on field here
            }))}
            gridActions={actions}
            displayAllStaticActions
            onRowClick={handleRowClick}
            hoverOnRowClick
            showLoader={tableLoader}
            loaderColSpan={5}
            renderRowList={financialInstitutionRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={(value: any) => handlePageChange(value)}
            onPageChange={handlePageChange}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (currencyListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
