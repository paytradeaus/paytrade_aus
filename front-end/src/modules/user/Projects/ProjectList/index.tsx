"use client";

import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  COMPLETED,
  currencySymbol,
  DELETE,
  EDIT,
  InputType,
  NA,
} from "@/shared/constant/general";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  getProjectListsForCompany,
  updateProjectStatusById,
} from "./projects.functions";
import {
  ProjectsHeaders,
  roleTypeOptions,
  projectsRenderData,
  tabOptions,
} from "./projects.constant";

import { connectWebSocket, formatDate, getCompanyIdFromStorage } from "@/utils";
import { IProjectListDetails } from "./projects.types";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import { showErrorToast } from "@/components/Toaster";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import debounce from "lodash/debounce";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
// Row data interface (Optional but recommended)
interface RowData {
  id: string;
  type: string;
  amount: string;
  fromAccount: string;
  toAccountName: string;
  toAccountNumber: string;
  toAccountBSB: string;
  status: string;
  isDelete?: boolean;
}

interface Action {
  label: string;
  icon: string;
  onClick: (row: RowData, index?: number) => void;
  style?: string;
  isDelete?: boolean;
}

export default function Projects(props?: any) {
  const { isEdit = false, ...rest } = props;
  const [projectListData, setProjectListData] = useState<IProjectListDetails[]>(
    []
  );
  const [search, setSearch] = useState(""); // Holds the search input value
  const [selectedRoleType, setSelectedRoleType] = useState<any>();
  const [totalRows, setTotalRows] = useState(0);
  const [actionData, setActionData] = useState<any>();
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [tabStatus, setTabStatus] = useState<string | null>(null);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [sortValues, setSortValues] = useState<any>("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState<boolean>(false);
  const handleDeleteFunction = async (id: string) => {
    setOpenModal(true); // Close the modal
    try {
      // Update the backend with the deleted status
      const response = await updateProjectStatusById({ id, status: "Deleted" });

      // Update the projectListData state to remove the deleted item
      if (response) {
        setProjectListData((prevData) =>
          prevData.filter((project) => project.id !== id)
        );
      }

      // showSuccessToast("This project has been archived.");
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };
  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);
  const handleCompletedFunction = async (id: string) => {
    setOpenModal(false); // Close the modal
    try {
      // Update the backend with the completed status
      const response = await updateProjectStatusById({
        id,
        status: "Completed",
      });

      if (response) {
        // Update the projectListData state to remove the completed item
        setProjectListData((prevData) =>
          prevData.filter((project) => project.id !== id)
        );

        // Show success message
        // showSuccessToast("This project has been marked as completed.");
      }
    } catch (error) {
      console.error("Error updating project status:", error);
    }
  };

  const handleOptionClick = async (data: any) => {
    const { id, option } = data;
    console.log("data: ", data, { option });
    if (option === EDIT) {
      router.push(`${AppRoutes.USER_EDIT_PROJECTS}/${id}`);
    } else if (option === "Delete" || option === "Completed") {
      setDisplayConfirmationModal(true);
      setActionData(data);
    } else if (option === "View") {
      router.push(`${AppRoutes.USER_PROJECTS_OVERVIEW}/${id}`);
    } else if (option === "Completed") {
      setDisplayConfirmationModal(true);
      setActionData(data);
    }
    console.log("Out");
  };

  const router = useRouter();
  // Define actions dynamically
  const actions: Action[] = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: RowData) => {
        router.push(`${AppRoutes.USER_PROJECTS_OVERVIEW}/${row.id}`);
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: RowData) => handleOptionClick({ ...row, option: EDIT }),
    },
    {
      label: "Completed",
      icon: "fa-light fa-circle-check",
      onClick: (row: RowData) =>
        handleOptionClick({ ...row, option: COMPLETED }),
    },
    {
      label: "Delete",
      icon: "fa-light fa-trash",
      style: "contrast",
      isDelete: true,
      onClick: (row: RowData) => handleOptionClick({ ...row, option: DELETE }),
    },
  ];

  const archivedActions: Action[] = [
    {
      label: "View",
      icon: "fa-light fa-inbox",
      style: "primary",
      onClick: (row: RowData) => {
        router.push(`${AppRoutes.USER_PROJECTS_OVERVIEW}/${row.id}`);
      },
    },
  ];

  // Row click handler
  const handleRowClick = (id: any) => {
    router.push(`${AppRoutes.USER_PROJECTS_OVERVIEW}/${id}`);
  };
  const handlecomplianceClick = (rowData: any) => {
    router.push(
      `${AppRoutes.USER_COMPLIANCE_OVERVIEW}?project=${rowData?.project_id}&st=${rowData?.project_status}`
    );
  };
  const resetFilters = () => {
    setSearch("");
    setSelectedRoleType("All");
    setEmptySearchField(true);
    setCurrentPage(1);
  };
  const isAnyFilterActive = search || selectedRoleType?.value || "";
  async function fetchProjectListsForCompany() {
    if (emptySearchField) {
      setEmptySearchField(false);
    }
    try {
      setProjectListData([]);
      setTableLoader(true);
      console.log("selectedRoleType", selectedRoleType);

      // Prepare the input payload
      const getProjectListsInput = {
        list_type: tabStatus === "Archived" ? "Archived" : null,
        project_role:
          selectedRoleType?.value === "All" ? "" : selectedRoleType?.value,
        company_id: getCompanyIdFromStorage(),
        page_size: entriesPerPage,
        page_number: currentPage,
        project_name_or_id: search, // Ensuring this is passed
        // project_role: selectedValue,
        project_status: tabStatus === tabOptions[0]?.label ? null : tabStatus,
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      };

      // Call the API function
      const response = await getProjectListsForCompany(getProjectListsInput);

      if (response?.project_list?.length > 0) {
        const modifiedGridData = response?.project_list.map((listObj: any) => {
          return {
            ...listObj,
            project_date: listObj?.project_date
              ? formatDate(listObj?.project_date)
              : NA,
            // updated_on: listObj?.updated_on
            //   ? formatDate(listObj?.updated_on)
            //   : NA,
            showValidIcon: listObj?.status == "Open",
            compliance: (
              <span
                style={{
                  color:
                    listObj?.compliance === "Action required" ? "red" : "green",
                  cursor: "pointer",
                }}
              >
                {listObj?.compliance}
              </span>
            ),
            current_balance: listObj?.current_balance
              ? `${currencySymbol} ${Number(listObj?.current_balance).toFixed(
                  2
                )}`
              : "",
          };
        });
        console.log("modifiedGridData", modifiedGridData);
        setProjectListData(modifiedGridData);
      } else {
        setProjectListData([]);
      }

      setTotalRows(response?.total_count || 0);
      setTableLoader(false);
    } catch (err: any) {
      console.error("Error fetching project list data:", err);
      setTableLoader(false);
    } finally {
      setDisableExcelBtn(false);
    }
  }

  useEffect(() => {
    setTabStatus(tabOptions?.[0]?.label);
  }, []);

  useEffect(() => {
    fetchProjectListsForCompany();
  }, [
    search,
    tabStatus,
    debounce,
    selectedRoleType,
    currentPage,
    entriesPerPage,
    sortValues,
  ]);

  function handleTabChange(value: string) {
    setTotalRows(0);
    setCurrentPage(1);
    setEntriesPerPage(10);
    setTabStatus(value);
  }

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "project",
        list_type: tabStatus === "Archived" ? "Archived" : null,
        project_role:
          selectedRoleType?.value === "All" ? "" : selectedRoleType?.value,
        company_id: getCompanyIdFromStorage(),
        project_name_or_id: search || null, // Ensuring this is passed
        project_status: tabStatus === tabOptions[0]?.label ? null : tabStatus,
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisableExcelBtn(false);
    }
  };

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "project",
        list_type: tabStatus === "Archived" ? "Archived" : null,
        project_role:
          selectedRoleType?.value === "All" ? "" : selectedRoleType?.value,
        company_id: getCompanyIdFromStorage(),
        project_name_or_id: search || null, // Ensuring this is passed
        project_status: tabStatus === tabOptions[0]?.label ? null : tabStatus,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  return (
    <div>
      <div className="container-fluid">
        <div className="pt_title">
          <div className="ptHeadTitle">
            <div>
              <BreadCrumbs
                routePaths={[
                  { name: "Dashboard", path: AppRoutes.USER_DASHBOARD },
                ]}
                activeRoute="Projects"
              />
              <div className="pt_pagetitle">
                <h1>Projects</h1>
              </div>
            </div>
            <div className="blockGrid">
              <Link href={"/user/projects/add"} passHref legacyBehavior>
                <a className="pt_addnewbutton">
                  <button
                    className="secondary"
                    onClick={() => {
                      router.push(AppRoutes.USER_ADD_PROJECTS);
                    }}
                  >
                    <i className="fa-light fa-hexagon-plus"></i>Add project
                  </button>
                </a>
              </Link>
            </div>
          </div>
          <div className="grid">
            <GridExportActions
              resetFilterFunction={() => {
                resetFilters();
              }}
              hideExcelButton={projectListData.length > 0 ? false : true}
              hidePdfButton={projectListData.length > 0 ? false : true}
              hideResetButton={!isAnyFilterActive}
              handleDownloadExcelFile={() => {
                handleDownloadExcelFile();
              }}
              disabledOnExcel={disableExcelBtn}
              exportFromAPI={true}
              disabledPDF={disablePDFBtn}
              handleDownloadPrintPDF={() => {
                handleDownloadPdfFile();
              }}
            />
          </div>
        </div>

        <div className="pt_filtergroup">
          <div className="grid">
            <div className="pt_filters">
              <TabSwitch tabOptions={tabOptions} onChange={handleTabChange} />
            </div>
            {/* <div className="filterAlign"> */}
          </div>
        </div>
        <div className="pt_filteroptions">
          <FormikControl
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearch(value);
            }}
            value={search}
            name={search}
            placeholder={"Search by project name"}
            clearSearch={emptySearchField}
          />

          <SearchableSelect
            placeholder="Select a role"
            name="Selectrole"
            options={roleTypeOptions}
            selectedData={selectedRoleType}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => {
              setCurrentPage(1);
              setSelectedRoleType(value);
            }}
          />
        </div>
        <div className="grid">
          <div className="pt_box">
            <div className="grid">
              <h4>{tabStatus || "Current"}</h4>
              {/* <div>
                <FormikControl
                  control={InputType.SEARCH}
                  onChange={setSearchValue}
                  placeholder="Search By Project Name"
                />   
              </div> */}
            </div>
            <DynamicTable
              headers={ProjectsHeaders}
              gridData={projectListData?.length > 0 ? projectListData : []}
              gridActions={
                tabStatus === tabOptions[0]?.label ? actions : archivedActions
              }
              displayAllStaticActions
              onRowClick={(data: any) => handleRowClick(data?.id)}
              showLoader={tableLoader}
              onTableDataClick={(rowData: any) =>
                handlecomplianceClick(rowData)
              }
              loaderColSpan={10}
              renderRowList={projectsRenderData}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={setEntriesPerPage}
              onPageChange={setCurrentPage}
              totalEntries={totalRows}
              hoverOnRowClick
              onSortChange={(sortConfig) => {
                if (projectListData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
            {displayConfirmationModal && (
              <BaseModal
                modalId="Confirmation Modal"
                displayModal={displayConfirmationModal}
                onHeaderIconClose={() => setDisplayConfirmationModal(false)}
                firstButtonName="No"
                secondButtonName="Yes"
                restrictOncloseFunctionInHeader
                onConfirm={() => {
                  // Handle the action when "Yes" is clicked
                  if (actionData?.option === "Delete") {
                    handleDeleteFunction(actionData?.id);
                  } else {
                    handleCompletedFunction(actionData?.id);
                  }
                  return true;
                }}
                onClose={() => {
                  // Close the modal when "No" is clicked
                  setDisplayConfirmationModal(false);
                }}
              >
                {!actionData
                  ? "Are you sure you wish to move the project to the archive with status updated to deleted?"
                  : "Are you sure you wish to move the project to the archive with status updated to completed?"}
              </BaseModal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
