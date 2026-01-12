"use client";
import React, { useEffect, useState } from "react";
import { GetActivityLogList, GetEventGroup } from "./userActivityLog.functions";
import { format, isValid } from "date-fns";
import { getCookie } from "cookies-next";
import { useTokenDetails } from "@/hooks";
import GridExportActions from "@/components/GridExportActions";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  ActivitypdfheaderNames,
  activityRenderData,
  ExcelColumnNames,
  pdfDataRow,
  PdfheaderNames,
} from "./userActivityLog.constants";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import DynamicTable from "@/components/Table";
import { filterByDuration } from "@/shared/constant/data";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { connectWebSocket } from "@/utils";

type UserData = {
  created_on: string;
  event_date: string;
  event_type: string;
  first_name: string;
  last_name: string;
  event_text: string;
  email_id: string;
  timezone: string;
};
export default function UserActivityLog() {
  const { decodeTokenData } = useTokenDetails();
  const [userData, setUserData] = useState<UserData[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(0, 0, 0, 0)));
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));
  const [sortValues, setSortValues] = useState<any>("");
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [singleEventType, setSingleEventType] = useState<any>();
  const [eventType, setEventType] = useState(null);
  const [activityDate, setActivityDate] = useState("");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "This Month",
    label: "This Month",
  });

  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [eventOptions, setEventOptions] = useState<any[]>([]);

  // const eventOptions = [
  //   { label: "All", value: "" },
  //   { label: "Bank accounts", value: "Bank accounts" },
  //   { label: "Client/Supplier", value: "Client/Supplier" },
  //   { label: "Contracts", value: "Contracts" },
  //   { label: "Variations", value: "Variations" },
  //   { label: "Manage business", value: "Manage business" },
  //   { label: "Manage users", value: "Manage users" },
  //   { label: "Notices", value: "Notices" },
  //   { label: "Payment claims", value: "Payment claims" },
  //   { label: "Payments", value: "Payments" },
  //   { label: "Projects", value: "Projects" },
  //   { label: "Signed in/out", value: "Signed in/out" },
  //   { label: "Subscriptions", value: "Subscriptions" },
  //   { label: "Journals", value: "Journals" },
  //   { label: "Bookkeeping", value: "Book keeping" },
  // ];

  const resetFilters = () => {
    setSingleEventType(""); // Reset Event categories filter
    setEventType(null); // Reset eventType state
    setSingleActivyDate({ value: "This Month", label: "This Month" }); // Reset Activity Range filter
    setActivityDate(""); // Reset activityDate state
    setIsCustomDate(false); // Reset custom date state
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0))); // Reset start date to today
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999))); // Reset end date to today
  };

  const isAnyFilterActive =
    eventType !== null ||
    activityDate !== "" ||
    singleActivyDate.label !== "This Month";

  useEffect(() => {
    getAllActivityLogList(page, perPage);
  }, [
    eventType,
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
    page,
    perPage,
    sortValues,
  ]);

  useEffect(() => {
    fetchEventOptions();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [eventType, activityDate, activityLogEndDate, activityLogStartDate]);

  const fetchEventOptions = async () => {
    try {
      const response = await GetEventGroup(); // 👈 call your API here
      const list = response || [];
      // Convert into dropdown format
      const formattedOptions = [
        { label: "All", value: "" }, // Add "All" at first like before
        ...list.map((item: any) => ({
          label: item?.name,
          value: item?.name,
        })),
      ];

      setEventOptions(formattedOptions);
    } catch (error) {
      console.error("Error fetching event options:", error);
    }
  };

  const getAllActivityLogList = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const companyId = localStorage.getItem("companyId");
    const Uid = localStorage.getItem("UserCompanyId");
    const userCompanyIdNumber = Uid ? parseInt(Uid, 10) : null;
    const companyIdNumber = companyId ? parseInt(companyId, 10) : null;
    const profileType = getCookie("ProfileType");
    const responseData = await GetActivityLogList(
      {
        companyId:
          profileType === "User" ? userCompanyIdNumber : companyIdNumber, // Send companyId if not "User"
        userId: profileType === "User" ? decodeTokenData["userId"] : null,
        page: Number(page),
        perPage: Number(rowsPerPage),
        eventType: eventType,
        dateFilter: activityDate === "All" ? null : activityDate,
        startDate: isCustomDate ? activityLogStartDate : null,
        endDate: isCustomDate ? activityLogEndDate : null,
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      },
      setLoading
    );
    setTotalRows(responseData?.total_count || 0);
    setPerPage(rowsPerPage);
    const printDataObjCreation = responseData?.activity_logs?.map(
      (row: any) => {
        return {
          event_date: row?.event_date
            ? `${format(new Date(row?.event_date), "dd MMM yyyy h:mm a")} ${
                row?.timezone === "India Standard Time"
                  ? "Indian Standard Time"
                  : row?.timezone || ""
              }`
            : "N/A",
          user: row?.first_name
            ? `${row.first_name} ${row?.last_name || ""}(${row?.email_id})`
            : `${row?.last_name}}(${row?.email_id})` || "",
          event_text: row.event_text ? (
            <div
              dangerouslySetInnerHTML={{
                __html: row.event_text.replace(/<\/?p>/g, ""),
              }}
            />
          ) : (
            ""
          ),
        };
      }
    );
    setPrintDocumentData(printDataObjCreation);
    setUserData(printDataObjCreation || []);
    setDisableExcelBtn(false);
  };

  const handleEventChange = (selectedValue: any) => {
    setSingleEventType(selectedValue);
    setEventType(selectedValue);
  };

  const handleActivityChange = (selectedValue: any) => {
    setSingleActivyDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue); // Perform any other actions based on the selected value
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      const companyId = localStorage.getItem("companyId");
      const companyIdNumber = companyId ? parseInt(companyId, 10) : null;
      const profileType = getCookie("ProfileType");
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "activity_log",
        company_id: profileType === "User" ? null : companyIdNumber, // Send companyId if not "User"
        user_id: profileType === "User" ? decodeTokenData["userId"] : null,
        event_group: eventType,
        date_filter: activityDate === "All" ? null : activityDate || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
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
      const companyId = localStorage.getItem("companyId");
      const companyIdNumber = companyId ? parseInt(companyId, 10) : null;
      const profileType = getCookie("ProfileType");
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "activity_log",
        company_id: profileType === "User" ? null : companyIdNumber, // Send companyId if not "User"
        user_id: profileType === "User" ? decodeTokenData["userId"] : null,
        event_group: eventType,
        date_filter: activityDate === "All" ? null : activityDate || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
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
            activeRoute={"Activity log"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Activity log</h1>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters align_view_activity">
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                excelFile={{
                  sheetName: "activity-log list",
                  tableData: userData,
                  LabelAndValueKey: ExcelColumnNames,
                }}
                pdfFile={{
                  fileName: "activity-log",
                  headerRow: PdfheaderNames,
                  tableData: userData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => {
                  resetFilters();
                }}
                hideExcelButton={userData.length > 0 ? false : true}
                hidePdfButton={userData.length > 0 ? false : true}
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
          <div>
            <FormikControl
              placeholder={"Event categories"}
              name="Event categories"
              options={eventOptions}
              onChange={handleEventChange}
              control={InputType.SELECT}
              value={singleEventType}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <div>
            <FormikControl
              placeholder={"Activity Range"}
              name="Activity Range"
              options={filterByDuration}
              onChange={handleActivityChange}
              control={InputType.SELECT}
              value={singleActivyDate}
              renderKey="label"
              valueKey="value"
            />
          </div>
        </div>
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
                activityLogStartDate && isValid(new Date(activityLogStartDate))
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

      <div className="grid">
        <div className="pt_box">
          <div className="grid">{/* <h4>{activeTab || "Current"}</h4> */}</div>

          <DynamicTable
            headers={ActivitypdfheaderNames}
            gridData={userData?.length > 0 ? userData : []}
            gridActions={[]}
            onRowClick={(data: any) => {}}
            showLoader={loading}
            loaderColSpan={10}
            renderRowList={activityRenderData}
            currentPage={page}
            entriesPerPage={perPage}
            onEntriesPerPageChange={setPerPage}
            onPageChange={setPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (userData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
