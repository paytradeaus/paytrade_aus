"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter } from "next/navigation";
import {
  DELETE,
  EDIT,
  OVERVIEW_TABS,
  PAYMENT,
  VIEW,
} from "@/shared/constant/general";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  clientAndSupplierRenderData,
  excelColumnNames,
  pdfDataRow,
  tabOptions,
  clientsAndSuppliersHeaders,
  pdfHeaders,
  tabId,
} from "./clientsAndSuppliers.constant";
import { connectWebSocket, getCompanyIdFromStorage } from "@/utils";
import {
  deleteClientSuppliersById,
  fetchClientSuppliersList,
  getClientSuppliersListByProjectId,
} from "./clientsAndSuppliers.functions";
import { useAppDispatch } from "@/redux/store";
import { IClientsAndSuppliersDetails } from "./clientsAndSuppliers.types";
import { useSearchParams } from "next/navigation";
import {
  setAccountDetailsData,
  setClientsSuppliersData,
} from "@/redux/slices/clientSuppliersDetails";
import BaseModal from "@/components/BaseModal";
import { setAddTrustRecord } from "@/redux/slices/companyRegistrationDetails";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { overviewModeType } from "../../PaymentsList/PaymentList.constants";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { projectOverviewTabs } from "../../Projects/ProjectOverview/ProjectOverview.constant";

// Row data interface (Optional but recommended)
interface RowData {
  id: string;
  client_supplier_name: string;
  business_name: string;
  client_supplier_type: string;
  client_supplier_address: string;
  contract_count: string;
  claim_count: string;
  client_supplier_status: string;
  client_supplier_id: string;
}
interface Action {
  label: string;
  icon: string;
  onClick: (row: RowData, index?: number) => void;
  style?: string;
  isDelete?: boolean;
}
export default function ClientsAndSuppliers({ overViewDetails = {} }: any) {
  const { overViewMode = false, data: overviewData } = overViewDetails;
  const [clientAndSuppliersListData, setClientAndSuppliersListData] = useState<
    IClientsAndSuppliersDetails[]
  >([]);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const dispatch = useAppDispatch();
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();
  const [totalRows, setTotalRows] = useState(0);
  const [tabStatus, setTabStatus] = useState<string | null>(null);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [claimType, setClaimType] = useState("All"); // State to manage switch
  const handleClaimTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setClientTabStatus(event.target.value);
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [clientTabStatus, setClientTabStatus] = useState<string | null>("All");
  const [tableLoader, setTableLoader] = useState(false);
  const queryParams = useSearchParams();
  const [gridRowData, setGridRowData] = useState<any>({});
  const [displayArchiveGrid] = useState(queryParams.get("tab") === "archived");
  const resetFilters = () => {
    setSearchValue("");
  };
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState<boolean>(false);

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const isAnyFilterActive = searchValue || "";
  function handleSearch(value: string) {
    setSearchValue(value);
  }

  function onRouteFromProjectOverview() {
    if (overViewDetails?.overViewType == overviewModeType.PROJECTS) {
      dispatch(
        setScreenDetails({
          fromScreen: "projectOverview",
          toScreen: "clientSuppliers",
          mainActiveTab: projectOverviewTabs.CLIENTSANDSUPPLIERS,
        })
      );
    }
  }

  // Define actions dynamically
  const archiveActions: Action[] = [
    {
      label: "View",
      icon: "fa-light fa-inbox",
      style: "primary",
      onClick: (row: RowData) => {
        onRouteFromProjectOverview();
        handleActions({ option: VIEW }, row); // This triggers the 'handleActions' function
      },
    },

    {
      label: "Undo delete",
      style: "contrast",
      icon: "fa-light fa-trash-undo",
      isDelete: true,
      onClick: (row: RowData) => {
        handleActions({ option: DELETE }, row); // This triggers the 'handleActions' function
      },
    },
  ];

  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: RowData) => {
        onRouteFromProjectOverview();
        handleActions({ option: VIEW }, row); // This triggers the 'handleActions' function
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: RowData) => {
        onRouteFromProjectOverview();
        handleActions({ option: EDIT }, row); // This triggers the 'handleActions' function
      },
    },
    {
      label: "Add payment claim",
      icon: "fa-light fa-money-bill-simple",
      onClick: (row: RowData) => {
        onRouteFromProjectOverview();
        handleActions({ option: PAYMENT }, row);
      },
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: RowData) => {
        handleActions({ option: DELETE }, row); // This triggers the 'handleActions' function
      },
    },
  ];
  const paymentActions: Action[] = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: RowData) => {
        handleActions({ option: VIEW }, row); // This triggers the 'handleActions' function
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: RowData) => {
        handleActions({ option: EDIT }, row); // This triggers the 'handleActions' function
      },
    },
    {
      label: "Add payment claim",
      icon: "fa-light fa-money-bill-simple",
      onClick: (row: RowData) => {
        handleActions({ option: PAYMENT }, row);
      },
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: RowData) => {
        handleActions({ option: DELETE }, row); // This triggers the 'handleActions' function
      },
    },
  ];

  useEffect(() => {
    if (!overViewMode || (overViewMode && !!overviewData?.project_id)) {
      getClientSuppliersList(page, perPage);
    }
  }, [
    page,
    perPage,
    displayArchiveGrid,
    overviewData,
    clientTabStatus,
    tabStatus,
    searchValue,
    sortValues,
  ]);

  useEffect(() => {
    setPage(1); // Reset to the first page
    setTabStatus(tabOptions?.[0]?.label);
  }, []);
  // Row click handler
  function handleRowClick(row: RowData) {
    onSelectionOfViewOrEditMode(VIEW, row?.id);
  }

  useEffect(() => {
    dispatch(setClientsSuppliersData(""));
    dispatch(setAccountDetailsData(""));
  }, []);

  async function getClientSuppliersList(page: number, newPerPage: number) {
    const generalPayload = {
      company_id: Number(localStorage.getItem("companyId")),
      page_number: page,
      page_size: newPerPage,
      search: searchValue,
      client_supplier_type: clientTabStatus === "All" ? "" : clientTabStatus,
      sorting_field: sortValues?.sortKey || "",
      sorting_order: sortValues?.direction || "",
    };
    const commonPostData = {
      getClientSupplierListsInput: {
        ...generalPayload,
        list_type: tabStatus === "Archived" ? "Archived" : null,
        client_supplier_status: null,
      },
    };

    const projectOverviewPostData = {
      getClientSuppliersListForProjectsInput: {
        ...generalPayload,
        project_id: overviewData?.project_id,
      },
    };

    const api = overViewMode
      ? getClientSuppliersListByProjectId(projectOverviewPostData)
      : fetchClientSuppliersList(commonPostData);

    setTableLoader(true);

    const response = await api;

    try {
      if (response) {
        setClientAndSuppliersListData(response?.client_suppliers_list);
        setTotalRows(response?.total_count);
      }
      setTableLoader(false);
    } catch (err: any) {
      setTableLoader(false);
    }
  }

  async function handleDelete() {
    try {
      setLoading(true);

      const postData: any = {
        id: gridRowData?.id,
        isDeleted: tabOptions?.[0]?.label === tabStatus ? true : false,
      };
      const response = await deleteClientSuppliersById(postData);
      if (response) {
        setDisplayConfirmationModal(false);
        await getClientSuppliersList(page, perPage);
      }

      setLoading(false);
    } catch (error: any) {}
  }

  function handleActions(type: any, data: RowData) {
    const { option } = type;

    if (option == VIEW || option == EDIT) {
      onSelectionOfViewOrEditMode(option, data?.id);
    } else if (option === DELETE || option === "Undo Delete") {
      setGridRowData(data);
      setDisplayConfirmationModal(true);
    } else if (option === "Add Payment Claim") {
      router.push(
        `${AppRoutes.USER_ADD_CLAIMS}?overviewType=${OVERVIEW_TABS.project}&overviewProjectId=${overviewData?.id}&active_tab=${projectOverviewTabs.CLIENTSANDSUPPLIERS}`
      );
    }
  }
  function onSelectionOfViewOrEditMode(selectionOption: string, clientId: any) {
    let route =
      selectionOption === VIEW
        ? AppRoutes.USER_VIEW_CLIENTS_AND_SUPPLIERS
        : AppRoutes.USER_EDIT_CLIENTS_AND_SUPPLIERS;

    if (overViewMode) {
      // Ensure the view page reflects the overview mode
      router.push(
        `${route}/${clientId}?overview=${overviewData?.id}&from=${tabId.CLIENTS_AND_SUPPLIERS}`
      );
    } else {
      router.push(
        `${route}/${clientId}?tab=${
          tabStatus === "Archived" ? "archived" : "current"
        }`
      );
    }
  }

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "client_supplier",
        list_type: tabStatus === "Archived" ? "Archived" : null,
        company_id: getCompanyIdFromStorage(),
        search: searchValue || "",
        client_supplier_type:
          clientTabStatus === "All" ? null : clientTabStatus,
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
        screen_name: "client_supplier",
        list_type: tabStatus === "Archived" ? "Archived" : null,
        company_id: getCompanyIdFromStorage(),
        search: searchValue || "",
        client_supplier_type:
          clientTabStatus === "All" ? null : clientTabStatus,
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
        <div className="pt_title blockGridDisplay">
          {!overViewMode && (
            <div>
              <BreadCrumbs
                routePaths={[
                  {
                    name: "Dashboard",
                    path: AppRoutes.USER_DASHBOARD,
                  },
                ]}
                activeRoute={"Clients & suppliers"}
              />
              {/* <div className="grid"> */}
              <div className="pt_pagetitle">
                <h1>Clients & suppliers</h1>
              </div>
              {/* </div> */}
            </div>
          )}
          {!displayArchiveGrid && !overViewMode && (
            <div>
              <Link
                href={"/user/clients-suppliers/add"}
                passHref
                legacyBehavior
              >
                <a className="pt_addnewbutton">
                  <button
                    className="secondary"
                    onClick={() => {
                      dispatch(setAddTrustRecord([]));
                      router.push(AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS);
                    }}
                  >
                    <i className="fa-light fa-hexagon-plus"></i>
                    Add client/supplier
                  </button>
                </a>
              </Link>
            </div>
          )}
        </div>

        <div className="pt_filtergroup">
          <div className="grid">
            {!overViewMode && (
              <div className="pt_filters blockGridDisplay">
                <div>
                  <TabSwitch
                    tabOptions={tabOptions}
                    onChange={(value: any) => setTabStatus(value)}
                  />
                </div>
              </div>
            )}
            <div>
              <GridExportActions
                excelFile={{
                  sheetName: "clients-suppliers list",
                  tableData: clientAndSuppliersListData,
                  LabelAndValueKey: excelColumnNames,
                }}
                pdfFile={{
                  fileName: "clients-suppliers",
                  headerRow: pdfHeaders,
                  tableData: clientAndSuppliersListData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => {
                  resetFilters();
                }}
                hideExcelButton={
                  clientAndSuppliersListData?.length > 0 ? false : true
                }
                hidePdfButton={
                  clientAndSuppliersListData?.length > 0 ? false : true
                }
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
        </div>
        <div className="pt_filtergroup pt_filters blockGridDisplay">
          <div>
            <fieldset>
              <input
                type="radio"
                id="claims"
                name="claimstype"
                value="All"
                checked={clientTabStatus === "All"}
                onChange={handleClaimTypeChange}
              />
              <label htmlFor="claims">All</label>

              <input
                type="radio"
                id="clients"
                name="claimstype"
                value="Client"
                checked={clientTabStatus === "Client"}
                onChange={handleClaimTypeChange}
              />
              <label htmlFor="clients">Clients</label>

              <input
                type="radio"
                id="suppliers"
                name="claimstype"
                value="Supplier"
                checked={clientTabStatus === "Supplier"}
                onChange={handleClaimTypeChange}
              />
              <label htmlFor="suppliers">Suppliers</label>
            </fieldset>
          </div>
        </div>
        <div className="pt_filteroptions">
          <div className="pt_search">
            <input
              type="search"
              id="search"
              onChange={(e: any) => handleSearch(e?.target?.value)}
              value={searchValue}
              name="search"
              placeholder="Search by name"
              className="inputBlock"
            />
          </div>
        </div>
        <div className="grid">
          <div className="pt_box">
            <div className="grid">
              <h4>{tabStatus || "Current"}</h4>
            </div>
            <DynamicTable
              headers={clientsAndSuppliersHeaders}
              gridData={
                clientAndSuppliersListData?.length > 0
                  ? clientAndSuppliersListData
                  : []
              }
              gridActions={
                tabStatus === tabOptions[1]?.label
                  ? archiveActions // 1st tab should open archiveActions
                  : gridRowData?.client_supplier_status === "Draft" ||
                    !gridRowData?.contract_count
                  ? actions // 0th tab should display paymentActions
                  : paymentActions // Default actions
              }
              displayAllStaticActions
              onRowClick={handleRowClick}
              showLoader={tableLoader}
              loaderColSpan={8}
              renderRowList={clientAndSupplierRenderData}
              currentPage={page}
              entriesPerPage={perPage}
              onEntriesPerPageChange={setPerPage}
              onPageChange={setPage}
              totalEntries={totalRows}
              hoverOnRowClick
              onSortChange={(sortConfig) => {
                if (clientAndSuppliersListData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
            {displayConfirmationModal && (
              <BaseModal
                displayModal={displayConfirmationModal}
                onHeaderIconClose={() => setDisplayConfirmationModal(false)}
                secondButtonName="Yes"
                firstButtonName="No"
                restrictOncloseFunctionInHeader
                onConfirm={() => {
                  handleDelete();
                  return true;
                }}
                onClose={() => setDisplayConfirmationModal(false)}
              >
                <span className="modalPopup">
                  {tabOptions?.[1]?.label === tabStatus
                    ? "Do you want to undo delete on this client/supplier record?"
                    : "Are you sure you wish to move the client/supplier to the archive with status updated to Deleted?"}
                </span>
              </BaseModal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
