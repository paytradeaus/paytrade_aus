"use client";
import React, { useCallback, useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import styles from "./userReceivedInvitationPage.module.scss";
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
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { getCookie } from "cookies-next";
import { useTokenDetails } from "@/common/commonHooks";

const UserRecivedInvitationPage = () => {
  const routePath = usePathname();
  const router = useRouter();
  const UserType = getCookie("ProfileType");

  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [userData, setUserData] = useState<InvitationItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterData, setFilterData] = useState<InvitationItem[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [admin, setAdmin] = useState<any>();

  const [activeTab, setActiveTab] = useState("Requests");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const { accessTokenId, decodeTokenData } = useTokenDetails();

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
    setLoading(true);
    // console.log("🚀 ~ getUsersInvitationList ~ UserType:", UserType);

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
    setLoading(false);
    // Admin-specific logic
  };

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

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value.trim();
    setSearch(inputvalue || e.target.value);
  }, []);

  const columns = [
    {
      name: "Name",
      selector: (row: InvitationItem) => row.user_name || "",
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
      name: "Action",
      cell: (row: InvitationItem) => (
        <Overlays
          trigger="click"
          placement="bottom-end"
          overlay={<span></span>}
          popoverTypes="invitationList"
          customPopupstyles={styles.customPopupstyles}
          optionClick={(data) => handleOptionClick(data)}
          cellData={{ id: row.id, name: row.user_name || "" }}
          popperConfig={{
            modifiers: [{ name: "offset", options: { offset: [20, 10] } }],
          }}
        >
          <div className={styles.dotsContainer}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
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
          {
            href: CompanyURLS.COMPANY_RECIVED_REQUESTS,
            label: "Requests",
            active: routePath === CompanyURLS.COMPANY_RECIVED_REQUESTS,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Requests</span>
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
        paginationServer
        paginationTotalRows={totalRows}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="Cancel"
        modalBodyContent="Do you want to Decline the Invitation?"
        onConfirm={handleDeleteFunction}
      />
    </div>
  );
};

export default UserRecivedInvitationPage;
