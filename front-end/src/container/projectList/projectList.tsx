"use client";
import React, { useCallback, useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";

import Overlays from "@/components/Overlayes/Overlayes";
import TabContainer from "../addGroups/tabsContainer";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  ThreeDots,
} from "react-bootstrap-icons";
import styles from "./projectList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import FormButton from "@/components/Button/button";
import TextField from "@/components/TextField/textField";
import {
  getProjectListsForCompany,
  updateProjectStatusById,
} from "./projectList.functions";
import { RowsPerPageInTable } from "@/common/constants";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { DD_MM_YYYY } from "@/common/constants/general";
import { filterByDuration } from "@/common/constants/data";
import { AppModal } from "@/components/model/model";
import { toast } from "react-toastify";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import debounce from "lodash/debounce";
import { SetProjectOverview } from "@/redux/slices/dashboardSlices";
import { useAppDispatch } from "@/redux/store";

type UserData = {
  projectName: string;
  dateAdded: string;
  siteAddress: string;
  role: string;
  compliance: string;
  units: string;
  pta: string;
  rta: string;
  project_id: number;
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
  compliance: string;
};
type OptionType = {
  value: string;
  label: string;
};
const ProjectList = () => {
  const [projects, setProjects] = useState<ProjectType[]>([]);

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [totalRows, setTotalRows] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [data, setData] = useState<UserData[]>([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [filter, setFilter] = useState<UserData[]>([]);
  // const [singleSelectedData, setSingleSelectedData] = useState();
  const [activeTab, setActiveTab] = useState("Current");
  const routePath = usePathname();
  const [singleSelectedData, setSingleSelectedData] =
    useState<OptionType | null>(null);
  const [selectedValue, setSelectedValue] = useState<OptionType | null>(null);
  // const [selectedValue, setSelectedValue] = useState("");
  // const [singleActivyDate, setSingleActivyDate] = useState<any>({
  //   value: "This Month",
  //   label: "This Month",
  // });
  const dispatch = useAppDispatch();

  const [singleEventType, setSingleEventType] = useState();
  const [isCustomDate, setIsCustomDate] = useState(false);
  // const [activityDate, setActivityDate] = useState("This Month");
  // const [activityLogStartDate, setActivityLogStartDate] = useState(
  //   new Date(new Date().setHours(0, 0, 0, 0))
  // );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const roleOptions = [
    { value: "", label: "All" },
    { value: "Head Contractor", label: "Head Contractor" },
    { value: "Principal", label: "Principal" },
    { value: "Sub Contractor", label: "Sub Contractor" },
  ];

  useEffect(() => {
    dispatch(SetProjectOverview({}));
  }, []);

  useEffect(() => {
    // Fetch company ID from local storage
    const storedCompanyId = localStorage.getItem("companyId");

    if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
    }
  }, []);

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  useEffect(() => {
    if (companyId !== null) {
      fetchData(page, perPage);
    }
  }, [
    companyId,
    selectedValue,
    // activityDate,
    activityLogEndDate,
    // activityLogStartDate,
    debouncedSearch,
  ]);

  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const response = await getProjectListsForCompany({
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
              project_date: formatDate(project?.project_date),
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

  function downloadExcel() {
    const columnNames = [
      { value: "project_name", label: "Name" },
      { value: "project_role", label: "Role" },
      { value: "site_address", label: "Address" },
      { value: "number_of_units", label: "Units" },
      { value: "pta_eligibility", label: "PTA Eligibility" },
      { value: "rta_eligibility", label: "RTA Eligibility" },
      { value: "project_date", label: "Date Added" },
    ];
    convertJsonToExcel(printDocumentData, "current projects list", columnNames);
  }

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue);
    // Perform any other actions based on the selected value
  };

  const tabs = [
    { id: "Current", label: "Current", hasError: false },
    { id: "Archived", label: "Archived", hasError: true },
  ];
  const resetFilters = () => {
    setSearch(""); // Reset the search field
    setSingleSelectedData(null); // Reset the dropdown select
    setSelectedValue(null); // Reset the selected value if needed
  };
  const isAnyFilterActive =
    search !== "" || singleSelectedData !== null || selectedValue !== null;
  const renderTabSwitch = () => {
    switch (activeTab) {
      case "Current":
        return null;
      case "Archive Projects":
        return null;
      default:
        return null;
    }
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
    const { id, option } = data;

    if (option === "Edit") {
      router.push(`${ApplicationURLS.USER_EDIT_PROJECT}/${id}`);
    } else if (option === "Delete") {
      setOpenModal(true);
      setActionData(data);
    } else if (option === "View") {
      router.push(`${ApplicationURLS.USER_PROJECT_OVERVIEW}/${id}`);
    } else if (option === "Completed") {
      setOpenModal(true);
      setActionData(data);
    }
  };

  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.USER_PROJECT_OVERVIEW}/${id}`);
  };

  const handleDeleteFunction = async (id: string) => {
    setOpenModal(false); // Close the modal
    try {
      await updateProjectStatusById({ id, status: "Deleted" });
      // Refresh the project list after deletion
      fetchData(page, perPage);
      // toast.success("This project has been archived.");
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  const handleCompletedFunction = async (id: string) => {
    setOpenModal(false); // Close the modal
    try {
      await updateProjectStatusById({ id, status: "Completed" });
      // Refresh the project list after deletion
      fetchData(page, perPage);
      // toast.success("This project has been archived.");
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map(
      (project: ProjectType) => [
        project?.project_name,
        project?.project_date,
        project?.site_address,
        project?.project_role,
        project?.compliance,
        project?.number_of_units,
        project?.pta_eligibility,
        project?.rta_eligibility,
      ]
    );
    let headerNames: string[] = [
      "Project Name",
      "Date Added",
      "Site Address",
      "Role",
      "Compliance",
      "Units",
      "PTA Eligibility",
      "RTA Eligibility",
    ];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "current-projects",
      true
    );
  };

  const handleExportExcel = () => {
    if (printDocumentData?.length) {
      downloadExcel();
    }
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
      name: "Date Added",
      selector: (row: ProjectType) => formatDate(row.project_date),
      maxWidth: "110px",
    },
    {
      name: "Site Address",
      selector: (row: ProjectType) => row.site_address,
      wrap: true, // Allow the text to wrap
      grow: 4,
      maxWidth: "none",
    },
    {
      name: "Role",
      selector: (row: ProjectType) => row.project_role,
      wrap: true, // Allow the text to wrap
      grow: 2,
      maxWidth: "none",
    },
    {
      name: "Compliance",
      maxWidth: "130px",
      selector: (row: UserData) => row.compliance,
      cell: (row: UserData) => (
        <span
          style={{ color: row.compliance === "Ok" ? "green" : "red" }}
          onClick={() =>
            router.push(
              `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${row?.project_id}`
            )
          }
        >
          {row.compliance}
        </span>
      ),
    },
    {
      name: "Number of Units",
      selector: (row: ProjectType) => row.number_of_units,
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
      name: "Actions",
      maxWidth: "120px",
      cell: (row: ProjectType, index: number) => (
        <Overlays
          trigger="click"
          placement={index === 0 ? "bottom-end" : "auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            { label: "View", value: "View" },
            { label: "Edit", value: "Edit" },
            { label: "Completed", value: "Completed" },
            { label: "Delete", value: "Delete", isDelete: true },
          ]}
          customPopupstyles={styles.customPopupstyles}
          cellData={{
            id: row.id,
          }}
          optionClick={(data) => handleOptionClick({ ...data })} // Pass user_id
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
          singleSelectedData={singleSelectedData}
          onChange={handleSelectChange}
          disabled={false}
          placeholder="Select Role"
          className={styles.roleDropStyles}
        />
        {isAnyFilterActive && (
          <div>
            <button onClick={resetFilters} className={styles.resetButton}>
              <ArrowClockwise /> Reset Filters
            </button>
          </div>
        )}
        {/* <SearchableSelect
          options={filterByDuration}
          onChange={handleActivityChange}
          disabled={false}
          placeholder="Activity Range"
          singleSelectedData={singleActivyDate}
        /> */}
        {/* {isCustomDate && (
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
        <FormButton
          className={styles.buttonStyles}
          onClick={() => router.push("/user/projects/add")}
        >
          + Project
        </FormButton>
      </div>
      <TabContainer
        tabs={tabs}
        activeTab={activeTab}
        onTabClick={handleTabClick}
      />
      {renderTabSwitch()}
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

      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="No"
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent={
          actionData?.option === "Delete"
            ? "Are you sure you wish to move the project to the archive with status updated to Deleted?"
            : "Are you sure you wish to move the project to the archive with status updated to Completed?"
        }
        onConfirm={() =>
          actionData?.option === "Delete"
            ? handleDeleteFunction(actionData?.id)
            : handleCompletedFunction(actionData?.id)
        }
      />
    </div>
  );
};

export default ProjectList;
