"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import FormButton from "@/components/Button/button";
import styles from "./usersList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  AdminResetUserPassword,
  AdminlistAllUsers,
  AllowAdminToLoginAsUser,
} from "./userList.functions";
import { RowsPerPageInTable } from "@/common/constants";
import { ApplicationURLS } from "@/common/applicationURLS";
import { AppModal } from "@/components/model/model";
import { AdminUpdateUser } from "../addUserDetails/addUserDetails.fucntions";
import {
  convertJsonToExcel,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import debounce from "lodash/debounce";
import CustomSubHeader from "./userCusotmHeader";
import { toast } from "react-toastify";
import { deleteCookie, setCookie } from "cookies-next";
import { CustomJwtPayload } from "@/container/userLogin/userLoginPage";
import { jwtDecode } from "jwt-decode";
import { SUPER_ADMIN_ROLE } from "@/common/constants/roles";
import { useTokenDetails } from "@/common/commonHooks";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setAppUserDetails } from "@/redux/slices/userRegistrationDetails";
import CryptoJS from "crypto-js";
import { useLoaderContext } from "@/context/useLoader";

type UserData = {
  email_id: string;
  first_name: string;
  id: string;
  last_name: string;
  user_id: string;
  user_role: string;
  user_status: string;
  user_phone_no: string;
  user_address: string;
  occupation: string;
  is_admin_contacted: boolean;
  position_title: string;
};

const UsersList = () => {
  const options = [
    { value: "", label: "All" },
    { value: "Active", label: "Active" },
    { value: "Blocked", label: "Blocked" },
    { value: "Inactive", label: "Inactive" },
  ];
  const routePath = usePathname();
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { sideBarFullView, hideSearchBarView } = useAppSelector(
    (state: RootState) => state.dashBoard
  );
  const appUserDetails: any = useAppSelector(
    (state: RootState) => state?.userDetails?.appUserDetails
  );
  const [selectedValue, setSelectedValue] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const [userData, setUserData] = useState<UserData[]>([]);
  const [search, setSearch] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [singleSelectedData, setSingleSelectedData] = useState<any>(null);
  const [actionData, setActionData] = useState<any>();
  const [popUpHeaderMsg, setPopUpHeaderMsg] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [disabledBtn, setDisabledBtn] = useState(false);
  const [password, setPassword] = useState("");
  const { loader, setLoader }: any = useLoaderContext();

  const resetFilters = () => {
    setSearch(""); // Reset search input
    setSingleSelectedData(null); // Reset the selected option
    setSelectedValue(null);
  };

  // Check if either the search input or the selected filter has been changed
  const isAnyFilterActive =
    search !== "" || singleSelectedData !== null || selectedValue !== null;
  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  useEffect(() => {
    getAdminListAllUsers(page, perPage);
  }, [debouncedSearch, selectedValue]);

  const getAdminListAllUsers = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const responseData = await AdminlistAllUsers(
      {
        page: page,
        perPage: rowsPerPage,
        keyWord: search,
        status: selectedValue,
      },
      setLoading
    );
    setUserData(responseData?.users || []);
    setTotalRows(responseData?.totalCount || 0);
    setPerPage(rowsPerPage);
  };

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue.value); // Perform any other actions based on the selected value
  };
  const handlePageChange = async (page: number) => {
    setPage(page);
    await getAdminListAllUsers(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getAdminListAllUsers(page, newPerPage);
  };
  function downloadExcel() {
    const columnNames = [
      { value: "first_name", label: "First Name" },
      { value: "last_name", label: "Last Name" },
      { value: "email_id", label: "Email ID" },
      { value: "user_role", label: "User Role" },
      { value: "position_title", label: "Position" },
      { value: "user_address", label: "User Address" },
      { value: "user_phone_no", label: "User Phone Number" },
      { value: "user_status", label: "User Status" },
    ];
    convertJsonToExcel(userData, "users list", columnNames);
  }

  const handleOptionClick = async (data: {
    id: string;
    option: string;
    name: string;
    userID?: number;
    status?: string;
    isAdminContacted?: boolean;
  }) => {
    const { id, option, name, userID, status, isAdminContacted } = data;
    setActionData(data);

    if (option === "Edit") {
      router.push(`${ApplicationURLS.ADMIN_NORMAL_USERS_EDIT}/${userID}`);
    }
    if (option === "Reset") {
      setPopUpHeaderMsg(`Do you want to reset ${name} password?`);
      setOpenModal(!openModal);
    }
    if (option === "status") {
      setPopUpHeaderMsg(
        `Do you want to ${status === "Blocked" ? "unblock" : "block"} ${name}?`
      );
      setOpenModal(!openModal);
    }
    if (option === "isAdminContacted") {
      setPopUpHeaderMsg(`Do you want change the  ${name} status?`);
      setOpenModal(!openModal);
    }
    if (option === "Login as user") {
      setPopUpHeaderMsg(`Please enter admin password`);
      setOpenModal(!openModal);
    }
  };

  const handleRowView = (userID: any) => {
    router.push(`${ApplicationURLS.ADMIN_NORMAL_USERS_EDIT}/${userID}`);
  };
  const handlePrintPDF = () => {
    let formatedTableData: any[] = userData.map((user) => [
      user.first_name,
      user.last_name,
      user.email_id,
      user.user_role,
      user.user_address,
      user.position_title,
      user.user_phone_no,
      user.user_status,
    ]);
    let headerNames: string[] = [
      "First Name",
      "Last Name",
      "Email ID",
      "User Role",
      "User Address",
      "Position",
      "User Phone Number",
      "User Status",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "users");
  };
  const handleModalPopUpFunction = async () => {
    if (actionData.option === "Login as user") {
      setLoader(true);
      const payload = {
        admin_password: password,
        user_id: actionData?.userID,
      };
      const responseData: any = await AllowAdminToLoginAsUser(payload);
      setLoader(false);
      if (responseData?.access_token) {
        const token = responseData?.access_token;
        localStorage.setItem("accessToken", token);
        localStorage.setItem("userMode", "Normal");
        setCookie("userMode", "Normal");
        localStorage.setItem("ProfileType", "User");
        setCookie("ProfileType", "User");

        const decodeTokensData: CustomJwtPayload = jwtDecode(token);
        const companySpecificRoles = decodeTokensData?.companySpecificRoles;

        if (companySpecificRoles && companySpecificRoles.length > 0) {
          const userPrivilage = companySpecificRoles.find(
            (data: any) => data?.isSystemAdded === true
          );
          if (userPrivilage) {
            localStorage.setItem("UserCompanyId", userPrivilage?.companyId);
            setCookie("UserCompanyId", userPrivilage?.companyId);
          }
        }
        const userDetails = JSON.parse(JSON.stringify(decodeTokensData));

        //changes for cookie storage issue
        const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
          JSON.stringify({
            role: userDetails?.role,
            status: userDetails?.status,
            id: userDetails?.id,
            userName: userDetails?.userName,
            userFirstName: userDetails?.userFirstName,
            userLastName: userDetails?.userLastName,
            emailId: userDetails?.emailId,
            isAdmin: userDetails?.isAdmin,
            timezone: userDetails?.timezone,
            iat: userDetails?.iat,
            exp: userDetails?.exp,
          }),
          "token-verification"
        ).toString();

        setCookie("accessVerification", userTokenDetailsForMiddleware);

        // const expireTime: any = new Date(userDetails.exp * 1000);
        // const currentTime: any = new Date(); // Current time in seconds
        // const timeDiff = expireTime - currentTime; // Remaining time until expiration in seconds

        // setCookie("accessToken", token);

        // Clear the company ID from local storage
        localStorage.removeItem("companyId");
        deleteCookie("companyId");
        dispatch(setAppUserDetails({}));

        // Check if companySpecificRoles is null
        if (
          Array.isArray(userDetails?.companySpecificRoles) &&
          userDetails?.companySpecificRoles?.length === 0
        ) {
          // Redirect to the dashboard if companySpecificRoles is null
          router.push("/user/dashboard");
          return;
        } else {
          // Redirect to choose profile if companySpecificRoles is not null
          router.push("/user/choose-profile");
          return;
        }
      } else {
        setDisabledBtn(false);
      }
      // if (responseData?.access_token) {
      //   setDisabledBtn(false);
      //   setPassword("");
      //   setOpenModal(!openModal);
      // }
      return;
    }
    setOpenModal(!openModal);
    if (actionData.option === "Reset") {
      const response = await AdminResetUserPassword(
        { id: actionData.id },
        "Password has been reset and sent to the user."
      );
      setDisabledBtn(false);
    }
    if (actionData.option === "status") {
      let payload = {
        user_status: actionData?.status === "Blocked" ? "Active" : "Blocked",
        user_id: actionData?.userID,
      };
      let msg =
        actionData?.status === "Blocked"
          ? "This user has been unblocked."
          : "This user has been blocked.";
      const response = await AdminUpdateUser(payload, msg);

      if (response) {
        setDisabledBtn(false);
        await getAdminListAllUsers(page, perPage);
      }
    }
    if (actionData.option === "isAdminContacted") {
      let payload = {
        is_admin_contacted: !actionData?.isAdminContacted,
        user_id: actionData?.userID,
      };

      let msg = actionData?.isAdminContacted
        ? "User has been marked as “Uncontacted”."
        : "User has been marked as “Contacted”.";
      const response = await AdminUpdateUser(payload, msg);
      if (response) {
        setDisabledBtn(false);
        await getAdminListAllUsers(page, perPage);
      }
    }
  };

  const columns = [
    {
      name: "User No",
      selector: (row: UserData) => row.user_id,
      grow: true,
      center: true,
      wrap: true,
    },

    {
      name: "Name",
      minWidth: "200px",
      wrap: true,
      selector: (row: UserData) =>
        row?.first_name
          ? `${row.first_name} ${row.last_name || ""}`
          : row?.last_name || "",
    },

    {
      name: "Email",
      minWidth: "200px",
      selector: (row: UserData) => row.email_id,
      wrap: true,
    },

    {
      name: "Phone Number",
      selector: (row: UserData) => row.user_phone_no,
      wrap: true,
      minWidth: "200px",
    },
    // {
    //   name: "Position",
    //   selector: (row: UserData) => row?.position_title,
    //   wrap: true,
    // },
    {
      name: "Occupation",
      selector: (row: UserData) => row?.occupation,
      wrap: true,
    },

    {
      name: "New Users",
      selector: (row: UserData) =>
        row.is_admin_contacted ? " Contacted" : "New User",
      fixed: "right",
      grow: true,
      // center: true,
    },

    {
      name: "Status",
      selector: (row: UserData) => row.user_status,
      fixed: "right",
      grow: true,
      // center: true,
    },
    {
      name: "Actions",
      fixed: "right",
      grow: true,
      center: true,
      cell: (row: UserData, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            { label: "Edit", value: "Edit" },
            {
              label: row?.is_admin_contacted
                ? "Mark as Uncontacted"
                : "Mark as Contacted ",
              value: "isAdminContacted",
            },
            {
              label: row?.user_status === "Blocked" ? "Unblock" : "Block",
              value: "status",
            },
            { label: "Reset Password", value: "Reset" },
            ...(decodeTokenData?.role === SUPER_ADMIN_ROLE
              ? [{ label: "Login as user", value: "Login as user" }]
              : []),
          ]}
          optionClick={(data) => handleOptionClick(data)}
          cellData={{
            id: row?.id,
            name: row?.first_name
              ? `${row.first_name} ${row.last_name || ""}`
              : row?.last_name || "",
            userID: row?.user_id,
            status: row?.user_status,
            isAdminContacted: row?.is_admin_contacted,
          }}
          popperConfig={{
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [20, 10], // Adjust the offset as needed
                },
              },
            ],
          }}
        >
          <div style={{ cursor: "pointer" }}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearch(inputvalue);
  }, []);

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },
          {
            href: "",
            label: "Users List",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Manage Users</span>

        <FormButton
          className={styles.buttonStyles}
          onClick={() => router.push(ApplicationURLS.ADMIN_NORMAL_USERS_ADD)}
        >
          + Add User
        </FormButton>
      </div>

      <ReusableDataTable
        columns={columns}
        data={userData}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            search={search}
            options={options}
            onInputChange={onInputChange}
            handleSelectChange={handleSelectChange}
            selectedData={singleSelectedData}
            userData={userData}
            handlePrintPDF={handlePrintPDF}
            downloadExcel={downloadExcel}
            resetFilters={resetFilters} // Pass reset function to child
            isAnyFilterActive={isAnyFilterActive} // Pass filter active state to child
          />
        }
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => handleRowView(data?.user_id)}
      />
      <AppModal
        show={openModal}
        onHide={() => {
          setOpenModal(false);
          setDisabledBtn(false);
          setPassword("");
        }}
        secondButtonLabel="Cancel"
        firstButtonLabel="Yes"
        isInputFieldEnabled={actionData?.option === "Login as user"}
        modalHeading=""
        modalBodyTitle=""
        disabled={disabledBtn}
        modalBodyContent={popUpHeaderMsg || `Do you want to reset password?`}
        onConfirm={() => {
          if (actionData?.option === "Login as user" && !password) {
            toast.warn("Please enter admin password");
            return;
          }
          handleModalPopUpFunction();
          setDisabledBtn(true);
        }}
        handlePasswordChange={(e: any) => {
          // console.log(e.target.value, "callback");
          let pwd = e?.target?.value.trim()
            ? e?.target?.value
            : e?.target?.value.trim();
          setPassword(pwd);
        }}
        disableInputField={disabledBtn}
      />
    </div>
  );
};

export default UsersList;
