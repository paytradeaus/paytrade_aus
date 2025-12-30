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
  archivedManageItemsHeaders,
  manageItemsHeaders,
  manageItemsRenderData,
  pdfDataRow,
  pdfHeaders,
  statusOptions,
} from "./manageItems.constant";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import CustomButton from "@/components/CustomButton/CustomButton";
import { useLoaderContext } from "@/context/useLoader";
import {
  AdminListSubscriptionItems,
  editSubscriptionDetails,
} from "./manageItems.functions";
import { listTabOptions } from "@/shared/constant/data";
import { connectWebSocket } from "@/utils";

function ManageSubscriptionItems(props: any) {
  const { archived = false } = props;
  const router = useRouter();
  const { setLoader }: any = useLoaderContext();
  const [itemsGridData, setItemsGridData] = useState<any[]>([]);

  const [searchValue, setSearchValue] = useState("");

  const [selectedStatusType, setSelectedStatusType] = useState<any>(null);

  const [totalRows, setTotalRows] = useState(0);
  const [sortValues, setSortValues] = useState<any>("");
  const [tabStatus] = useState(archived ? "Archived" : "Current");

  const [tableLoader, setTableLoader] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>();

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  useEffect(() => {
    getAllSubscriptionItems(currentPage, entriesPerPage);
  }, [searchValue, tabStatus, sortValues]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        router.push(`${AppRoutes.ADMIN_VIEW_SUBSCRIPTION_ITEMS}/${row?.id}`);
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: any) => {
        router.push(`${AppRoutes.ADMIN_EDIT_SUBSCRIPTION_ITEMS}/${row?.id}`);
      },
    },

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
          `${AppRoutes.ADMIN_VIEW_SUBSCRIPTION_ITEMS}/${row?.id}?tab=archived`
        );
      },
    },
  ];

  // Row click handler
  const handleRowClick = (row: any) => {
    router.push(
      `${AppRoutes.ADMIN_VIEW_SUBSCRIPTION_ITEMS}/${row?.id}?tab=${
        tabStatus == "Archived" ? "archived" : ""
      }`
    );
  };

  function handleTabChange(value: string) {
    router.push(
      value === "Archived"
        ? AppRoutes.ADMIN_SUBSCRIPTION_ARCHIVED_ITEMS
        : AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_ITEMS
    );
  }

  function handleStatusChange(selectionOption: any) {
    setSelectedStatusType(selectionOption?.value || selectionOption?.label);
    setCurrentPage(1);
    getAllSubscriptionItems(1, entriesPerPage, selectionOption?.value);
  }

  function handlePageChange(value: any) {
    setCurrentPage(value);
    getAllSubscriptionItems(value, entriesPerPage);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    getAllSubscriptionItems(1, value);
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

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "subscription_item",
        keyword: searchValue ?? "",
        status: archived
          ? "Deleted"
          : selectedStatusType == "All"
          ? ""
          : selectedStatusType || null,
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
        screen_name: "subscription_item",
        keyword: searchValue ?? "",
        status: archived
          ? "Deleted"
          : selectedStatusType == "All"
          ? ""
          : selectedStatusType || null,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  async function getAllSubscriptionItems(
    page: number,
    rowsPerPage: number,
    selectedStatus?: string
  ) {
    try {
      setTableLoader(true);
      const postData = {
        keyword: searchValue ?? "",
        status: archived ? "Deleted" : selectedStatus ?? null,
        page: page,
        perPage: rowsPerPage,
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      };
      const subscriptionItemsResponse = await AdminListSubscriptionItems(
        postData
      );

      let modifiedData = [];
      if (subscriptionItemsResponse?.subscriptionItems?.length > 0) {
        modifiedData = subscriptionItemsResponse?.subscriptionItems?.map(
          (rowObj: any) => {
            return {
              ...rowObj,
              showValidIcon: rowObj?.item_status == "Active",
              showErrorIcon: rowObj?.item_status == "Inactive",
            };
          }
        );
      }

      setItemsGridData(modifiedData || []);
      setTotalRows(subscriptionItemsResponse?.totalCount || 0);
      setEntriesPerPage(rowsPerPage);

      setTableLoader(false);
    } catch (err: any) {
      setTableLoader(false);
    }
  }

  async function handleDeleteSubscription() {
    try {
      setDisplayConfirmationModal(false);

      setLoader(true);

      // 🔹 Convert dropdown_type back to object if it's array
      let dropdownPayload: Record<string, string> | null = null;
      if (
        actionData?.limit_type === "Dropdown" &&
        Array.isArray(actionData?.dropdown_type)
      ) {
        dropdownPayload = actionData.dropdown_type.reduce(
          (
            acc: Record<string, string>,
            cur: { key?: string; value?: string }
          ) => {
            if (cur.key && cur.value) acc[cur.key] = cur.value;
            return acc;
          },
          {}
        );
      } else if (
        actionData?.limit_type === "Dropdown" &&
        typeof actionData?.dropdown_type === "object"
      ) {
        dropdownPayload = actionData.dropdown_type;
      }

      const response = await editSubscriptionDetails({
        updateSubscriptionItemInput: {
          id: actionData?.id,
          item_name: actionData?.item_name,
          description: actionData?.description,
          item_status: "Deleted",
          limit_type: actionData?.limit_type || null,
          unit_type:
            actionData?.limit_type === "Numeric" ? actionData?.unit_type : null,
          dropdown_type: dropdownPayload,
        },
      });
      if (response) {
        showSuccessToast("Subscription item deleted successfully");
        await getAllSubscriptionItems(1, entriesPerPage);
      }

      setLoader(false);
    } catch (err: any) {
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
            activeRoute={"Manage items"}
          />

          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Manage items</h1>
            </div>

            {!archived && (
              <div className="pt_pageactions">
                <CustomButton
                  buttonName={"Add subscription item"}
                  buttonType={buttonType.SECONDARY}
                  actionType="button"
                  iconClassName="fa-light fa-hexagon-plus"
                  onClick={() =>
                    router.push(AppRoutes.ADMIN_ADD_SUBSCRIPTION_ITEMS)
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt_filtergroup">
          <div className="grid pt_topfilters">
            <div className="pt_filters ">
              <TabSwitch
                tabOptions={listTabOptions}
                tabValue={tabStatus}
                onChange={(value: any) => handleTabChange(value)}
              />
            </div>

            <GridExportActions
              pdfFile={{
                fileName: "manage-plans",
                headerRow: pdfHeaders,
                tableData: itemsGridData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={() => {
                handleStatusChange("");
                setEmptySearchField(true);
              }}
              hideResetButton={
                ((selectedStatusType && selectedStatusType == "All") ||
                  !selectedStatusType) &&
                !searchValue
              }
              hideExcelButton={itemsGridData?.length == 0}
              hidePdfButton={itemsGridData?.length == 0}
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
          <div className="pt_filteroptions">
            <div className={archived ? "width_50" : "width_100"}>
              <FormikControl
                control={InputType.SEARCH}
                onChange={(value: any) => handleSearch(value)}
                clearSearch={emptySearchField}
                placeholder={"Search by name"}
              />
            </div>
            {!archived && (
              <div className={archived ? "width_50" : "width_100"}>
                <FormikControl
                  placeholder={"Select a status"}
                  name="status Type"
                  options={statusOptions}
                  control={InputType.SELECT}
                  value={selectedStatusType}
                  renderKey="label"
                  valueKey="value"
                  returnSelectedObject
                  onChange={(value: any) => handleStatusChange(value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid">
          <div className="pt_box">
            <DynamicTable
              headers={
                tabStatus === listTabOptions[1]?.label
                  ? archivedManageItemsHeaders
                  : manageItemsHeaders
              }
              gridData={itemsGridData?.length > 0 ? itemsGridData : []}
              gridActions={
                tabStatus === listTabOptions[1]?.label
                  ? archivedActions
                  : currentActions
              }
              displayAllStaticActions={true}
              onRowClick={handleRowClick}
              showLoader={tableLoader}
              loaderColSpan={4}
              renderRowList={manageItemsRenderData}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={(value: any) =>
                handleRowsPerPageChange(value)
              }
              onPageChange={(value: any) => handlePageChange(value)}
              totalEntries={totalRows}
              hoverOnRowClick
              onSortChange={(sortConfig) => {
                if (itemsGridData?.length > 0) {
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
            Are you sure you wish to delete this Subscription item?
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
export default ManageSubscriptionItems;
