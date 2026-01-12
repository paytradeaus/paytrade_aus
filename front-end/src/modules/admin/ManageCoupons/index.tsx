"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, InputType } from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import CustomButton from "@/components/CustomButton/CustomButton";
import { useLoaderContext } from "@/context/useLoader";
import { listTabOptions } from "@/shared/constant/data";
import { AdminGiftCouponList } from "./manageCoupons.functions";
import {
  archivedManageCouponsHeaders,
  couponListPDFHeaders,
  excelColumnNames,
  manageCouponsHeaders,
  manageCouponsRenderData,
  pdfDataRow,
} from "./manageCoupons.constants";
import { AdminUpdateGiftCoupon } from "../AddUpdateCoupons/AddUpdateCoupons.functions";
import { showErrorToast } from "@/components/Toaster";
import GridExportActions from "@/components/GridExportActions";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { connectWebSocket } from "@/utils";

function ManageSubscriptionCoupons(props: any) {
  const { archived = false } = props;
  const router = useRouter();
  const { setLoader }: any = useLoaderContext();
  const [itemsGridData, setItemsGridData] = useState<any[]>([]);

  const [searchValue, setSearchValue] = useState("");

  const [totalRows, setTotalRows] = useState(0);
  const [sortValues, setSortValues] = useState<any>("");
  const [tabStatus] = useState(archived ? "Archived" : "Current");

  const [tableLoader, setTableLoader] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>();
  const isAnyFilterActive = searchValue !== "";

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
        router.push(`${AppRoutes.ADMIN_SUBSCRIPTION_VIEW_COUPON}/${row?.id}`);
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: any) => {
        router.push(`${AppRoutes.ADMIN_SUBSCRIPTION_EDIT_COUPON}/${row?.id}`);
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
          `${AppRoutes.ADMIN_SUBSCRIPTION_VIEW_COUPON}/${row?.id}?tab=${
            tabStatus == "Archived" ? "archived" : ""
          }`
        );
      },
    },
  ];

  // Row click handler
  const handleRowClick = (row: any) => {
    router.push(
      `${AppRoutes.ADMIN_SUBSCRIPTION_VIEW_COUPON}/${row?.id}?tab=${
        tabStatus == "Archived" ? "archived" : ""
      }`
    );
  };

  function handleTabChange(value: string) {
    router.push(
      value === "Archived"
        ? AppRoutes.ADMIN_SUBSCRIPTION_ARCHIVED_COUPON
        : AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_COUPON
    );
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

  async function getAllSubscriptionItems(
    page: number,
    rowsPerPage: number,
    selectedStatus?: string
  ) {
    try {
      setTableLoader(true);
      const postData = {
        keyword: searchValue ?? "",
        status: archived ? "Inactive" : selectedStatus ?? null,
        page: page,
        perPage: rowsPerPage,
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      };
      const subscriptioncouponsResponse = await AdminGiftCouponList(postData);
      let modifiedData = [];
      if (subscriptioncouponsResponse?.list?.length > 0) {
        modifiedData = subscriptioncouponsResponse?.list?.map((rowObj: any) => {
          const months = rowObj?.duration_in_months;
          const percent = rowObj?.percent_off;
          // Duration formatting
          const monthText =
            !months || Number(months) <= 0
              ? ""
              : Number(months) === 1
              ? "1 month"
              : `${months} months`;

          // Percentage formatting → "50%" or "" if empty
          const percentText =
            percent === null || percent === undefined || percent === ""
              ? ""
              : `${percent} %`;
          return {
            ...rowObj,
            duration_in_months: monthText,
            percent_off: percentText,
            showValidIcon: rowObj?.coupon_status == "Active",
            showErrorIcon: rowObj?.coupon_status == "Inactive",
          };
        });
      }
      setItemsGridData(modifiedData || []);
      setTotalRows(subscriptioncouponsResponse?.total_count || 0);
      setEntriesPerPage(rowsPerPage);
      setTableLoader(false);
    } catch (err: any) {
      setTableLoader(false);
    }
  }

  async function handleDeleteCoupon() {
    try {
      setLoader(true);
      setDisplayConfirmationModal(false);

      const payload = {
        payload: { id: actionData?.id, coupon_status: "Deleted" },
      };

      const response = await AdminUpdateGiftCoupon(payload, setLoader);

      if (response) {
        await getAllSubscriptionItems(1, entriesPerPage);
      }
    } catch (err: any) {
      showErrorToast("Something went wrong while deleting coupon");
    } finally {
      setLoader(false);
    }
  }

  const handleResetFilters = () => {
    setSearchValue("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField((prev) => !prev);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      const responseFileURL = await GenerateSignedUrl({
        screen_name: "coupons",
        keyword: searchValue,
        status: tabStatus === "Archived" ? "Inactive" : "",
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      console.error("Excel download error:", error);
    } finally {
      setDisableExcelBtn(false);
    }
  };

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();

      await getPDFUrl(clientId, {
        screen_name: "coupons",
        keyword: searchValue,
        status: tabStatus === "Archived" ? "Inactive" : "",
      });
    } catch (error) {
      console.error("PDF download error:", error);
    } finally {
      setDisablePDFBtn(false);
    }
  };

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
            activeRoute={"Manage coupons"}
          />

          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Manage coupons</h1>
            </div>

            {!archived && (
              <div className="pt_pageactions">
                <CustomButton
                  buttonName={"Add coupon"}
                  buttonType={buttonType.SECONDARY}
                  actionType="button"
                  iconClassName="fa-light fa-hexagon-plus"
                  onClick={() =>
                    router.push(AppRoutes.ADMIN_SUBSCRIPTION_ADD_COUPON)
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
            <div className="pt_pageactions">
              <div className="actionbuttons">
                <GridExportActions
                  excelFile={{
                    sheetName: "users list",
                    tableData: itemsGridData,
                    LabelAndValueKey: excelColumnNames,
                  }}
                  pdfFile={{
                    fileName: "users list",
                    headerRow: couponListPDFHeaders,
                    tableData: itemsGridData,
                    dataRow: pdfDataRow,
                  }}
                  resetFilterFunction={() => handleResetFilters()}
                  hideExcelButton={itemsGridData.length > 0 ? false : true}
                  hidePdfButton={itemsGridData.length > 0 ? false : true}
                  hideResetButton={!isAnyFilterActive}
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
            </div>
          </div>
          <div className="pt_filteroptions">
            <div className={"width_50"}>
              <FormikControl
                key={emptySearchField}
                control={InputType.SEARCH}
                onChange={(value: any) => handleSearch(value)}
                clearSearch={emptySearchField}
                placeholder={"Search by coupon name"}
              />
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="pt_box">
            <DynamicTable
              headers={
                tabStatus === listTabOptions[1]?.label
                  ? archivedManageCouponsHeaders
                  : manageCouponsHeaders
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
              loaderColSpan={7}
              renderRowList={manageCouponsRenderData}
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
            handleDeleteCoupon();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            Are you sure you wish to delete this Coupon?
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
export default ManageSubscriptionCoupons;
