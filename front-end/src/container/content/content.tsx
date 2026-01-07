"use client";
import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  Share,
  ThreeDots,
} from "react-bootstrap-icons";
import styles from "./content.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import TabContainer from "../addGroups/tabsContainer";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { fetchPageList } from "./content.function";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { pageType } from "@/common/constants/data";

type UserData = {
  heading: string;
  body: string;
  updated_on: any;
};

const List = () => {
  const router = useRouter();
  const [selectedPageType, setSelectedPageType] = useState<any>(null);

  const handleSelectChange = (selectedValue: any) => {
    setSelectedPageType(selectedValue);
  };

  const [activeTab, setActiveTab] = useState("Page List");
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [pageList, setPageList] = useState([]);
  // Reset only the selected filter (page type)
  const resetFilters = () => {
    if (selectedPageType) {
      setSelectedPageType(null); // Reset the selected page type
    }
  };

  // Check if any filter is active (in this case, Page Type filter)
  const isAnyFilterActive = selectedPageType !== null;
  useEffect(() => {
    getListOfEmails(page, perPage);
  }, [selectedPageType, page, perPage]);

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

  const handleOptionClick = async (data: any) => {
    router.push(`${ApplicationURLS.ADMIN_CONTENT_MANAGEMENT}/${data?.id}`);
  };

  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.ADMIN_CONTENT_MANAGEMENT}/${id}`);
  };

  const columns = [
    {
      name: "Page Type",
      selector: (row: UserData) => row?.heading,
      maxWidth: "12.5rem",
    },
    {
      name: "Descriptions",
      selector: (row: UserData) => row?.body,
      grow: 1,
      wrap: true,
    },
    {
      name: "Last Updated",
      selector: (row: UserData) => row?.updated_on,
      wrap: true,
      maxWidth: "12.5rem",
      left: "true",
    },
    {
      name: "Action",
      maxWidth: "9.375rem",
      cell: (row: UserData) => (
        <Overlays
          trigger="click"
          placement={"bottom-end"}
          overlay={<span></span>}
          popoverTypes={"contentFaqList"}
          customPopupstyles={styles.customPopupstyles}
          optionClick={(data) => handleOptionClick(row)}
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
          <SearchableSelect
            options={pageType}
            onChange={handleSelectChange}
            disabled={false}
            placeholder="Page Type"
            selectedData={selectedPageType}
          />
          {isAnyFilterActive && (
            <div>
              <button onClick={resetFilters} className={styles.resetButton}>
                <ArrowClockwise /> Reset Filters
              </button>
            </div>
          )}
        </div>
        {pageList?.length > 0 && (
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

  async function getListOfEmails(page: number, rowsPerPage: number) {
    setLoading(true);
    const postData = {
      keyword: "",
      page: page,
      pageType: selectedPageType?.value ?? null,
      perPage: perPage,
    };
    const response = await fetchPageList(postData);
    let modifiedResponse = [];
    if (response?.Contents?.length > 0) {
      modifiedResponse = response?.Contents.map((x: any) => {
        return { ...x, updated_on: formatDate(x?.updated_on) };
      });
    }

    setPageList(modifiedResponse);
    setTotalRows(response?.totalCount || 0);
    setPerPage(rowsPerPage);
    setLoading(false);

    setPerPage(rowsPerPage);
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  function handlePrintPDF() {
    let formattedTableData: any[] = pageList.map((data: UserData) => [
      data?.heading,
      data?.body,
      data?.updated_on,
    ]);
    let headerNames: string[] = ["Page Type", "Descriptions", "Last Updated"];
    generateAndPrintPDF(formattedTableData, headerNames, "page-list");
  }

  function downloadExcel() {
    const columnNames = [
      { value: "heading", label: "Page Type" },
      { value: "body", label: "Descriptions" },
      { value: "updated_on", label: "Last Updated" },
    ];
    convertJsonToExcel(pageList, "page list", columnNames);
  }

  return (
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
        />
      </div>
      {renderTabSwitch()}

      <ReusableDataTable
        columns={columns}
        data={pageList}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={(newPerPage: any, page: any) =>
          handlePerRowsChange(newPerPage, page)
        }
        onChangePage={(page: any) => handlePageChange(page)}
        onRowClicked={(data: any) => handleRowView(data?.id)}
      />
    </div>
  );
};

export default List;
