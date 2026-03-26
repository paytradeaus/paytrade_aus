"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType, NA } from "@/shared/constant/general";
import { useFormik } from "formik";
import * as Yup from "yup";
import CryptoJS from "crypto-js";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import { IBusinessListDetail } from "../adminBusinessProfiles.types";
import { connectWebSocket, formatDate } from "@/utils";
import {
  AdminDeleteCompany,
  AdminGetCompanyDependencies,
  AdminListAllCompanies,
  AdminListSubscriptionPlans,
  subscriptionUpdateByAdmin,
} from "../adminBusinessProfiles.functions";
import {
  businessListHeaders,
  businessListPDFHeaders,
  businessRenderData,
  excelColumnNames,
  pdfDataRow,
  statusOptions,
} from "../adminBusinessProfiles.constant";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { useRouter } from "next/navigation";
import { useLoaderContext } from "@/context/useLoader";
import { AllowAdminToLoginAsUser } from "../../Users/users.functions";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { CustomJwtPayload } from "../../AdminLoginForm";
import { jwtDecode } from "jwt-decode";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { useAppDispatch } from "@/redux/store";
import BaseModal from "@/components/BaseModal";
import {
  AdminUpdateCompany,
  UpdateBusinessFreeAccess,
} from "../AddBusinessProfiles/AddBusinessProfile.function";
import { Roles } from "@/shared/constant/role";
import { useTokenDetails } from "@/hooks";

export default function BusinessProfilesList() {
  const [businessListData, setBusinessListData] = useState<
    IBusinessListDetail[]
  >([]);

  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();
  const [statusType, setStatusType] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [freePlanModel, setFreePlanModal] = useState(false);
  const [singleselectedPlan, setSingleSelectedPlan] = useState<string | null>(
    null
  );

  const dispatch = useAppDispatch();

  const { loader, setLoader }: any = useLoaderContext();
  const { decodeTokenData } = useTokenDetails();

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const handlePlanChange = (plan: any) => {
    setSingleSelectedPlan(plan);
    setSelectedPlan(plan);
  };
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planOptions, setPlanOptions] = useState([{ value: "", label: "All" }]);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [actionData, setActionData] = useState<any>();
  const [popUpHeaderMsg, setPopUpHeaderMsg] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [dependencyData, setDependencyData] = useState<any>(null);
  const [dependencyLoading, setDependencyLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isAnyFilterActive =
    statusType !== "" ||
    searchValue !== "" ||
    selectedPlan !== null ||
    singleselectedPlan !== null;
  useEffect(() => {
    getSubscriptionPlans();
  }, []);

  const togglePasswordVisibility = () => {
    setIsPWDShow((prevState) => !prevState);
  };

  useEffect(() => {
    getAdminListAllCompanies(currentPage, entriesPerPage);
  }, [
    searchValue,
    statusType,
    currentPage,
    entriesPerPage,
    selectedPlan,
    sortValues,
  ]);

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
      onClick: (row: IBusinessListDetail) => {
        router.push(`${AppRoutes.ADMIN_BUSINESS_EDIT}/${row?.company_id}`);
      },
      displayByDefault: true,
    },
    {
      label: "Block",
      icon: "fa-light fa-ban",
      onClick: (row: IBusinessListDetail) => {
        console.log("Withdrawing from row:", row);
        setActionData({
          ...row,
          option: "status",
        });

        setPopUpHeaderMsg(
          `Do you want change the  ${row?.company_name} status?`
        );
        setOpenModal(!openModal);
      },
      conditionalApiDisplayKey: "block",
    },
    {
      label: "Unblock",
      icon: "fa-light fa-check-circle",
      onClick: (row: IBusinessListDetail) => {
        console.log("Withdrawing from row:", row);
        setActionData({
          ...row,
          option: "status",
        });

        setPopUpHeaderMsg(
          `Do you want change the  ${row?.company_name} status?`
        );
        setOpenModal(!openModal);
      },
      conditionalApiDisplayKey: "unblock",
    },
    {
      label: "Allow update subscription",
      icon: "fa-light fa-arrow-down-up-lock",
      onClick: (row: IBusinessListDetail) => {
        console.log("Claiming for row:", row);
        setActionData({
          ...row,
          option: "Update",
        });

        setPopUpHeaderMsg(
          `Do you want to allow updating the subscription for ${row?.company_name}?`
        );
        setOpenModal(!openModal);
      },
      displayByDefault: true,
    },

    {
      label: "Access profile",
      icon: "fa-light fa-id-card",
      onClick: (row: IBusinessListDetail) => {
        console.log("Claiming for row:", row);
        setActionData({
          ...row,
          option: "Access Profile",
        });
        setPopUpHeaderMsg(`Please enter admin password`);
        setOpenModal(!openModal);
      },
      conditionalApiDisplayKey: "allowaccess",
    },
    {
      label: "Enable Free Premium Access",
      icon: "fa-light fa-badge-check",
      onClick: (row: IBusinessListDetail) => {
        setActionData({
          ...row,
        });

        setPopUpHeaderMsg(
          "Are you sure you want to make this business profile eligible for the free premium access?"
        );
        setFreePlanModal(true);
      },
      conditionalApiDisplayKey: "allowfreeplan",
    },
    {
      label: "Disable Free Premium Access",
      icon: "fa-light fa-circle-xmark",
      style: "primary",
      onClick: (row: IBusinessListDetail) => {
        setActionData({
          ...row,
        });

        setPopUpHeaderMsg(
          "Are you sure you want to remove free premium access from this business profile?"
        );
        setFreePlanModal(true);
      },
      conditionalApiDisplayKey: "freeplanallowed",
    },
    {
      label: "Delete",
      icon: "fa-light fa-trash-can",
      style: "danger",
      onClick: async (row: IBusinessListDetail) => {
        setDeleteTarget(row);
        setDependencyLoading(true);
        setDeleteModalOpen(true);
        setDependencyData(null);
        const deps = await AdminGetCompanyDependencies(Number(row?.company_id));
        setDependencyData(deps);
        setDependencyLoading(false);
      },
      conditionalApiDisplayKey: "allowdelete",
    },
  ];

  // Row click handler
  const handleRowClick = (row: IBusinessListDetail) => {
    router.push(`${AppRoutes.ADMIN_BUSINESS_EDIT}/${row?.company_id}`);
  };
  const getSubscriptionPlans = async () => {
    const postData = {
      getAllSubscriptionPlanInput: {
        plan_type: "",
        search: "",
        status: "Active",
        page_number: null,
        page_size: null,
        is_alphabetical_order: true,
      },
    };
    const subscriptionListResponse = await AdminListSubscriptionPlans(postData);

    const mappedPlanOptions =
      subscriptionListResponse?.plan_list?.map(
        (plan: { plan_name: string }) => ({
          label: plan?.plan_name,
          value: plan?.plan_name,
        })
      ) || [];

    setPlanOptions([
      { value: "All", label: "All" },
      { value: "Free Premium", label: "Free Premium" },
      ...(mappedPlanOptions || []),
    ]);
  };

  async function getAdminListAllCompanies(
    currentPage: number,
    entriesPerPage: number
  ) {
    try {
      if (emptySearchField) {
        setEmptySearchField(false);
      }

      setTableLoader(true);
      const payload = {
        page: currentPage,
        perPage: entriesPerPage,
        keyword: searchValue,
        blocked:
          statusType === "Blocked"
            ? true
            : statusType === "UnBlocked"
            ? false
            : null,
        plan: singleselectedPlan,
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      };
      const response = await AdminListAllCompanies(payload);

      if (response?.companies?.length > 0) {
        const modifiedGridData = response?.companies.map((listObj: any) => {
          return {
            ...listObj,
            is_admin_blocked: listObj.is_admin_blocked
              ? "Blocked"
              : "Unblocked",
            expiry_date: listObj?.expiry_date
              ? formatDate(listObj?.expiry_date)
              : NA,
            business_list_icons: {
              block: !listObj?.is_admin_blocked,
              unblock: listObj?.is_admin_blocked,
              allowaccess:
                !listObj?.is_admin_blocked &&
                decodeTokenData?.role === Roles.SUPER_ADMIN_ROLE,
              allowfreeplan: !listObj?.is_free_plan_eligible,
              freeplanallowed: listObj?.is_free_plan_eligible,
              allowdelete: decodeTokenData?.role === Roles.SUPER_ADMIN_ROLE,
            },
          };
        });

        setBusinessListData(modifiedGridData);
      } else {
        setBusinessListData([]);
      }

      setTotalRows(response?.totalCount || 0);
    } catch (err: any) {
    } finally {
      setTableLoader(false);
      setDisableExcelBtn(false);
    }
  }

  const handleResetFilters = () => {
    setStatusType("");
    setSearchValue("");
    setSelectedPlan(null);
    setSingleSelectedPlan(null);
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };
  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "business_profile",
        keyword: searchValue,
        blocked:
          statusType === "Blocked"
            ? true
            : statusType === "UnBlocked"
            ? false
            : null,
        plan: null,
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
        screen_name: "business_profile",
        keyword: searchValue,
        blocked:
          statusType === "Blocked"
            ? true
            : statusType === "UnBlocked"
            ? false
            : null,
        plan: null,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

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
      if (!actionData) return;

      const { id, option, name, companyID, isAdminBlocked, userID } =
        actionData;

      // if (option === "Edit") {
      //   router.push(`${ApplicationURLS.ADMIN_COMPANY_EDIT}/${companyID}`);
      //   return { msg: "", isReturn: true, isLogin: false };
      // }

      if (option === "status") {
        setPopUpHeaderMsg(`Do you want to change ${name}'s status?`);
        setOpenModal(!openModal);
        let payload = {
          is_admin_blocked:
            actionData?.is_admin_blocked === "Unblocked" ? true : false,
          company_id: actionData?.company_id,
        };
        let msg = actionData?.is_admin_blocked
          ? "This business profile has been unblocked."
          : "This business profile has been blocked.";
        const response = await AdminUpdateCompany(payload, msg);

        if (response) {
          await getAdminListAllCompanies(currentPage, entriesPerPage);
        }
        return { msg: "", isReturn: true, isLogin: false };
      }

      if (option === "Update") {
        // setPopUpHeaderMsg(
        //   `Do you want to allow updating the subscription for ${name}?`
        // );
        setOpenModal(true);
        let payload = {
          companyId: actionData?.company_id,
        };

        const response = await subscriptionUpdateByAdmin(payload, setLoader);

        if (response) {
          await getAdminListAllCompanies(currentPage, entriesPerPage);
        } else {
          setOpenModal(false);
        }
        return { msg: "", isReturn: true, isLogin: false };
      }

      if (option === "Access Profile") {
        // setPopUpHeaderMsg("Please enter admin password");
        setLoader(true);
        const payload = {
          admin_password: formik.values.password,
          user_id: actionData?.primary_admin_id,
        };
        const responseData = await AllowAdminToLoginAsUser(payload);
        console.log(
          "🚀 ~ handleModalPopUpFunction ~ responseData:",
          responseData
        );
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
          return { msg: responseData, isReturn: false, isLogin: false };
        }
      }

      setOpenModal(!openModal);
      return { msg: "", isReturn: false, isLogin: false };
    } catch (error) {
      console.error("Error in handleModalPopUpFunction:", error);
      setLoader(false);
      return {
        msg: "An error occurred. Please try again.",
        isReturn: false,
        isLogin: false,
      };
    }
  };

  const DEPENDENCY_LABELS: Record<string, string> = {
    users: "User Roles",
    projects: "Projects",
    contracts: "Contracts",
    bank_accounts: "Bank Accounts",
    claims: "Payment Claims",
    payments: "Payments",
    journal_entries: "Journal Entries",
    transactions: "Transactions",
    reconciliation_reports: "Reconciliation Reports",
    clients_suppliers: "Clients / Suppliers",
    notices: "Notices",
    invitations: "Invitations",
    subscriptions: "Subscriptions",
    integrations: "Integrations",
    activity_logs: "Activity Logs",
    variations: "Variations",
    audit_reports: "Audit Reports",
    ai_support_usage: "AI Support Usage",
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== "DELETE") return false;
    setIsDeleting(true);
    const success = await AdminDeleteCompany(deleteTarget?.company_id);
    setIsDeleting(false);
    if (success) {
      setDeleteConfirmOpen(false);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      setDependencyData(null);
      setDeleteConfirmText("");
      await getAdminListAllCompanies(currentPage, entriesPerPage);
    }
    return success;
  };

  async function handleOptionSelection() {
    setLoader(true);

    let payload = {
      is_free_plan_eligible: !actionData?.is_free_plan_eligible,
      company_id: actionData?.company_id,
    };

    const response = await UpdateBusinessFreeAccess(payload);
    if (response) {
      getAdminListAllCompanies(currentPage, entriesPerPage);
      // showSuccessToast("FAQ list updated successfully");
    } else {
      showErrorToast("Business list update failed");
    }
    setFreePlanModal(false);
    setLoader(false);
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
            activeRoute={"Business Profiles"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Business profile list</h1>
          </div>
          <div className="pt_pageactions">
            <Link href={"/admin/business/add"} passHref legacyBehavior>
              <a className="pt_addnewbutton">
                <button
                  className="secondary"
                  onClick={() => {
                    router.push(AppRoutes.ADMIN_BUSINESS_ADD);
                  }}
                >
                  <i className="fa-light fa-hexagon-plus"></i>Add business
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
                  sheetName: "business list",
                  tableData: businessListData,
                  LabelAndValueKey: excelColumnNames,
                }}
                pdfFile={{
                  fileName: "business list",
                  headerRow: businessListPDFHeaders,
                  tableData: businessListData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={businessListData.length > 0 ? false : true}
                hidePdfButton={businessListData.length > 0 ? false : true}
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
          <FormikControl
            placeholder={"Select a subscription"}
            name="Subscription"
            options={planOptions}
            control={InputType.SELECT}
            value={selectedPlan}
            selectedData={singleselectedPlan}
            renderKey="label"
            valueKey="value"
            onChange={handlePlanChange}
          />
        </div>
      </div>
      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={businessListHeaders}
            gridData={businessListData?.length > 0 ? businessListData : []}
            gridActions={currentActions}
            onRowClick={handleRowClick}
            dynamicApiGridIconsKey="business_list_icons"
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={businessRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            hoverOnRowClick
            onSortChange={(sortConfig) => {
              if (businessListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
        {openModal && (
          <BaseModal
            modalId="resetPasswordModal"
            displayModal={openModal}
            onClose={() => {
              setOpenModal(false);
              formik.resetForm();
              formik.setFieldValue("password", "");
            }}
            onConfirm={async () => {
              if (
                actionData?.option === "Access Profile" &&
                !formik.values.password
              ) {
                // showWarningToast("Please enter admin password");
                formik.handleSubmit();

                return false; // Prevent closing if validation fails.
              }
              const isreturntrue = await handleModalPopUpFunction();

              if (!isreturntrue?.isReturn) {
                formik.setFieldError("password", isreturntrue?.msg);
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
            {actionData?.option === "Access Profile" && (
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
        {freePlanModel && (
          <BaseModal
            modalId="FreePlanModal"
            displayModal={freePlanModel}
            onClose={() => {
              setFreePlanModal(false);
            }}
            onConfirm={async () => {
              handleOptionSelection();
              return true;
            }}
            firstButtonName="Cancel"
            secondButtonName="Yes"
          >
            <div className="text_center">{popUpHeaderMsg}</div>
          </BaseModal>
        )}
        {deleteModalOpen && (
          <BaseModal
            modalId="deleteImpactModal"
            displayModal={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setDeleteTarget(null);
              setDependencyData(null);
            }}
            onConfirm={async () => {
              if (dependencyLoading || !dependencyData) return false;
              setDeleteModalOpen(false);
              setDeleteConfirmOpen(true);
              return true;
            }}
            firstButtonName="Cancel"
            secondButtonName={dependencyLoading ? "Loading..." : !dependencyData ? "Error — Close and Retry" : "Proceed to Delete"}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{
                background: "#fff3cd",
                border: "2px solid #dc3545",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
              }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: "#dc3545", fontSize: "32px", marginBottom: "8px", display: "block" }}></i>
                <h3 style={{ color: "#dc3545", margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700" }}>
                  PERMANENT DATA DELETION
                </h3>
                <p style={{ color: "#856404", margin: "0", fontSize: "14px", fontWeight: "600" }}>
                  You are about to permanently delete <strong>{deleteTarget?.company_name}</strong> and ALL associated data. This action cannot be undone.
                </p>
              </div>

              {dependencyLoading ? (
                <div style={{ padding: "20px", color: "#666" }}>
                  <i className="fa-light fa-spinner-third fa-spin" style={{ marginRight: "8px" }}></i>
                  Checking dependencies...
                </div>
              ) : dependencyData ? (
                <div style={{ textAlign: "left" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "600", color: "#333" }}>
                    The following data will be permanently removed:
                  </h4>
                  <div style={{
                    background: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    padding: "12px",
                    maxHeight: "240px",
                    overflowY: "auto",
                  }}>
                    {Object.entries(dependencyData?.counts || {}).map(([key, count]: [string, any]) => (
                      count > 0 || count === -1 ? (
                        <div key={key} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          borderBottom: "1px solid #eee",
                          fontSize: "14px",
                        }}>
                          <span style={{ color: "#495057" }}>{DEPENDENCY_LABELS[key] || key}</span>
                          <span style={{
                            fontWeight: "700",
                            color: count === -1 ? "#856404" : "#dc3545",
                            minWidth: "40px",
                            textAlign: "right",
                          }}>{count === -1 ? "?" : count}</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                  <div style={{
                    marginTop: "12px",
                    padding: "10px",
                    background: "#f8d7da",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#721c24",
                    textAlign: "center",
                  }}>
                    Total records to be deleted: {dependencyData?.totalRecords || 0}
                  </div>
                </div>
              ) : (
                <div style={{ padding: "20px", color: "#dc3545" }}>
                  Failed to load dependency data. Please try again.
                </div>
              )}
            </div>
          </BaseModal>
        )}
        {deleteConfirmOpen && (
          <BaseModal
            modalId="deleteConfirmModal"
            displayModal={deleteConfirmOpen}
            onClose={() => {
              setDeleteConfirmOpen(false);
              setDeleteConfirmText("");
              setDeleteTarget(null);
              setDependencyData(null);
            }}
            onConfirm={async () => {
              return await handleDeleteConfirm();
            }}
            firstButtonName="Cancel"
            secondButtonName={isDeleting ? "Deleting..." : "DELETE PERMANENTLY"}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{
                background: "#dc3545",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "20px",
              }}>
                <i className="fa-solid fa-skull-crossbones" style={{ color: "#fff", fontSize: "40px", marginBottom: "12px", display: "block" }}></i>
                <h2 style={{ color: "#fff", margin: "0 0 8px 0", fontSize: "22px", fontWeight: "800", letterSpacing: "1px" }}>
                  FINAL WARNING
                </h2>
                <p style={{ color: "#ffcdd2", margin: "0", fontSize: "14px", fontWeight: "500" }}>
                  This will permanently destroy all data for <strong style={{ color: "#fff" }}>{deleteTarget?.company_name}</strong>. There is no recovery option.
                </p>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "8px",
                }}>
                  Type <strong style={{ color: "#dc3545" }}>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "16px",
                    fontWeight: "700",
                    textAlign: "center",
                    border: deleteConfirmText === "DELETE" ? "2px solid #dc3545" : "2px solid #dee2e6",
                    borderRadius: "6px",
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    boxSizing: "border-box",
                  }}
                  autoFocus
                />
              </div>

              {deleteConfirmText !== "" && deleteConfirmText !== "DELETE" && (
                <small style={{ color: "#dc3545", fontSize: "12px" }}>
                  <i className="fa-light fa-circle-xmark" style={{ marginRight: "4px" }}></i>
                  Please type exactly DELETE to proceed
                </small>
              )}
            </div>
          </BaseModal>
        )}
      </div>
    </div>
  );
}
