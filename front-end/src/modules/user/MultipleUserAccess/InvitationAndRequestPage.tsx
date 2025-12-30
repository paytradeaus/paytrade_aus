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
  invitationsHeader,
  tabOptions,
  tabOptionsForBaseUser,
  requestRenderData,
  invitationRenderData,
  requestRenderDataAdmin,
  invitationRenderDataAdmin,
} from "./multipleUserAccess.constant";
import { InputType, NA } from "@/shared/constant/general";
import {
  getInvitationListsForCompany,
  getUserListsForCompany,
  InvitationItem,
  updateAcceptOrDecline,
} from "./multipleUserAccess.function";
import { useTokenDetails } from "@/hooks";
import BaseModal from "@/components/BaseModal";
import { useLoaderContext } from "@/context/useLoader";
import { getSubscriptionDetailsByCompanyId } from "../Subscriptions/subscriptions.function";
import { formatDate } from "@/utils";

interface UserAccessPageProps {
  variant?: "requests" | "invitations";
}

const InvitationAndRequestPage: React.FC<UserAccessPageProps> = ({
  variant = "requests",
}) => {
  const routePath = usePathname();
  const router = useRouter();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [totalCount, setTotalCount] = useState(0);
  const [inviteCount, setInviteCount] = useState(0);
  const [userLimit, setUserLimit] = useState<number | null>(null);
  const [openPlanModal, setOpenPlanModal] = useState(false);
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState("");
  const [tableLoader, setTableLoader] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const UserType = getCookie("ProfileType");

  const [userData, setUserData] = useState<InvitationItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterData, setFilterData] = useState<InvitationItem[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();

  // Determine the actual variant based on user type
  const actualVariant =
    UserType === "User"
      ? variant === "requests"
        ? "invitations"
        : "requests"
      : variant;

  const [activeTab, setActiveTab] = useState(
    variant === "requests" ? "Requests" : "Invitations"
  );
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

  const handleTabClick = (tabId: string) => {
    debugger;
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

  const getUsersInvitationList = async (page: number, rowsPerPage: number) => {
    setTableLoader(true);
    const userInvitationList = await getInvitationListsForCompany({
      companyId: UserType === "User" ? null : companyId,
      pageNumber: page,
      pageSize: perPage,
      type: actualVariant === "requests" ? "Received" : "Sent",
      search: search.length > 2 ? search : "",
    });
    const { invitation_list = [], totalCount = 0 } = userInvitationList || {};

    const processedData = invitation_list.map((val: any) => ({
      ...val,
      user_action: val.user_action ? (
        val.user_action === "Accept" ? (
          <span style={{ color: "green" }}>Accepted</span>
        ) : (
          <span style={{ color: "red" }}>Declined</span>
        )
      ) : (
        ""
      ),
    }));

    setUserData(processedData);
    setFilterData(processedData);
    setTotalRows(totalCount);
    setTableLoader(false);
  };

  useEffect(() => {
    if (companyId) {
      getUsersInvitationList(page, perPage);
    }
  }, [companyId, page, perPage, actualVariant]);

  const handleOptionClick = async (data: { id: string; option: string }) => {
    const { id, option } = data;
    setActionData(data);

    if (option === "Decline") {
      setOpenModal(true);
    } else if (option === "Accept") {
      // 🟩 Run subscription check first
      await handleAcceptWithSubscriptionCheck(id);
      // await handleAction(id, "Accept", "You have accepted this invite.");
    }
  };

  const handleConfirm = () => {
    setOpenPlanModal(false);
    // Proceed with the action
    // sessionStorage.setItem(commonCookies.NAVIGATED_FROM, AppRoutes.USER_ACCESS);
    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  };

  const getUserAccessListsForCompany = async (
    page: number,
    rowsPerPage: number
  ) => {
    if (companyId === null) {
      return;
    }
    setTableLoader(true);
    try {
      const response = await getUserListsForCompany({
        companyId: companyId,
        pageNumber: page,
        pageSize: rowsPerPage,
        search: search.length > 2 ? search : "",
      });
      const newData = decodeTokenData?.companySpecificRoles?.filter(
        (x: { companyId: number }) => String(x.companyId) === String(companyId)
      );
      let role = newData?.length > 0 ? newData[0] : {};
      const user_list: any[] = response.user_list.map((val: any) => {
        let userIcon = {};
        if (
          role?.manageUser &&
          (role?.manageUser == "No" || role?.manageUser == "View Only")
        ) {
          userIcon = {
            edit: false,
            delete: false,
            makePrimaryAdmin: false,
          };
        } else if (val.user_type === "PRIMARY ADMIN") {
          userIcon = {
            edit: false,
            delete: false,
            makePrimaryAdmin: false,
          };
        } else if (
          role?.role === "STANDARD USER" &&
          val.user_type === "ADMIN"
        ) {
          userIcon = {
            edit: false,
            delete: false,
            makePrimaryAdmin: false,
          };
        } else {
          userIcon = {
            edit: true,
            delete: true,
            makePrimaryAdmin:
              role?.role !== "ADMIN" && role?.role !== "STANDARD USER"
                ? true
                : false,
          };
        }

        return {
          ...val,
          date_added: val.date_added ? formatDate(val?.date_added) : NA,
          userIcon,
        };
      });
      setFilterData(response.user_list || []);
      setTotalRows(response.total_count || 0);

      return response;
    } catch (error) {
    } finally {
      setTableLoader(false);
    }
  };

  // 🟩 New wrapper specifically for Accept
  const handleAcceptWithSubscriptionCheck = async (id: string) => {
    try {
      setLoader(true);

      // Run both APIs in parallel
      const [userListResponse, subscriptionResponse] = await Promise.all([
        getUserAccessListsForCompany(currentPage, entriesPerPage),
        getSubscriptionDetailsByCompanyId(),
      ]);

      let latestTotalCount = totalCount;
      let latestUserLimit = userLimit;
      let latestInviteCount = inviteCount;

      // ✅ Update totalCount + inviteCount
      if (userListResponse) {
        latestTotalCount = userListResponse.total_count || 0;
        latestInviteCount = userListResponse.pending_invitations || 0;
        setInviteCount(latestInviteCount);
        setTotalCount(latestTotalCount);
      }
      // ✅ Update userLimit from subscriptionResponse
      let usersItem: any = null;
      // ✅ Update userLimit
      if (subscriptionResponse?.plan_items?.length > 0) {
        usersItem = subscriptionResponse.plan_items.find(
          (item: any) => item.item_name === "Users"
        );
        if (usersItem) {
          latestUserLimit = Number(usersItem.limit_value);
          setUserLimit(latestUserLimit);
        }
      }

      const combinedCount = latestTotalCount + latestInviteCount;

      if (!usersItem) {
        setModalHeading("Upgrade Subscription");
        setModalBodyContent(
          "You need to upgrade your subscription to add multiple users to this profile."
        );
        setOpenPlanModal(true);
      }
      // ✅ Check subscription before accepting
      else if (latestUserLimit !== null && combinedCount >= latestUserLimit) {
        setModalHeading("Upgrade Subscription");
        setModalBodyContent(
          `You already have ${latestTotalCount} active ${
            latestTotalCount === 1 ? "user" : "users"
          } and ${latestInviteCount} pending ${
            latestInviteCount === 1 ? "invitation" : "invitations"
          }.  

Your current plan allows a maximum of ${latestUserLimit} ${
            latestUserLimit === 1 ? "user" : "users"
          }.  

To accept this invitation and add more members to your organization, please upgrade your subscription.`
        );
        setOpenPlanModal(true);
      } else {
        // 🟩 Safe to accept invite
        await handleAction(id, "Accept", "You have accepted this invite.");
      }
    } catch (error) {
      console.error("Error in handleAcceptWithSubscriptionCheck:", error);
    } finally {
      setLoader(false);
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

  const handleResetFilters = () => {
    setSearch("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };

  const filteredData = userData.filter((item) => {
    const valueToSearch = item?.user_name?.toLowerCase();
    return valueToSearch?.includes(search.toLowerCase());
  });

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

  const actions =
    actualVariant === "requests"
      ? [
          {
            label: "Accept",
            icon: "fa-light fa-check",
            onClick: (row: any) =>
              handleOptionClick({ ...row, option: "Accept" }),
            displayByDefault: true,
          },
          {
            label: "Deny",
            icon: "fa-light fa-ban",
            style: "primary",
            onClick: (row: any) =>
              handleOptionClick({ ...row, option: "Decline" }),
            displayByDefault: true,
          },
        ]
      : [];

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
            activeRoute={variant === "requests" ? "Requests" : "Invitations"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>{variant === "requests" ? "Requests" : "Invitations"}</h1>
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
            headers={
              actualVariant === "requests" ? requestHeader : invitationsHeader
            }
            gridData={filteredData}
            gridActions={actions}
            showLoader={tableLoader}
            loaderColSpan={
              actualVariant === "requests"
                ? requestHeader.length
                : invitationsHeader.length
            }
            renderRowList={
              actualVariant === "requests"
                ? UserType === "User"
                  ? requestRenderDataAdmin
                  : requestRenderData
                : UserType === "User"
                ? invitationRenderDataAdmin
                : invitationRenderData
            }
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
          />
        </div>
      </div>
      {actualVariant === "requests" && openModal && (
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
      {openPlanModal && (
        <BaseModal
          displayModal={openPlanModal}
          onClose={() => setOpenPlanModal(false)}
          firstButtonName="Cancel"
          secondButtonName="Upgrade Now"
          title={modalHeading}
          onConfirm={() => {
            handleConfirm();
            return true;
          }}
        >
          <h4 className="text_center">{modalBodyContent}</h4>
        </BaseModal>
      )}
    </div>
  );
};
export default InvitationAndRequestPage;
