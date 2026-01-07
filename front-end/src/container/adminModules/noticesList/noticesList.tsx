"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  ThreeDots,
} from "react-bootstrap-icons";
import ReusableDataTable from "@/components/DataTable/dataTable";
import Overlays from "@/components/Overlayes/Overlayes";
import styles from "./noticesList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { AppModal } from "@/components/model/model";
import { ApplicationURLS } from "@/common/applicationURLS";
import TabContainer from "@/container/addGroups/tabsContainer";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { RowsPerPageInTable } from "@/common/constants";
import {
  convertJsonToExcel,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import {
  getNoticesListServices,
  NoticesListType,
  UpdateNotice,
} from "@/container/userModules/notices/notices.functions";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import {
  bankAccountShortTypes,
  transactionsDateOptions,
} from "@/container/userModules/bankTrustAccount/bankTrustAccount.constant";
import { DD_MM_YYYY } from "@/common/constants/general";
import { deleteCookie, setCookie } from "cookies-next";
import { fetchFiltersForAdminNotices } from "./noticesList.functions";
import { format } from "date-fns";

export default function NoticesList(props: any) {
  const { isArchived = false } = props;
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [actionData, setActionData] = useState<any>();

  const [selectedNoticesType, setSelectedNoticesType] = useState<any>();
  const [selectedAccountName, setSelectedAccountName] = useState<any>();
  const [selectedNoticesSource, setSelectedNoticesSource] = useState<any>();
  const [selectedStatus, setSelectedStatus] = useState<any>({
    value: "Sending",
    label: "Sending",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [noticesListData, setNoticesListData] = useState<NoticesListType[]>([]);

  const [companyOptions, setCompanyOptions] = useState<any>([]);
  const [accountList, setAccountList] = useState<any>([]);
  const [noticesTypeOptions, setNoticesTypeOptions] = useState<any>([]);

  const [companySelectedData, setCompanySelectedData] = useState<any>();
  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "",
    label: "All Dates",
  });
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityDate, setActivityDate] = useState("");
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );

  const tabOptions = [
    {
      id: "Current Projects",
      label: "Current",
      hasError: false,
    },
    {
      id: "Archived Projects",
      label: "Archived",
      hasError: false,
    },
  ];
  const [selectedTab, setSelectedTab] = useState(
    isArchived ? tabOptions[1]?.id : tabOptions[0]?.id
  );

  const statusNotices = [
    {
      value: "",
      label: "All",
    },
    { value: "Sending", label: "Sending" },
    { value: "Sent", label: "Sent" },
    { value: "Sent - Onboarded", label: "Sent - Onboarded" },
  ];
  const initialObj = { value: "", label: "All" };

  useEffect(() => {
    deleteCookie("noticeListPath");
    fetchFilters();
  }, [companySelectedData, selectedAccountName, selectedNoticesType]);

  useEffect(() => {
    fetchData(page, perPage);
  }, [selectedValue, activityDate, activityLogEndDate, activityLogStartDate]);

  const resetFilters = () => {
    setCompanySelectedData(null);
    setSelectedAccountName(null);
    setSelectedNoticesType(null);
    setSelectedStatus({ value: "Sending", label: "Sending" });

    // Reset date filters
    setSingleActivityDate({ value: "", label: "All Dates" });
    setIsCustomDate(false);
    setActivityDate("");
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
  };

  const isAnyFilterActive =
    companySelectedData?.value ||
    selectedAccountName?.value ||
    selectedNoticesType?.value ||
    selectedStatus?.value !== "Sending" || // Add condition for status filter
    singleActivityDate?.value || // Add condition for single activity date filter
    (isCustomDate && (activityLogStartDate || activityLogEndDate));

  const fetchFilters = async () => {
    const result = await fetchFiltersForAdminNotices({
      company_id: companySelectedData?.value || null,
      bank_account_id: selectedAccountName?.value || null,
      account_type: "",
      notice_type: selectedNoticesType?.value || null,
      status: isArchived ? "Deleted" : "",
      delegated_qbcc: true,
    });
    if (result) {
      setAccountList([
        { label: "All", value: "" },
        ...result?.account_list?.map(({ name, value }: any) => {
          return {
            label: name,
            value: Number(value),
          };
        }),
      ]);
      setCompanyOptions([
        { label: "All", value: "" },

        ...result?.company_list?.map(({ name, value }: any) => {
          return { label: name, value: Number(value) };
        }),
      ]);
      setNoticesTypeOptions([
        { label: "All", value: "" },
        ...result.notice_type_list?.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
    }
  };

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map(
      (notices: NoticesListType) => [
        notices?.project_name,
        notices?.account_name,
        notices?.notice_type,
        notices?.notice_source,
        notices?.status,
      ]
    );
    let headerNames: string[] = [
      "Project Name",
      "Account Name",
      "Notice Type",
      "Notice Source",
      "Status",
    ];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "current-notices",
      true
    );
  };

  function downloadExcel() {
    const columnNames = [
      { value: "project_name", label: "Project Name" },
      { value: "account_name", label: "Account Name" },
      { value: "notice_type", label: "Notices Type" },
      { value: "notice_source", label: "Notices Sources" },
      { value: "status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "current notices list", columnNames);
  }

  const handleSelectChange = (
    selectedValue: any,
    field?:
      | "project_name"
      | "account_name"
      | "notice_type"
      | "notice_source"
      | "status"
      | "company"
  ) => {
    if (field === "notice_type") {
      setSelectedNoticesType(selectedValue);
    }
    if (field === "account_name") {
      setSelectedAccountName(selectedValue);
    }
    if (field === "notice_source") {
      setSelectedNoticesSource(selectedValue);
    }
    if (field === "status") {
      setSelectedStatus(selectedValue);
    }
    if (field === "company") {
      setCompanySelectedData(selectedValue);
    }
    setSelectedValue(selectedValue);
    // Perform any other actions based on the selected value
  };

  const handleOptionClick = async (
    data: { id: string; option: string },
    row: NoticesListType
  ) => {
    const { id, option } = data;
    if (option === "Mark as sent") {
      setActionData(row);
      setOpenModal(!openModal);
    }
    if (option === "View") {
      setCookie("noticeListPath", ApplicationURLS.ADMIN_NOTICES);
      router.push(`${ApplicationURLS.ADMIN_NOTICES_VIEW}/${id}`);
    }
  };

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    const { id, notice_id } = actionData;
    if (id) {
      let payload = {
        notice_id: notice_id,
        status: "Sent",
      };
      let changeStatusRes = await UpdateNotice(payload, true);
      if (changeStatusRes) {
        await fetchData(page, perPage);
      }
    }
  };

  function handleTabClick(tab: any) {
    if (tab === selectedTab) {
      return;
    } else if (tab === tabOptions[0]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.ADMIN_NOTICES);
    } else if (tab === tabOptions[1]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.ADMIN_NOTICES_ARCHIVE);
    }
  }

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await fetchData(page, newPerPage);
  };

  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const payload = {
        company_id: companySelectedData?.value || null,
        delegated_qbcc: true,
        payment_id: null,
        page: page,
        items_per_page: rowsPerPage,
        notice_type: selectedNoticesType?.value || null,
        status: isArchived
          ? "Deleted"
          : selectedStatus?.value
          ? selectedStatus?.value
          : "",
        payment_claim_id: null,
        bank_account_id: selectedAccountName?.value || null,
        date_filter: activityDate || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
      };
      const response = await getNoticesListServices(payload);

      setNoticesListData(response?.notices_list || []);
      setTotalRows(response?.total_count || 0);
      setPerPage(rowsPerPage);
      let printDataObjCreation = response?.notices_list?.map(
        (notices: NoticesListType) => {
          return {
            notice_id: notices?.notice_id,
            notice_type: notices?.notice_type,
            account_name: notices?.account_name,
            notice_source: notices?.notice_source,
            project_id: notices?.project_id,
            project_name: notices?.project_name,
            status: notices?.status,
          };
        }
      );
      setPrintDocumentData(printDataObjCreation);
    } catch (error) {
      console.error("Error fetching notices lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityChange = (selectedValue: any) => {
    setSingleActivityDate(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue.value); // Perform any other actions based on the selected value
  };
  const handleRowView = (id: any) => {
    setCookie("noticeListPath", ApplicationURLS.ADMIN_NOTICES);
    router.push(`${ApplicationURLS.ADMIN_NOTICES_VIEW}/${id}`);
  };

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <SearchableSelect
          options={companyOptions}
          onChange={(v) => {
            handleSelectChange(v, "company");
          }}
          disabled={false}
          placeholder="Company Profile"
          selectedData={companySelectedData}
          className={styles.textFieldStyles3}
        />
        <SearchableSelect
          options={accountList}
          onChange={(name) => {
            handleSelectChange(name, "account_name");
          }}
          disabled={false}
          selectedData={selectedAccountName}
          placeholder="Account Name"
          className={styles.textFieldStyles3}
        />
        <SearchableSelect
          options={noticesTypeOptions}
          onChange={(v) => {
            handleSelectChange(v, "notice_type");
          }}
          disabled={false}
          placeholder="Notices Type"
          selectedData={selectedNoticesType}
          className={styles.textFieldStyles3}
        />
        {!isArchived && (
          <SearchableSelect
            options={statusNotices}
            onChange={(status) => {
              handleSelectChange(status, "status");
            }}
            disabled={false}
            selectedData={selectedStatus}
            placeholder="Status"
            className={styles.textFieldStyles}
          />
        )}
        <SearchableSelect
          options={transactionsDateOptions}
          onChange={handleActivityChange}
          disabled={false}
          placeholder="Dates"
          selectedData={singleActivityDate}
          className={styles.textFieldStyles}
        />

        {isCustomDate && (
          <>
            <CustomDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;From date"
              selected={activityLogStartDate}
              value={activityLogStartDate}
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
            <CustomDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;To date"
              selected={activityLogEndDate}
              value={activityLogEndDate}
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
        {isAnyFilterActive && (
          <button
            onClick={resetFilters}
            title="Reset Filters"
            className={styles.resetButton}
          >
            <ArrowClockwise className={styles.iconSpacing} />
            Reset Filters
          </button>
        )}
      </div>
      {printDocumentData?.length > 0 && (
        <div className={styles.headerIconCon}>
          <span
            className={styles.cursorPointer}
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
            className={styles.cursorPointer}
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
  const columns = [
    {
      name: "Date Generated",
      minWidth: "200px",
      wrap: true,
      // selector: (row: NoticesListType) => row.notice_date,
      selector: (row: NoticesListType) =>
        row?.notice_date
          ? format(new Date(row?.notice_date), "dd MMM yyyy h:mm a")
          : "N/A",
    },
    {
      name: "Company Profile",
      minWidth: "200px",
      wrap: true,
      selector: (row: NoticesListType) => row.company_name,
    },
    {
      name: "Account Name",
      wrap: true,
      minWidth: "200px",
      selector: (row: NoticesListType) => row.account_name,
    },
    {
      name: "Type",
      wrap: true,
      // minWidth: "200px",
      selector: (row: NoticesListType) =>
        row.bank_account_type
          ? bankAccountShortTypes[
              row.bank_account_type as keyof typeof bankAccountShortTypes
            ]
          : "",
    },
    {
      name: "Notice Type",
      wrap: true,
      minWidth: "200px",
      selector: (row: NoticesListType) => row.notice_type,
    },

    {
      name: "Notice Source",
      wrap: true,
      minWidth: "200px",
      selector: (row: NoticesListType) => row.notice_source,
    },
    {
      name: "Status",
      fixed: "right",
      center: true,
      selector: (row: NoticesListType) => row.status,
      cell: (row: NoticesListType) => (
        <span style={{ color: row.status === "Not Sent" ? "red" : "" }}>
          {row.status}
        </span>
      ),
    },
    ...(!isArchived
      ? [
          {
            name: "Actions",
            fixed: "right",
            grow: true,
            center: true,
            cell: (row: NoticesListType, index: number) => (
              <Overlays
                trigger="click"
                placement={index === 0 ? "bottom-end" : "auto"}
                overlay={<span></span>}
                popoverTypes={"tableActions"}
                popoverActions={[
                  { label: "View", value: "View" },
                  { label: "Mark as sent", value: "Mark as sent" },
                ]}
                customPopupstyles={styles.customPopupstyles}
                cellData={{
                  id: row?.id,
                }}
                optionClick={(data) => handleOptionClick(data, row)} // Pass user_id
                popperConfig={{
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [20, 10], // Adjust the offset as needed
                      },
                    },
                  ],
                }}
              >
                {row?.status === "Sending" ? (
                  <div style={{ cursor: "pointer" }}>
                    <ThreeDots />
                  </div>
                ) : (
                  <></>
                )}
              </Overlays>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={styles.container}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },

          {
            href: "",
            label: "Notices",
            active: true,
          },
        ]}
        separator={<span className={styles.breadcrumbSeparator}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Notices</span>
      </div>
      <div className={styles.subHeaderTabs}>
        <TabContainer
          tabs={tabOptions}
          activeTab={selectedTab}
          onTabClick={handleTabClick}
        />
      </div>

      <ReusableDataTable
        columns={columns}
        data={noticesListData}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        paginationServer
        progressPending={loading}
        paginationTotalRows={totalRows}
        onChangePage={handlePageChange}
        onChangeRowsPerPage={handlePerRowsChange}
        onRowClicked={(data: any) => {
          if (!isArchived) handleRowView(data?.id);
        }}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={""}
        modalBodyContent={"Are you sure you want to send?"}
        onConfirm={() => {
          handleModalPopUpFunction();
        }}
      />
    </div>
  );
}
