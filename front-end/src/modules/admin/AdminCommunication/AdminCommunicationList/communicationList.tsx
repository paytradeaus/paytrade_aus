"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType, VIEW } from "@/shared/constant/general";
import {
  communicationListHeaders,
  communicationListPDFHeaders,
  communicationRenderData,
  excelColumnNames,
  pdfDataRow,
} from "../communicationList.constant";
import { format } from "date-fns";
import { FetchAllEmailsSentByAdmin } from "../communicationList.functions";
import { ICommunicationListType } from "../communicationList.types";
import { IMastersListDetail } from "../../masters/mastersList/mastersList.types";
import { useRouter } from "next/navigation";

export default function AdminCommunicationList(props: any) {
  const { isArchived = false } = props;
  const router = useRouter();
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [selectedAccountName, setSelectedAccountName] = useState<any>();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNoticesType, setSelectedNoticesType] = useState<any>();
  const [loading, setLoading] = useState<boolean>(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emailsList, setEmailsList] = useState<any>([]);

  const [companySelectedData, setCompanySelectedData] = useState<any>();
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [selectedRowsInGrid, setSelectedRowsInGrid] = useState([]);

  const [communicationListData, setCommunicationListData] = useState<
    ICommunicationListType[]
  >([]);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "This Month",
    label: "This Month",
  });
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const activityDateOptions = [
    { value: "Custom", label: "Custom" },
    { value: "Last Month", label: "Last month" },
    { value: "This Month", label: "This month" },
  ];
  const [selectedValue, setSelectedValue] = useState("");
  const [activityDate, setActivityDate] = useState("This Month");

  const [emptySearchField, setEmptySearchField] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");

  const [selectedStatus, setSelectedStatus] = useState<any>({
    value: "Sending",
    label: "Sending",
  });

  // Determine if any filter is active
  const isAnyFilterActive =
    selectedNoticesType?.value ||
    companySelectedData?.value ||
    selectedAccountName?.value ||
    // selectedValue?.value ||
    selectedStatus.label !== "Sending" ||
    singleActivyDate.label !== "This Month";

  const resetFilters = () => {
    setSelectedNoticesType("All");
    setCompanySelectedData("All");
    setSelectedAccountName("All");
    setSelectedStatus({ value: "", label: "Sending" });
    setSelectedValue("");
    setSingleActivyDate({ value: "This Month", label: "This Month" });
    setActivityDate("This Month"); // Reset the activity date to "This Month"
    setIsCustomDate(false);
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0))); // Reset to the start of the current month
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999))); // Reset to the end of the current month
    setEmptySearchField(true);
  };

  const handleActivityChange = (selectedValue: any) => {
    setSelectedRowsInGrid([]);
    setTimeKey(new Date().getTime());
    setSingleActivyDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue); // Perform any other actions based on the selected value
  };
  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: ICommunicationListType) =>
        handleOptionClick({ ...row, option: VIEW }),
    },
  ];
  const handleOptionClick = async (data: any) => {
    const { id, option } = data;
    console.log("data: ", data, { option });
    if (option === VIEW) {
      router.push(`${AppRoutes.ADMIN_COMMUNICATION_VIEW}/${id}`);
    }
  };
  // Fetch data when filters, pagination, or entries per page change
  useEffect(() => {
    getFetchAllEmailsSentByAdmin(currentPage, entriesPerPage);
  }, [
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
    currentPage,
    entriesPerPage,
    sortValues,
  ]);
  // Fetch communication list data
  const getFetchAllEmailsSentByAdmin = async (
    page: number,
    rowsPerPage: number
  ) => {
    try {
      setLoading(true);
      let responseData = await FetchAllEmailsSentByAdmin({
        page: Number(page),
        perPage: Number(rowsPerPage),
        startDate: isCustomDate ? activityLogStartDate : null,
        endDate: isCustomDate ? activityLogEndDate : null,
        dateFilter: activityDate,
        sorting_order: sortValues?.direction || "",
        sorting_field: sortValues?.sortKey || "",
      });

      // Format the `created_on` date in the response
      const formattedEmailsList = (responseData?.emails_list || []).map(
        (email: any) => ({
          ...email,
          created_on: email?.created_on
            ? format(new Date(email.created_on), "dd/MM/yyyy")
            : "N/A",
        })
      );
      setEmailsList(formattedEmailsList);
      setTotalRows(responseData?.total_count || 0);
      setEntriesPerPage(rowsPerPage);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  // Reset filters

  // Row click handler
  const handleRowClick = (row: IMastersListDetail) => {
    router.push(`${AppRoutes.ADMIN_COMMUNICATION_VIEW}/${row?.id}`);
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
            activeRoute={"Communication"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Communication</h1>
          </div>
          <div className="pt_pageactions">
            <Link href={"/admin/communication/add"} passHref legacyBehavior>
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add communication
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
                tableData: communicationListData,
                LabelAndValueKey: excelColumnNames,
              }}
              pdfFile={{
                fileName: "admin users list",
                headerRow: communicationListPDFHeaders,
                tableData: communicationListData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={() => {
                resetFilters();
              }}
              hideExcelButton={emailsList?.length == 0}
              hidePdfButton={emailsList?.length == 0}
              hideResetButton={!isAnyFilterActive}
            />
          </div>
        </div>

        <div className="pt_filtergroup">
          <div className="grid">
            <FormikControl
              placeholder={"Dates"}
              name="Dates"
              options={activityDateOptions}
              onChange={handleActivityChange}
              control={InputType.SELECT}
              value={activityDate}
              renderKey="label"
              valueKey="value"
            />

            <div>
              {isCustomDate && (
                <div className="grid">
                  <div>
                    <FormikControl
                      //   label="From date"
                      name="From date"
                      control={InputType.DATE_PICKER}
                      type="date"
                      value={
                        activityLogStartDate
                          ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(selectedDate: any) => {
                        let fromDate = new Date(
                          new Date(selectedDate).setHours(0, 0, 0, 0)
                        );
                        if (fromDate > activityLogEndDate) {
                          setSelectedRowsInGrid([]);
                          setTimeKey(new Date().getTime());
                          setActivityLogStartDate(fromDate);
                          setActivityLogEndDate(fromDate);
                        } else {
                          setSelectedRowsInGrid([]);
                          setTimeKey(new Date().getTime());
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
                      //   label="To date"
                      name="To date"
                      type="date"
                      control={InputType.DATE_PICKER}
                      value={
                        activityLogEndDate
                          ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(selectedDate: any) => {
                        const toDate = new Date(
                          new Date(selectedDate).setHours(23, 59, 59, 999)
                        );
                        if (toDate < activityLogStartDate) {
                          return;
                        } else {
                          setSelectedRowsInGrid([]);
                          setTimeKey(new Date().getTime());
                          setActivityLogEndDate(toDate);
                        }
                      }}
                      maxDate=""
                      disabled={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={communicationListHeaders}
            gridData={emailsList?.length > 0 ? emailsList : []}
            gridActions={actions}
            displayAllStaticActions
            onRowClick={handleRowClick}
            hoverOnRowClick
            showLoader={loading}
            loaderColSpan={8}
            renderRowList={communicationRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (emailsList?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
