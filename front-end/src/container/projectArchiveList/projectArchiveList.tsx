"use client";
import React, { useCallback, useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { sampleData } from "./adminConstantData";
import Overlays from "@/components/Overlayes/Overlayes";
import TabContainer from "../addGroups/tabsContainer";
import { FileEarmarkExcel, Printer, ThreeDots } from "react-bootstrap-icons";
import styles from "./projectArchiveList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import FormButton from "@/components/Button/button";
import TextField from "@/components/TextField/textField";
import { RowsPerPageInTable } from "@/common/constants";
import { getProjectListsForCompany } from "../projectList/projectList.functions";
import { ApplicationURLS } from "@/common/applicationURLS";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { DD_MM_YYYY } from "@/common/constants/general";
import { filterByDuration } from "@/common/constants/data";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import debounce from "lodash/debounce";

type UserData = {
  projectName: string;
  dateAdded: string;
  siteAddress: string;
  role: string;
  compliance: string;
  units: string;
  pta: string;
  rta: string;
};

type ProjectType = {
  company_id: string;
  country: string;
  head_contract_sum: string;
  id: string;
  latitude: string;
  longitude: string;
  number_of_units: string;
  place_id: string;
  project_date: string;
  project_description: string;
  project_id: string;
  project_name: string;
  project_role: string;
  project_status: string;
  pta_eligibility: string;
  region: string;
  retention_type: string;
  rta_eligibility: string;
  site_address: string;
};

const ProjectArchiveList = () => {
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [totalRows, setTotalRows] = useState(0);
  const [date, setDate] = useState("");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [activeTab, setActiveTab] = useState("Archive Projects");
  const routePath = usePathname();
  const [selectedValue, setSelectedValue] = useState("");
  const [data, setData] = useState<UserData[]>(sampleData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserData[]>(sampleData);
  const [singleSelectedData, setSingleSelectedData] = useState();
  // const [singleActivyDate, setSingleActivyDate] = useState<any>({
  //   value: "This Month",
  //   label: "This Month",
  // });
  // const [isCustomDate, setIsCustomDate] = useState(false);
  // const [activityDate, setActivityDate] = useState("");
  // const [activityLogStartDate, setActivityLogStartDate] = useState(
  //   new Date(new Date().setHours(0, 0, 0, 0))
  // );
  // const [activityLogEndDate, setActivityLogEndDate] = useState(new Date());
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  const tabs = [
    { id: "Current", label: "Current", hasError: false },
    { id: "Archive Projects", label: "Archived", hasError: true },
  ];

  const roleOptions = [
    { value: "", label: "All" },
    { value: "Head Contractor", label: "Head Contractor" },
    { value: "Principal", label: "Principal" },
    { value: "Sub Contractor", label: "Sub Contractor" },
  ];

  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const response = await getProjectListsForCompany({
        project_status: "Archived",
        company_id: companyId, // Change companyId as per your requirement
        page_number: page,
        page_size: rowsPerPage,
        project_name_or_id: search,
        project_role: selectedValue,
        // dateFilter: activityDate,
        // startDate: isCustomDate ? activityLogStartDate : null,
        // endDate: isCustomDate ? activityLogEndDate : null,
      });
      if (response) {
        const responseData = JSON.parse(JSON.stringify(response));
        setProjects(response?.project_list || []);
        setTotalRows(response?.total_count || 0);
        setPerPage(rowsPerPage);
        let printDataObjCreation = responseData?.project_list?.map(
          (project: ProjectType) => {
            return {
              project_name: project?.project_name,
              project_role: project?.project_role,
              project_description: project?.project_description,
              site_address: project?.site_address,
              head_contract_sum: project?.head_contract_sum,
              retention_type: project?.retention_type,
              number_of_units: project?.number_of_units,
              pta_eligibility: project?.pta_eligibility,
              rta_eligibility: project?.rta_eligibility,
              project_status: project?.project_status,
            };
          }
        );

        setPrintDocumentData(printDataObjCreation);
      }
    } catch (error) {
      console.error("Error fetching project lists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId !== null) {
      fetchData(page, perPage);
    }
  }, [selectedValue, debouncedSearch]);

  // useEffect(() => {
  //   if (companyId !== null && search.length > 2) {
  //     fetchData(1, perPage);
  //     return;
  //   }
  //   if (companyId !== null && !search.length) {
  //     fetchData(1, perPage);
  //     return;
  //   }
  // }, [search]);

  useEffect(() => {
    // Fetch company ID from local storage
    const storedCompanyId = localStorage.getItem("companyId");

    if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
    }
  }, []);

  useEffect(() => {
    if (companyId !== null) {
      fetchData(page, perPage);
    }
  }, [companyId, page, perPage]);

  // useEffect(() => {
  //   if (companyId !== null) {
  //     fetchData(page, perPage);
  //   }
  // }, [activityDate, activityLogEndDate, activityLogStartDate]);

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue);
    // Perform any other actions based on the selected value
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab !== tabId) {
      setActiveTab(tabId);
      switch (tabId) {
        case "Current":
          router.push("/user/projects/current");
          break;
        case "Archived":
          router.push("/user/projects/archived");
          break;
        default:
          break;
      }
    }
  };

  const handleOptionClick = async (data: {
    id: string;
    option: string;
    user_id: string;
    email: string; // Add email to the data type
    name: string;
  }) => {
    const { id, option, user_id, email, name } = data;

    if (option === "View") {
      router.push(`${ApplicationURLS.USER_PROJECT_OVERVIEW}/${id}`);
    }
  };

  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.USER_PROJECT_OVERVIEW}/${id}`);
  };

  const router = useRouter();

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await fetchData(page, newPerPage);
  };

  const columns = [
    {
      name: "Project Name",
      selector: (row: ProjectType) => row.project_name,
      maxWidth: "none",
      wrap: true, // Allow the text to wrap
      grow: 4,
    },

    {
      name: "Site Address",
      selector: (row: ProjectType) => row.site_address,
      maxWidth: "200px",
    },
    {
      name: "Role",
      selector: (row: ProjectType) => row.project_role,
      maxWidth: "180px",
    },
    {
      name: "Compliance",
      maxWidth: "130px",
      selector: (row: UserData) => row.compliance,
      cell: (row: UserData) => (
        <span style={{ color: row.compliance === "Ok" ? "green" : "red" }}>
          {row.compliance}
        </span>
      ),
    },
    {
      name: "Number of Units",
      selector: (row: ProjectType) => row.number_of_units,
      wrap: true,
      maxWidth: "140px",
      center: true,
    },
    {
      name: "PTA Eligible?",
      selector: (row: ProjectType) => row.pta_eligibility,
      maxWidth: "130px",
      center: true,
    },
    {
      name: "RTA Eligible?",
      selector: (row: ProjectType) => row.rta_eligibility,
      maxWidth: "130px",
      center: true,
    },
    {
      name: "Date Added",
      selector: (row: ProjectType) => formatDate(row?.project_date),
      maxWidth: "110px",
    },
    {
      name: "Actions",
      maxWidth: "120px",
      cell: (row: ProjectType, index: number) => (
        <Overlays
          trigger="click"
          placement={index === 0 ? "bottom-end" : "auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[{ label: "View", value: "View" }]}
          customPopupstyles={styles.customPopupstyles}
          cellData={{
            id: row.id,
          }}
          optionClick={(data) => handleOptionClick({ ...data })}
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

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map(
      (project: ProjectType) => [
        project?.project_name,
        project?.project_role,
        project?.project_description,
        project?.site_address,
        project?.head_contract_sum,
        project?.retention_type,
        project?.number_of_units,
        project?.pta_eligibility,
        project?.rta_eligibility,
        project?.project_status,
      ]
    );
    let headerNames: string[] = [
      "Name",
      "Role",
      "Discription",
      "Address",
      "Head Contract Sum",
      "Retention Type",
      "Units",
      "PTA Eligibility",
      "RTA Eligibility",
      "Project Status",
    ];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "archived-projects",
      true
    );
  };

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearch(inputvalue);
  }, []);

  // const onInputValue = useCallback((e: { target: { value: string } }) => {
  //   const inputvalue = e.target.value?.trim()
  //     ? e.target.value
  //     : e.target.value?.trim();
  //   setDate(inputvalue);
  // }, []);

  function downloadExcel() {
    const columnNames = [
      { value: "project_name", label: "Name" },
      { value: "project_role", label: "Role" },
      { value: "project_description", label: " Discription" },
      { value: "site_address", label: "Address" },
      { value: "head_contract_sum", label: "Head Contract Sum" },
      { value: "retention_type", label: "Retention Type" },
      { value: "number_of_units", label: "Units" },
      { value: "pta_eligibility", label: "PTA Eligibility" },
      { value: "rta_eligibility", label: "RTA Eligibility" },
      { value: "project_status", label: "Project Status" },
    ];
    convertJsonToExcel(
      printDocumentData,
      "archived projects list",
      columnNames
    );
  }

  const handleExportExcel = () => {
    if (printDocumentData?.length) {
      downloadExcel();
    }
  };

  // const handleActivityChange = (selectedValue: any) => {
  //   setSingleActivyDate(selectedValue);
  //   if (selectedValue.value === "Custom") {
  //     setIsCustomDate(true);
  //   } else {
  //     setIsCustomDate(false);
  //   }
  //   setActivityDate(selectedValue.value); // Perform any other actions based on the selected value
  // };

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <TextField
          placeholder="Search By Project Name"
          value={search}
          onChange={onInputChange}
          type="text"
          autoFocus
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={roleOptions}
          selectedData={singleSelectedData}
          onChange={handleSelectChange}
          disabled={false}
          placeholder="Select Role"
          className={styles.roleDropStyles}
        />
        {/* <SearchableSelect
          options={filterByDuration}
          onChange={handleActivityChange}
          disabled={false}
          placeholder="Activity Range"
          selectedData={singleActivyDate}
        />
        {isCustomDate && (
          <>
            <CustomDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;From date"
              className={styles.DatePickerCustomStyles}
              selected={activityLogStartDate}
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
              value={activityLogStartDate}
              maxDate={new Date()}
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
        )} */}
      </div>
      <div className={styles.headerIconCon}>
        {printDocumentData?.length > 0 && (
          <>
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
              onClick={handleExportExcel}
              title="Export to Excel"
            >
              <FileEarmarkExcel />
            </span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: "/user/dashboard",
            label: "Home",
            active: routePath === "/user/dashboard",
          },
          {
            href: "/user/projects",
            label: "Projects",
            active: routePath.startsWith("/user/projects"),
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Projects</span>
      </div>
      <TabContainer
        tabs={tabs}
        activeTab={activeTab}
        onTabClick={handleTabClick}
      />

      <ReusableDataTable
        columns={columns}
        data={projects}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        bottomText
        pagination
        paginationServer
        progressPending={loading}
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => handleRowView(data?.id)}
      />
    </div>
  );
};

export default ProjectArchiveList;
