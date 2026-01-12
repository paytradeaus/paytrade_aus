"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getCookie } from "cookies-next";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import TabSwitch from "@/components/TabSwitch";
import GridExportActions from "@/components/GridExportActions";
import FormikControl from "@/components/FormikControl";
import DynamicTable from "@/components/Table";
import {
  requestHeader,
  requestRenderData,
  tabOptions,
  tabOptionsForBaseUser,
} from "./multipleUserAccess.constant";
import { InputType } from "@/shared/constant/general";
import {
  getInvitationListsForCompany,
  InvitationItem,
  updateAcceptOrDecline,
} from "./multipleUserAccess.function";
import { useTokenDetails } from "@/hooks";
import BaseModal from "@/components/BaseModal";

const RequestPage = () => {
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [tableLoader, setTableLoader] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const UserType = getCookie("ProfileType");

  const [userData, setUserData] = useState<InvitationItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterData, setFilterData] = useState<InvitationItem[]>([]);
  const [singleSelectedData, setSingleSelectedData] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [activeTab, setActiveTab] = useState("Requests"); // Set the default active tab
  const [companyId, setCompanyId] = useState<number | null>(null);
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [admin, setAdmin] = useState<any>();
  const isAnyFilterActive = search;

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem("companyId");
    if (storedCompanyId) setCompanyId(Number(storedCompanyId));
  }, []);

  useEffect(() => {
    if (userData.length > 0 && decodeTokenData?.companySpecificRoles) {
      const companySpecificRoles = decodeTokenData.companySpecificRoles;

      // Check if user is admin for any of the invitations
      const isAdmin = userData.some((invitation) => {
        return companySpecificRoles.some((company: any) => {
          return (
            Number(company?.companyId) === Number(invitation?.company_id) &&
            (company?.role === "PRIMARY ADMIN" || company?.role === "ADMIN")
          );
        });
      });

      setAdmin(isAdmin);
    }
  }, [userData, decodeTokenData]);

  useEffect(() => {
    if (companyId) {
      getUsersInvitationList(page, perPage);
    }
  }, [companyId]);

  const getUsersInvitationList = async (page: number, rowsPerPage: number) => {
    setTableLoader(true);
    const userInvitationList = await getInvitationListsForCompany({
      companyId: UserType === "User" ? null : companyId,
      pageNumber: page,
      pageSize: perPage,
      type: "Received",
      search: search.length > 2 ? search : "",
    });
    const { invitation_list = [], totalCount = 0 } = userInvitationList || {};
    setUserData(invitation_list);
    setFilterData(invitation_list);
    setTotalRows(totalCount);
    setTableLoader(false);
    // Admin-specific logic
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab !== tabId) {
      setActiveTab(tabId);
      switch (tabId) {
        case "User Access":
          router.push("/user/company/user-access");
          break;
        case "Invitations":
          router.push("/user/company/invitations");
          break;
        case "Requests":
          router.push("/user/company/received-requests");
          break;
        default:
          break;
      }
    }
  };

  const tabs = [
    { id: "User Access", label: "User Access", hasError: false },
    { id: "Invitations", label: "Invitations", hasError: true },
    {
      id: "Requests",
      label: "Requests",
      hasError: true,
    },
    // Add more tabs as needed
  ];

  const handleOptionClick = async (data: { id: string; option: string }) => {
    const { id, option } = data;
    setActionData(data);

    if (option === "Decline") {
      setOpenModal(true);
    } else if (option === "Accept") {
      await handleAction(id, "Accept", "You have accepted this invite.");
    }
  };

  const handleAction = async (
    id: string,
    actionType: string,
    message: string
  ) => {
    const invitation = filterData.find((item) => item.id === id);
    if (invitation) {
      const { email_id, user_id, company_id } = invitation;

      // Determine if the user is an admin based on the invitation and companySpecificRoles
      const IsAdminTrue = decodeTokenData?.companySpecificRoles?.some(
        (company: any) => {
          return (
            Number(company?.companyId) === Number(company_id) &&
            (company?.role === "PRIMARY ADMIN" || company?.role === "ADMIN") &&
            company?.status === "Active"
          );
        }
      );
      const response = await updateAcceptOrDecline(
        company_id,
        IsAdminTrue,
        actionType,
        email_id,
        user_id,
        message
      );
      if (response) {
        await getUsersInvitationList(page, perPage);
      }
    }
  };

  const handleDeleteFunction = async () => {
    setOpenModal(false);
    if (actionData)
      await handleAction(
        actionData.id,
        "Decline",
        "You have declined this invite."
      );
  };

  // Filter data by search value
  const filteredData = userData.filter((item) => {
    const valueToSearch = item?.user_name?.toLowerCase();
    return valueToSearch?.includes(search.toLowerCase());
  });

  const handleResetFilters = () => {
    setSearch("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };
  const getColumns = () => {
    let header = structuredClone(requestHeader);
    if (userData.length == 0) {
      header[header.length - 1].title = "Action";
    }
    return header;
  };

  const header = useMemo(getColumns, [userData]);

  const actions = [
    {
      label: "Accept",
      icon: "fa-light fa-check",
      onClick: (row: any) => handleOptionClick({ ...row, option: "Accept" }),
      displayByDefault: true,
    },
    {
      label: "Deny",
      icon: "fa-light fa-ban",
      style: "primary",
      onClick: (row: any) => handleOptionClick({ ...row, option: "Decline" }),
      displayByDefault: true,
    },
  ];

  const getTabOptions = () => {
    const roleDetails = decodeTokenData?.companySpecificRoles?.find(
      (x: { companyId: number }) =>
        x.companyId === Number(localStorage.getItem("companyId"))
    );
    const storedProfileType = getCookie("ProfileType");
    if (storedProfileType === "User") {
      return tabOptionsForBaseUser;
    } else if (
      roleDetails?.role === "PRIMARY ADMIN" ||
      roleDetails?.role === "ADMIN" ||
      (roleDetails?.role === "STANDARD USER" &&
        (roleDetails?.manageUser === "Yes" ||
          roleDetails?.manageUser === "View Only"))
    ) {
      return tabOptions;
    } else {
      return tabOptionsForBaseUser;
    }
  };
  const tabOptionsList = useMemo(getTabOptions, [decodeTokenData]);

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
            ]}
            activeRoute={"Requests"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Requests</h1>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            <TabSwitch
              tabOptions={tabOptionsList}
              onChange={handleTabClick}
              tabValue={activeTab}
            />
          </div>
          <GridExportActions
            resetFilterFunction={handleResetFilters}
            hideExcelButton={true}
            hidePdfButton={true}
            hideResetButton={!isAnyFilterActive}
          />
        </div>
        <div className="pt_filteroptions">
          <div className="pt_filteroptions">
            <div>
              <FormikControl
                placeholder={"Search by name"}
                control={InputType.SEARCH}
                onChange={(value: any) => {
                  if (currentPage !== 1) setCurrentPage(1);
                  setSearch(value);
                }}
                name={search}
                value={search}
                clearSearch={emptySearchField}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={header}
            gridData={filteredData}
            gridActions={actions}
            // onRowClick={handleRowClick}
            showLoader={tableLoader}
            loaderColSpan={requestHeader.length}
            renderRowList={requestRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
          />
        </div>
      </div>
      {openModal && (
        <BaseModal
          displayModal={openModal}
          onClose={() => setOpenModal(false)}
          secondButtonName="Yes"
          firstButtonName="Cancel"
          onConfirm={() => {
            handleDeleteFunction();
            return true;
          }}
        >
          Do you want to decline the invitation?
        </BaseModal>
      )}
    </div>
  );
};

export default RequestPage;
