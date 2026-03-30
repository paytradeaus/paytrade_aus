"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, InputType } from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import {
  archivedPlanHeaders,
  managePlanHeaders,
  managePlansRenderData,
  pdfDataRow,
  pdfHeaders,
  planTypes,
  tabOptions,
} from "./managePlans.constant";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { AdminListSubscriptionPlans } from "../AdminBusinessProfiles/adminBusinessProfiles.functions";
import CustomButton from "@/components/CustomButton/CustomButton";
import { useLoaderContext } from "@/context/useLoader";
import { AdminArchiveSubscription } from "./managePlans.functions";
import { connectWebSocket } from "@/utils";

function ManageSubscriptionPlans(props: any) {
  const { isArchived = false } = props;
  const router = useRouter();
  const { setLoader }: any = useLoaderContext();
  const [planGridData, setPlanGridData] = useState<any[]>([]);

  const [searchValue, setSearchValue] = useState("");

  const [selectedPlanType, setSelectedPlanType] = useState<any>(null);

  const [totalRows, setTotalRows] = useState(0);

  const [tabStatus] = useState(isArchived ? "Archived" : "Current");

  const [tableLoader, setTableLoader] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [currentPage, setCurrentPage] = useState(1);

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>();

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  useEffect(() => {
    getAllSubscriptionPlans(currentPage, entriesPerPage);
  }, [searchValue, tabStatus, sortValues, showSandbox]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        router.push(`${AppRoutes.ADMIN_VIEW_SUBSCRIPTION_PLAN}/${row?.id}`);
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: any) => {
        router.push(`${AppRoutes.ADMIN_EDIT_SUBSCRIPTION_PLAN}/${row?.id}`);
      },
    },

    // [Replit Update 2026-03-29] Delete/archive available for all plan types
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: any) => {
        setActionData(row);
        setDisplayConfirmationModal(true);
      },
    },
  ];

  const archivedActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        router.push(
          `${AppRoutes.ADMIN_VIEW_SUBSCRIPTION_PLAN}/${row?.id}?tab=archived`
        );
      },
    },
  ];

  // Row click handler
  function handleRowClick(row: any) {
    router.push(
      `${AppRoutes.ADMIN_VIEW_SUBSCRIPTION_PLAN}/${row?.id}?tab=${
        tabStatus == "Archived" ? "archived" : ""
      }`
    );
  }

  function handleTabChange(value: string) {
    router.push(
      value === "Archived"
        ? AppRoutes.ADMIN_SUBSCRIPTION_ARCHIVED_PLAN
        : AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_PLAN
    );
  }

  function handleStatusChange(selectionOption: any) {
    setSelectedPlanType(selectionOption?.value || selectionOption?.label);
    setCurrentPage(1);
    getAllSubscriptionPlans(1, entriesPerPage, selectionOption?.value);
  }

  function handlePageChange(value: any) {
    setCurrentPage(value);
    getAllSubscriptionPlans(value, entriesPerPage);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    getAllSubscriptionPlans(1, value);
  }

  function handleSearch(searchedValue: any) {
    if (currentPage != 1) {
      setCurrentPage(1);
    }
    if (entriesPerPage != 10) {
      setEntriesPerPage(10);
    }
    setSearchValue(searchedValue);
  }

  async function handleDownloadExcelFile() {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "subscription_plan",
        plan_type: selectedPlanType == "All" ? "" : selectedPlanType ?? "",
        search: searchValue ?? "",
        status: isArchived ? "Inactive" : "Active",
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
  }

  async function handleDownloadPdfFile() {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "subscription_plan",
        plan_type: selectedPlanType == "All" ? "" : selectedPlanType ?? "",
        search: searchValue ?? "",
        status: isArchived ? "Inactive" : "Active",
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  }

  async function getAllSubscriptionPlans(
    page: number,
    rowsPerPage: number,
    selectedPlan?: string
  ) {
    try {
      setTableLoader(true);
      const postData = {
        getAllSubscriptionPlanInput: {
          plan_type: selectedPlan ?? "",
          search: searchValue ?? "",
          status: isArchived ? "Inactive" : "Active",
          page_number: page,
          page_size: rowsPerPage,
          sorting_order: sortValues?.direction || "",
          sorting_field: sortValues?.sortKey || "",
          is_sandbox: showSandbox,
        },
      };
      const subscriptionListResponse = await AdminListSubscriptionPlans(
        postData
      );

      let modifiedData = subscriptionListResponse?.plan_list?.map(
        (rowObj: any) => {
          return {
            ...rowObj,
            mode_label: rowObj?.is_sandbox ? "Sandbox" : "Live",
            plan_items: rowObj?.plan_items
              ?.map((rowObj: any) => rowObj?.item_name)
              .toLocaleString(),
            showValidIcon: rowObj?.plan_status == "Active",
            showErrorIcon: rowObj?.plan_status == "Inactive",
          };
        }
      );
      setPlanGridData(modifiedData || []);
      setTotalRows(subscriptionListResponse?.total_count || 0);

      setTableLoader(false);
    } catch {
      setTableLoader(false);
    }
  }

  async function handleDeleteSubscription() {
    try {
      setDisplayConfirmationModal(false);

      let payload = {
        id: actionData?.id,
      };

      setLoader(true);

      let response = await AdminArchiveSubscription(payload);
      if (response) {
        await getAllSubscriptionPlans(1, entriesPerPage);
      }

      setLoader(false);
    } catch {
      setLoader(false);
    }
  }

  return (
    <div>
      <div className="container-fluid">
        <div className="pt_title">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
            ]}
            activeRoute={"Manage plans"}
          />

          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Manage plans</h1>
            </div>

            {!isArchived && (
              <div className="pt_pageactions">
                <CustomButton
                  buttonName={"Add subscription"}
                  buttonType={buttonType.SECONDARY}
                  actionType="button"
                  iconClassName="fa-light fa-hexagon-plus"
                  onClick={() =>
                    router.push(AppRoutes.ADMIN_ADD_SUBSCRIPTION_PLAN)
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt_filtergroup">
          <div className="grid pt_topfilters">
            <div className="pt_filters " style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <TabSwitch
                tabOptions={tabOptions}
                tabValue={tabStatus}
                onChange={(value: any) => handleTabChange(value)}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: showSandbox ? 400 : 600, color: showSandbox ? "#999" : "#333" }}>Live</span>
                <label style={{ position: "relative", display: "inline-block", width: "44px", height: "22px", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={showSandbox}
                    onChange={() => { setShowSandbox(!showSandbox); setCurrentPage(1); }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: showSandbox ? "#f59e0b" : "#4CAF50", borderRadius: "22px", transition: "0.3s",
                  }}>
                    <span style={{
                      position: "absolute", height: "16px", width: "16px",
                      left: showSandbox ? "24px" : "3px", bottom: "3px",
                      backgroundColor: "white", borderRadius: "50%", transition: "0.3s",
                    }} />
                  </span>
                </label>
                <span style={{ fontSize: "13px", fontWeight: showSandbox ? 600 : 400, color: showSandbox ? "#f59e0b" : "#999" }}>Sandbox</span>
              </div>
            </div>

            <GridExportActions
              pdfFile={{
                fileName: "manage-plans",
                headerRow: pdfHeaders,
                tableData: planGridData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={() => {
                handleStatusChange("");
                setEmptySearchField(true);
              }}
              hideResetButton={
                ((selectedPlanType && selectedPlanType == "All") ||
                  !selectedPlanType) &&
                !searchValue
              }
              hideExcelButton={planGridData?.length == 0}
              hidePdfButton={planGridData?.length == 0}
              handleDownloadExcelFile={() => {
                handleDownloadExcelFile();
              }}
              disabledOnExcel={disableExcelBtn}
              exportFromAPI={true}
              handleDownloadPrintPDF={() => {
                handleDownloadPdfFile();
              }}
              disabledPDF={disablePDFBtn}
            />
          </div>
          <div className="pt_filteroptions">
            <FormikControl
              control={InputType.SEARCH}
              onChange={(value: any) => handleSearch(value)}
              clearSearch={emptySearchField}
              placeholder={"Search by name"}
            />

            <FormikControl
              placeholder={"Select a plan"}
              name="Account Type"
              options={planTypes}
              control={InputType.SELECT}
              value={selectedPlanType}
              renderKey="label"
              valueKey="value"
              returnSelectedObject
              onChange={(value: any) => handleStatusChange(value)}
            />
          </div>
        </div>

        <div className="grid">
          <div className="pt_box">
            <div className="grid">
              <h4>{tabStatus || "Current"}</h4>
            </div>
            <DynamicTable
              headers={isArchived ? archivedPlanHeaders : managePlanHeaders}
              gridData={planGridData?.length > 0 ? planGridData : []}
              gridActions={
                tabStatus === tabOptions[1]?.label
                  ? archivedActions
                  : currentActions
              }
              displayAllStaticActions={true}
              onRowClick={handleRowClick}
              showLoader={tableLoader}
              loaderColSpan={7}
              renderRowList={managePlansRenderData}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={(value: any) =>
                handleRowsPerPageChange(value)
              }
              onPageChange={(value: any) => handlePageChange(value)}
              totalEntries={totalRows}
              hoverOnRowClick
              onSortChange={(sortConfig) => {
                if (planGridData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
          </div>
        </div>
      </div>
      {displayConfirmationModal && (
        <BaseModal
          modalId={"manage plan delete modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            handleDeleteSubscription();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            Are you sure you wish to delete this Subscription?
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
export default ManageSubscriptionPlans;
