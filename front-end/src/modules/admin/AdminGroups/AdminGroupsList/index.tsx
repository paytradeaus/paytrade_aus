"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  buttonType,
  DateFormat,
  InputType,
  NA,
} from "@/shared/constant/general";

import React, { useEffect, useState } from "react";
import { IGroupsData } from "../adminGroups.types";

import {
  adminGroupsListHeaders,
  adminGroupsRenderData,
  statusOptions,
} from "../adminGroups.constant";

import { connectWebSocket, formatDate } from "@/utils";
import { listAllGroups, UpdateGroupDetails } from "../adminGroups.functions";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import BaseModal from "@/components/BaseModal";
import CustomButton from "@/components/CustomButton/CustomButton";
import { useRouter } from "next/navigation";

export default function AdminGroupList() {
  const [adminGroupsListData, setAdminGroupsListData] = useState<IGroupsData[]>(
    []
  );
  const [actionData, setActionData] = useState<any>();
  const router = useRouter();
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [statusType, setStatusType] = useState("All");
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const isAnyFilterActive = statusType !== "All" || searchValue;
  const [sortValues, setSortValues] = useState<any>("");

  useEffect(() => {
    fetchAdminGroupsLists();
  }, [searchValue, statusType, currentPage, entriesPerPage, sortValues]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: IGroupsData) => {
        router.push(`${AppRoutes.GROUPS_EDIT}/${row?.id}`);
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

  async function fetchAdminGroupsLists() {
    try {
      if (emptySearchField) {
        setEmptySearchField(false);
      }
      setTableLoader(true);
      const payload = {
        page: currentPage,
        perPage: entriesPerPage,
        keyword: searchValue,
        status: statusType === "All" ? "" : statusType,
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      };
      const response = await listAllGroups(payload);

      if (response?.groups?.length > 0) {
        const modifiedGridData = response?.groups.map((listObj: any) => {
          return {
            ...listObj,
            created_on: listObj?.created_on
              ? formatDate(listObj?.created_on)
              : NA,
          };
        });

        setAdminGroupsListData(modifiedGridData);
      } else {
        setAdminGroupsListData([]);
      }

      setTotalRows(response?.totalCount || 0);
    } catch (err: any) {
    } finally {
      setTableLoader(false);
      setDisableExcelBtn(false);
    }
  }

  const handleResetFilters = () => {
    setStatusType("All");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };
  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "admin_group",
        keyword: searchValue,
        status: statusType === "All" ? "" : statusType,
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

  async function handleDelete() {
    let payload = {
      group_status: "Deleted",
      id: actionData?.id,
    };
    let response = await UpdateGroupDetails(
      payload,
      "This group has been deleted."
    );
    if (response) {
      await fetchAdminGroupsLists();
    }
    setDisplayConfirmationModal(false);
  }

  async function handleDownloadPdfFile() {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "admin_group",
        page: currentPage,
        perPage: entriesPerPage,
        keyword: searchValue,
        status: statusType === "All" ? "" : statusType,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
            ]}
            activeRoute={"Groups"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Manage groups</h1>
          </div>
          <div className="pt_pageactions">
            <div className="pt_pageactions">
              <CustomButton
                buttonName={"Add group"}
                buttonType={buttonType.SECONDARY}
                actionType="button"
                iconClassName="fa-light fa-hexagon-plus"
                onClick={() => router.push(AppRoutes.GROUPS_ADD)}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="pt_filtergroup">
        <div className="pt_topfilters">
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={adminGroupsListData.length > 0 ? false : true}
                hidePdfButton={adminGroupsListData.length > 0 ? false : true}
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
        <div className="pt_filteroptions">
          <FormikControl
            placeholder={"Search by name"}
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearchValue(value);
            }}
            clearSearch={emptySearchField}
          />
          <FormikControl
            placeholder={"Status"}
            name="status"
            options={statusOptions}
            control={InputType.SELECT}
            value={statusType}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => {
              setCurrentPage(1);
              setStatusType(value);
            }}
          />
        </div>
      </div>
      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={adminGroupsListHeaders}
            gridData={
              adminGroupsListData?.length > 0 ? adminGroupsListData : []
            }
            displayAllStaticActions
            gridActions={currentActions}
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={adminGroupsRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            hoverOnRowClick
            onSortChange={(sortConfig) => {
              if (adminGroupsListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
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
            handleDelete();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">Do you want to delete QA admin group?</h4>
        </BaseModal>
      )}
    </div>
  );
}
