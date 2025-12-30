"use client";

import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { Printer, Share, ThreeDots } from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import styles from "./multipleUserAccessPage.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { format } from "date-fns";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import { UserType, getUserListsForCompany } from "@/app/api/LoginServices";
import { CompanyURLS } from "@/common/companyURLS";
import TabContainer from "../addGroups/tabsContainer";
import {
  deleteUserFromCompany,
  updatePrimaryAdmin,
} from "@/app/api/CompanyRegistrationServices";
import { useTokenDetails } from "@/common/commonHooks";
import { ApplicationURLS } from "@/common/applicationURLS";
import { clearALLCookies } from "@/common/commonFunctions";
import { commonCookies } from "@/common/constants/general";
import { getCookie } from "cookies-next";

const MultipleUserAccessPage = () => {
  const routePath = usePathname();
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [planName, setPlanName] = useState<string>();
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");

  const [userData, setUserData] = useState<UserType[]>([]);
  const [search, setSearch] = useState("");
  const [filterData, setFilterData] = useState<UserType[]>([]);
  const [singleSelectedData, setSingleSelectedData] = useState();
  const [openPlanModal, setOpenPlanModal] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [activeTab, setActiveTab] = useState("User Access");
  const [companyId, setCompanyId] = useState<number | null>(null);

  const { decodeTokenData } = useTokenDetails();
  const roleDetails = decodeTokenData?.companySpecificRoles?.filter(
    (x: { companyId: number }) => String(x.companyId) === String(companyId)
  );
  const [roleAccess, setRoleAccess] = useState<any>(
    roleDetails?.length > 0 ? roleDetails?.[0] : {}
  );
  const storedProfileType = getCookie("ProfileType");

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
      getUserAccessListsForCompany(1, perPage);
    } else {
      console.log("companyId is null. Waiting for it to be set...");
    }
  }, [companyId, perPage]);

  useEffect(() => {
    // Check if decodeTokenData and companyId are available
    if (decodeTokenData && companyId) {
      // Filter to get the relevant company-specific role based on companyId
      const newData = decodeTokenData?.companySpecificRoles?.filter(
        (x: { companyId: number }) => String(x.companyId) === String(companyId)
      );

      // Check if the company role exists and contains subscription data
      const subscription = newData?.length > 0 ? newData[0].subscription : null;

      // Set the plan name from the subscription or default to "No plan"
      const planName = subscription?.plan_name;

      console.log("Plan Name:", planName);
      setRoleAccess(newData?.length > 0 ? newData[0] : {});
      setPlanName(planName); // Assuming setPlanName exists to store the plan name
    }
  }, [companyId]);

  useEffect(() => {
    if (search.length > 2) {
      getUserAccessListsForCompany(page, perPage);
    } else if (search.length === 0) {
      getUserAccessListsForCompany(1, perPage);
    }
  }, [search]);

  useEffect(() => {
    if (selectedValue) {
      getUserAccessListsForCompany(page, perPage);
    }
  }, [selectedValue]);

  const getUserAccessListsForCompany = async (
    page: number,
    rowsPerPage: number
  ) => {
    if (companyId === null) {
      return;
    }
    setLoading(true);
    try {
      const response = await getUserListsForCompany({
        companyId: companyId,
        pageNumber: page,
        pageSize: rowsPerPage,
        search: search.length > 2 ? search : "",
      });
      setUserData(response.user_list || []);
      setFilterData(response.user_list || []);
      setTotalRows(response.total_count || 0);
    } catch (error) {
      console.error("Error fetching user lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab !== tabId) {
      setActiveTab(tabId);
      switch (tabId) {
        case "User Access":
          router.push("/company/user-access");
          break;
        case "Invitations":
          router.push("/company/invitations");
          break;
        case "Requests":
          router.push("/company/received-requests");
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
  ];

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
      await getUserAccessListsForCompany(page, perPage);
      if (updatePrimaryResponce) {
        localStorage.clear();
        clearALLCookies();
        router.push(ApplicationURLS.USER_LOGIN);
      }
    } catch (error) {
      console.error("Error updating primary admin:", error);
    }
  };

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
      // Open the new modal
      setOpenUpdateModal(true);
    } else if (option === "Delete") {
      setOpenModal(true);
    }
    if (option === "Edit") {
      router.push(`${CompanyURLS.COMPANY_EDIT_USER}/${email}`);
    }
  };

  const handleDeleteFunction = async (user_id: string) => {
    setOpenModal(false); // Close the modal
    try {
      await deleteUserFromCompany(companyId, Number(user_id)); // Call deleteUserFromCompany service with user_id
      await getUserAccessListsForCompany(page, perPage); // Refresh user list after deletion
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getUserAccessListsForCompany(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getUserAccessListsForCompany(page, newPerPage);
  };

  const handleButtonClick = () => {
    if (planName === "Basic") {
      setModalHeading("Upgrade Subscription");
      setModalBodyContent(
        "You need to upgrade your subscription to add multiple users to this profile."
      );
      setOpenPlanModal(true);
    } else {
      router.push(CompanyURLS.COMPANY_ADD_USER);
    }
  };

  const handleConfirm = () => {
    setOpenPlanModal(false);
    // Proceed with the action
    sessionStorage.setItem(
      commonCookies.NAVIGATED_FROM,
      CompanyURLS.MULTIPLE_USERS_ACCESS
    );
    router.push(ApplicationURLS.USER_SUBSCRIPTION_UPGRADE);
  };

  const handleCancel = () => {
    setOpenPlanModal(false);
    // Handle the cancel action if needed
  };

  const popoverActions = [
    { label: "Edit", value: "Edit" },
    { label: "Delete", value: "Delete" },
  ];

  if (roleAccess?.role !== "ADMIN" && roleAccess?.role !== "STANDARD USER") {
    popoverActions.unshift({
      label: "Make Primary Admin",
      value: "Make Primary Admin",
    });
  }

  const optionCol = [
    {
      name: "Actions",
      cell: (row: UserType) => {
        // Check if the user type is primary admin
        if (row.user_type === "PRIMARY ADMIN") {
          return null; // Return null if user type is primary admin
        }
        if (roleAccess?.role === "STANDARD USER" && row.user_type === "ADMIN") {
          return null;
        }
        // Render the ThreeDots icon if user type is not primary admin
        return (
          <Overlays
            trigger="click"
            placement="bottom-end"
            overlay={<span />}
            popoverTypes={"tableActions"}
            popoverActions={popoverActions}
            customPopupstyles={styles.customPopupstyles}
            optionClick={(data) =>
              handleOptionClick({
                ...data,
                user_id: row.user_id,
                email: row?.email_id,
              })
            } // Pass user_id
            cellData={{
              id: row.id,
              name: row.user_name ? `${row.user_name} ` : "",
              emailId: row?.email_id || "",
              user_type: row.user_type, // Include user_type
            }}
            popperConfig={{
              modifiers: [
                {
                  name: "offset",
                  options: {
                    offset: [20, 10],
                  },
                },
              ],
            }}
          >
            <div className={styles.dotsContainer}>
              <ThreeDots />
            </div>
          </Overlays>
        );
      },
    },
  ];
  const otherCols = [
    { name: "Name", selector: (row: UserType) => row?.user_name || "" },
    { name: "Email", selector: (row: UserType) => row.email_id, wrap: true },
    { name: "User Type", selector: (row: UserType) => row.user_type },
    { name: "Status", selector: (row: UserType) => row.status },
    {
      name: "Date Added",
      selector: (row: UserType) =>
        row.date_added ? format(new Date(row.date_added), "dd/MM/yyyy") : "N/A",
    },
  ];
  const columns =
    roleAccess?.manageUser !== "No" && roleAccess?.manageUser !== "View Only"
      ? [...otherCols, ...optionCol]
      : otherCols;

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearch(inputvalue);
  }, []);

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <TextField
          placeholder="Search by Name"
          value={search}
          onChange={onInputChange}
          type="text"
          autoFocus
          className={styles.textFieldStyles}
        />
      </div>
    </div>
  );

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: CompanyURLS.USER_DASHBOARD,
            label: "Home",
            active: routePath === CompanyURLS.USER_DASHBOARD,
          },
          {
            href: CompanyURLS.MULTIPLE_USERS_ACCESS,
            label: "User Access",
            active: routePath === CompanyURLS.MULTIPLE_USERS_ACCESS,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Multiple User Access</span>
        {companyId !== null && storedProfileType !== "User" && (
          <FormButton
            className={styles.buttonStyles}
            onClick={handleButtonClick}
          >
            + Add User
          </FormButton>
        )}
      </div>
      <TabContainer
        tabs={tabs}
        activeTab={activeTab}
        onTabClick={handleTabClick}
      />

      <ReusableDataTable
        columns={columns}
        data={filterData}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
      />

      <AppModal
        show={openUpdateModal}
        onHide={() => setOpenUpdateModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="Cancel"
        modalTitleStyle={styles.UpdateModalTitle}
        modalHeading="Do you wish to make this user a primary admin?"
        modalBodyContent={`While you do this remember your profile permission will be
        changed to that of an admin user.`}
        onConfirm={() => handleMakePrimaryAdmin(actionData?.user_id)}
      />

      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="Cancel"
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent={
          "Are you sure you wish to delete access for this user?"
        }
        onConfirm={() => handleDeleteFunction(actionData?.user_id)}
      />
      <AppModal
        show={openPlanModal}
        onHide={handleCancel}
        firstButtonLabel="Upgrade Now"
        secondButtonLabel="Cancel"
        modalHeading={modalHeading}
        modalBodyTitle=""
        modalBodyContent={modalBodyContent}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default MultipleUserAccessPage;
