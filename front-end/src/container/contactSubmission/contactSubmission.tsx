//default imports
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
//import from reactstrap components
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  ThreeDots,
} from "react-bootstrap-icons";
//import from customized components
import Overlays from "@/components/Overlayes/Overlayes";
import TextField from "@/components/TextField/textField";
import ReusableDataTable from "@/components/DataTable/dataTable";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
//import customized styles
import styles from "./contactSubmission.module.scss";
//import from external libraries
//import from constants, interfaces ,functions and services
import { ApplicationURLS } from "@/common/applicationURLS";
import { fetchAllContacts } from "./contactSubmission.function";
import { RowsPerPageInTable } from "@/common/constants";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  contactSubmissionStatus,
  filterByDuration,
} from "@/common/constants/data";
import MyDatePicker from "@/components/datePicker/datePicker";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";

//module level constants and interfaces

type gridData = {
  id: string;
  name: string;
  message: string;
  status: string;
  email: string;
  received_date: string;
};

function ContactSubmission() {
  //useState and useEffect Management

  const [search, setSearch] = useState("");
  const [faqList, setFaqList] = useState<any>([]);

  const [actionData, setActionData] = useState<any>();
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [selectedDuration, setSelectedDuration] = useState(filterByDuration[0]);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const resetFilters = () => {
    setSearch("");
    setSelectedStatus(null);
    setSelectedDuration(filterByDuration[0]);
    setIsCustomDate(false);
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
  };

  // Check if any filter is active
  const isAnyFilterActive =
    search ||
    selectedStatus !== null ||
    selectedDuration.label !== "All" ||
    isCustomDate;
  useEffect(() => {
    getListOfContacts(page, perPage);
  }, [
    search,
    selectedStatus,
    selectedDuration,
    activityLogStartDate,
    activityLogEndDate,
    page,
    perPage,
  ]);

  //other Hooks
  const routePath = usePathname();
  const router = useRouter();

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputValue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();

    setSearch(inputValue);
  }, []);

  const handleRowView = (data: any) => {
    setActionData({ rowData: data });
    if (data?.id) {
      router.push(`${ApplicationURLS.ADMIN_CONTACT}/${data?.id}`);
    }
  };
  //Functions

  async function handleOptionClick(data: { option: string }, row: gridData) {
    const { option } = data;

    setActionData(data);

    if (option === "View") {
      router.push(`${ApplicationURLS.ADMIN_CONTACT}/${row?.id}`);
    }
  }

  const columns = [
    {
      name: "Name",
      selector: (row: gridData) => row?.name,
      grow: 1,
      wrap: true,
    },

    {
      name: "Email",
      selector: (row: gridData) => row?.email,
      wrap: true,
      grow: 1,
    },
    {
      name: "Status",
      selector: (row: gridData) => row?.status,
      wrap: true,
      grow: 1,
    },
    {
      name: "Message",
      selector: (row: gridData) => row?.message,
      grow: 2,
      wrap: true,
    },
    {
      name: "Date Received",
      selector: (row: gridData) => row?.received_date,
      width: "8rem",
      grow: 1,
      wrap: true,
    },

    {
      name: "Action",
      cell: (row: gridData) => (
        <Overlays
          trigger="click"
          placement={"bottom-end"}
          overlay={<span></span>}
          popoverTypes={"contentFaqList"}
          customPopupstyles={styles.customPopupstyles}
          optionClick={(data) => handleOptionClick(data, row)}
        >
          <div className={styles.dotsContainer}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
      maxWidth: "6rem",
    },
  ];

  function handlePrintPDF() {
    let formattedTableData: gridData[] = faqList.map((data: gridData) => [
      data.name,
      data.email,
      data.status,
      data.message,
      data.received_date,
    ]);
    let headerNames: string[] = [
      "Name",
      "Email",
      "Status",
      "Message",
      "Date Received",
    ];
    generateAndPrintPDF(formattedTableData, headerNames, "contact-submission");
  }

  function downloadExcel() {
    const columnNames = [
      { value: "name", label: "Name" },
      { value: "email", label: "Email" },
      { value: "status", label: "Status" },
      { value: "message", label: "Message" },
      { value: "received_date", label: "Date Received" },
    ];
    convertJsonToExcel(faqList, "contact submission list", columnNames);
  }

  function CustomSubHeader() {
    return (
      <div className={styles.customSubHeaderCon}>
        <div className={styles.textAndSelectCon}>
          <TextField
            placeholder="Search..."
            value={search}
            onChange={onInputChange}
            type="text"
            autoFocus
            className={styles.textFieldStyles}
          />
          <SearchableSelect
            options={[
              {
                label: "All",
                value: "",
              },
              ...contactSubmissionStatus,
            ]}
            onChange={(selectedObj: any) => setSelectedStatus(selectedObj)}
            disabled={false}
            placeholder="Status"
            className={styles.dropdown}
            selectedData={selectedStatus}
          />
          <SearchableSelect
            options={filterByDuration}
            onChange={handleActivityChange}
            disabled={false}
            placeholder="Activity Range"
            className={styles.dropdown}
            selectedData={selectedDuration}
          />
          {isCustomDate && (
            <>
              <MyDatePicker
                showIcon={true}
                toggleCalendarOnIconClick
                placeholderText="&nbsp;From date"
                selected={activityLogStartDate}
                value={formatDate(activityLogStartDate)}
                onChange={(selectedDate: string) =>
                  onStartDateChange(selectedDate)
                }
                disabled={false}
                className={styles.datePicker}
              />

              <MyDatePicker
                showIcon={true}
                toggleCalendarOnIconClick
                placeholderText="&nbsp;To date"
                selected={activityLogEndDate}
                value={formatDate(activityLogEndDate)}
                onChange={(selectedDate: string) =>
                  onEndDateChange(selectedDate)
                }
                disabled={false}
                className={styles.datePicker}
              />
            </>
          )}
          {isAnyFilterActive && (
            <div>
              <button onClick={resetFilters} className={styles.resetButton}>
                <ArrowClockwise /> Reset Filters
              </button>
            </div>
          )}
        </div>

        {faqList?.length > 0 && (
          <div className={styles.headerIconCon}>
            <span
              className={"c-p"}
              onClick={() => {
                handlePrintPDF();
              }}
              title="Print PDF"
            >
              <Printer />
            </span>
            <span
              className={"c-p"}
              onClick={() => {
                downloadExcel();
              }}
              title="Export to Excel"
            >
              <FileEarmarkExcel />
            </span>
          </div>
        )}
      </div>
    );
  }

  async function getListOfContacts(page: number, rowsPerPage: number) {
    setLoading(true);
    const response = await fetchAllContacts({
      page: page,
      perPage: rowsPerPage,
      search: search?.length > 2 ? search : "",
      status: selectedStatus?.value ?? null,
      date_filter: selectedDuration ?? null,
      start_date: activityLogStartDate ?? null,
      end_date: activityLogEndDate ?? null,
    });

    setLoading(false);

    if (response?.data?.contacts?.length > 0) {
      const modifiedData = response?.data?.contacts.map((x: any) => {
        return {
          ...x,
          received_date: x?.created_on ? formatDate(x?.created_on) : "",
        };
      });
      setFaqList(modifiedData);
    } else {
      setFaqList([]);
    }

    setTotalRows(response?.totalCount || 0);
    setPerPage(rowsPerPage);
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  function handleActivityChange(selectedValue: any) {
    setSelectedDuration(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
      setActivityLogEndDate(new Date(new Date().setHours(0, 0, 0, 0)));
      setIsCustomDate(false);
    }
  }

  function onStartDateChange(selectedDate: string) {
    let fromDate = new Date(new Date(selectedDate).setHours(0, 0, 0, 0));
    if (fromDate > activityLogEndDate) {
      setActivityLogStartDate(fromDate);
      setActivityLogEndDate(new Date(selectedDate));
    } else {
      setActivityLogStartDate(fromDate);
    }
  }

  function onEndDateChange(selectedDate: string) {
    let toDate = new Date(selectedDate);
    if (toDate < activityLogStartDate) {
      return;
    } else {
      setActivityLogEndDate(toDate);
    }
  }

  //render Template
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
            href: ApplicationURLS.ADMIN_CONTACT,
            label: "Contacts",
            active: routePath === ApplicationURLS.ADMIN_CONTACT,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Contacts</span>
      </div>

      <ReusableDataTable
        columns={columns}
        data={faqList ?? []}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={(newPerPage: any, page: any) =>
          handlePerRowsChange(newPerPage, page)
        }
        onRowClicked={(data: any) => handleRowView(data)}
        onChangePage={(page: any) => handlePageChange(page)}
      />
    </div>
  );
}

export default ContactSubmission;
