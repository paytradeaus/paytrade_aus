"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import React, { useEffect, useMemo, useState } from "react";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";
import BaseModal from "@/components/BaseModal";
import {
  autoMappingProject,
  GetPaytradeProjectListsForCompany,
  getMappedProjectLists,
  getXeroProjectListsForCompany,
  manualMappingProject,
  syncAllProjectsByCompanyId,
  unMappingProject,
  CreateProjectInPaytrade,
  CreateProjectInXero,
  getXeroDetailsForCompany,
} from "../../integration.functions";
import { showSuccessToast } from "@/components/Toaster";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  mappedProjectsHeaders,
  mappedProjectsRenderData,
  paytradeProjectsHeaders,
  paytradeProjectsRenderData,
  projectsTabOptions,
  statusOptions,
  xeroProjectsHeaders,
  xeroProjectsRenderData,
} from "../../integration.constant";
import GridExportActions from "@/components/GridExportActions";
import { useRouter, useSearchParams } from "next/navigation";

interface TableConfig {
  headers: any[];
  gridActions: any[];
  renderRowList: any[];
}

export default function XeroProjects() {
  const router = useRouter();
  const queryParams = useSearchParams();
  const to = queryParams.get("navigateTo") || 0;
  const [tabStatus, setTabStatus] = useState(projectsTabOptions[+to]?.label);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [xeroData, setXeroData] = useState<any>("");

  const [headers, setHeaders] = useState<any>([]);
  const [gridData, setGridData] = useState<any[]>([]);
  const [gridActions, setGridActions] = useState([]);
  const [renderRowList, setRenderRowList] = useState([]);
  const [status, setStatus] = useState("");

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [sortValues, setSortValues] = useState<any>("");
  const [modelConfig, setModelConfig] = useState<any>({
    show: false,
    title: "",
    secondButtonName: "",
    firstButtonName: "",
    description: "",
    id: "",
  });

  const [showTable, setShowTable] = useState(true);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [manualMapData, setManualMapData] = useState<any>("");
  const [manualMapOptions, setManualMapOptions] = useState([]);

  const isXeroConnected = xeroData?.status === "ACTIVE";

  const paytradeProjectsActions = [
    {
      label: "Manual map",
      icon: "fa-light fa-link",
      onClick: (row: any) => handleOptionClick(row, "Manual Map"),
      conditionalApiDisplayKey: "manual",
    },
    {
      label: "Create in Xero",
      icon: "fa-light fa-plus-circle",
      onClick: (row: any) => handleOptionClick(row, "Create in Xero"),
      conditionalApiDisplayKey: "createIcon",
    },
  ];
  const xeroProjectsActions = [
    {
      label: "Manual map",
      icon: "fa-light fa-link",
      onClick: (row: any) => handleOptionClick(row, "Manual Map"),
      conditionalApiDisplayKey: "manual",
    },
    {
      label: "Create in PayTrade",
      icon: "fa-light fa-plus-circle",
      onClick: (row: any) => handleOptionClick(row, "Create in PayTrade"),
      conditionalApiDisplayKey: "createIcon",
    },
  ];
  const mappedProjectsActions = [
    {
      label: "Unmap",
      icon: "fa-light fa-unlink",
      onClick: (row: any) => {
        setSelectedContact(row);
        setModelConfig({
          show: true,
          title: "Unmap",
          secondButtonName: "Unmap",
          firstButtonName: "Cancel",
          id: "Unmap_from?",
          description: (
            <>
              <b>{row?.pt_project_name}</b> from <b>{row?.project_name}</b>?
            </>
          ),
        });
      },
      displayByDefault: true,
    },
  ];

  const getTableConfig = (): TableConfig => {
    switch (tabStatus) {
      case "Paytrade projects":
        return {
          headers: paytradeProjectsHeaders,
          gridActions: paytradeProjectsActions,
          renderRowList: paytradeProjectsRenderData,
        };
      case "Xero projects":
        return {
          headers: xeroProjectsHeaders,
          gridActions: xeroProjectsActions,
          renderRowList: xeroProjectsRenderData,
        };
      case "Mapped projects":
        return {
          headers: mappedProjectsHeaders,
          gridActions: mappedProjectsActions,
          renderRowList: mappedProjectsRenderData,
        };
      default:
        return {
          headers: [],
          gridActions: [],
          renderRowList: [],
        };
    }
  };

  function handleTabChange(value: string) {
    if (value != tabStatus) {
      setShowTable(false);
      setCurrentPage(1);
      setEntriesPerPage(10);
      setSearch("");
      setSortValues("");
      setStatus("");
      setTabStatus(value);
    }
  }

  useEffect(() => {
    const { headers, gridActions, renderRowList } = getTableConfig();
    setHeaders(headers as never[]);
    setGridActions(gridActions as never[]);
    setRenderRowList(renderRowList as never[]);
    setShowTable(true);
  }, [tabStatus]);

  useEffect(() => {
    fetchGetXeroDetailsForCompany();
  }, []);

  const fetchGetXeroDetailsForCompany = () => {
    setTableLoader(true);
    getXeroDetailsForCompany().then((data) => {
      setXeroData(data);
      setTableLoader(false);
    });
  };

  const fetchXeroProjects = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getXeroProjectListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search || "",
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: status,
        },
      },
      setTableLoader
    );
    return {
      contacts:
        data?.project_list.map((val: any) => {
          const isUnmapped = val.mapped_status?.toLocaleLowerCase() !== "mapped";
          const isNotDraft = val.project_status?.toLocaleLowerCase() !== "draft";
          return {
            ...val,
            dynamicIcon: {
              syncIcon: isUnmapped && isNotDraft,
              manual: isUnmapped,
              createIcon: isUnmapped,
            },
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchPaytradeProjects = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    sortValues: any,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await GetPaytradeProjectListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: status,
        },
      },
      setTableLoader
    );
    return {
      contacts:
        data?.project_list.map((val: any) => {
          const isUnmapped = val.mapped_status?.toLocaleLowerCase() !== "mapped";
          const isNotDraft = val.project_status?.toLocaleLowerCase() !== "draft";
          return {
            ...val,
            dynamicIcon: {
              syncIcon: isUnmapped && isNotDraft,
              manual: isUnmapped,
              createIcon: isUnmapped && isNotDraft,
            },
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchMappedProject = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getMappedProjectLists(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
        },
      },
      setTableLoader
    );
    return {
      contacts: data?.project_list || [],
      totalCount: data?.total_count || 0,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setTableLoader(true);
      if (tabStatus === "Xero projects") {
        const { contacts, totalCount } = await fetchXeroProjects(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Paytrade projects") {
        const { contacts, totalCount } = await fetchPaytradeProjects(
          currentPage,
          entriesPerPage,
          search,
          sortValues,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Mapped projects") {
        const { contacts, totalCount } = await fetchMappedProject(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      }
    };
    fetchData();
  }, [tabStatus, currentPage, entriesPerPage, search, sortValues, status]);

  const handleOptionClick = async (row: any, label: string) => {
    if (tabStatus === "Xero projects" && label == "Manual Map") {
      getOptionForManualProjectMappingForXero();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade projects" && label == "Manual Map") {
      getOptionForManualProjectMappingForPaytrade();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (
      tabStatus === "Paytrade projects" &&
      label === "Create in Xero"
    ) {
      setSelectedContact(row);
      setModelConfig({
        show: true,
        title: "Create in Xero",
        secondButtonName: "Create",
        firstButtonName: "Cancel",
        description: (
          <>
            Create <b>{row?.project_name}</b> in Xero?
          </>
        ),
        id: "Create_in_xero?",
      });
    } else if (
      tabStatus === "Xero projects" &&
      label === "Create in PayTrade"
    ) {
      setSelectedContact(row);
      setModelConfig({
        show: true,
        title: "Create in PayTrade",
        secondButtonName: "Create",
        firstButtonName: "Cancel",
        description: (
          <>
            Create <b>{row?.project_name}</b> in PayTrade?
          </>
        ),
        id: "Create_in_paytrade?",
      });
    }
  };

  const syncXeroProjects = async () => {
    setTableLoader(true);
    await syncAllProjectsByCompanyId(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchXeroProjects(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleAutoMappingProjects = async () => {
    await autoMappingProject(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchMappedProject(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleCreateInXero = async () => {
    setTableLoader(true);
    await CreateProjectInXero({ projectId: +selectedContact?.project_id });
    const { contacts, totalCount } = await fetchPaytradeProjects(
      currentPage,
      entriesPerPage,
      search,
      sortValues,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleCreateInPaytrade = async () => {
    setTableLoader(true);
    await CreateProjectInPaytrade({
      companyId: +(localStorage.getItem("companyId") || 0),
      projectId: selectedContact?.project_id,
    });
    const { contacts, totalCount } = await fetchXeroProjects(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleBatchCreateInPaytrade = async () => {
    setTableLoader(true);
    let created = 0;
    let failed = 0;
    for (const row of gridData) {
      try {
        await CreateProjectInPaytrade({
          companyId: +(localStorage.getItem("companyId") || 0),
          projectId: row.project_id,
        });
        created++;
      } catch (e) {
        failed++;
      }
    }
    showSuccessToast(`Created ${created} project(s)${failed > 0 ? `, ${failed} failed` : ""}`);
    const { contacts, totalCount } = await fetchXeroProjects(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleBatchCreateInXero = async () => {
    setTableLoader(true);
    let created = 0;
    let failed = 0;
    for (const row of gridData) {
      try {
        await CreateProjectInXero({ projectId: +row.project_id });
        created++;
      } catch (e) {
        failed++;
      }
    }
    showSuccessToast(`Created ${created} project(s) in Xero${failed > 0 ? `, ${failed} failed` : ""}`);
    const { contacts, totalCount } = await fetchPaytradeProjects(
      currentPage,
      entriesPerPage,
      search,
      sortValues,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const modelClose = () => {
    if (modelConfig.id === "Sync_xero_projects?") {
      syncXeroProjects();
    } else if (modelConfig.id === "Map_projects?") {
      handleAutoMappingProjects();
    } else if (modelConfig.id === "Unmap_from?") {
      handleUnmapProject();
    } else if (modelConfig.id === "Create_in_xero?") {
      handleCreateInXero();
    } else if (modelConfig.id === "Create_in_paytrade?") {
      handleCreateInPaytrade();
    } else if (modelConfig.id === "Batch_create_in_paytrade?") {
      handleBatchCreateInPaytrade();
    } else if (modelConfig.id === "Batch_create_in_xero?") {
      handleBatchCreateInXero();
    }
  };

  const handleUnmapProject = async () => {
    await unMappingProject(
      {
        projectId: selectedContact?.project_id,
      },
      setTableLoader
    );
    setTableLoader(true);
    const { contacts, totalCount } = await fetchMappedProject(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const getOptionForManualProjectMappingForXero = async () => {
    const data = await GetPaytradeProjectListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
        },
      },
      setTableLoader
    );
    setManualMapOptions(data?.project_list);
  };

  const getOptionForManualProjectMappingForPaytrade = async () => {
    const data = await getXeroProjectListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search || "",
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: status,
        },
      },
      setTableLoader
    );
    setManualMapOptions(data?.project_list);
  };

  const handleManualMappingProject = async () => {
    await manualMappingProject(
      tabStatus === "Paytrade projects"
        ? {
            payload: {
              project_id: manualMapData?.project_id,
              pt_project_id: selectedContact?.project_id,
            },
          }
        : {
            payload: {
              project_id: selectedContact?.project_id,
              pt_project_id: manualMapData?.project_id,
            },
          }
    );
    if (tabStatus === "Xero projects") {
      const { contacts, totalCount } = await fetchXeroProjects(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Paytrade projects") {
      const { contacts, totalCount } = await fetchPaytradeProjects(
        currentPage,
        entriesPerPage,
        search,
        sortValues,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    }
    setManualMapData("");
  };

  const checkActionCondition = () => {
    const actionMapping: any = {
      "Mapped projects": mappedProjectsActions,
      "Xero projects": isXeroConnected
        ? xeroProjectsActions
        : xeroProjectsActions.slice(0, 1),
      "Paytrade projects": isXeroConnected
        ? paytradeProjectsActions
        : paytradeProjectsActions.slice(0, 1),
    };
    return actionMapping[tabStatus] || [];
  };

  const gridActionsCondition = useMemo(checkActionCondition, [
    tabStatus,
    xeroData,
  ]);
  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
              {
                name: "Integrations",
                path: AppRoutes.USER_INTEGRATION,
              },
              {
                name: "Xero",
                path: AppRoutes.USER_XERO,
              },
            ]}
            activeRoute={"Projects"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Projects</h1>
            <p>Manage your paytrade and xero projects</p>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters ">
            <TabSwitch
              tabOptions={projectsTabOptions}
              tabValue={tabStatus}
              onChange={(value: any) => handleTabChange(value)}
            />
          </div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                resetFilterFunction={() => {
                  setStatus("");
                  setSearch("");
                }}
                hideExcelButton={true}
                hidePdfButton={true}
                hideResetButton={
                  status.length == 0 && search.length == 0 ? true : false
                }
              />
            </div>
          </div>
        </div>
        {showTable && (
          <>
            <div
              className="pt_filteroptions"
              style={{
                width: tabStatus === "Mapped projects" ? "25%" : "50%",
              }}
            >
              <FormikControl
                placeholder={"Search by project name"}
                control={InputType.SEARCH}
                onChange={(value: any) => {
                  if (currentPage !== 1) setCurrentPage(1);
                  setSearch(value);
                }}
                name={search}
                value={search}
                clearSearch={emptySearchField}
              />
              {(tabStatus === "Xero projects" ||
                tabStatus === "Paytrade projects") && (
                <FormikControl
                  placeholder={"Select status"}
                  control={InputType.SELECT}
                  onChange={(value: any) => {
                    if (currentPage !== 1) setCurrentPage(1);
                    setStatus(value);
                  }}
                  options={statusOptions}
                  name={status}
                  value={status}
                  renderKey={"label"}
                  valueKey={"value"}
                />
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid">
        <div className="pt_box">
          {tabStatus === "Mapped projects" && (
            <CustomButton
              buttonName="AUTO MAP"
              iconClassName="fa-light fa-link"
              buttonType={buttonType.CONTRAST_SMALL}
              actionType="button"
              onClick={() =>
                setModelConfig({
                  show: true,
                  title: "",
                  secondButtonName: "Map",
                  firstButtonName: "Cancel",
                  description: "Map projects?",
                  id: "Map_projects?",
                })
              }
              styles={{ margin: "0 10px 10px 10px" }}
            />
          )}
          {tabStatus === "Xero projects" && (
            <>
              <CustomButton
                buttonName="SYNC"
                iconClassName="fa-light fa-sync"
                buttonType={buttonType.CONTRAST_SMALL}
                actionType="button"
                onClick={() =>
                  setModelConfig({
                    show: true,
                    title: "",
                    secondButtonName: "Sync",
                    firstButtonName: "Cancel",
                    description: "Sync xero projects?",
                    id: "Sync_xero_projects?",
                  })
                }
                styles={{ margin: "0 10px 10px 10px" }}
              />
              {isXeroConnected && (
                <CustomButton
                  buttonName="CREATE ALL IN PAYTRADE"
                  iconClassName="fa-light fa-plus-circle"
                  buttonType={buttonType.CONTRAST_SMALL}
                  actionType="button"
                  onClick={() =>
                    setModelConfig({
                      show: true,
                      title: "Create All in PayTrade",
                      secondButtonName: "Create All",
                      firstButtonName: "Cancel",
                      description:
                        "Create all unmapped Xero projects in PayTrade? Projects with missing required fields will be skipped.",
                      id: "Batch_create_in_paytrade?",
                    })
                  }
                  styles={{ margin: "0 10px 10px 10px" }}
                />
              )}
            </>
          )}
          {tabStatus === "Paytrade projects" &&
            isXeroConnected && (
              <CustomButton
                buttonName="CREATE ALL IN XERO"
                iconClassName="fa-light fa-plus-circle"
                buttonType={buttonType.CONTRAST_SMALL}
                actionType="button"
                onClick={() =>
                  setModelConfig({
                    show: true,
                    title: "Create All in Xero",
                    secondButtonName: "Create All",
                    firstButtonName: "Cancel",
                    description:
                      "Create all unmapped PayTrade projects in Xero?",
                    id: "Batch_create_in_xero?",
                  })
                }
                styles={{ margin: "0 10px 10px 10px" }}
              />
            )}
          {showTable && (
            <DynamicTable
              headers={
                gridActionsCondition.length > 1
                  ? headers
                  : headers.map((header: any, index: any) =>
                      index === 2 ? { ...header, title: "Action" } : header
                    )
              }
              gridData={gridData}
              gridActions={gridActionsCondition}
              dynamicApiGridIconsKey={"dynamicIcon"}
              showLoader={tableLoader}
              loaderColSpan={headers.length}
              renderRowList={renderRowList}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={(perPage) => {
                setCurrentPage(1);
                setEntriesPerPage(perPage);
              }}
              onPageChange={setCurrentPage}
              totalEntries={totalRows}
              onSortChange={(sortConfig) => {
                if (gridData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
        <CustomButton
          styles={{ height: "40px" }}
          buttonName="Close"
          iconClassName="fa-light fa-close"
          buttonType={buttonType.CONTRAST_SMALL}
          actionType="button"
          onClick={() => {
            router.push("/user/integrations/xero");
          }}
        />
      </div>

      {modelConfig.show && (
        <BaseModal
          modalId="confirmation"
          displayModal={modelConfig.show}
          onClose={() => setModelConfig({ ...modelConfig, show: false })}
          title={modelConfig.title}
          secondButtonName={modelConfig.secondButtonName}
          firstButtonName={modelConfig.firstButtonName}
          onConfirm={() => {
            modelClose();
            return true;
          }}
        >
          <p className="text_center">{modelConfig.description}</p>
        </BaseModal>
      )}
      {showManualMapping && (
        <BaseModal
          modalId="confirmation"
          displayModal={showManualMapping}
          onClose={() => setShowManualMapping(false)}
          secondButtonName="Map"
          firstButtonName="Cancel"
          onConfirm={() => {
            handleManualMappingProject();
            return true;
          }}
          title="Project Mapping"
        >
          <br />
          <p className="text_center">
            Map <b>{selectedContact?.project_name}</b> to:{" "}
          </p>
          <br />
          <SearchableSelect
            placeholder={
              tabStatus === "Xero projects"
                ? "Select contact from paytrade projects"
                : "Select contact from xero projects"
            }
            label=""
            name={"contact"}
            renderKey="project_name"
            options={manualMapOptions}
            valueKey="project_id"
            isInPopup={true}
            onChange={(selectedOption: any) => {
              setManualMapData(selectedOption);
            }}
            selectedData={manualMapData}
          />
        </BaseModal>
      )}
    </div>
  );
}
