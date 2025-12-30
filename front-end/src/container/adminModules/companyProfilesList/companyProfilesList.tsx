"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import FormButton from "@/components/Button/button";
import styles from "./companyProfilesList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  AdminlistAllCompanies,
  subscriptionUpdateByAdmin,
} from "./companyProfilesList.functions";
import { RowsPerPageInTable } from "@/common/constants";
import { ApplicationURLS } from "@/common/applicationURLS";
import { AppModal } from "@/components/model/model";
import { AdminUpdateCompany } from "../addCompanyProfileDetails/addCompanyProfileDetails.functions";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import debounce from "lodash/debounce";
import CustomSubHeader from "./customHeader";
import { AdminListSubscriptionPlans } from "../subscriptions/subscriptions.functions";
import { setCookie } from "cookies-next";
import { CustomJwtPayload } from "@/container/userLogin/userLoginPage";
import { jwtDecode } from "jwt-decode";
import { AllowAdminToLoginAsUser } from "../usersList/userList.functions";
import { toast } from "@/app/Toaster";
import { setCompanyId } from "@/redux/slices/companyDetails";
import { useAppDispatch } from "@/redux/store";
import { useTokenDetails } from "@/common/commonHooks";
import { SUPER_ADMIN_ROLE } from "@/common/constants/roles";
import CryptoJS from "crypto-js";
import { useLoaderContext } from "@/context/useLoader";

type UserData = {
  abn_number: string;
  acn_number: string;
  company_address: string;
  company_email_id: string;
  company_id: string;
  company_name: string;
  company_phone_no: string;
  country: string;
  entity_type: string;
  expiry_date: Date | string;
  icon_base64: string;
  icon_file_path: string;
  icon_file_type: string;
  id: string;
  is_admin_blocked: boolean;
  is_verified: boolean;
  latitude: number;
  legal_company_name: string;
  longitude: number;
  place_id: string;
  plan_id: string;
  plan_name: string;
  qbcc_number: string;
  region: string;
  subscription_id: string;
  subscription_status: string;
  tfn_number: string;
  utr_number: string;
  vat_number: string;
  primary_admin_id?: number;
};

const CompanyProfileList = () => {
  const options = [
    { value: "", label: "All" },
    { value: "Blocked", label: "Blocked" },
    { value: "UnBlocked", label: "Unblocked" },
  ];
  const routePath = usePathname();
  const dispatch = useAppDispatch();
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [companiesListdata, setCompaniesListdata] = useState<UserData[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [singleselectedStatus, setSingleSelectedStatus] = useState<
    string | null
  >(null);
  const [singleselectedPlan, setSingleSelectedPlan] = useState<string | null>(
    null
  );
  const [actionData, setActionData] = useState<any>();
  const [popUpHeaderMsg, setPopUpHeaderMsg] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planOptions, setPlanOptions] = useState([{ value: "", label: "All" }]);
  const [disabledBtn, setDisabledBtn] = useState(false);
  const [password, setPassword] = useState("");
  const { loader, setLoader }: any = useLoaderContext();
  const resetFilters = () => {
    setSearch(""); // Reset search input
    setSingleSelectedStatus(null); // Reset status filter
    setSelectedStatus(null);
    setSingleSelectedPlan(null); // Reset plan filter
    setSelectedPlan(null);
  };

  // Check if either the search input or the selected filter has been changed
  const isAnyFilterActive =
    search !== "" ||
    singleselectedStatus !== null ||
    selectedStatus !== null ||
    singleselectedPlan !== null ||
    selectedPlan !== null;
  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);
  useEffect(() => {
    getAdminlistAllCompanies(page, perPage);
  }, [debouncedSearch, selectedPlan, selectedStatus]);

  useEffect(() => {
    getListAllAdminUsers(page, perPage);
  }, []);

  const getListAllAdminUsers = async (page: number, rowsPerPage: number) => {
    setLoading(true);
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
    const subscriptionListResponse = await AdminListSubscriptionPlans(
      postData,
      setLoading
    );

    const mappedPlanOptions =
      subscriptionListResponse?.plan_list?.map(
        (plan: { plan_name: string }) => ({
          label: plan?.plan_name,
          value: plan?.plan_name,
        })
      ) || [];

    setPlanOptions([{ value: "", label: "All" }, ...(mappedPlanOptions || [])]);
  };

  const getAdminlistAllCompanies = async (
    page: number,
    rowsPerPage: number
  ) => {
    setLoading(true);
    const responseData = await AdminlistAllCompanies(
      {
        page: page,
        perPage: rowsPerPage,
        keyWord: search.length > 2 ? search : "",
        plan: selectedPlan,
        blocked:
          selectedStatus === "Blocked"
            ? true
            : selectedStatus === "UnBlocked"
            ? false
            : null,
      },
      setLoading
    );
    setCompaniesListdata(responseData?.companies || []);
    setTotalRows(responseData?.totalCount || 0);
    setPerPage(rowsPerPage);
  };
  function downloadExcel() {
    const columnNames = [
      { value: "company_id", label: "Business ID" },
      { value: "entity_type", label: "Trading Type" },
      { value: "qbcc_number", label: "QBCC No" },
      { value: "company_name", label: "Business Name" },
      { value: "legal_company_name", label: "Legal Company Name" },
      { value: "company_phone_no", label: "Phone Number" },
      { value: "company_email_id", label: "Company Email ID" },
      { value: "company_address", label: "Company Address" },
      { value: "country", label: "Country" },
      { value: "region", label: "Region" },
      { value: "plan_name", label: "Subscription" },
      { value: "is_admin_blocked", label: "Admin Blocked?" },
    ];
    convertJsonToExcel(companiesListdata, "company profile list", columnNames);
  }
  const handleSelectChange = (status: any) => {
    setSingleSelectedStatus(status);
    setSelectedStatus(status.value);
  };
  const handlePlanChange = (plan: any) => {
    setSingleSelectedPlan(plan);
    setSelectedPlan(plan.value);
  };
  const handlePageChange = async (page: number) => {
    setPage(page);
    await getAdminlistAllCompanies(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getAdminlistAllCompanies(page, newPerPage);
  };

  const handleOptionClick = async (data: {
    id: string;
    option: string;
    name: string;
    companyID: string;
    isAdminBlocked: boolean;
    userID: string;
  }) => {
    const { id, option, name, companyID, isAdminBlocked, userID } = data;
    setActionData(data);
    if (option === "Edit") {
      router.push(`${ApplicationURLS.ADMIN_COMPANY_EDIT}/${companyID}`);
    }
    if (option === "status") {
      setPopUpHeaderMsg(`Do you want change the  ${name} status?`);
      setOpenModal(!openModal);
    }
    if (option === "Access Profile") {
      setPopUpHeaderMsg(`Please enter admin password`);
      setOpenModal(!openModal);
    }
    if (option === "Update") {
      setPopUpHeaderMsg(
        `Do you want to allow updating the subscription for ${name}?`
      );
      setOpenModal(true);
    }
  };
  const handleRowView = (companyID: any) => {
    router.push(`${ApplicationURLS.ADMIN_COMPANY_EDIT}/${companyID}`);
  };

  const handlePrintPDF = () => {
    let formatedTableData: any[] = companiesListdata.map((user) => [
      user.company_id,
      user.entity_type,
      user.qbcc_number,
      user.company_name,
      user.legal_company_name,
      user.company_phone_no,
      user.company_email_id,
      user.company_address,
      user.country,
      user.region,
      user.plan_name,
      user.is_admin_blocked,
    ]);
    let headerNames: string[] = [
      "Business ID",
      "Trading Type",
      "QBCC No",
      "Business Name",
      "Legal Company Name",
      "Phone Number",
      "Company Email ID",
      "Company Address",
      "Country",
      "Region",
      "Subscription",
      "Admin Blocked",
    ];
    const moduleName = "Company Profile"; // Use the module name here

    generateAndPrintPDF(formatedTableData, headerNames, moduleName, true);
  };
  const handleModalPopUpFunctiosn = async () => {
    if (actionData.option === "Access Profile") {
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
        localStorage.setItem("ProfileType", "Business");
        setCookie("ProfileType", "Business");

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

        localStorage.setItem("companyId", actionData.companyID.toString());
        setCookie("companyId", actionData.companyID);
        dispatch(setCompanyId(actionData.companyID));
        router.push("/user/dashboard");
        toast.success("Login Successful");
        return;
      } else {
        setDisabledBtn(false);
      }

      return;
    }
    setOpenModal(!openModal);
    if (actionData.option === "status") {
      let payload = {
        is_admin_blocked: !actionData?.isAdminBlocked,
        company_id: actionData?.companyID,
      };
      let msg = actionData?.isAdminBlocked
        ? "This business profile has been unblocked."
        : "This business profile has been blocked.";
      const response = await AdminUpdateCompany(payload, msg);

      if (response) {
        setDisabledBtn(false);
        await getAdminlistAllCompanies(page, perPage);
      }
    }
    if (actionData.option === "Update") {
      let payload = {
        companyId: actionData.companyID,
      };

      const response = await subscriptionUpdateByAdmin(payload, setLoading);

      if (response) {
        setDisabledBtn(false);
        await getAdminlistAllCompanies(page, perPage);
      }
    }
  };
  const columns = [
    {
      name: "Business ID",
      selector: (row: UserData) => row.company_id,
      grow: true,
      minWidth: "105px",
      center: true,
    },
    {
      name: "Trading Type",
      selector: (row: UserData) => row.entity_type,
      grow: true,
      minWidth: "115px",
      center: true,
    },
    {
      name: "Business Name",
      selector: (row: UserData) => row.company_name,
      wrap: true,
      // grow: true,
      minWidth: "200px",
    },
    {
      name: "Legal Business Name",
      selector: (row: UserData) => row.legal_company_name,

      fixed: "right",
      // grow: true,
      minWidth: "200px",
      // center: true,
    },

    {
      name: "Subscription Valid",
      center: true,
      minWidth: "148px",
      selector: (row: UserData) =>
        row?.expiry_date ? formatDate(row?.expiry_date) : "",
    },
    {
      name: "Subscription Type",
      center: true,
      minWidth: "148px",
      selector: (row: UserData) => row?.plan_name || "",
    },
    {
      name: "Admin Blocked",
      selector: (row: UserData) =>
        row.is_admin_blocked ? "Blocked" : "Unblocked",
      fixed: "right",
      grow: true,
      minWidth: "128px",
      center: true,
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
            { label: "View", value: "Edit" },
            {
              label: row?.is_admin_blocked ? "Unblock" : "Block",
              value: "status",
            },
            { label: "Allow Update Subscription", value: "Update" },
            ...(!row?.is_admin_blocked &&
            decodeTokenData?.role === SUPER_ADMIN_ROLE
              ? [{ label: "Access Profile", value: "Access Profile" }]
              : []),
          ]}
          // customPopupstyles={styles.customPopupstyles}
          optionClick={(data) => handleOptionClick(data)}
          cellData={{
            id: row?.id,
            companyID: row?.company_id,
            name: row?.company_name,
            isAdminBlocked: row?.is_admin_blocked,
            userID: row?.primary_admin_id,
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
            label: "Business Profiles",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Business Profile List</span>

        <FormButton
          className={styles.buttonStyles}
          onClick={() => router.push(ApplicationURLS.ADMIN_COMPANY_ADD)}
        >
          + Add Business
        </FormButton>
      </div>
      <ReusableDataTable
        columns={columns}
        data={companiesListdata}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            search={search}
            onInputChange={onInputChange}
            options={options}
            planOptions={planOptions}
            singleselectedPlan={singleselectedPlan}
            singleselectedStatus={singleselectedStatus}
            handlePlanChange={handlePlanChange}
            handleSelectChange={handleSelectChange}
            companiesListdata={companiesListdata}
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
        onRowClicked={(data: any) => handleRowView(data?.company_id)}
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
        isInputFieldEnabled={actionData?.option === "Access Profile"}
        modalHeading=""
        modalBodyTitle=""
        disabled={disabledBtn}
        modalBodyContent={popUpHeaderMsg || `Do you want to reset password?`}
        onConfirm={() => {
          if (actionData?.option === "Access Profile" && !password) {
            toast.warn("Please enter admin password");
            return;
          }
          handleModalPopUpFunctiosn();
          setDisabledBtn(true);
        }}
        handlePasswordChange={(e: any) => {
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

export default CompanyProfileList;
