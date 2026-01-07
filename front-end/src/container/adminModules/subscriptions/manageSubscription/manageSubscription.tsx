"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  ThreeDots,
} from "react-bootstrap-icons";
import styles from "./manageSubscription.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";

import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
  upperCaseFirstLetter,
} from "@/common/commonFunctions";
import debounce from "lodash/debounce";
import { DD_MM_YYYY } from "@/common/constants/general";
import { useLoaderContext } from "@/context/useLoader";
import {
  AdminListSubscribedUsers,
  CancelSubscriptionForUser,
  SubscribedUser,
} from "./manageSubscription.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { fetchFiltersForAdminJournals } from "@/container/journals/adminJournals.functions";
import {
  statusOptions,
  subscriptionDateOptions,
} from "./manageSubscription.constants";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { format } from "date-fns";
import TextField from "@/components/TextField/textField";

const ManageProfiles = () => {
  const routePath = usePathname();
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [userData, setUserData] = useState<SubscribedUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedData, setSingleSelectedData] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [companyOptions, setCompanyOptions] = useState<any>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>("");

  const [selectedPlanData, setSelectedPlanData] = useState<any>();
  const [planTypeValue, setPlanTypeValue] = useState("");
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "",
    label: "All Dates",
  });
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [activityDate, setActivityDate] = useState("");
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );

  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<any>("");
  const [selectedStatusName, setSelectedStatusName] = useState<any>("");

  const { setLoader }: any = useLoaderContext();
  const resetFilters = () => {
    setSearch(""); // Reset search input
    setSelectedStatusName(""); // Reset status filter
    setSelectedStatus("");
    setSelectedCompany(""); // Reset company filter
    // setSingleActivityDate({ value: "", label: "All Dates" }); // Reset date filter
    setSingleActivityDate({ value: "", label: "All Dates" });
    setIsCustomDate(false);
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
    // setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0))); // Reset start date
    // setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999))); // Reset end date
  };

  // Check if any filter is active
  const isAnyFilterActive =
    search !== "" ||
    selectedStatusName !== "" ||
    selectedStatus !== "" ||
    selectedCompany !== "" ||
    singleActivityDate.value !== "";

  // singleActivityDate.value !== "";
  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel;
  }, [search]);

  useEffect(() => {
    fetchSubscriptionPlans(page, perPage);
  }, [
    debouncedSearch,
    selectedValue,
    planTypeValue,
    selectedCompany,
    activityLogStartDate,
    activityLogEndDate,
    singleActivityDate,
    selectedStatus,
  ]);

  async function fetchSubscriptionPlans(page: number, rowsPerPage: number) {
    setLoading(true);
    const postData = {
      getAllSubscribedUsersInput: {
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null,
        date_filter: singleActivityDate?.value,
        start_date: isCustomDate
          ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
          : null,
        end_date: isCustomDate
          ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
          : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        search: search ?? "",
        status: selectedStatus || null,
        page_number: page,
        page_size: rowsPerPage,
      },
    };
    try {
      const subscriptionListResponse = await AdminListSubscribedUsers(postData);
      setUserData(subscriptionListResponse?.user_list || []);
      setTotalRows(subscriptionListResponse?.total_count || 0);
      setPerPage(rowsPerPage);

      const printDataObjCreation = subscriptionListResponse?.user_list?.map(
        (each: SubscribedUser) => {
          return {
            company_name: each?.company_name,
            plan_name: each?.plan_name,
            subscribed_amount: each?.subscribed_amount,
            start_date: formatDate(each?.start_date),
            expiry_date: formatDate(each?.expiry_date),
            bill_cycle: each?.bill_cycle,
            subscription_status: each?.subscription_status,
          };
        }
      );
      setPrintDocumentData(printDataObjCreation);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
    } finally {
      setLoading(false);
    }
  }

  const fetchFilters = async () => {
    const result = await fetchFiltersForAdminJournals({});
    if (result) {
      setCompanyOptions([
        { label: "All", value: "" }, // Add this line to include the "All" option
        ...result.company_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
    }
  };

  async function handleOptionClick(data: { comp_id: number; option: string }) {
    const { comp_id, option } = data;

    setActionData(data);
    if (option === "Cancel Subscription") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to Cancel this Subscription?",
      }));
    }
  }

  async function handleCancelSubscription() {
    try {
      setOpenModal(!openModal);

      if (actionData.option === "Cancel Subscription") {
        // Ensure companyId is a number
        const companyId = Number(actionData?.comp_id);

        setLoader(true);

        // Call the CancelSubscriptionForUser service with companyId
        const response = await CancelSubscriptionForUser(companyId);

        if (response) {
          await fetchSubscriptionPlans(page, perPage);
        }
      }

      setLoader(false);
    } catch (err: any) {
      setLoader(false);
      // Optionally, handle or log the error
      console.error("An error occurred while canceling the subscription:", err);
    }
  }

  async function handlePageChange(page: number) {
    setPage(page);
    await fetchSubscriptionPlans(page, perPage);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
    await fetchSubscriptionPlans(page, newPerPage);
  }

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e?.target?.value?.trim()
      ? e?.target?.value
      : e?.target?.value?.trim();
    setSearch(inputvalue);
  }, []);

  const handleCompanyChange = (selectedValue: any) => {
    setSelectedCompany(selectedValue);
  };
  const handleActivityChange = (selectedValue: any) => {
    setTimeKey(new Date().getTime());
    setSingleActivityDate(selectedValue);
    setIsCustomDate(selectedValue.value === "Custom");
    setActivityDate(selectedValue.value);
  };

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue?.value);
    setSelectedStatusName(selectedValue);
    // Perform any other actions based on the selected valuef
  };

  function downloadExcel() {
    const columnNames = [
      { value: "company_name", label: "Company Name" },
      { value: "plan_name", label: "Subscription Name" },
      { value: "subscribed_amount", label: "Subscribed Amount" },
      { value: "start_date", label: "Start Date" },
      { value: "expiry_date", label: "Expiry Date" },
      { value: "bill_cycle", label: "Bill Cycle" },
      { value: "subscription_status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "Manage Profiles List", columnNames);
  }
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((user: any) => [
      user?.company_name,
      user?.plan_name,
      user?.subscribed_amount,
      user?.start_date,
      user?.expiry_date,
      user?.bill_cycle,
      user?.subscription_status,
    ]);
    let headerNames: string[] = [
      "Company Name",
      "Subscription Name",
      "Subscribed Amount",
      "Start Date",
      "Expiry Date",
      "Bill Cycle",
      "Status",
    ];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "Manage Profiles List",
      true
    );
  };
  const columns = [
    {
      name: "Company Name",
      wrap: true,
      left: true,
      selector: (row: SubscribedUser) => row?.company_name || "",
    },
    {
      name: "Subscription Name",
      wrap: true,
      center: true,
      selector: (row: SubscribedUser) =>
        row?.plan_name ? upperCaseFirstLetter(row?.plan_name) : "",
    },
    {
      name: "Subscribed Amount",
      wrap: true,
      right: true,
      selector: (row: SubscribedUser) => row?.subscribed_amount || "",
    },
    {
      name: "Start Date",
      wrap: true,
      center: true,
      selector: (row: SubscribedUser) =>
        row?.start_date ? formatDate(row?.start_date) : "",
    },
    {
      name: "Expiry Date",
      wrap: true,
      center: true,
      selector: (row: SubscribedUser) =>
        row?.expiry_date ? formatDate(row?.expiry_date) : "",
    },
    {
      name: "Bill Cycle",
      grow: true,
      center: true,
      selector: (row: SubscribedUser) => row?.bill_cycle || "",
    },
    {
      name: "Status",
      grow: true,
      center: true,
      selector: (row: SubscribedUser) => row?.subscription_status || "",
    },

    {
      name: "Action",
      grow: true,
      right: true,

      cell: (row: SubscribedUser, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            {
              label: "Cancel Subscription",
              value: "Cancel Subscription",
              isDelete: true,
            },
          ]}
          optionClick={(data) => handleOptionClick(data)}
          cellData={{
            comp_id: row.company_id,
          }}
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
          <div className={styles.dotsContainer}>
            {row?.subscription_status != "Cancelled" && <ThreeDots />}
          </div>
        </Overlays>
      ),
    },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <TextField
          placeholder="Search By Name"
          value={search}
          onChange={onInputChange}
          type="text"
          autoFocus
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={companyOptions}
          onChange={handleCompanyChange}
          disabled={false}
          selectedData={selectedCompany}
          placeholder="Company Profile"
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={statusOptions}
          onChange={handleStatusChange}
          disabled={false}
          placeholder="Select Status"
          selectedData={selectedStatusName}
          className={styles.textFieldStyles}
        />

        <SearchableSelect
          options={subscriptionDateOptions}
          onChange={handleActivityChange}
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
              onChange={(selectedDate: Date) => {
                let fromDate = new Date(
                  new Date(selectedDate).setHours(0, 0, 0, 0)
                );
                if (fromDate > activityLogEndDate) {
                  setTimeKey(new Date().getTime());
                  setActivityLogStartDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));
                } else {
                  setTimeKey(new Date().getTime());
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
              onChange={(selectedDate: Date) => {
                let toDate = new Date(selectedDate);
                if (toDate < activityLogStartDate) {
                  return;
                } else {
                  setTimeKey(new Date().getTime());
                  setActivityLogEndDate(toDate);
                }
              }}
              disabled={false}
              format={DD_MM_YYYY}
              maxDate={new Date()}
              className={styles.DatePickerCustomStyles}
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
            href: ApplicationURLS.ADMIN_SUBSCRIPTION,
            label: "Subscription",
            active: false,
          },
          {
            href: "",
            label: "Manage Profiles",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Manage Profiles</span>
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
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleCancelSubscription();
        }}
      />
    </div>
  );
};

export default ManageProfiles;
