"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType } from "@/shared/constant/general";
import { useFormik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import CryptoJS from "crypto-js";

import React, { useEffect, useState } from "react";
import { IUserListDetail } from "../users.types";

import {
  usersListHeaders,
  usersListPDFHeaders,
  usersRenderData,
  excelColumnNames,
  pdfDataRow,
  statusOptions,
} from "../users.constant";

import {
  AdminListAllUsers,
  AdminResetUserPassword,
  AllowAdminToLoginAsUser,
} from "../users.functions";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast, showWarningToast } from "@/components/Toaster";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import { AdminUpdateUser } from "../../AdminAddUser/adminAddUser.functions";
import { CustomJwtPayload } from "@/modules/auth/LoginForm";
import { jwtDecode } from "jwt-decode";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { useLoaderContext } from "@/context/useLoader";
import { useAppDispatch } from "@/redux/store";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { useTokenDetails } from "@/hooks";
import { Roles } from "@/shared/constant/role";
import { connectWebSocket } from "@/utils";

export default function UsersList() {
  const router = useRouter();
  const { loader, setLoader }: any = useLoaderContext();
  const dispatch = useAppDispatch();
  const { decodeTokenData } = useTokenDetails();

  const [usersListData, setUsersListData] = useState<IUserListDetail[]>([]);

  const [searchValue, setSearchValue] = useState("");

  const [statusType, setStatusType] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [actionData, setActionData] = useState<any>();
  const [popUpHeaderMsg, setPopUpHeaderMsg] = useState("");
  const [disabledBtn, setDisabledBtn] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const [emptySearchField, setEmptySearchField] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [isPWDShow, setIsPWDShow] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");

  const isAnyFilterActive = statusType !== "" || searchValue;

  const togglePasswordVisibility = () => {
    setIsPWDShow((prevState) => !prevState);
  };

  useEffect(() => {
    fetchUsersLists();
  }, [searchValue, statusType, currentPage, entriesPerPage, sortValues]);

  const validationSchema = Yup.object().shape({
    password: Yup.string().required("Password is required"),
  });

  const formik = useFormik({
    initialValues: {
      password: "",
    },
    validationSchema,
    onSubmit: async (values) => {},
  });
  // Define actions dynamically
  const currentActions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: IUserListDetail) => {
        router.push(`${AppRoutes.ADMIN_NORMAL_USERS_EDIT}/${row?.user_id}`);
      },
      displayByDefault: true,
    },
    {
      label: "Mark as contacted ",
      icon: "fa-light fa-message-check",
      onClick: (row: IUserListDetail) => {
        setActionData({
          ...row,
          option: "isAdminContacted",
          status: row?.user_status,
          isAdminContacted: row?.is_admin_contacted,
          userId: row?.user_id,
        });

        setPopUpHeaderMsg(`Do you want change the  ${row?.first_name} status?`);
        setOpenModal(!openModal);
      },
      conditionalApiDisplayKey: "contacted",
    },
    {
      label: "Mark as uncontacted ",
      icon: "fa-light fa-message-xmark",
      onClick: (row: IUserListDetail) => {
        setActionData({
          ...row,
          option: "isAdminContacted",
          status: row?.user_status,
          isAdminContacted: row?.is_admin_contacted,
          userId: row?.user_id,
        });

        setPopUpHeaderMsg(`Do you want change the  ${row?.first_name} status?`);
        setOpenModal(!openModal);
      },
      conditionalApiDisplayKey: "uncontacted",
    },
    {
      label: "Block",
      icon: "fa-light fa-user-slash",
      onClick: (row: IUserListDetail) => {
        setActionData({
          ...row,
          option: "status",
          status: row?.user_status,
          userId: row?.user_id,
        });

        setPopUpHeaderMsg(
          `Do you want to ${
            row?.user_status === "Blocked" ? "unblock" : "block"
          } ${row?.first_name}?`
        );
        setOpenModal(!openModal);
      },
      conditionalApiDisplayKey: "block",
    },
    {
      label: "Unblock",
      icon: "fa-light fa-user-check",
      onClick: (row: IUserListDetail) => {
        setActionData({
          ...row,
          option: "status",
          status: row?.user_status,
          userId: row?.user_id,
        });

        setPopUpHeaderMsg(
          `Do you want to ${
            row?.user_status === "Blocked" ? "unblock" : "block"
          } ${row?.first_name}?`
        );
        setOpenModal(!openModal);
      },
      conditionalApiDisplayKey: "unblock",
    },
    {
      label: "Reset password",
      icon: "fa-light fa-user-lock",
      onClick: (row: IUserListDetail) => {
        setActionData({ ...row, option: "Reset" });
        setPopUpHeaderMsg(`Do you want to reset ${row?.first_name} password?`);
        setOpenModal(!openModal);
      },
      displayByDefault: true,
    },
    ...(decodeTokenData?.role === Roles.SUPER_ADMIN_ROLE
      ? [
          {
            label: "Login as user",
            icon: "fa-light fa-people-arrows",
            onClick: (row: IUserListDetail) => {
              setActionData({
                ...row,
                option: "Login as user",
                userId: row?.user_id,
              });

              setPopUpHeaderMsg(`Please enter admin password`);
              setOpenModal(!openModal);
            },
            // conditionalApiDisplayKey: "loginasuser",
            displayByDefault: true,
          },
        ]
      : []),
  ];

  // Row click handler
  const handleRowClick = (row: IUserListDetail) => {
    router.push(`${AppRoutes.ADMIN_NORMAL_USERS_EDIT}/${row?.user_id}`);
  };

  async function fetchUsersLists() {
    try {
      if (emptySearchField) {
        setEmptySearchField(false);
      }
      setTableLoader(true);
      const payload = {
        page: currentPage,
        perPage: entriesPerPage,
        keyWord: searchValue,
        status: statusType === "All" ? "" : statusType,
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      };

      const response = await AdminListAllUsers(payload);

      if (response?.users?.length > 0) {
        const modifiedGridData = response?.users.map((listObj: any) => {
          return {
            ...listObj,
            is_admin_contacted_modified: listObj?.is_admin_contacted
              ? " Contacted"
              : "New User",
            manageusers_list_icons: {
              loginasuser: listObj?.user_status !== "Blocked",
              contacted: !listObj?.is_admin_contacted,
              uncontacted: listObj?.is_admin_contacted,
              block: listObj?.user_status !== "Blocked",
              unblock: listObj?.user_status === "Blocked",
            },
          };
        });

        setUsersListData(modifiedGridData);
      } else {
        setUsersListData([]);
      }

      setTotalRows(response?.totalCount || 0);
    } catch {
    } finally {
      setTableLoader(false);
    }
  }

  const handleResetFilters = () => {
    setStatusType("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "user",
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

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "user",
        keyword: searchValue,
        status: statusType === "All" ? "" : statusType,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  // Function to save admin session data
  const saveAdminSession = () => {
    const adminToken = localStorage.getItem("accessToken");
    const adminAccessVerification = getCookie("accessVerification");

    if (adminToken && adminAccessVerification) {
      sessionStorage.setItem(
        "adminSession",
        JSON.stringify({
          accessToken: adminToken,
          accessVerification: adminAccessVerification,
        })
      );
    }
  };

  const handleModalPopUpFunction = async () => {
    try {
      if (actionData.option === "Login as user") {
        setLoader(true);
        const payload = {
          admin_password: formik.values.password,
          user_id: actionData?.userId,
        };
        const responseData = await AllowAdminToLoginAsUser(payload);
        setLoader(false);

        if (responseData?.access_token) {
          // Save admin session and set tokens
          saveAdminSession();
          const token = responseData.access_token;
          localStorage.setItem("accessToken", token);
          localStorage.setItem("userMode", "Normal");
          setCookie("userMode", "Normal");
          localStorage.setItem("ProfileType", "User");
          setCookie("ProfileType", "User");

          const decodeTokensData: CustomJwtPayload = jwtDecode(token);
          const companySpecificRoles = decodeTokensData?.companySpecificRoles;

          if (companySpecificRoles && companySpecificRoles.length > 0) {
            const userPrivilege = companySpecificRoles.find(
              (data: any) => data?.isSystemAdded === true
            );
            if (userPrivilege) {
              localStorage.setItem("UserCompanyId", userPrivilege?.companyId);
              setCookie("UserCompanyId", userPrivilege?.companyId);
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

          // Clear the company ID from local storage
          localStorage.removeItem("companyId");
          deleteCookie("companyId");
          dispatch(setAppUserDetails({}));
          formik.setFieldValue("password", "");

          // Redirect based on companySpecificRoles
          if (
            Array.isArray(userDetails?.companySpecificRoles) &&
            userDetails?.companySpecificRoles?.length === 0
          ) {
            router.push(AppRoutes.USER_DASHBOARD);
            return { msg: "", isReturn: true, isLogin: true };
          } else {
            router.push(AppRoutes.USER_SELECT_PROFILE);
            return { msg: "", isReturn: true, isLogin: true };
          }
        } else {
          setDisabledBtn(false);
          return { msg: responseData, isReturn: false, isLogin: false };
        }
      }

      setOpenModal(!openModal);

      if (actionData.option === "Reset") {
        const response = await AdminResetUserPassword(
          { id: actionData.id },
          "Password has been reset and sent to the user."
        );
        if (response) {
          setDisabledBtn(false);
          await fetchUsersLists();
        }
        return { msg: "", isReturn: true, isLogin: false };
      }

      if (actionData.option === "status") {
        const payload = {
          user_status: actionData?.status === "Blocked" ? "Active" : "Blocked",
          user_id: actionData?.userId,
        };
        const msg =
          actionData?.status === "Blocked"
            ? "User has been unblocked."
            : "User has been blocked.";
        const response = await AdminUpdateUser(payload, msg);

        if (response) {
          setDisabledBtn(false);
          await fetchUsersLists();
        }
        return { msg: "", isReturn: true, isLogin: false };
      }

      if (actionData.option === "isAdminContacted") {
        const payload = {
          is_admin_contacted: !actionData?.isAdminContacted,
          user_id: actionData?.userId,
        };

        const msg = actionData?.isAdminContacted
          ? "User has been marked as “Uncontacted”."
          : "User has been marked as “Contacted”.";
        const response = await AdminUpdateUser(payload, msg);
        if (response) {
          setDisabledBtn(false);
          await fetchUsersLists();
        }
        return { msg: "", isReturn: true, isLogin: false };
      }
    } catch (error) {
      console.error("Error in handleModalPopUpFunction:", error);
      setLoader(false);
      setDisabledBtn(false);
      return {
        msg: "An error occurred. Please try again.",
        isReturn: false,
        isLogin: false,
      };
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
            activeRoute={"Manage users"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Manage users</h1>
          </div>
          <div className="pt_pageactions">
            <Link
              href={AppRoutes.ADMIN_NORMAL_USERS_ADD}
              passHref
              legacyBehavior
            >
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add user
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
                excelFile={{
                  sheetName: "users list",
                  tableData: usersListData,
                  LabelAndValueKey: excelColumnNames,
                }}
                pdfFile={{
                  fileName: "users list",
                  headerRow: usersListPDFHeaders,
                  tableData: usersListData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={usersListData.length > 0 ? false : true}
                hidePdfButton={usersListData.length > 0 ? false : true}
                hideResetButton={!isAnyFilterActive}
                handleDownloadExcelFile={() => {
                  handleDownloadExcelFile();
                }}
                disabledOnExcel={disableExcelBtn}
                exportFromAPI={true}
                handleDownloadPrintPDF={() => {
                  handleDownloadPdfFile();
                }}
                disabledPDF={disableExcelBtn}
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
            headers={usersListHeaders}
            gridData={usersListData?.length > 0 ? usersListData : []}
            gridActions={currentActions}
            onRowClick={handleRowClick}
            dynamicApiGridIconsKey={"manageusers_list_icons"}
            showLoader={tableLoader}
            loaderColSpan={11}
            renderRowList={usersRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            hoverOnRowClick
            onSortChange={(sortConfig) => {
              if (usersListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
      {openModal && (
        <BaseModal
          modalId="resetPasswordModal"
          displayModal={openModal}
          onClose={() => {
            setOpenModal(false);
            setDisabledBtn(false);
            formik.resetForm();
            formik.setFieldValue("password", "");
          }}
          onConfirm={async () => {
            if (
              actionData?.option === "Login as user" &&
              !formik.values.password
            ) {
              // showWarningToast("Please enter admin password");
              formik.handleSubmit();

              return false; // Prevent closing if validation fails.
            }
            const isreturntrue = await handleModalPopUpFunction();

            if (!isreturntrue?.isReturn) {
              formik.setFieldError("password", isreturntrue?.msg);
              setDisabledBtn(true);
              return false;
            }
            if (isreturntrue?.isLogin) {
              router.push(AppRoutes.USER_SELECT_PROFILE);
            }

            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Yes"
        >
          {/* Modal heading can be placed here if needed */}
          <div className="text_center">
            {popUpHeaderMsg || "Do you want to reset password?"}
          </div>
          {actionData?.option === "Login as user" && (
            // <div style={{ marginTop: "1rem" }}>
            //   <input
            //     type="password"
            //     placeholder="Enter admin password"
            //     value={password}
            //     onChange={(e) => {
            //       // Trim the password value and update state.
            //       let pwd = e?.target?.value.trim()
            //         ? e?.target?.value
            //         : e?.target?.value.trim();
            //       setPassword(pwd);
            //     }}
            //     disabled={disabledBtn}
            //     style={{ width: "100%", padding: "0.5rem" }}
            //   />
            // </div>
            <>
              <div
                className="passwordInputWrapper"
                style={{ marginTop: "1rem" }}
              >
                <input
                  style={{ margin: "0px" }}
                  type={isPWDShow ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Password"
                  required
                  maxLength={16}
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={
                    formik.touched.password && formik.errors.password
                      ? "invalid-borders" // Apply red border if there’s an error
                      : "" // No border if valid
                  }
                />
                <i
                  className={
                    isPWDShow
                      ? "fa-sharp fa-light fa-eye"
                      : "fa-light fa-eye-slash"
                  }
                  onClick={togglePasswordVisibility}
                ></i>
              </div>

              {formik.errors.password && formik.touched.password && (
                <small className="invalid">
                  <i className="fa-light fa-circle-xmark"></i>
                  {formik.errors.password}
                </small>
              )}
            </>
          )}
        </BaseModal>
      )}
    </div>
  );
}
