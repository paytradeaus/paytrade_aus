"use client";
import React, { useEffect, useState } from "react";
import styles from "./activityLogsList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  GetActivityLogList,
  GetEventGroupList,
} from "./activityLogsList.functions";
import { RowsPerPageInTable } from "@/common/constants";
import { ApplicationURLS } from "@/common/applicationURLS";
import { format } from "date-fns";
import { useTokenDetails } from "@/common/commonHooks";
import { filterByDuration } from "@/common/constants/data";
import CustomSubHeader from "./customHeader";
import {
  convertJsonToExcel,
  generateAndPrintPDF,
} from "@/common/commonFunctions";

type UserData = {
  created_on: string;
  event_date: string;
  event_type: string;
  first_name: string;
  last_name: string;
  event_text: string;
  email_id: string;
};
const ActivityLogsList = () => {
  const routePath = usePathname();
  const { decodeTokenData } = useTokenDetails();
  const [userData, setUserData] = useState<UserData[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [eventType, setEventType] = useState({ label: "All", value: "" });
  const [activityDate, setActivityDate] = useState("");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "",
    label: "All",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);

  const eventOptions = [
    { label: "All", value: "" },
    { label: "Blogs", value: "Blogs" },
    { label: "Business onboarding", value: "Business onboarding" },
    { label: "Communication", value: "Communication" },
    { label: "Email Templates", value: "Email Templates" },
    { label: "FAQ", value: "FAQ" },
    { label: "Login As User", value: "Login As User" },
    { label: "Manage Admin Users", value: "Manage Admin Users" },
    { label: "Manage Contents", value: "Manage Contents" },
    { label: "Manage Groups", value: "Manage Groups" },
    { label: "Masters", value: "Masters" },
    { label: "Notices", value: "Notices" },
    { label: "Resource Guides", value: "Resource Guides" },
    { label: "Signed in/out", value: "Signed in/out" },
    { label: "Subscription Management", value: "Subscription Management" },
  ];

  const resetFilters = () => {
    setSingleActivyDate({ label: "All", value: "" });
    setEventType({ label: "All", value: "" });
    setActivityDate("");
    setIsCustomDate(false);
  };

  const isAnyFilterActive =
    Boolean(eventType?.value) || Boolean(activityDate) || isCustomDate === true;

  useEffect(() => {
    getAllActivityLogList(page, perPage);
  }, [eventType, activityDate, activityLogEndDate, activityLogStartDate]);

  const getAllActivityLogList = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const responseData = await GetActivityLogList(
      {
        adminId: decodeTokenData?.id,
        page: Number(page),
        perPage: Number(rowsPerPage),
        eventType: eventType?.value,
        dateFilter: activityDate,
        startDate: isCustomDate ? activityLogStartDate : null,
        endDate: isCustomDate ? activityLogEndDate : null,
      },
      setLoading
    );
    setUserData(responseData?.activity_logs || []);
    setTotalRows(responseData?.total_count || 0);
    setPerPage(rowsPerPage);
    const printDataObjCreation = responseData?.activity_logs?.map(
      (row: any) => {
        return {
          event_date: row?.event_date
            ? format(new Date(row?.event_date), "dd MMM yyyy h:mm a")
            : "N/A",
          user: row?.first_name
            ? `${row.first_name} ${row?.last_name || ""}(${row?.email_id})`
            : `${row?.last_name}}(${row?.email_id})` || "",
          event_text: row.event_text
            ? row.event_text
                .replace(/<\/?p>/g, "") // removes <p> and </p>
                .replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1") // removes <a> tags and keeps the inner text
            : "",
          history: "",
        };
      }
    );
    setPrintDocumentData(printDataObjCreation);
  };
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((txn: any) => [
      txn?.event_date,
      txn?.user,
      txn?.event_text,
      txn?.history,
    ]);
    let headerNames: string[] = ["Date Changed", "User", "Event", "History"];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "Activity logs list",
      true
    );
  };
  function downloadExcel() {
    const columnNames = [
      { value: "event_date", label: "Date Changed" },
      { value: "user", label: "User" },
      { value: "event_text", label: "Event" },
      { value: "history", label: "History" },
    ];
    convertJsonToExcel(printDocumentData, "Activity logs list", columnNames);
  }

  const handleActivityChange = (selectedValue: any) => {
    setSingleActivyDate(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue.value); // Perform any other actions based on the selected value
  };

  const handleEventChange = (selectedValue: any) => {
    // setSingleEventType(selectedValue);
    setEventType(selectedValue);
  };
  const handlePageChange = async (page: number) => {
    setPage(page);
    await getAllActivityLogList(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getAllActivityLogList(page, newPerPage);
  };

  const columns = [
    {
      name: "Date Changed",
      selector: (row: UserData) =>
        row?.created_on
          ? format(new Date(row?.created_on), "dd MMM yyyy h:mm a")
          : "N/A",
      wrap: true,
    },

    {
      name: "User",
      wrap: true,
      selector: (row: UserData) =>
        row?.first_name
          ? `${row.first_name} ${row?.last_name || ""}(${row?.email_id})`
          : `${row?.last_name}}(${row?.email_id})` || "",
    },

    {
      name: "Event",
      selector: (row: UserData) => {
        const stringWithoutPTags = row.event_text.replace(/<\/?p>/g, "");
        return <div dangerouslySetInnerHTML={{ __html: stringWithoutPTags }} />;
      },
      wrap: true,
    },

    // {
    //   name: "History",
    //   selector: (row: UserData) => "",
    //   fixed: "right",
    //   grow: true,
    // },
  ];

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: routePath === ApplicationURLS.ADMIN_DASHBOARD,
          },
          {
            href: "",
            label: "Activity Log",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Activity Log</span>
      </div>

      <ReusableDataTable
        columns={columns}
        data={userData}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            eventOptions={eventOptions}
            filterByDuration={filterByDuration}
            singleEventType={eventType}
            handleEventChange={handleEventChange}
            singleActivyDate={singleActivyDate}
            handleActivityChange={handleActivityChange}
            isCustomDate={isCustomDate}
            activityLogStartDate={activityLogStartDate}
            activityLogEndDate={activityLogEndDate}
            setActivityLogEndDate={setActivityLogEndDate}
            setActivityLogStartDate={setActivityLogStartDate}
            printDocumentData={printDocumentData}
            handlePrintPDF={handlePrintPDF}
            downloadExcel={downloadExcel}
            resetFilters={resetFilters} // Pass reset function to child
            isAnyFilterActive={isAnyFilterActive} // Pass filter active state to child
          />
        }
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
      />
    </div>
  );
};

export default ActivityLogsList;
