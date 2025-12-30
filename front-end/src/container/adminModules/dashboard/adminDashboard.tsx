import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import styles from "./adminDashboard.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";

import {
  FetchAllBankAccountsForJournals,
  fetchAllCompaniesWithFailedSubscriptionStatus,
  FetchAllNewCompanies,
  FetchAllNewUsers,
  FetchAllProjectsWithComplianceIssues,
} from "./adminDashboard.function";
import AdminDashboardCard from "@/components/adminDashboardCard/adminDashboard";
import { FullPageLoader } from "@/components/Loader/fullPageLoader";
import { getNoticesListServices } from "@/container/userModules/notices/notices.functions";
import Link from "next/link";

const typeOfCard = {
  USERS: "users",
  COMPANIES: "companies",
  COMPLIANCE: "compliance",
  NOTICES: "notices",
  TRUST_ACCOUNT_ISSUES: "trustAccountIssues",
  SUBSCRIPTIONS: "subscriptions",
};

function AdminDashboardPage() {
  const [displayNoDataMessage, setDisplayNoDataMessage] = useState(false);
  const [allUsersData, setAllUsersData] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [compliancesData, setCompliancesData] = useState([]);
  const [failedSubscriptions, setFailedSubscriptions] = useState([]);
  const [trustAccountingIssues, setTrustAccountingIssues] = useState([]);

  const [loader, setLoader] = useState(false);
  const [noticesData, setNoticesData] = useState([]);

  useEffect(() => {
    initialInvoke();
  }, []);

  async function initialInvoke() {
    try {
      // Show loader before starting
      // setLoader(true);

      // Execute all API calls in parallel
      await Promise.allSettled([
        getAllNewUsers(),
        getAllNewCompanies(),
        getCompliances(),
        getFailedSubscriptionsList(),
        getTrustAccountingIssues(),
        fetchUnsentNotices(),
      ]);

      // Hide loader after all API calls are completed
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  async function getAllNewUsers() {
    try {
      const response = await FetchAllNewUsers();

      if (response) {
        setAllUsersData(response);
        setDisplayNoDataMessage(response?.length == 0);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  async function getAllNewCompanies() {
    try {
      const response = await FetchAllNewCompanies();

      if (response) {
        setAllCompanies(response);
        setDisplayNoDataMessage(response?.length == 0);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  async function getCompliances() {
    try {
      const response = await FetchAllProjectsWithComplianceIssues();

      if (response) {
        setCompliancesData(response);
        setDisplayNoDataMessage(response?.length == 0);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  async function getFailedSubscriptionsList() {
    try {
      const response = await fetchAllCompaniesWithFailedSubscriptionStatus();

      if (response) {
        setFailedSubscriptions(response);
        setDisplayNoDataMessage(response?.length == 0);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  async function getTrustAccountingIssues() {
    try {
      const response = await FetchAllBankAccountsForJournals();

      if (response?.account_list?.length > 0) {
        setTrustAccountingIssues(response?.account_list);
        setDisplayNoDataMessage(response?.length == 0);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  async function fetchUnsentNotices() {
    try {
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
    } catch (error) {
      console.error("Error fetching notices lists:", error);
    }
  }

  function getNoRecordStatus(cardType: string) {
    switch (cardType) {
      case typeOfCard.USERS:
        if (allUsersData?.length === 0) {
          return true;
        }
        break;
      case typeOfCard.COMPANIES:
        if (allCompanies?.length === 0) {
          return true;
        }
        break;
      case typeOfCard.COMPLIANCE:
        if (compliancesData?.length === 0) {
          return true;
        }
        break;
      case typeOfCard.TRUST_ACCOUNT_ISSUES:
        if (trustAccountingIssues?.length === 0) {
          return true;
        }
        break;
      case typeOfCard.NOTICES:
        if (noticesData?.length === 0) {
          return true;
        }
        break;
      case typeOfCard.SUBSCRIPTIONS:
        if (failedSubscriptions?.length === 0) {
          return true;
        }
        break;
      default:
        return true;
    }
  }

  return (
    <Container fluid className={styles.ContainerStyles}>
      {/* first row */}
      {loader && <FullPageLoader setLoading={loader} />}
      <Row className={styles.rowGap}>
        <Col xs={12} sm={6} md={4} lg={3}>
          <AdminDashboardCard
            title={"NEW USERS"}
            cardData={allUsersData}
            linkHref={ApplicationURLS.ADMIN_NORMAL_USERS_LIST}
            displayNoDataMessage={getNoRecordStatus(typeOfCard.USERS)}
          />
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <AdminDashboardCard
            title={"NEW COMPANIES"}
            cardData={allCompanies}
            linkHref={ApplicationURLS.ADMIN_COMPANY_LIST}
            displayNoDataMessage={getNoRecordStatus(typeOfCard.COMPANIES)}
          />
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <AdminDashboardCard
            title={"SUBSCRIPTIONS"}
            cardData={failedSubscriptions}
            linkHref={`${ApplicationURLS.ADMIN_SUBSCRIPTION_BILLING_HISTORY}?status=failed`}
            displayNoDataMessage={getNoRecordStatus(typeOfCard.SUBSCRIPTIONS)}
            isContact
          />
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <AdminDashboardCard
            title={"TRUST ACCOUNTING ISSUES"}
            cardData={trustAccountingIssues}
            linkHref={`${ApplicationURLS.ADMIN_JOURNALS}?balance-check=error`}
            displayNoDataMessage={getNoRecordStatus(
              typeOfCard.TRUST_ACCOUNT_ISSUES
            )}
            isContact
          />
        </Col>
        <Col xs={12} sm={6} md={3} lg={3}>
          <AdminDashboardCard
            title={"NOTICES"}
            cardData={noticesData}
            linkHref={ApplicationURLS.ADMIN_NOTICES}
            displayNoDataMessage={getNoRecordStatus(typeOfCard.NOTICES)}
          />
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <AdminDashboardCard
            title={"COMPLIANCE"}
            cardData={compliancesData}
            linkHref={ApplicationURLS.ADMIN_COMPLIANCE}
            displayNoDataMessage={getNoRecordStatus(typeOfCard.COMPLIANCE)}
          />
        </Col>
      </Row>

      {/* Footer */}
      <hr></hr>
      <footer className={styles.footerStyles}>
        <div className={styles.versionStyles}>{"Version 12.1.8"}</div>
        <Row className={styles.footerRowStyles}>
          <Col xs={12} className={styles.footerContent}>
            <span>© {new Date().getFullYear()} All Rights Reserved.</span>
            <span className={styles.footerLinks}>
              <Link
                href={ApplicationURLS.PRIVACY_POLICY}
                className={styles.footerSections}
              >
                Privacy
              </Link>{" "}
              |{" "}
              <Link
                className={styles.footerSections}
                href={ApplicationURLS.SECURITY}
              >
                Security
              </Link>{" "}
              |{" "}
              <Link
                href={ApplicationURLS.TERMS_AND_CONDITIONS}
                className={styles.footerSections}
              >
                Terms of Services
              </Link>
            </span>
          </Col>
        </Row>
      </footer>
    </Container>
  );
}

export default AdminDashboardPage;
