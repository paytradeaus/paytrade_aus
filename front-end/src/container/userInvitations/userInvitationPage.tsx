"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { Printer, Share, ThreeDots } from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import styles from "./userInvitationPage.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import { CompanyURLS } from "@/common/companyURLS";
import {
  InvitationItem,
  getInvitationListsForCompany,
  updateAcceptOrDecline,
} from "@/app/api/CompanyRegistrationServices";
import TabContainer from "../addGroups/tabsContainer";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import { getCookie } from "cookies-next";
import { useTokenDetails } from "@/common/commonHooks";

const UserInvitationPage = () => {
  const routePath = usePathname();
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);

  const UserType = getCookie("ProfileType");

  const [userData, setUserData] = useState<InvitationItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterData, setFilterData] = useState<InvitationItem[]>([]);
  const [singleSelectedData, setSingleSelectedData] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [activeTab, setActiveTab] = useState("Invitations"); // Set the default active tab
  const [companyId, setCompanyId] = useState<number | null>(null);
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [admin, setAdmin] = useState<any>();

  useEffect(() => {
    // Fetch company ID from local storage
    const storedCompanyId = localStorage.getItem("companyId");
    if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
    }
  }, []);

  useEffect(() => {
    if (userData.length > 0 && decodeTokenData?.companySpecificRoles) {
      const companySpecificRoles = decodeTokenData.companySpecificRoles;

      // Check if user is admin for any of the invitations
      const isAdmin = userData.some((invitation) => {
        return companySpecificRoles.some((company: any) => {
          return (
            Number(company?.companyId) === Number(invitation.company_id) &&
            (company?.role === "PRIMARY ADMIN" || company?.role === "ADMIN")
          );
        });
      });

      setAdmin(isAdmin);
      console.log("🚀 ~ useEffect ~ isAdmin:", isAdmin);
    }
  }, [userData, decodeTokenData]);

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearch(inputvalue);
  }, []);

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    }

    // Update the route based on the selected tab
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
      // Handle other tabs as needed
    }

    setActiveTab(tabId);
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

  const renderTabSwitch = () => {
    switch (activeTab) {
      case "User Access":
        return "";
      case "Invitations":
        return "";
      case "Requests":
        return null;
      default:
        return <></>;
    }
  };

  const getUsersInvitationList = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    if (companyId === null) {
      return;
    }
    const UserInvitaionList = await getInvitationListsForCompany(
      {
        companyId: UserType === "User" ? null : companyId, // Make sure you have companyId defined
        pageNumber: page,
        pageSize: perPage,
        type: "Sent", // Corrected to use lowercase 'type'
        search: search.length > 2 ? search : "",
      }
      // setLoading
    );
    const responseData = JSON.parse(JSON.stringify(UserInvitaionList));
    setUserData(responseData?.invitation_list || []);
    setFilterData(responseData?.invitation_list || []);
    setTotalRows(responseData?.totalCount || 0);
    setPerPage(rowsPerPage);
  };

  useEffect(() => {
    if (companyId !== null) {
      getUsersInvitationList(1, perPage);
    } else {
      console.log("companyId is null. Waiting for it to be set...");
    }
  }, [companyId, perPage]);

  useEffect(() => {
    if (search.length > 2 || selectedValue) {
      getUsersInvitationList(page, perPage);
    } else if (search.length === 0) {
      getUsersInvitationList(1, perPage);
    }
  }, [search, selectedValue]);

  // const handleOptionClick = async (data: { id: string; option: string }) => {
  //   const { id, option } = data;
  //   setActionData(data);

  //   if (option === "Decline") {
  //     setOpenModal(!openModal);
  //   } else if (option === "Accept") {
  //     try {
  //       const invitation = filterData.find((item) => item.id === id); // Find the invitation item by ID
  //       if (invitation) {
  //         const { email_id, user_id } = invitation;
  //         const response = await updateAcceptOrDecline(
  //           companyId,
  //           admin,
  //           "Accept",
  //           email_id,
  //           user_id,
  //           "You have accepted this invite."
  //         );
  //         if (response) {
  //           // Refresh invitation list after deletion
  //           await getUsersInvitationList(page, perPage);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error accepting invitation:", error);
  //     }
  //   } else if (option === "Decline") {
  //     try {
  //       const invitation = filterData.find((item) => item.id === id); // Find the invitation item by ID
  //       if (invitation) {
  //         const { email_id, user_id } = invitation;
  //         const response = await updateAcceptOrDecline(
  //           companyId,
  //           admin,
  //           "Decline",
  //           email_id,
  //           user_id,
  //           "You have declined this invite."
  //         );
  //       }
  //     } catch (error) {
  //       console.error("Error declining invitation:", error);
  //     }
  //   }
  // };

  const handleDeleteFunction = async () => {
    setOpenModal(false); // Close the modal
    try {
      const invitation = filterData.find((item) => item.id === actionData.id); // Find the invitation item by ID
      if (invitation) {
        const { email_id, user_id, company_id } = invitation; // Extract the email ID and user ID

        // Determine if the user is an admin based on the invitation and companySpecificRoles
        const IsAdminTrue = decodeTokenData?.companySpecificRoles?.some(
          (company: any) => {
            return (
              Number(company?.companyId) === Number(company_id) &&
              (company?.role === "PRIMARY ADMIN" ||
                company?.role === "ADMIN") &&
              company?.status === "Active"
            );
          }
        );
        const response = await updateAcceptOrDecline(
          companyId,
          IsAdminTrue,
          "Decline",
          email_id,
          user_id,
          "You have declined this invite."
        );
        if (response) {
          // Refresh invitation list after deletion
          await getUsersInvitationList(page, perPage);
        }
      }
    } catch (error) {
      console.error("Error declining invitation:", error);
    }
  };

  const columns = [
    {
      name: "Name",
      selector: (row: InvitationItem) =>
        row?.user_name ? `${row.user_name}` : "",
    },

    {
      name: "Business Name",
      selector: (row: InvitationItem) =>
        row?.user_name ? `${row.company_name}` : "",
    },

    {
      name: "Email",
      selector: (row: InvitationItem) => row.email_id,
      wrap: true,
    },

    {
      name: "User Action",
      selector: (row: InvitationItem) => row.user_action,
      width: "100px",
      center: true,
      cell: (row: InvitationItem) => {
        let userAction = row.user_action;

        // Map "Accept" to "Accepted" and "Decline" to "Declined"
        if (userAction === "Accept") {
          userAction = "Accepted";
        } else if (userAction === "Decline") {
          userAction = "Declined";
        }

        let color = "";
        if (userAction === "Accepted") {
          color = "green"; // Set color to green for "Accepted"
        } else if (userAction === "Declined") {
          color = "red"; // Set color to red for "Declined"
        }

        return (
          <span style={{ color: color }}>
            {userAction || ""}{" "}
            {/* Show the value or an empty string if undefined */}
          </span>
        );
      },
    },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <TextField
          placeholder="Filter by Name"
          value={search}
          onChange={onInputChange}
          type="text"
          autoFocus
          className={styles.textFieldStyles}
        />
        {/* <SearchableSelect
          options={options}
          onChange={handleSelectChange}
          disabled={false}
          placeholder="Status"
          selectedData={singleSelectedData}
        /> */}
      </div>
      <div className={styles.headerIconCon}>
        <span>{/* <Printer /> */}</span>
        <span>{/* <Share /> */}</span>
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
          {
            href: CompanyURLS.COMPANY_INVITATIONS,
            label: "Invitations",
            active: routePath === CompanyURLS.COMPANY_INVITATIONS,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Invitations</span>
      </div>
      <TabContainer
        tabs={tabs} // Your array of tabs
        activeTab={activeTab}
        onTabClick={handleTabClick}
      />
      {renderTabSwitch()}
      {/* {userData && userData.length > 0 ? ( */}
      <ReusableDataTable
        columns={columns}
        data={filterData}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        // progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        // onChangeRowsPerPage={handlePerRowsChange}
        // onChangePage={handlePageChange}
      />
      {/* ) : (
        <div>No invitations available</div>
      )} */}
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="Cancel"
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent={`Do you want to Decline the Invitaion?`}
        onConfirm={() => {
          handleDeleteFunction();
        }}
      />
    </div>
  );
};

export default UserInvitationPage;
