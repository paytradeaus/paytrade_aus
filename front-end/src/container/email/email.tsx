"use client";
import React, { useCallback, useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";

import Overlays from "@/components/Overlayes/Overlayes";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  Share,
  ThreeDots,
} from "react-bootstrap-icons";
import styles from "./email.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";

import TabContainer from "../addGroups/tabsContainer";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";

import TextField from "@/components/TextField/textField";
import { ApplicationURLS } from "@/common/applicationURLS";
import { moduleDropdown } from "@/common/constants/data";
import { RowsPerPageInTable } from "@/common/constants";
import { fetchEmailList } from "./email.function";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";

type UserData = {
  email_subject: string;
  category: any;
  updated_on: string;
};

const Emails = () => {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<any>("");
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [emailTemplates, setEmailTemplates] = useState([]);

  useEffect(() => {
    getListOfEmails(page, perPage);
  }, [search, selectedModule, page, perPage]);

  const handleModuleChange = (selectedValue: any) => {
    setSelectedModule(selectedValue);
    // Perform any other actions based on the selected value
  };

  const [activeTab, setActiveTab] = useState("Email Templates");
  const resetFilters = () => {
    setSelectedModule(""); // Reset selected module filter
    setSearch(""); // Reset search filter
    setPage(1); // Reset to first page
  };

  // Check if any filter is active
  const isAnyFilterActive = selectedModule !== "" || search !== "";
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
          router.push("/admin/content-management");
          break;
        case "FAQs":
          router.push("/admin/content-management/faq");
          break;
        case "Email Templates":
          router.push("/admin/content-management/emailTemplates");
          break;
        default:
          break;
      }
    }
  };

  const handleOptionClick = async (data: any) => {
    router.push(
      `${ApplicationURLS.ADMIN_CONTENT_MANAGEMENT_EMAIL_TEMPLATE}/${data?.id}`
    );
  };
  const handleRowView = (id: any) => {
    router.push(
      `${ApplicationURLS.ADMIN_CONTENT_MANAGEMENT_EMAIL_TEMPLATE}/${id}`
    );
  };

  const columns = [
    {
      name: "Email Type",
      selector: (row: UserData) => row?.category,
      maxWidth: "12.5rem",
    },
    {
      name: "Subject",
      selector: (row: UserData) => row?.email_subject,
      maxWidth: "75rem",
    },
    {
      name: "Last Updated",
      selector: (row: UserData) => row.updated_on,
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
          optionClick={() => handleOptionClick(row)}
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

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearch(inputvalue);
  }, []);

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <TextField
          placeholder="Search by subject"
          value={search}
          onChange={onInputChange}
          type="text"
          autoFocus
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={moduleDropdown}
          onChange={handleModuleChange}
          disabled={false}
          placeholder="Module"
          singleSelectedData={selectedModule}
        />
        {isAnyFilterActive && (
          <div>
            <button onClick={resetFilters} className={styles.resetButton}>
              <ArrowClockwise /> Reset Filters
            </button>
          </div>
        )}
      </div>
      {emailTemplates?.length > 0 && (
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

  async function handlePageChange(page: number) {
    setPage(page);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  async function getListOfEmails(page: number, rowsPerPage: number) {
    setLoading(true);
    const postData = {
      category: selectedModule?.value ?? "",
      keyword: search?.length > 2 ? search : "",
      page: page,
      mailType: null,
      perPage: perPage,
    };
    const response = await fetchEmailList(postData);

    let modifiedResponse = [];
    if (response?.mailTemplates?.length > 0) {
      modifiedResponse = response?.mailTemplates.map((x: any) => {
        return { ...x, updated_on: formatDate(x?.updated_on) };
      });
    }

    setEmailTemplates(modifiedResponse);
    setTotalRows(response?.totalCount || 0);
    setPerPage(rowsPerPage);
    setLoading(false);

    setPerPage(rowsPerPage);
  }

  function handlePrintPDF() {
    let formattedTableData: any[] = emailTemplates.map((data: UserData) => [
      data?.category,
      data?.email_subject,
      data?.updated_on,
    ]);
    let headerNames: string[] = ["Email Type", "Subject", "Last Updated"];
    generateAndPrintPDF(formattedTableData, headerNames, "email-templates");
  }

  function downloadExcel() {
    const columnNames = [
      { value: "category", label: "Email Type" },
      { value: "email_subject", label: "Subject" },
      { value: "updated_on", label: "Last Updated" },
    ];
    convertJsonToExcel(emailTemplates, "email templates list", columnNames);
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
            active: false,
          },
          {
            href: "/admin/content-management/email",
            label: "Email Templates",
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
        data={emailTemplates}
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

export default Emails;
