"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { EDIT, InputType, NA } from "@/shared/constant/general";

import {
  AdminfetchAllMasterTypeDetails,
  AdminListAllMasterTypeDetails,
} from "./mastersList.functions";
import {
  excelColumnNames,
  mastersListHeaders,
  mastersListPDFHeaders,
  mastersRenderData,
  pdfDataRow,
} from "./mastersList.constant";
import { IMastersListDetail } from "./mastersList.types";
import debounce from "lodash/debounce";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { useRouter } from "next/navigation";
interface CategoryOption {
  value: string;
  label: string;
}
export default function AdminMasterList() {
  const [adminMastersListData, setAdminMastersListData] = useState<
    IMastersListDetail[]
  >([]);
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [categoryValue, setCategoryValue] = useState("");
  const [categorySelectedData, setCategorySelectedData] = useState<any>();
  const [search, setSearch] = useState("");
  const [statusType, setStatusType] = useState<any>();
  const [totalRows, setTotalRows] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState<any>([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const isAnyFilterActive = search || statusType?.value || selectedValue !== "";
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortValues, setSortValues] = useState<any>("");
  const actions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      style: "primary",
      onClick: (row: IMastersListDetail) =>
        handleOptionClick({ ...row, option: EDIT }),
    },
  ];
  const handleOptionClick = async (data: any) => {
    const { id, option } = data;
    console.log("data: ", data, { option });
    if (option === EDIT) {
      router.push(`${AppRoutes.ADMIN_MASTERS_EDIT}/${id}`);
    }
  };

  // Fetch data when filters, pagination, or entries per page change
  useEffect(() => {
    fetchMastersLists();
    fetchCategoryOptions();
  }, [search, statusType, currentPage, entriesPerPage, sortValues]);

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);
  // Fetch masters list data
  const fetchMastersLists = async () => {
    if (emptySearchField) {
      setEmptySearchField(false);
    }
    try {
      setTableLoader(true);
      const payload = {
        page: currentPage,
        perPage: entriesPerPage,
        search: search,
        masterType: statusType?.value === "All" ? "" : statusType?.value,
        sorting_order: sortValues?.direction || "",
        sorting_field: sortValues?.sortKey || "",
      };

      console.log("Fetching data with payload:", payload);
      const response = await AdminListAllMasterTypeDetails(payload);

      if (response?.MasterTypeDetails?.length > 0) {
        const modifiedGridData = response.MasterTypeDetails.map(
          (item: any) => ({
            ...item,
            masters: item.master_type
              ? `${item.master_type} ${item.value || ""}`
              : item.value || "",
          })
        );
        setAdminMastersListData(modifiedGridData);
        setTotalRows(response.totalCount || 0);
      } else {
        setAdminMastersListData([]);
        setTotalRows(0);
      }
    } catch (error) {
      console.error("Error fetching masters list:", error);
    } finally {
      setTableLoader(false);
    }
  };

  // Fetch category options
  const fetchCategoryOptions = async () => {
    try {
      setTableLoader(true);
      const categories: any = await AdminfetchAllMasterTypeDetails();
      console.log("categories-->", categories);

      setCategoryOptions([
        { value: "All", label: "All" },
        ...(categories?.length > 0 ? categories : []),
      ]);
    } catch (error) {
      console.error("Error fetching category options:", error);
    } finally {
      setTableLoader(false);
    }
  };

  // Filter data by search value
  const filteredData = adminMastersListData.filter((item) => {
    const valueToSearch = item.masters.toLowerCase();
    return valueToSearch.includes(search.toLowerCase());
  });

  // Reset filters
  const handleResetFilters = () => {
    setSearch("");
    setStatusType("All");
    setCategoryValue("All"); // Reset category filter
    setCurrentPage(1);
    setSelectedValue("");
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };

  // Row click handler
  const handleRowClick = (row: IMastersListDetail) => {
    router.push(`${AppRoutes.ADMIN_MASTERS_EDIT}/${row?.id}`);
  };
  const handleCategoryChange = (selectedValue: any) => {
    setCategorySelectedData(selectedValue);
    if (selectedValue.label === "All") {
      setCategoryValue(selectedValue.value);
    } else {
      setCategoryValue(selectedValue.label);
    }
    // Perform any other actions based on the selected value
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
            activeRoute={"All masters"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Masters</h1>
          </div>
          <div className="pt_pageactions">
            <Link href={"/admin/masters/add"} passHref legacyBehavior>
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add masters
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
                tableData: filteredData,
                LabelAndValueKey: excelColumnNames,
              }}
              pdfFile={{
                fileName: "admin users list",
                headerRow: mastersListPDFHeaders,
                tableData: filteredData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={handleResetFilters}
              hideExcelButton={filteredData.length === 0}
              hidePdfButton={filteredData.length === 0}
              hideResetButton={!isAnyFilterActive}
            />
          </div>
        </div>
        <div className="pt_filteroptions">
          <FormikControl
            placeholder={"Search by value"}
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearch(value);
            }}
            name={search}
            value={search}
            clearSearch={emptySearchField}
          />
          {/* <FormikControl
            placeholder={"Master Type"}
            name="status"
            options={categoryOptions}
            control={InputType.SELECT}
            value={statusType}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => {
              setCurrentPage(1);
              setStatusType(value);
            }}
          /> */}

          <SearchableSelect
            placeholder={"Master type"}
            name="status"
            options={categoryOptions}
            selectedData={statusType}
            renderKey="label"
            valueKey="value"
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setStatusType(selectedValue);
            }}
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={mastersListHeaders}
            gridData={filteredData}
            gridActions={actions}
            displayAllStaticActions
            onRowClick={handleRowClick}
            hoverOnRowClick
            showLoader={tableLoader}
            loaderColSpan={5}
            renderRowList={mastersRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (filteredData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
