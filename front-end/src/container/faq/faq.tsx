//default imports
"use client";
import React, { Fragment, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
//import from reactstrap components and icons
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  Share,
  ThreeDots,
} from "react-bootstrap-icons";
import { ArrowUpCircleFill, ArrowDownCircleFill } from "react-bootstrap-icons";
//import from customized components
import Overlays from "@/components/Overlayes/Overlayes";
import TextField from "@/components/TextField/textField";
import TabContainer from "../addGroups/tabsContainer";
import ReusableDataTable from "@/components/DataTable/dataTable";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
//import customized styles
import styles from "./faq.module.scss";
//import from external libraries
//import from constants, interfaces ,functions and services
import { ApplicationURLS } from "@/common/applicationURLS";
import {
  fetchCategories,
  fetchFaqList,
  postFaqOptions,
  reorderFaq,
} from "./faq.function";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import { toast } from "@/app/Toaster";
import { statusOptions } from "@/common/constants/data";
import {
  convertJsonToExcel,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
//module level constants and interfaces
const SWAP_UP = "swapUp";
const SWAP_DOWN = "swapDown";
const DELETE = "Delete";
const IN_ACTIVE = "Mark as In Active";
const ACTIVE = "Mark as Active";
type UserData = {
  id: number;
  category: any;
  question: string;
  answer: string;
  faq_status: string;
  selectedOption?: string;
  messages?: string;
};

function Content() {
  //useState and useEffect Management

  const [search, setSearch] = useState("");
  const [faqList, setFaqList] = useState<any>([]);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>();
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusSelection, setStatusSelection] = useState("");
  const [categorySelection, setCategorySelection] = useState<any>("");
  const [rowData, setRowData] = useState<UserData | null>(null);
  const [faqCategories, setFaqCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("FAQs");
  const resetFilters = () => {
    setSearch(""); // Reset search input
    setStatusSelection(""); // Reset status filter
    setCategorySelection(""); // Reset category filter
  };

  // Check if any filter is active
  const isAnyFilterActive =
    search !== "" || statusSelection !== "" || categorySelection !== "";
  const tabs = [
    { id: "Page List", label: "Page List", hasError: false },
    { id: "FAQs", label: "FAQs", hasError: true },
    { id: "Email Templates", label: "Email Templates", hasError: true },
  ];

  const renderTabSwitch = () => {
    switch (activeTab) {
      case "List":
        return null;
      case "FAQs":
        return null;
      case "Email Templates":
        return null;
      default:
        return null;
    }
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab !== tabId) {
      setActiveTab(tabId);
      switch (tabId) {
        case "Page List":
          router.push(ApplicationURLS.ADMIN_CONTENT_MANAGEMENT);
          break;
        case "FAQs":
          router.push("/admin/content-management/faq");
          break;
        case "Email Templates":
          router.push("/admin/content-management/email");
          break;
        default:
          break;
      }
    }
  };

  useEffect(() => {
    getCategories();
  }, []);

  useEffect(() => {
    getListOfFaq(page, perPage);
  }, [search, statusSelection, categorySelection]);

  //other Hooks

  const router = useRouter();

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputValue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();

    setSearch(inputValue);
  }, []);

  //functions
  function handleStatusSelectChange(selectedValue: any) {
    setStatusSelection(selectedValue);
  }
  function handleCategorySelectChange(selectedValue: any) {
    setCategorySelection(selectedValue);
  }

  async function getCategories() {
    await fetchCategories()
      .then((data: any) => {
        const response = data?.adminfetchAllMasterTypeDetails?.data;
        if (response?.length > 0) {
          const modifiedResponse = response.map((x: any) => {
            return { ...x, label: x?.value, value: x?.value };
          });
          setFaqCategories([{ label: "All", value: "" }, ...modifiedResponse]);
        }
      })
      .catch((error: any) => console.log("~ handleSubmit ~ error:", error));
  }

  async function handleOptionClick(
    data: { id: string; option: string },
    row: UserData
  ) {
    const { option } = data;

    setActionData(data);
    if (option === DELETE || option === IN_ACTIVE || option === ACTIVE) {
      setRowData({
        ...row,
        selectedOption:
          option === DELETE
            ? "Deleted"
            : option === IN_ACTIVE
            ? "Inactive"
            : "Active",
        messages:
          option === DELETE
            ? "Are you sure, Do you want to Delete the faq?"
            : option === IN_ACTIVE
            ? "Are you sure, Do you want to Inactive the faq?"
            : "Are you sure, Do you want to Active the faq?",
      });
      setDisplayConfirmationModal(true);
    }
    if (option === "View") {
      router.push(`${ApplicationURLS.ADMIN_CONTENT_EDIT}/${row?.id}`);
    }
  }

  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.ADMIN_CONTENT_EDIT}/${id}`);
  };

  /**
   * Handles the reordering of FAQ items based on the specified type of swap (up or down) for a given FAQ object.
   * This function updates the order of FAQ items by sending a request to the backend API.
   *
   * @param curObj - The current FAQ object whose order is being changed.
   * @param typeOfSwap - The type of swap operation to perform ('up' or 'down').
   * @returns A Promise that resolves once the reordering operation is complete.
   */
  async function handleOrderChange(curObj: any, typeOfSwap: string) {
    // Find the index of the current FAQ object in the list
    const curIndex = faqList.findIndex((x: any) => x?.id === curObj?.id);
    // Exit the function if the current object is not found in the list
    if (curIndex === -1) return;

    let swapIndex = null;
    // Determine the index to swap based on the type of swap operation
    if (typeOfSwap === SWAP_UP && curIndex > 0) {
      swapIndex = curIndex - 2;
    } else if (typeOfSwap === SWAP_DOWN && curIndex < faqList.length - 1) {
      swapIndex = curIndex + 1; // If the reordering was successful, refresh the list of FAQ items
    }

    // Retrieve the FAQ object to swap with
    const swapObject = swapIndex !== null && faqList[swapIndex];

    // Prepare the data for reordering
    const postData = {
      updateOrderInput: {
        category: categorySelection?.value ?? null,
        faqId: curObj?.id ?? null,
        previousFaqId: swapObject?.id ?? null,
      },
    };

    // Send a request to reorder the FAQ items
    const response = await reorderFaq(postData);

    // If the reordering was successful, refresh the list of FAQ items
    if (response) {
      getListOfFaq(page, perPage);
    }
  }

  const columns = [
    {
      name: "Category",
      selector: (row: UserData) => row.category,
      wrap: true,
      maxWidth: "10rem",
      left: "true",
    },
    {
      name: "Questions",
      selector: (row: UserData) => row.question,
      wrap: true,
      maxWidth: "75rem",
      left: "true",
    },
    {
      name: "Answers",
      selector: (row: UserData) => row.answer,
      wrap: true,
      maxWidth: "75rem",
      left: "true",
    },
    {
      name: "Status",
      selector: (row: UserData) => row?.faq_status,
      wrap: true,
      maxWidth: "10rem",
      left: "true",
    },
    {
      name: "Change Order",
      maxWidth: "9.375rem",
      cell: (row: UserData) => (
        <div
          style={{
            width: "100%",
            marginLeft: "1rem",
          }}
        >
          <ArrowUpCircleFill
            size={20}
            className={`${styles.orderIcon} ${styles.upArrow}`}
            onClick={() => handleOrderChange(row, SWAP_UP)}
          />
          <ArrowDownCircleFill
            size={20}
            className={`${styles.orderIcon} ${styles.downArrow}`}
            onClick={() => handleOrderChange(row, SWAP_DOWN)}
          />
        </div>
      ),
    },
    {
      name: "Action",
      maxWidth: "9.375rem",
      fixed: "right",
      center: true,
      cell: (row: UserData) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            { label: "View", value: "View" },

            ...(row?.faq_status === "Active"
              ? [{ label: "Mark as In Active", value: "Mark as In Active" }]
              : [{ label: "Mark as Active", value: "Mark as Active" }]),
            { label: "Delete", value: "Delete", isDelete: true },
          ]}
          // customPopupstyles={styles.customPopupstyles}
          optionClick={(data) => handleOptionClick(data, row)}
          cellData={{
            id: row?.id,
          }}
          // popperConfig={{
          //   modifiers: [
          //     {
          //       name: "offset",
          //       options: {
          //         offset: [20, 10], // Adjust the offset as needed
          //       },
          //     },
          //   ],
          // }}
        >
          <div style={{ cursor: "pointer" }}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  function CustomSubHeader() {
    return (
      <div className={styles.customSubHeaderCon}>
        <div className={styles.textAndSelectCon}>
          <TextField
            placeholder="Search by Questions"
            value={search}
            onChange={onInputChange}
            type="text"
            autoFocus
            className={styles.textFieldStyles}
          />
          <SearchableSelect
            options={faqCategories}
            onChange={handleCategorySelectChange}
            disabled={false}
            placeholder="Category"
            selectedData={categorySelection}
          />
          <SearchableSelect
            options={statusOptions}
            onChange={handleStatusSelectChange}
            disabled={false}
            placeholder="Status"
            selectedData={statusSelection}
          />
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

  async function getListOfFaq(page: number, rowsPerPage: number) {
    setLoading(true);
    const response = await fetchFaqList({
      page: page,
      perPage: rowsPerPage,
      keyword: search?.length > 2 ? search : "",
      status: statusSelection,
      category: categorySelection,
    });
    setLoading(false);

    let modifiedResponse = [];

    if (response.FAQs?.length > 0) {
      modifiedResponse = response.FAQs.map((x: any) => {
        return { ...x, category: x?.category?.value };
      });
    }

    setFaqList(modifiedResponse);
    setTotalRows(response?.totalCount || 0);
    setPerPage(rowsPerPage);
  }

  async function handlePageChange(page: number) {
    setPage(page);

    await getListOfFaq(page, perPage);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
    await getListOfFaq(page, newPerPage);
  }

  async function handleOptionSelection() {
    setLoading(true);

    const postData: any = {
      updateFaqInput: {
        id: rowData?.id,
        question: "",
        faq_status: rowData?.selectedOption,
        categoryId: null,
        answer: "",
      },
    };

    const response = await postFaqOptions(postData);
    if (response) {
      getListOfFaq(page, perPage);
      toast.success("FAQ list updated successfully");
    } else {
      toast.error("FAQ list update failed");
    }
    setDisplayConfirmationModal(false);
    setLoading(false);
  }

  function handlePrintPDF() {
    let formattedTableData: any[] = faqList.map((data: UserData) => [
      data?.category,
      data?.question,
      data?.answer,
      data?.faq_status,
    ]);
    let headerNames: string[] = ["Category", "Questions", "Answers", "Status"];
    generateAndPrintPDF(formattedTableData, headerNames, "page-list");
  }

  function downloadExcel() {
    const columnNames = [
      { value: "category", label: "Category" },
      { value: "question", label: "Questions" },
      { value: "answer", label: "Answers" },
      { value: "faq_status", label: "Status" },
    ];
    convertJsonToExcel(faqList, "faq list", columnNames);
  }

  //render Template
  return (
    <Fragment>
      <div className={styles.dataContainer}>
        <ReusableBreadcrumb
          items={[
            {
              href: "/admin/dashboard",
              label: "Home",
              active: false,
            },
            {
              href: "/admin/content-management",
              label: "Content Management",
              active: false,
            },
            {
              href: "/admin/content-management/faq",
              label: "FAQs",
              active: true,
            },
          ]}
          separator={<span className={styles.separatorStyle}>&gt;</span>}
        />

        <div className={styles.tabHead}>
          <TabContainer
            tabs={tabs}
            activeTab={activeTab}
            onTabClick={handleTabClick}
            displayButton={true}
            routePath={ApplicationURLS.ADMIN_CONTENT_ADD}
          />
        </div>
        {renderTabSwitch()}

        <ReusableDataTable
          columns={columns}
          data={faqList ?? []}
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
      </div>
      <AppModal
        show={displayConfirmationModal}
        onHide={() => setDisplayConfirmationModal(false)}
        secondButtonLabel="Cancel"
        firstButtonLabel="Yes"
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent={
          rowData?.messages || `Are you sure, Do you want to Delete the faq?`
        }
        onConfirm={() => handleOptionSelection()}
      />
    </Fragment>
  );
}

export default Content;
