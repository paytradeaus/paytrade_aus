"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  DateFormat,
  filterByDuration,
  InputType,
  NA,
} from "@/shared/constant/general";

import { connectWebSocket, formatDate } from "@/utils";

import debounce from "lodash/debounce";
import {
  contactListHeaders,
  contactListPDFHeaders,
  contactRenderData,
  contactSubmissionStatus,
  excelColumnNames,
  pdfDataRow,
} from "../contactList.constant";

import { format, isValid } from "date-fns";
import { fetchAllContacts } from "../contactList.functions";
import { ICommunicationListType } from "../contactList.types";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { IMastersListDetail } from "../../masters/mastersList/mastersList.types";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { usePathname, useRouter } from "next/navigation";

export default function AdminContactList(props: any) {
  const router = useRouter();

  const { isArchived = false } = props;
  const [totalRows, setTotalRows] = useState(0);
  const [actionData, setActionData] = useState<any>();

  const [tableLoader, setTableLoader] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState<boolean>(false);

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(0, 0, 0, 0)));
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));

  const [communicationListData, setCommunicationListData] = useState<
    ICommunicationListType[]
  >([]);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [selectedActivityRangeType, setSelectedActivityRangeType] =
    useState("All dates");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  // Determine if any filter is active
  const isAnyFilterActive =
    search ||
    selectedStatus?.value ||
    selectedActivityRangeType !== "All dates";

  const resetFilters = () => {
    setSelectedStatus("All");
    setSearch("");
    setSelectedActivityRangeType("All dates"); // Reset activityDate state
    setIsCustomDate(false); // Reset custom date state
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0))); // Reset start date to today
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999))); // Reset end date to today
    setEmptySearchField(true);
  };

  const actions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: IMastersListDetail) => {
        router.push(`${AppRoutes.ADMIN_CONTACT}/${row?.id}`);
      },
    },
  ];

  // Fetch data when filters, pagination, or entries per page change
  const getListOfContacts = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const response = await fetchAllContacts({
      page,
      perPage: rowsPerPage,
      search: search,
      status: selectedStatus?.value || "",
      date_filter:
        selectedActivityRangeType === "All dates"
          ? null
          : selectedActivityRangeType || null,
      start_date: isCustomDate ? activityLogStartDate : null,
      end_date: isCustomDate ? activityLogEndDate : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sorting_order: sortValues?.direction || "",
      sorting_field: sortValues?.sortKey || "",
    });
    setLoading(false);
    setDisableExcelBtn(false);

    if (response?.data?.contacts) {
      const modifiedData = response.data.contacts.map((x: any) => ({
        ...x,
        received_date: x?.created_on ? formatDate(x.created_on) : "",
      }));
      setTableData(modifiedData);
      setTotalRows(response.totalCount || 0);
    } else {
      setTableData([]);
      setTotalRows(0);
    }
  };
  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);
  // Fetch data on page load and when dependencies change
  useEffect(() => {
    getListOfContacts(currentPage, entriesPerPage);
  }, [
    currentPage,
    entriesPerPage,
    search,
    selectedStatus,
    selectedActivityRangeType,
    isCustomDate,
    activityLogStartDate,
    activityLogEndDate,
    sortValues,
  ]);
  // Reset filters

  // Row click handler
  const handleRowView = (data: any) => {
    setActionData({ rowData: data });
    if (data?.id) {
      router.push(`${AppRoutes.ADMIN_CONTACT}/${data?.id}`);
    }
  };
  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "contact",
        search: search,
        status: selectedStatus?.value || "",
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
        screen_name: "contact",
        search: search,
        status: selectedStatus?.value || "",
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
            activeRoute={"Contacts"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Contacts</h1>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters align_view_activity">
          <div className="pt_pageactions">
            <GridExportActions
              excelFile={{
                sheetName: "admin users list",
                tableData: communicationListData,
                LabelAndValueKey: excelColumnNames,
              }}
              pdfFile={{
                fileName: "admin users list",
                headerRow: contactListPDFHeaders,
                tableData: communicationListData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={() => {
                resetFilters();
              }}
              hideExcelButton={tableData?.length == 0}
              hidePdfButton={tableData?.length == 0}
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
          <FormikControl
            placeholder={"Search by name"}
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearch(value);
            }}
            value={search}
            name={search}
            clearSearch={emptySearchField}
          />
          <SearchableSelect
            placeholder="Select a status"
            name="profileName"
            options={[
              {
                label: "All",
                value: "",
              },
              ...contactSubmissionStatus,
            ]}
            onChange={(selectedObj) => {
              setCurrentPage(1);
              setSelectedStatus(selectedObj);
            }}
            selectedData={selectedStatus}
            renderKey="label"
            valueKey="value"
          />
          <FormikControl
            placeholder={"Activity Range"}
            name="Activity Range"
            options={filterByDuration}
            onChange={(value: any) => {
              console.log(value);
              if (value === "Custom") {
                setIsCustomDate(true);
              } else {
                setIsCustomDate(false);
              }
              setSelectedActivityRangeType(value);
            }}
            control={InputType.SELECT}
            value={selectedActivityRangeType}
            renderKey="label"
            valueKey="value"
          />
        </div>
        {isCustomDate && (
          <div className="grid">
            <div>
              <FormikControl
                label="From date"
                name="activityLogStartDate"
                control={InputType.DATE_PICKER}
                type="date"
                // value={
                //   activityLogStartDate
                //     ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                //     : ""
                // }
                value={
                  activityLogStartDate &&
                  isValid(new Date(activityLogStartDate))
                    ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(selectedDate: any) => {
                  if (!selectedDate) {
                    setActivityLogStartDate(null);
                    return;
                  }
                  const fromDate = new Date(
                    new Date(selectedDate).setHours(0, 0, 0, 0)
                  );

                  if (fromDate > activityLogEndDate) {
                    setActivityLogStartDate(fromDate);
                    // setActivityLogEndDate(fromDate);
                    setActivityLogEndDate(new Date(selectedDate));
                  } else {
                    setActivityLogStartDate(fromDate);
                  }
                }}
                minDate="" // Set any minimum date if needed
                // maxDate={format(new Date(activityLogEndDate), "yyyy-MM-dd")}
                disabled={false}
              />
            </div>
            <div>
              <FormikControl
                label="To date"
                name="activityLogEndDate"
                type="date"
                control={InputType.DATE_PICKER}
                // value={
                //   activityLogEndDate
                //     ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                //     : ""
                // }
                value={
                  activityLogEndDate && isValid(new Date(activityLogEndDate))
                    ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(selectedDate: any) => {
                  if (!selectedDate) {
                    setActivityLogEndDate(null);
                    return;
                  }
                  const toDate = new Date(
                    new Date(selectedDate).setHours(23, 59, 59, 999)
                  );

                  // Ensure end date is not before start date
                  if (toDate >= activityLogStartDate) {
                    setActivityLogEndDate(toDate);
                  }
                }}
                minDate={
                  activityLogStartDate
                    ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    : ""
                }
                maxDate="" // Set any maximum date if needed
                disabled={false}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={contactListHeaders}
            gridData={tableData?.length > 0 ? tableData : []}
            gridActions={actions}
            onRowClick={(data: any) => handleRowView(data)}
            showLoader={loading}
            loaderColSpan={6}
            hoverOnRowClick
            displayAllStaticActions
            renderRowList={contactRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (tableData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
