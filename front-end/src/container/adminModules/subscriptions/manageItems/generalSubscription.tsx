"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  ThreeDots,
} from "react-bootstrap-icons";
import styles from "./generalSubscription.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";

import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import {
  convertJsonToExcel,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import debounce from "lodash/debounce";
import { useLoaderContext } from "@/context/useLoader";
import {
  CancelSubscriptionForUser,
  SubscribedUser,
} from "../manageSubscription/manageSubscription.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { fetchFiltersForAdminJournals } from "@/container/journals/adminJournals.functions";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { statusOptions, tabOptions } from "./generalSubscription.contants";
import {
  AdminListSubscriptionItems,
  SubscriptionItem,
} from "./generalSubscription.functions";
import { editSubscriptionDetails } from "./addItems/addItems.functions";
import { toast } from "react-toastify";
import TabContainer from "@/container/addGroups/tabsContainer";

const GeneralSubscription = (props: any) => {
  const { isArchived = false } = props;

  const routePath = usePathname();
  const router = useRouter();

  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [subscriptionItems, setSubscriptionItems] = useState<
    SubscriptionItem[]
  >([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [companyOptions, setCompanyOptions] = useState<any>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>("");

  const [planTypeValue, setPlanTypeValue] = useState("");
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(
    isArchived ? "Deleted" : ""
  );
  const [selectedStatusName, setSelectedStatusName] = useState<any>("");
  const [selectedTab, setSelectedTab] = useState(
    isArchived ? tabOptions[1]?.id : tabOptions[0]?.id
  );
  const resetFilters = () => {
    setSearch(""); // Reset search input
    setSelectedStatusName(""); // Reset status filter
    setSelectedStatus("");
  };

  // Check if either the search input or the selected filter has been changed
  const isAnyFilterActive =
    search !== "" || selectedStatusName !== "" || selectedStatus !== "";
  const { setLoader }: any = useLoaderContext();

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
    fetchSubscriptionItems(page, perPage);
  }, [
    debouncedSearch,
    selectedValue,
    planTypeValue,
    selectedCompany,
    selectedStatus,
  ]);

  async function fetchSubscriptionItems(page: number, rowsPerPage: number) {
    setLoading(true);
    const postData = {
      status: selectedStatus || null,
      keyword: search ?? "",
      page: page,
      perPage: rowsPerPage,
    };

    try {
      const subscriptionItemsResponse = await AdminListSubscriptionItems(
        postData
      );
      setSubscriptionItems(subscriptionItemsResponse?.subscriptionItems || []);
      setTotalRows(subscriptionItemsResponse?.totalCount || 0);
      setPerPage(rowsPerPage);

      const printDataObjCreation =
        subscriptionItemsResponse?.subscriptionItems?.map(
          (each: SubscriptionItem) => ({
            item_name: each?.item_name,
            description: each?.description,
            item_status: each?.item_status,
          })
        );
      setPrintDocumentData(printDataObjCreation);
    } catch (error) {
      console.error("Error fetching subscription items:", error);
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

  async function handleOptionClick(data: {
    id: number;
    option: string;
    description: string;
    status: string;
    name: string;
  }) {
    const { id, option, description, status, name } = data;

    setActionData(data);
    if (option === "Edit") {
      router.push(
        `${ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_EDIT}/${id}`
      );
    } else if (option === "Delete") {
      setOpenModal(true);
      setActionData(data);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to Delete this Subscription item?",
      }));
    } else if (option === "View") {
      router.push(
        `${ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_VIEW}/${id}`
      );
    }
  }

  const handleRowView = (id: any) => {
    router.push(
      `${ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_VIEW}/${id}`
    );
  };

  async function handleDeleteSubscriptionItem() {
    try {
      setOpenModal(!openModal);

      if (actionData.option === "Delete") {
        setLoader(true);
        // Call the CancelSubscriptionForUser service with companyId
        const response = await editSubscriptionDetails({
          updateSubscriptionItemInput: {
            id: actionData?.id,
            item_name: actionData?.name,
            description: actionData?.description,
            item_status: "Deleted",
          },
        });

        if (response) {
          toast.success("Subscription item deleted successfully");
          await fetchSubscriptionItems(page, perPage);
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
    await fetchSubscriptionItems(page, perPage);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
    await fetchSubscriptionItems(page, newPerPage);
  }

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e?.target?.value?.trim()
      ? e?.target?.value
      : e?.target?.value?.trim();
    setSearch(inputvalue);
  }, []);

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue?.value);
    setSelectedStatusName(selectedValue);
    // Perform any other actions based on the selected value
  };

  function downloadExcel() {
    const columnNames = [
      { value: "item_name", label: "Item Name" },
      { value: "description", label: "Description" },
      { value: "item_status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "General List", columnNames);
  }
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((user: any) => [
      user?.item_name,
      user?.description,
      user?.item_status,
    ]);
    let headerNames: string[] = ["Item Name", "Description", "Status"];
    generateAndPrintPDF(formatedTableData, headerNames, "General List", true);
  };

  function handleTabClick(tab: any) {
    if (tab === selectedTab) {
      return;
    } else if (tab === tabOptions[0]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_CURRENT);
    } else if (tab === tabOptions[1]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_ARCHIVED);
    }
  }

  const columns = [
    {
      name: "Item Name",
      selector: (row: SubscriptionItem) => row?.item_name || "",
      wrap: true,
      left: true,
    },
    {
      name: "Description",
      selector: (row: SubscriptionItem) => row?.description || "",
      wrap: true,
    },

    {
      name: "Status",
      selector: (row: SubscriptionItem) => row?.item_status || "",
      wrap: true,
      center: true,
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
              label: "View",
              value: "View",
            },
            {
              label: "Edit",
              value: "Edit",
            },
            {
              label: "Delete",
              value: "Delete",
              isDelete: true,
            },
          ]}
          optionClick={(data) => handleOptionClick(data)}
          cellData={{
            id: row.id,
            description: row?.description,
            status: row?.item_status,
            name: row?.item_name,
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
          <div style={{ cursor: "pointer" }}>
            <ThreeDots />
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
        <>
          {!isArchived && (
            <SearchableSelect
              options={statusOptions}
              onChange={handleStatusChange}
              disabled={false}
              placeholder="Select Status"
              selectedData={selectedStatusName}
              className={styles.textFieldStyles}
            />
          )}
          {isAnyFilterActive && (
            <div>
              <button onClick={resetFilters} className={styles.resetButton}>
                <ArrowClockwise /> Reset Filters
              </button>
            </div>
          )}
        </>
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
            active: false,
          },
          {
            href: ApplicationURLS.ADMIN_SUBSCRIPTION,
            label: "Subscription",
            active: false,
          },
          {
            href: "",
            label: "Manage Items",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Manage Items</span>
        <FormButton
          className={styles.button}
          onClick={() =>
            router.push(ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_ADD)
          }
        >
          + Add Subscription Item
        </FormButton>
      </div>
      <div>
        <TabContainer
          tabs={tabOptions}
          activeTab={selectedTab}
          onTabClick={handleTabClick}
        />
      </div>
      <ReusableDataTable
        columns={columns}
        data={subscriptionItems}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => handleRowView(data?.id)}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleDeleteSubscriptionItem();
        }}
      />
    </div>
  );
};

export default GeneralSubscription;
