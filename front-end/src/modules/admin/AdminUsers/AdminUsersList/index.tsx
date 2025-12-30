"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { DateFormat, InputType, NA } from "@/shared/constant/general";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IAdminUserListDetail } from "../adminUsers.types";

import {
  adminUsersListHeaders,
  adminUsersRenderData,
  statusOptions,
} from "../adminUsers.constant";

import {
  ListAllAdminsUsers,
  ResetAdminPassword,
} from "../adminUsers.functions";
import { clearBrowserStorage, connectWebSocket, formatDate } from "@/utils";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import { UpdateAdminDetails } from "../../AddAdminUser/AddAdminUsers.function";
import { Roles } from "@/shared/constant/role";

export default function AdminUsersList() {
  const router = useRouter();
  const [adminUsersListData, setAdminUsersListData] = useState<
    IAdminUserListDetail[]
  >([]);

  const [searchValue, setSearchValue] = useState("");
  const [actionData, setActionData] = useState<any>();

  const [statusType, setStatusType] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [sortValues, setSortValues] = useState<any>("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const [emptySearchField, setEmptySearchField] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const isAnyFilterActive = statusType !== "" || searchValue;

  useEffect(() => {
    fetchAdminUsersLists();
  }, [searchValue, statusType, currentPage, entriesPerPage, sortValues]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "Make Super Admin",
      icon: "fa-thin fa-user-crown",
      onClick: (row: IAdminUserListDetail) => {
        console.log("Claiming for row:", row);
        setActionData({ ...row, option: "Make Super Admin" });
        setOpenModal(!openModal);
        setPopupMessage((prev: any) => ({
          headerMsg: "Do you wish to make this user a super admin?",
          subHeaderMsg:
            "While you do this remember your profile permission will be changed to that of an admin user.",
        }));
      },
      conditionalApiDisplayKey: "makeSuperAdmin",
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: IAdminUserListDetail) => {
        router.push(`${AppRoutes.ADMIN_USER_EDIT}/${row?.id}`);
      },
      displayByDefault: true,
    },
    {
      label: "Reset password",
      icon: "fa-light fa-user-lock",
      onClick: (row: IAdminUserListDetail) => {
        setActionData({ ...row, option: "Reset" });
        setOpenModal(!openModal);
        setPopupMessage((prev) => ({
          headerMsg: "",
          subHeaderMsg: "Do you wish to Reset password?",
        }));
        setOpenModal(!openModal);
      },
      displayByDefault: true,
    },
    {
      label: "Delete",
      icon: "fa-light fa-trash",
      style: "contrast",
      onClick: (row: IAdminUserListDetail) => {
        console.log("Claiming for row:", row);
        setActionData({ ...row, option: "Delete" });
        setOpenModal(!openModal);
        setPopupMessage((prev) => ({
          headerMsg: "",
          subHeaderMsg: "Are you sure you wish to delete access for this user?",
        }));
      },
      displayByDefault: true,
    },
  ];

  // Row click handler
  const handleRowClick = (row: IAdminUserListDetail) => {
    router.push(`${AppRoutes.ADMIN_USER_EDIT}/${row?.id}`);
  };

  async function fetchAdminUsersLists() {
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
      const response = await ListAllAdminsUsers(payload);

      if (response?.admins?.length > 0) {
        const modifiedGridData = response?.admins.map((listObj: any) => {
          return {
            ...listObj,
            names: listObj?.first_name
              ? `${listObj.first_name} ${listObj?.last_name || ""}`
              : listObj?.last_name || "",

            created_on: listObj?.created_on
              ? formatDate(listObj?.created_on)
              : NA,
            manageadminusers_list_icons: {
              makeSuperAdmin: listObj?.admin_role !== "Super Admin",
            },
          };
        });

        setAdminUsersListData(modifiedGridData);
      } else {
        setAdminUsersListData([]);
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
        screen_name: "admin_user",
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

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    if (actionData.option === "Delete") {
      let payload = {
        admin_status: "Deleted",
        id: actionData?.id,
      };
      let response = await UpdateAdminDetails(
        payload,
        "User has been deleted."
      );
      if (response) {
        await fetchAdminUsersLists();
      }
    }
    if (actionData.option === "Make Super Admin") {
      let payload = {
        admin_role: Roles.SUPER_ADMIN_ROLE,
        id: actionData?.id,
      };
      let response = await UpdateAdminDetails(
        payload,
        "User Role has been changed to Super Admin."
      );
      if (response) {
        clearBrowserStorage();
        router.push(AppRoutes.ADMIN_LOGIN);
      }
    }
    if (actionData.option === "Reset") {
      let payload = {
        id: actionData?.id,
      };
      let response = await ResetAdminPassword(
        payload,
        "Reset password link has been sent to the user."
      );
    }
  };

  function onInputChange(value: any) {
    if (currentPage != 1) {
      setCurrentPage(1);
    }
    if (entriesPerPage != 10) {
      setEntriesPerPage(10);
    }
    setSearchValue(value);
  }

  async function handleDownloadPdfFile() {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "admin_user",
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
            activeRoute={"Admin users"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Manage admin users</h1>
          </div>
          <div className="pt_pageactions">
            <Link href={AppRoutes.ADMIN_USER_ADD} passHref legacyBehavior>
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add admin user
                </button>
              </a>
            </Link>
          </div>
        </div>
      </div>
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters align_view_activity">
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={adminUsersListData?.length > 0 ? false : true}
                hidePdfButton={adminUsersListData?.length > 0 ? false : true}
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
            placeholder={"Search by name, email"}
            control={InputType.SEARCH}
            onChange={(value: any) => {
              onInputChange(value);
            }}
            name={searchValue}
            value={searchValue}
            clearSearch={emptySearchField}
          />
          <FormikControl
            placeholder={"Select a status"}
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
            headers={adminUsersListHeaders}
            gridData={adminUsersListData?.length > 0 ? adminUsersListData : []}
            gridActions={currentActions}
            onRowClick={handleRowClick}
            dynamicApiGridIconsKey={"manageadminusers_list_icons"}
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={adminUsersRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            hoverOnRowClick
            onSortChange={(sortConfig) => {
              if (adminUsersListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
      {openModal && (
        <BaseModal
          displayModal={openModal}
          onClose={() => {
            setOpenModal(false);
          }}
          title={popupMessage?.headerMsg || ""}
          firstButtonName="No"
          secondButtonName="Yes"
          onConfirm={() => {
            handleModalPopUpFunction();
            return true;
          }}
        >
          <div className="text_center">{popupMessage?.subHeaderMsg || ""}</div>
        </BaseModal>
      )}
    </div>
  );
}
