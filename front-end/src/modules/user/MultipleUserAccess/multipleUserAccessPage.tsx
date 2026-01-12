"use client";
import { useEffect, useMemo, useState } from "react";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType, NA } from "@/shared/constant/general";
import {
  tabOptions,
  userAccessHeader,
  userAccessRenderData,
} from "./multipleUserAccess.constant";
import { useTokenDetails } from "@/hooks";
import GridExportActions from "@/components/GridExportActions";
import TabSwitch from "@/components/TabSwitch";
import { useRouter } from "next/navigation";
import {
  deleteUserFromCompany,
  getUserListsForCompany,
  updatePrimaryAdmin,
} from "./multipleUserAccess.function";
import { clearBrowserStorage, commonCookies, formatDate } from "@/utils";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import BaseModal from "@/components/BaseModal";
import { UserType } from "@/modules/auth/ForgotPassword/forgorPasswordFunction";
import { getCookie } from "cookies-next";
import { getSubscriptionDetailsByCompanyId } from "../Subscriptions/subscriptions.function";
import { useLoaderContext } from "@/context/useLoader";

export default function MultipleUserAccessPage() {
  const router = useRouter();
  const { decodeTokenData } = useTokenDetails();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();

  let showAdd;
  const roleDetails = decodeTokenData?.companySpecificRoles?.find(
    (x: { companyId: number }) =>
      x.companyId === Number(localStorage.getItem("companyId"))
  );
  const storedProfileType = getCookie("ProfileType");
  if (storedProfileType === "User") {
    router.push(AppRoutes.INVITATION);
  } else if (
    roleDetails?.role === "PRIMARY ADMIN" ||
    roleDetails?.role === "ADMIN" ||
    (roleDetails?.role === "STANDARD USER" && roleDetails?.manageUser === "Yes")
  ) {
    showAdd = true;
  } else if (roleDetails?.manageUser === "View Only") {
    showAdd = false;
  } else {
    router.push(AppRoutes.INVITATION);
  }
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [inviteCount, setInviteCount] = useState(0);
  const [userLimit, setUserLimit] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [userAccessData, setUserAccessData] = useState<any[]>([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [filterData, setFilterData] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);

  const [roleAccess, setRoleAccess] = useState<any>(
    roleDetails ? roleDetails : {}
  );
  const [planName, setPlanName] = useState<string>();
  const isAnyFilterActive = search;

  const [activeTab, setActiveTab] = useState("User Access");
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [actionData, setActionData] = useState<any>();
  const [userData, setUserData] = useState<UserType[]>([]);
  const [openPlanModal, setOpenPlanModal] = useState(false);
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");

  useEffect(() => {
    // Fetch company ID from local storage
    const storedCompanyId = localStorage.getItem("companyId");
    if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
    }
  }, []);

  useEffect(() => {
    const newData = decodeTokenData?.companySpecificRoles?.filter(
      (x: { companyId: number }) => String(x.companyId) === String(companyId)
    );
    setRoleAccess(newData?.length > 0 ? newData?.[0] : {});
  }, [companyId]);

  useEffect(() => {
    if (companyId !== null) {
      getUserAccessListsForCompany(1, entriesPerPage);
    } else {
      console.log("companyId is null. Waiting for it to be set...");
    }
  }, [companyId, entriesPerPage]);

  useEffect(() => {
    // Check if decodeTokenData and companyId are available
    if (decodeTokenData && companyId) {
      // Filter to get the relevant company-specific role based on companyId
      const newData = decodeTokenData?.companySpecificRoles?.find(
        (x: { companyId: number }) => String(x.companyId) === String(companyId)
      );

      // Check if the company role exists and contains subscription data
      const subscription = newData ? newData.subscription : null;

      // Set the plan name from the subscription or default to "No plan"
      const planName = subscription?.plan_name;

      console.log("Plan Name:", planName);
      setRoleAccess(newData ? newData : {});
      setPlanName(planName); // Assuming setPlanName exists to store the plan name
    }
  }, [companyId]);

  // Fetch masters list data
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
      setUserAccessData(user_list || []);
      setFilterData(response.user_list || []);
      setTotalRows(response.total_count || 0);

      return response;
    } catch (error) {
    } finally {
      setTableLoader(false);
    }
  };

  // Filter data by search value
  const filteredData = userAccessData.filter((item) => {
    const valueToSearch = item?.user_name?.toLowerCase();
    return valueToSearch?.includes(search.toLowerCase());
  });

  // Reset filters
  const handleResetFilters = () => {
    setSearch("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
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
  const handleDeleteFunction = async (user_id: string) => {
    setOpenModal(false); // Close the modal
    try {
      await deleteUserFromCompany(companyId, Number(user_id)); // Call deleteUserFromCompany service with user_id
      await getUserAccessListsForCompany(currentPage, entriesPerPage); // Refresh user list after deletion
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  const handleMakePrimaryAdmin = async (user_id: string) => {
    try {
      const updatePrimaryResponce = await updatePrimaryAdmin(
        companyId,
        Number(user_id)
      ); // Call updatePrimaryAdmin service with user_id
      // Update the user type in the userData state
      setUserData((prevData) =>
        prevData.map((user) =>
          user.user_id === user_id
            ? { ...user, user_type: "PRIMARY ADMIN" }
            : user
        )
      );
      // Update the filterData state if needed
      setFilterData((prevData) =>
        prevData.map((user) =>
          user.user_id === user_id
            ? { ...user, user_type: "PRIMARY ADMIN" }
            : user
        )
      );
      setOpenUpdateModal(false);
      // Refresh the table
      await getUserAccessListsForCompany(currentPage, entriesPerPage);
      if (updatePrimaryResponce) {
        localStorage.clear();
        clearBrowserStorage();
        router.push(AppRoutes.USER_LOGIN);
      }
    } catch (error) {
      console.error("Error updating primary admin:", error);
    }
  };

  const getColumns = () => {
    let updatedColumns: any = structuredClone(userAccessHeader);

    if (
      roleAccess?.manageUser !== "No" &&
      roleAccess?.manageUser !== "View Only"
    ) {
      updatedColumns.push({
        title: "Actions",
        dataKey: "",
        restrictSorting: true,
      });
    }

    if (
      updatedColumns.length &&
      updatedColumns[updatedColumns.length - 1]?.title === "Actions" &&
      userAccessData.every(
        (val) =>
          !val.userIcon?.edit &&
          !val.userIcon?.delete &&
          !val.userIcon?.makePrimaryAdmin
      )
    ) {
      updatedColumns[updatedColumns.length - 1] = {
        ...updatedColumns[updatedColumns.length - 1],
        title: "Action",
      };
    }

    return updatedColumns;
  };

  const columns = useMemo(getColumns, [roleAccess, userAccessData]);
  const action = [
    {
      label: "Make Primary Admin",
      icon: "fa-light fa-id-card",
      onClick: (row: any) => {
        handleOptionClick({
          ...row,
          user_id: row.user_id,
          email: row?.email_id,
          option: "Make Primary Admin",
        });
      },
      conditionalApiDisplayKey: "makePrimaryAdmin",
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: any) => {
        handleOptionClick({
          ...row,
          user_id: row.user_id,
          email: row?.email_id,
          option: "Edit",
        });
      },
      conditionalApiDisplayKey: "edit",
    },
    {
      label: "Delete",
      icon: "fa-light fa-trash",
      style: "contrast",
      onClick: (row: any) => {
        handleOptionClick({
          ...row,
          user_id: row.user_id,
          email: row?.email_id,
          option: "Delete",
        });
      },
      conditionalApiDisplayKey: "delete",
    },
  ];

  const handleOptionClick = async (data: {
    id: string;
    option: string;
    user_id: string;
    email: string; // Add email to the data type
    name: string;
  }) => {
    const { id, option, user_id, email, name } = data;
    setActionData(data);
    if (option === "Make Primary Admin") {
      setOpenUpdateModal(true);
    } else if (option === "Delete") {
      setOpenModal(true);
    }
    if (option === "Edit") {
      router.push(`${AppRoutes.COMPANY_EDIT_USER}/${email}`);
    }
  };

  // const handleButtonClick = () => {
  //   if (planName === "Basic") {
  //     setModalHeading("Upgrade Subscription");
  //     setModalBodyContent(
  //       "You need to upgrade your subscription to add multiple users to this profile."
  //     );
  //     setOpenPlanModal(true);
  //   } else {
  //     router.push(AppRoutes.COMPANY_ADD_USER);
  //   }
  // };

  const handleButtonClick = async () => {
    try {
      setLoader(true); // one loader for both calls

      // Run both APIs in parallel
      const [userListResponse, subscriptionResponse] = await Promise.all([
        getUserAccessListsForCompany(currentPage, entriesPerPage),
        getSubscriptionDetailsByCompanyId(),
      ]);

      // ⭐ NEW: Extract free plan eligibility
      const isFreePlanEligible =
        subscriptionResponse?.is_free_plan_eligible === true;

      // ⭐ If free plan allows unlimited users → skip restrictions
      if (isFreePlanEligible) {
        router.push(AppRoutes.COMPANY_ADD_USER);
        return;
      }

      let latestTotalCount = totalCount;
      let latestUserLimit = userLimit;
      let latestInviteCount = inviteCount;

      // ✅ Update totalCount from userListResponse
      if (userListResponse) {
        latestTotalCount = userListResponse.total_count || 0;
        latestInviteCount = userListResponse.pending_invitations || 0;
        setInviteCount(latestInviteCount);
        setTotalCount(latestTotalCount);
      }
      // ✅ Update userLimit from subscriptionResponse
      let usersItem: any = null;
      // ✅ Update userLimit from subscriptionResponse
      if (subscriptionResponse?.plan_items?.length > 0) {
        usersItem = subscriptionResponse.plan_items.find(
          (item: any) => item.item_name === "Users"
        );
        if (usersItem) {
          latestUserLimit = Number(usersItem.limit_value);
          setUserLimit(latestUserLimit);
        }
      }
      // ✅ Compare total + invites against limit
      const combinedCount = latestTotalCount + latestInviteCount;

      // 🔹 Case 1: No "Users" item in plan → fallback message
      if (!usersItem) {
        setModalHeading("Upgrade Subscription");
        setModalBodyContent(
          "You need to upgrade your subscription to add multiple users to this profile."
        );
        setOpenPlanModal(true);
        return;
      }

      // 🔹 Case 2: Users item exists
      if (usersItem.limit_type === "Numeric") {
        if (usersItem.is_unlimited) {
          // ✅ Unlimited users allowed → skip validation
          router.push(AppRoutes.COMPANY_ADD_USER);
          return;
        }

        // Not unlimited → enforce numeric limit
        latestUserLimit = Number(usersItem.limit_value ?? 0);
        setUserLimit(latestUserLimit);

        if (combinedCount >= latestUserLimit) {
          setModalHeading("Upgrade Subscription");
          setModalBodyContent(
            `You already have ${latestTotalCount} active ${
              latestTotalCount === 1 ? "user" : "users"
            } and ${latestInviteCount} pending ${
              latestInviteCount === 1 ? "invitation" : "invitations"
            }.  

Your current plan supports only ${latestUserLimit} ${
              latestUserLimit === 1 ? "user" : "users"
            } in total.  

To invite or add more users to your organization, please upgrade your subscription.`
          );
          setOpenPlanModal(true);
          return;
        }
      }

      // 🔹 Case 3: Default → Allow user to proceed
      router.push(AppRoutes.COMPANY_ADD_USER);
    } catch (error) {
      console.error("Error in handleButtonClick:", error);
    } finally {
      setLoader(false);
    }
  };

  const handleConfirm = () => {
    setOpenPlanModal(false);
    // Proceed with the action
    sessionStorage.setItem(commonCookies.NAVIGATED_FROM, AppRoutes.USER_ACCESS);
    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  };

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
            activeRoute={"User Access"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Multiple User Access</h1>
          </div>
          {showAdd && (
            <div className="pt_pageactions">
              <a className="pt_addnewbutton">
                <button className="secondary" onClick={handleButtonClick}>
                  <i className="fa-light fa-hexagon-plus"></i>Add user
                </button>
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            <TabSwitch tabOptions={tabOptions} onChange={handleTabClick} />
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
            headers={columns}
            gridData={filteredData}
            gridActions={action}
            // onRowClick={handleRowClick}
            dynamicApiGridIconsKey={"userIcon"}
            showLoader={tableLoader}
            loaderColSpan={columns.length}
            renderRowList={userAccessRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
          />
        </div>
      </div>
      {openUpdateModal && (
        <BaseModal
          displayModal={openUpdateModal}
          onClose={() => setOpenUpdateModal(false)}
          secondButtonName="Yes"
          firstButtonName="Cancel"
          title="Do you wish to make this user a primary admin?"
          onConfirm={() => {
            handleMakePrimaryAdmin(actionData?.user_id);
            return true;
          }}
        >
          While you do this remember your profile permission will be changed to
          that of an admin user.
        </BaseModal>
      )}

      {openModal && (
        <BaseModal
          displayModal={openModal}
          onClose={() => setOpenModal(false)}
          secondButtonName="Yes"
          firstButtonName="Cancel"
          onConfirm={() => {
            handleDeleteFunction(actionData?.user_id);
            return true;
          }}
        >
          Are you sure you wish to delete access for this user?
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
}
