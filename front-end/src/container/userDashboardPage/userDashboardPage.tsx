import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import styles from "./UserDashboardPage.module.scss";
import AddClient from "../../../public/assets/AddClient.png";
import AddProject from "../../../public/assets/AddProject.png";
import AddContract from "../../../public/assets/AddContract.png";
import AddTrustAccount from "../../../public/assets/AddTrustAccount.png";
import AddPayment from "../../../public/assets/AddPayment.png";
import AuditAccount from "../../../public/assets/AuditAccount.png";
import EligibilityChecker from "../../../public/assets/EligibilityChecker.png";
import Reconciliation from "../../../public/assets/Reconciliation.png";
import Image from "next/image";
import ToDoCard from "@/components/dashboardCard/toDoCard/toDoCard";
import BankAccountsCard from "@/components/dashboardCard/bankAccountsCard/bankAccountsCard";
import ProjectsCard from "@/components/dashboardCard/projectsCard/projectsCard";
import Link from "next/link";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useRouter } from "next/navigation";
import { fetchUnmatchedTransactions } from "./userDashboardPage.function";
import { deleteCookie, getCookie } from "cookies-next";
import { YOU_ARE_UPTO_DATE } from "@/common/constants/messages";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";

import { VIEW } from "@/common/constants/general";
import { setAddBankAccountDetails } from "@/redux/slices/dashboardSlices";

const images = [
  {
    image: AddClient,
    url: ApplicationURLS.USER_ADD_CLIENTS_AND_SUPPLIERS,
  },
  {
    image: AddProject,
    url: ApplicationURLS.USER_ADD_PROJECT,
  },
  {
    image: AddContract,
    url: ApplicationURLS.USER_ADD_CONTRACTS,
  },
  {
    image: AddTrustAccount,
    url: ApplicationURLS.USER_BANK_ACCOUNTS_ADD,
  },
  {
    image: AddPayment,
    url: ApplicationURLS.USER_PAYMENT_CLAIMS_ADD,
  },
  {
    image: AuditAccount,
    url: ApplicationURLS.USER_AUDIT_ADD,
  },
  {
    image: EligibilityChecker,
    isExternalLink: true,
    url: "https://my.qbcc.qld.gov.au/myQBCC/s/trust-accounts-tool",
  },
  {
    image: Reconciliation,
    url: ApplicationURLS.USER_RECONCILIATION_ADD,
  },
];

const descriptions = [
  "Add client/supplier",
  "Add project",
  "Add contract",
  "Add trust account",
  "Add payment app",
  "Audit accounts",
  "Eligibility Checker",
  "Reconciliation",
];

const UserDashboardPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [transactionsList, setTransactionsList] = useState([]);

  const [displayNoDataMessage, setDisplayNoDataMessage] = useState(false);

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state.companyStore.updatedcompany
  );

  useEffect(() => {
    dispatch(setAddBankAccountDetails({}));
    // Delete the 'redirectAfterLogin' cookie when the component renders
    const isCookiePresent = getCookie("redirectAfterLogin");
    if (isCookiePresent) {
      deleteCookie("redirectAfterLogin");
    }
  }, []);

  useEffect(() => {
    getUnmatchedTransactionsList();
  }, [updatedCompany?.company_id]);

  async function getUnmatchedTransactionsList() {
    try {
      const postData = {
        company_id: Number(getCookie("companyId")),
      };

      const response = await fetchUnmatchedTransactions(postData);

      if (response) {
        setTransactionsList(response);
        setDisplayNoDataMessage(response?.length == 0);
      }
    } catch (err: any) {
      console.log("getUnmatchedTransactionsList ~ err:", err);
    }
  }

  function getNoRecordData() {
    if (displayNoDataMessage) {
      return <div className={styles.noRecordRow}>{YOU_ARE_UPTO_DATE} </div>;
    } else {
      return "";
    }
  }

  function handleUnmatchedTransactions(data: any) {
    // const encryptedData = CryptoJS.AES.encrypt(
    //   JSON.stringify({
    //     TransactionIDS: data?.transaction_id ? [data?.transaction_id] : [],
    //     bankAccountId: data?.bank_account_id,
    //   }),
    //   "transactions-IDS"
    // ).toString();

    router.push(
      `${ApplicationURLS.USER_PAYMENTS}?claim=${data?.payment_claim_id}&mode=${VIEW}&payment=${data?.payment_id}`
    );
  }

  function handleRouting(data: any) {
    if (data?.isExternalLink) {
      window.open(data.url, "_blank");
    } else {
      router.push(data.url);
    }
  }

  return (
    <Container fluid className={styles.ContainerStyles}>
      {/* first row */}

      <Row>
        <Col xs={12} sm={12} md={6} lg={6} className={styles.QuickLinkStyles}>
          <div className={styles.HeadingsStyle}>Quick Links</div>
          <Row className={styles.ImageRowStyles}>
            {images.map((data, index) => (
              <Col key={index} xs={6} md={3}>
                <Image
                  className={`${styles.ImageStyles} ${"c-p"}`}
                  src={data.image}
                  layout="intrinsic"
                  alt={`Icon ${index + 1}`}
                  onClick={() => handleRouting(data)}
                />

                <p className={styles.DiscriptionStyles}>
                  {descriptions[index]}
                </p>
              </Col>
            ))}
          </Row>
        </Col>
        <Col xs={12} sm={12} md={3} lg={3}>
          <BankAccountsCard
            title={"BANK ACCOUNTS"}
            dataType={"Cash Account"}
            linkHref={ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT}
            linkText={"View"}
            colorText={""}
            dynamicStyle={"style1"}
          />
        </Col>
        <Col xs={12} sm={12} md={3} lg={3}>
          {/* <ProjectTrustCard /> */}
          <BankAccountsCard
            title={"PROJECT TRUST ACCOUNTS"}
            linkHref={ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT}
            linkText={"View"}
            dataType={"Project Trust Account"}
            dynamicStyle={"style2"}
            displayColorText={true}
          />
        </Col>
      </Row>

      {/* second row  */}
      <Row className={styles.CardRowStyles}>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Row>
            <ToDoCard />
          </Row>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Row>
            <Col xs={12} sm={12} md={6} lg={6}>
              <BankAccountsCard
                title={"RETENTION TRUST ACCOUNTS"}
                linkHref={ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT}
                linkText={"View"}
                dataType={"Retention Trust Account"}
                displayColorText={true}
                dynamicStyle={"style2"}
              />
            </Col>
            <Col xs={12} sm={12} md={6} lg={6}>
              <ProjectsCard />
            </Col>
          </Row>
          <Row>
            <Col xs={12} sm={12} md={12} lg={12}>
              <Card className={`${styles.CardStyles} ${"my-3"}`}>
                <Card.Body className={styles.CardBodyStyle}>
                  <div>
                    <Card.Subtitle className={styles.CardSubtitleStyle}>
                      Payment transactions awaiting to match
                    </Card.Subtitle>

                    {/* <div className={styles.transactionHeader}>
                      Project name - Contract name - Amount - Due Date
                    </div> */}
                    <div className={styles.ScrollableContent}>
                      {transactionsList?.length > 0
                        ? transactionsList.map((data: any, index: number) => (
                            <div
                              key={index}
                              className="d-flex justify-content-between my-1"
                            >
                              <div
                                key={index}
                                className={styles.DiscriptionStyles}
                              >
                                {`${data?.account_name ?? ""} - ${
                                  data?.formatted_amount
                                    ? data?.formatted_amount
                                    : "0.00"
                                } - ${data?.status}`}
                              </div>
                              <div
                                className={`${
                                  styles.BottomLinkStyles
                                } ${"c-p"}`}
                                onClick={() =>
                                  handleUnmatchedTransactions(data)
                                }
                              >
                                View
                              </div>
                            </div>
                          ))
                        : getNoRecordData()}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
      <Link className={styles.linkStyles} href={"/user/activity-log"}>
        See all activity
      </Link>

      {/* Footer */}
      <hr></hr>
      <footer className={styles.footerStyles}>
        <div className={styles.versionStyles}>{"Version 1"}</div>
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
};

export default UserDashboardPage;
