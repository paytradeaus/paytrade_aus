"use client";
import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { FileEarmarkExcel, Printer } from "react-bootstrap-icons";
import styles from "./userActivityLogsList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  GetActivityLogList,
  GetEventGroupList,
} from "./userActivityLogsList.functions";
import { RowsPerPageInTable } from "@/common/constants";
import { ApplicationURLS } from "@/common/applicationURLS";
import { format } from "date-fns";
import { useTokenDetails } from "@/common/commonHooks";
import MyDatePicker from "@/components/datePicker/datePicker";
import { DD_MM_YYYY } from "@/common/constants/general";
import { filterByDuration } from "@/common/constants/data";
import { getCookie } from "cookies-next";
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
  timezone: string;
};
const UserActivityLogsList = () => {
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
  const [singleEventType, setSingleEventType] = useState();
  const [eventType, setEventType] = useState(null);
  const [activityDate, setActivityDate] = useState("");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "This Month",
    label: "This Month",
  });
  // const [eventOptions, setEventOptions] = useState([]);

  const [printDocumentData, setPrintDocumentData] = useState<any>([]);

  const eventOptions = [
    { label: "Bank accounts", value: "Bank accounts" },
    { label: "Book keeping", value: "Book keeping" },
    { label: "Client/Supplier", value: "Client/Supplier" },
    { label: "Contracts", value: "Contracts" },
    { label: "Journals", value: "Journals" },
    { label: "Manage business", value: "Manage business" },
    { label: "Manage users", value: "Manage users" },
    { label: "Notices", value: "Notices" },
    { label: "Payment claims", value: "Payment claims" },
    { label: "Payments", value: "Payments" },
    { label: "Projects", value: "Projects" },
    { label: "Signed in/out", value: "Signed in/out" },
    { label: "Subscriptions", value: "Subscriptions" },
    { label: "Variations", value: "Variations" },
  ];

  // useEffect(() => {
  //   (async () => {
  //     let evntList = await GetEventGroupList({});
  //     let modifiedOpt = evntList?.map((each: any) => {
  //       return {
  //         label: each?.name,
  //         value: each?.name,
  //       };
  //     });
  //     setEventOptions(modifiedOpt);
  //     getAllActivityLogList(1, perPage);
  //   })();
  // }, []);

  useEffect(() => {
    getAllActivityLogList(page, perPage);
  }, [eventType, activityDate, activityLogEndDate, activityLogStartDate]);

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
        page: Number(page),
        perPage: Number(rowsPerPage),
        eventType: eventType,
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
            ? `${format(new Date(row?.event_date), "dd MMM yyyy h:mm a")} ${
                row?.timezone || ""
              }`
            : "N/A",
          user: row?.first_name
            ? `${row.first_name} ${row?.last_name || ""}(${row?.email_id})`
            : `${row?.last_name}}(${row?.email_id})` || "",
          event_text: row.event_text
            ? row.event_text
                .replace(/<\/?p>/g, "") // removes <p> and </p>
                .replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1") // removes <a> tags and keeps the inner text
            : "",
          // history: "",
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
      // txn?.history,
    ]);
    let headerNames: string[] = ["Date Changed", "User", "Event"];
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
      // { value: "history", label: "History" },
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
    setSingleEventType(selectedValue);
    setEventType(selectedValue?.label);
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
        row?.event_date
          ? `${format(new Date(row?.event_date), "dd MMM yyyy h:mm a")} ${
              row?.timezone === "India Standard Time"
                ? "Indian Standard Time"
                : row?.timezone || ""
            }`
          : "N/A",
      wrap: true,
    },
    {
      name: "User",
      wrap: true,
      selector: (row: UserData) =>
        row?.first_name
          ? `${row.first_name} ${row?.last_name || ""}`
          : `${row?.last_name || ""}` || "",
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
    //   wrap: true,
    // },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <div className={styles.fieldsWraper}>
          <SearchableSelect
            // className={styles.eventOptionStyles}
            options={eventOptions}
            onChange={handleEventChange}
            disabled={false}
            placeholder="Event categories"
            selectedData={singleEventType}
          />
          <SearchableSelect
            options={filterByDuration}
            onChange={handleActivityChange}
            disabled={false}
            placeholder="Activity Range"
            selectedData={singleActivyDate}
          />
        </div>
        {isCustomDate && (
          <>
            <MyDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;From date"
              selected={activityLogStartDate}
              value={format(new Date(activityLogStartDate), DD_MM_YYYY)}
              onChange={(selectedDate: string) => {
                let fromDate = new Date(
                  new Date(selectedDate).setHours(0, 0, 0, 0)
                );
                if (fromDate > activityLogEndDate) {
                  setActivityLogStartDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));
                } else {
                  setActivityLogStartDate(fromDate);
                }
              }}
              disabled={false}
              format={DD_MM_YYYY}
              className={styles.DatePickerCustomStyles}
            />

            <MyDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;To date"
              selected={activityLogEndDate}
              value={format(new Date(activityLogEndDate), DD_MM_YYYY)}
              onChange={(selectedDate: string) => {
                let toDate = new Date(selectedDate);
                if (toDate < activityLogStartDate) {
                  return;
                } else {
                  setActivityLogEndDate(toDate);
                }
              }}
              disabled={false}
              format={DD_MM_YYYY}
              className={styles.DatePickerCustomStyles}
            />
          </>
        )}
      </div>
      {printDocumentData?.length > 0 && (
        <div className={styles.headerIconCon}>
          <span
            className={styles.iconStyles}
            onClick={() => {
              if (printDocumentData?.length) {
                handlePrintPDF();
              }
            }}
            title="Print PDF"
          >
            <Printer />
          </span>
          <span
            className={styles.iconStyles}
            onClick={() => {
              if (printDocumentData?.length) {
                downloadExcel();
              }
            }}
            title="Export to Excel"
          >
            <FileEarmarkExcel />
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.USER_DASHBOARD,
            label: "Home",
            active: routePath === ApplicationURLS.USER_DASHBOARD,
          },
          {
            href: ApplicationURLS.USER_ACTIVITY_LOGS,
            label: "Activity Log",
            active: routePath === ApplicationURLS.USER_ACTIVITY_LOGS,
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
        subHeaderComponent={<CustomSubHeader />}
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

export default UserActivityLogsList;
