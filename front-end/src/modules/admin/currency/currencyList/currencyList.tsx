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
import { ICurrency } from "../currencyList.types";
import {
  currencyListHeaders,
  currencyListPDFHeaders,
  currencyRenderData,
  excelColumnNames,
  pdfDataRow,
  statusOptions,
} from "../currencyList.constant";
import { AdminListAllCurrencyMasterDetails } from "../currencyList.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { useRouter } from "next/navigation";

export default function AdminCurrencyList() {
  const [search, setSearch] = useState("");
  const [statusType, setStatusType] = useState<any>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [perPage, setPerPage] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortValues, setSortValues] = useState<any>("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const isAnyFilterActive = statusType?.value || search;
  const [currencyListData, setCurrencyListData] = useState<ICurrency[]>([]);
  const resetFilters = () => {
    setSearch("");
    setStatusType("All");
    setEmptySearchField(true);
  };
  console.log("setStatusType", search, statusType);
  console.log("isAnyFilterActive==", isAnyFilterActive);

  const actions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      style: "primary",
      onClick: (row: ICurrency) => handleOptionClick({ ...row, option: EDIT }),
    },
  ];
  const handleOptionClick = async (data: any) => {
    const { id, option } = data;
    console.log("data: ", data, { option });
    if (option === EDIT) {
      router.push(`${AppRoutes.ADMIN_CURRENCY_EDIT}/${id}`);
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
    if (emptySearchField) {
      setEmptySearchField(false);
    }
    setLoading(true);
    const financialInstituionList = await AdminListAllCurrencyMasterDetails({
      page: page,
      perPage: rowsPerPage,
      keyWord: search,
      status: statusType?.value === "All" ? "" : statusType?.value,
      sortingOrder: sortValues?.direction || "",
      sortingField: sortValues?.sortKey || "",
    });
    setLoading(false);
    setCurrencyListData(financialInstituionList?.currencyMasters || []);
    setTotalRows(financialInstituionList?.totalCount || 0);
    setPerPage(rowsPerPage);
  };
  // Row click handler
  const handleRowClick = (row: ICurrency) => {
    router.push(`${AppRoutes.ADMIN_CURRENCY_EDIT}/${row?.id}`);
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
              {
                name: "Masters",
                path: AppRoutes.ADMIN_MASTERS_LIST,
              },
            ]}
            activeRoute={"Currency"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Currency</h1>
          </div>
          <div className="pt_pageactions">
            <Link href={"/admin/currency/add"} passHref legacyBehavior>
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add currency
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
              resetFilterFunction={() => {
                resetFilters();
              }}
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
            placeholder="Select status"
            name="status"
            selectedData={statusType}
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setStatusType(selectedValue);
            }}
            options={statusOptions} // Pass the status options here
            renderKey="label"
            valueKey="value"
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={currencyListHeaders}
            gridData={currencyListData?.length > 0 ? currencyListData : []}
            gridActions={actions}
            displayAllStaticActions
            onRowClick={handleRowClick}
            hoverOnRowClick
            showLoader={loading}
            loaderColSpan={5}
            renderRowList={currencyRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
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
