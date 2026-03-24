"use client";
import { useEffect, useState } from "react";
import { RootState, useAppSelector } from "@/redux/store";
import DashboardBox from "@/modules/user/UserDashboard/DashboardBox";
import {
  FetchAllBankAccountsForJournals,
  fetchAllCompaniesWithFailedSubscriptionStatus,
  FetchAllNewCompanies,
  FetchAllNewUsers,
  FetchAllProjectsWithComplianceIssues,
  FetchHolidayTableStatus,
} from "./adminDashboardPage.functions";
import { getNoticesListServices } from "@/modules/user/Notices/notices.functions";
import BaseModal from "@/components/BaseModal";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter } from "next/navigation";
import { setMailTo, setShowContactModel } from "@/redux/slices/homePage";
import { useDispatch } from "react-redux";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";

export default function AdminDashboard() {
  const [usersLoader, setUsersLoader] = useState(false);
  const [companiesLoader, setCompaniesLoader] = useState(false);
  const [compliancesLoader, setCompliancesLoader] = useState(false);
  const [failedSubscriptionsLoader, setFailedSubscriptionsLoader] =
    useState(false);
  const [trustAccountingLoader, setTrustAccountingLoader] = useState(false);
  const [noticesLoader, setNoticesLoader] = useState(false);

  const [allUsersData, setAllUsersData] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [compliancesData, setCompliancesData] = useState([]);

  const [failedSubscriptions, setFailedSubscriptions] = useState([]);
  const [trustAccountingIssues, setTrustAccountingIssues] = useState([]);
  const [noticesData, setNoticesData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [processedUsersData, setProcessedUsersData] = useState([]);
  const [holidayStatus, setHolidayStatus] = useState<any>(null);

  const router = useRouter();
  const dispatch = useDispatch();

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state.companyStore.updatedcompany
  );

  useEffect(() => {
    initialInvoke();
  }, [updatedCompany?.company_id]);

  async function initialInvoke() {
    fetchUsersData();
    fetchCompaniesData();
    fetchCompliancesData();
    fetchFailedSubscriptions();
    fetchTrustAccountingIssues();
    fetchUnsentNotices();
    fetchHolidayStatus();
  }

  async function fetchHolidayStatus() {
    try {
      const response = await FetchHolidayTableStatus();
      if (response) {
        setHolidayStatus(response);
      }
    } catch (error) {
      console.error("Error fetching holiday status:", error);
    }
  }

  async function fetchUsersData() {
    try {
      setUsersLoader(true);
      const response = await FetchAllNewUsers();

      if (response) {
        setAllUsersData(response);

        // Process data to add `full_name`
        const modifiedData = response.map((user: any) => ({
          ...user,
          full_name: `${user.first_name} ${user.last_name}`.trim(), // Concatenate first and last name
        }));
        setProcessedUsersData(modifiedData);
        setUsersLoader(false);
      }
    } catch (error) {
      setUsersLoader(false);
      console.error("Error fetching users data:", error);
    }
  }

  async function fetchCompaniesData() {
    try {
      setCompaniesLoader(true);
      const response = await FetchAllNewCompanies();
      setAllCompanies(response || []);
      setCompaniesLoader(false);
    } catch (error) {
      console.error("Error fetching companies data:", error);
      setCompaniesLoader(false);
    }
  }

  async function fetchCompliancesData() {
    try {
      setCompliancesLoader(true);
      const response = await FetchAllProjectsWithComplianceIssues();
      setCompliancesData(response || []);
      setCompliancesLoader(false);
    } catch (error) {
      console.error("Error fetching compliances data:", error);
      setCompliancesLoader(false);
    }
  }

  async function fetchFailedSubscriptions() {
    try {
      setFailedSubscriptionsLoader(true);
      const response = await fetchAllCompaniesWithFailedSubscriptionStatus();
      setFailedSubscriptions(response || []);
      setFailedSubscriptionsLoader(false);
    } catch (error) {
      console.error("Error fetching failed subscriptions:", error);
      setFailedSubscriptionsLoader(false);
    }
  }

  async function fetchTrustAccountingIssues() {
    try {
      setTrustAccountingLoader(true);
      const response = await FetchAllBankAccountsForJournals();
      setTrustAccountingIssues(response?.account_list || []);
      setTrustAccountingLoader(false);
    } catch (error) {
      console.error("Error fetching trust accounting issues:", error);
      setTrustAccountingLoader(false);
    }
  }

  async function fetchUnsentNotices() {
    try {
      setNoticesLoader(true);
      const payload = {
        company_id: null,
        delegated_qbcc: true,
        payment_id: null,
        page: 1,
        items_per_page: 100,
        notice_type: null,
        status: "Sending",
        payment_claim_id: null,
        bank_account_id: null,
        date_filter: null,
        start_date: null,
        end_date: null,
      };
      const response = await getNoticesListServices(payload);
      setNoticesData(response?.notices_list || []);
      setNoticesLoader(false);
    } catch (error) {
      console.error("Error fetching unsent notices:", error);
      setNoticesLoader(false);
    }
  }

  const closeModal = () => {
    setModalVisible(false);
  };
  return (
    <div className="container-fluid">
      {holidayStatus?.warning && (
        <div
          style={{
            padding: "16px 20px",
            marginBottom: "20px",
            borderRadius: "8px",
            backgroundColor:
              holidayStatus.days_remaining <= 0
                ? "#fef2f2"
                : holidayStatus.days_remaining <= 30
                  ? "#fff7ed"
                  : "#fffbeb",
            border: `1px solid ${
              holidayStatus.days_remaining <= 0
                ? "#fecaca"
                : holidayStatus.days_remaining <= 30
                  ? "#fed7aa"
                  : "#fde68a"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                fontSize: "20px",
                color:
                  holidayStatus.days_remaining <= 0
                    ? "#dc2626"
                    : holidayStatus.days_remaining <= 30
                      ? "#ea580c"
                      : "#d97706",
              }}
            >
              {holidayStatus.days_remaining <= 0 ? "\u26A0" : "\u23F0"}
            </span>
            <div>
              <strong
                style={{
                  color:
                    holidayStatus.days_remaining <= 0
                      ? "#991b1b"
                      : holidayStatus.days_remaining <= 30
                        ? "#9a3412"
                        : "#92400e",
                  fontSize: "14px",
                }}
              >
                Holiday Table{" "}
                {holidayStatus.days_remaining <= 0
                  ? "Expired"
                  : "Attention Needed"}
              </strong>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "13px",
                  color: "#374151",
                }}
              >
                {holidayStatus.status_message}
                {holidayStatus.latest_holiday_date && (
                  <span style={{ marginLeft: "8px", color: "#6b7280" }}>
                    (Latest date: {holidayStatus.latest_holiday_date})
                  </span>
                )}
              </p>
            </div>
          </div>
          <CustomButton
            buttonType={buttonType.CONTRAST}
            buttonName="Manage Holidays"
            actionType="button"
            onClick={() => router.push(AppRoutes.ADMIN_HOLIDAYS_LIST)}
          />
        </div>
      )}
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <span>Dashboard</span>
        </div>
        <div className="grid">
          <div className="pt_pagetitle">
            <h1>Welcome back, Pay Trade Admin</h1>
          </div>
          <div className="pt_search align_view_activity">
            <CustomButton
              buttonType={buttonType.CONTRAST}
              buttonName="View all activity"
              actionType="button"
              onClick={() => router.push(AppRoutes.ADMIN_ACTIVITY_LOG)}
            />
          </div>
        </div>
      </div>

      <div className="grid dashgrid">
        <DashboardBox
          title={"NEW USERS"}
          cardData={processedUsersData}
          enableLoader={usersLoader}
          mappingKeys={{
            leftMainContentOne: "full_name",
            dateLeftMainContentThree: "created_date",
            statusRightMainContentOne: "status",
          }}
          boxButtonLink={AppRoutes.ADMIN_NORMAL_USERS_LIST}
          enableInvalidForRightMainContentOne
          enableWithOverLink
          onCardClick={(cardObj) =>
            router.push(
              `${AppRoutes.ADMIN_NORMAL_USERS_EDIT}/${cardObj?.user_id}`
            )
          }
        />

        <DashboardBox
          title={"NEW BUSINESSES"}
          cardData={allCompanies}
          enableLoader={companiesLoader}
          mappingKeys={{
            leftMainContentOne: "company_name",
            dateLeftMainContentThree: "created_date",
            statusRightMainContentOne: "status",
          }}
          boxButtonLink={AppRoutes.ADMIN_BUSINESS_LIST}
          enableInvalidForRightMainContentOne
          enableWithOverLink
          onCardClick={(cardObj) =>
            router.push(
              `${AppRoutes.ADMIN_BUSINESS_EDIT}/${cardObj?.company_id}`
            )
          }
        />

        <DashboardBox
          title={"NOTICES"}
          boxButtonLink={AppRoutes.ADMIN_NOTICES_CURRENT}
          cardData={noticesData}
          enableLoader={noticesLoader}
          mappingKeys={{
            leftMainContentOne: "account_name",
            statusRightMainContentOne: "status",
            leftMainContentLight: "notice_type",
          }}
          enableInvalidForRightMainContentOne
          enableWithOverLink
          onCardClick={(cardObj) => {
            router.push(`${AppRoutes.ADMIN_NOTICES_VIEW}/${cardObj?.id}`);
          }}
        />

        <DashboardBox
          title={"COMPLIANCE"}
          boxButtonLink={AppRoutes.ADMIN_COMPLIANCES_LIST}
          cardData={compliancesData}
          enableLoader={compliancesLoader}
          mappingKeys={{
            leftMainContentOne: "project_name",
            issueRightMainContentOne: "issues",
            leftMainContentLight: "bank_account_name",
          }}
          enableInvalidForRightMainContentOne
          enableWithOverLink
          onCardClick={(cardObj) => {
            router.push(
              `${AppRoutes?.ADMIN_COMPLIANCE_VIEW}?project=${
                cardObj?.project_id
              }&st=${cardObj?.project_status ?? ""}&page=admin`
            );
          }}
        />

        <DashboardBox
          title={"SUBSCRIPTIONS"}
          boxButtonName={"View"}
          boxButtonLink={`${AppRoutes.ADMIN_SUBSCRIPTION_BILLING_AND_HISTORY}?status=failed`}
          cardData={failedSubscriptions}
          enableLoader={failedSubscriptionsLoader}
          mappingKeys={{
            leftMainContentOne: "company_name",
            statusRightMainContentOne: "transaction_status",
          }}
          enableInvalidForRightMainContentOne
          onCardClick={(cardObj) => {
            dispatch(setMailTo(cardObj?.primary_admin_email));
            dispatch(setShowContactModel(true));
            router.push(AppRoutes?.ADMIN_DASHBOARD_CONTACT);
          }}
        />
        <DashboardBox
          title={"TRUST ACCOUNTING ISSUES"}
          boxButtonName={"View"}
          boxButtonLink={`${AppRoutes.ADMIN_JOURNALS_LIST}?balance-check=error`}
          cardData={trustAccountingIssues}
          enableLoader={trustAccountingLoader}
          mappingKeys={{
            leftMainContentOne: "account_name",
            statusRightMainContentOne: "status",
            contactRightMainContentOne: "contact",
            leftMainContentLight: "account_name",
          }}
          enableInvalidForRightMainContentOne
          isContact
          enableWithOverLink
          onCardClick={(cardObj) => {
            dispatch(setMailTo(cardObj?.primary_admin_email));
            dispatch(setShowContactModel(true));
            router.push(AppRoutes?.ADMIN_DASHBOARD_CONTACT);
          }}
        />
        <BaseModal
          modalId="trustAccountingModal"
          displayModal={modalVisible}
          title="Trust Accounting Issues"
          onClose={closeModal}
        >
          <p>Details about Trust Accounting Issues can go here.</p>
        </BaseModal>
      </div>
    </div>
  );
}
