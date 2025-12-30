"use client";

import React, { useEffect, useState } from "react";
import FormButton from "@/components/Button/button";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import styles from "./contractsOverview.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { useLoaderContext } from "@/context/useLoader";
import { ApplicationURLS } from "@/common/applicationURLS";
import TabContainer from "@/container/addGroups/tabsContainer";
import { viewContractDetailsById } from "../contracts.functions";
import Link from "next/link";
import { formatDate } from "@/common/commonFunctions";
import { Col, Container, Row } from "react-bootstrap";
import OverviewClaims from "@/container/userProjectOverview/overviewClaims/overviewClaims";
import PaymentLists from "@/container/userModules/paymentsList/paymentList";
import { overviewModeType } from "@/container/userModules/paymentsList/paymentsList.constant";
import { AppModal } from "@/components/model/model";
import TextField from "@/components/TextField/textField";
import RetentionListsOverview from "@/container/userModules/retentionsList/retentionOverview";
import Variations from "@/container/userModules/variations/variations";
import NoticesList from "@/container/userModules/notices/noticesList";
import TooltipInfoIcon from "@/components/customToolTip/customToolTip";

const ContractOverview = () => {
  const queryParams = useSearchParams();
  const currentOverviewTab: any = queryParams.get("from");
  const [activeTab, setActiveTab] = useState(currentOverviewTab || "Claims");

  const routePath = usePathname();
  const router = useRouter();
  const { setLoader }: any = useLoaderContext();
  const params = useParams();
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [contractData, setContractData] = useState<any>({});

  const [openModal, setOpenModal] = useState(false);

  const handlePaymentClick = (event: any) => {
    event.preventDefault();
    setOpenModal(true);
  };

  const handleViewClick = (fileUrl: any, fileName: any, fileType: any) => {
    if (!fileUrl) return;

    const viewableFileTypes = ["pdf", "jpg", "jpeg", "png", "gif", "txt"];

    if (viewableFileTypes.includes(fileType.toLowerCase())) {
      // Attempt to open in a new tab
      const newTab = window.open(fileUrl, "_blank");
      // If newTab is null, it means the popup was blocked
      if (!newTab || newTab.closed || typeof newTab.closed === "undefined") {
        alert("Popup blocked. Please allow popups for this website.");
      }
    } else {
      // Download the file
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    getContracts();
  }, []);

  async function getContracts() {
    setLoader(true);
    if (params?.id) {
      const payload: any = {
        id: params?.id || "",
      };
      const userData = await viewContractDetailsById(payload);

      if (userData) {
        setContractData(userData);
      } else {
        setWorngIdCheck(true);
      }
    }
    setLoader(false);
  }

  const tabs = [
    { id: "Claims", label: "Claims", hasError: true },
    { id: "overview-payments", label: "Payments", hasError: true },
    { id: "Notices", label: "Notices", hasError: true },
    { id: "Retentions", label: "Retentions", hasError: true },
    { id: "overview-variations", label: "Variations", hasError: true },
  ];

  const renderTabSwitch = () => {
    switch (activeTab) {
      case "Contracts":
        return null;
      case "Claims":
        return (
          <OverviewClaims
            selectedContract={contractData?.contract_id}
            selectedProject={contractData?.project_id}
            selectedType={contractData?.client_supplier_type}
            screenName={"Contracts"}
          />
        );
      case "Notices":
        return (
          <NoticesList
            overViewDetails={{
              overViewMode: true,
              contract_id: contractData?.contract_id,
              project_id: null,
              screenName: "contracts",
            }}
          />
        );
      case "overview-variations":
        return (
          // <OverviewVariations
          //   selectedContract={contractData}
          //   fetchContracts={() => getContracts()}
          // />
          <Variations
            overViewDetails={{
              overViewMode: true,
              data: contractData,
              screenName: "contracts",
            }}
          />
        );
      case "Retentions":
        return (
          <RetentionListsOverview
            UniqueContract={contractData?.contract_id}
            screenName={"Contracts"}
          />
        );
      case "overview-payments":
        return (
          <PaymentLists
            overViewDetails={{
              overViewMode: true,
              data: contractData,
              overViewType: overviewModeType.CONTRACTS,
              screenName: "contracts",
            }}
          />
        );
      default:
        return null;
    }
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab !== tabId) {
      setActiveTab(tabId);
    }
  };
  const breadcrumbItems = [
    {
      href: "/user/dashboard",
      label: "Home",
      active: routePath === ApplicationURLS.USER_DASHBOARD,
    },
    {
      href: "/user/contracts/current",
      label: "Contracts",
      active: routePath === ApplicationURLS.USER_CONTRACT_LIST_CURRENT,
    },
    ...(contractData?.contract_status == "In Progress" ||
    contractData?.contract_status == "Draft"
      ? [
          {
            href: "/user/contracts/current",
            label: "Current",
            active: routePath === ApplicationURLS.USER_CONTRACT_LIST_CURRENT,
          },
        ]
      : []),
    ...(contractData?.contract_status == "Completed" ||
    contractData?.contract_status == "Deletd"
      ? [
          {
            href: "/user/contracts/archived",
            label: "Archived",
            active: routePath === ApplicationURLS.USER_CONTRACT_LIST_ARCHIVED,
          },
        ]
      : []),
    {
      href: "/user/contracts/overview/",
      label: "Overview",
      active: routePath.startsWith("/user/contracts/overview/"),
    },
  ];

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={breadcrumbItems}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />

      <div className={styles.containerBox}>
        <div className={styles.headerAndButtonCon}>
          <span className={styles.headerText}>
            {contractData?.contract_name} - {contractData?.contract_id}
          </span>
          <div className="row">
            {!["Completed", "Deleted"].includes(
              contractData?.contract_status
            ) && (
              <div className="col-lg-12">
                <FormButton
                  onClick={() =>
                    router.push(
                      `${ApplicationURLS.USER_EDIT_CONTRACTS}/${contractData?.id}`
                    )
                  }
                  className={styles.buttonStyles}
                >
                  {" "}
                  Edit
                </FormButton>
              </div>
            )}
          </div>
        </div>
        <div className="row">
          <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
            <div
              className={`${styles.customSubHeaderCon} ${styles.secondBlock}`}
            >
              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={3} xs={12}>
                  <div className={styles.discriptionsubHeader}>
                    Project name
                  </div>
                </Col>
                <Col lg={8} md={8} sm={9} xs={12}>
                  <div className={styles.description}>
                    - {contractData?.project_name}
                  </div>
                </Col>
              </Row>

              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={3} xs={12}>
                  <div className={styles.discriptionsubHeader}>
                    Site address
                  </div>
                </Col>
                <Col lg={8} md={8} sm={9} xs={12}>
                  <div className={styles.description}>
                    <span>-</span> <span>{contractData?.site_address}</span>
                  </div>
                </Col>
              </Row>

              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={3} xs={12}>
                  <div className={styles.discriptionsubHeader}>
                    {contractData?.client_supplier_type || "Supplier"}
                  </div>
                </Col>
                <Col lg={8} md={8} sm={9} xs={12}>
                  <div className={styles.description}>
                    - {contractData?.client_supplier_name}
                  </div>
                </Col>
              </Row>
              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={4} xs={12}>
                  <div className={styles.discriptionsubHeader}>
                    Initial Contract sum (excluding GST)
                  </div>
                </Col>
                <Col lg={8} md={8} sm={8} xs={12}>
                  <div className={styles.description}>
                    -{" "}
                    {contractData &&
                    typeof contractData.initial_contract_sum === "number" ? (
                      <>
                        $
                        {contractData.initial_contract_sum.toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </>
                    ) : null}
                  </div>
                </Col>
              </Row>
              <>
                {contractData &&
                contractData.variation_amount !== 0 &&
                typeof contractData.variation_amount === "number" ? (
                  <Row className={styles.viewStatus}>
                    <Col lg={4} md={4} sm={3} xs={12}>
                      <div className={styles.discriptionsubHeader}>
                        Agreed Variations (excluding GST)
                      </div>
                    </Col>
                    <Col lg={8} md={8} sm={9} xs={12}>
                      <div className={styles.description}>
                        -{" "}
                        {contractData &&
                        contractData.variation_amount !== 0 &&
                        typeof contractData.variation_amount === "number" ? (
                          <>
                            $
                            {contractData.variation_amount.toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </>
                        ) : null}
                      </div>
                    </Col>
                  </Row>
                ) : null}
              </>
              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={3} xs={12}>
                  <div className={styles.discriptionsubHeader}>
                    Payment Terms
                    <TooltipInfoIcon
                      tooltipText="Under the BIF Act, a progress payment or final payment must be paid by the date stated in the construction contract (due date), or if the contract does not state a due date within 10 business days after the payment claim is given to the respondent.
For some contracts, the due date stated in a contract cannot be greater than the following maximum timeframes set out under the QBCC Act, otherwise they become void and the default timeframe of 10 business days applies:
subcontracts or construction management trade contracts the maximum payment term is 25 business days
commercial building contracts the maximum payment term is 15 business days.
A person given a payment claim, the respondent, must respond to all payment claims."
                    />
                  </div>
                </Col>
                <Col lg={8} md={8} sm={9} xs={12}>
                  <div className={styles.description}>
                    -{" "}
                    {contractData?.payment_terms
                      ? `${contractData?.payment_terms} days`
                      : ""}
                  </div>
                </Col>
              </Row>
              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={3} xs={12}>
                  <div className={styles.discriptionsubHeader}>
                    Retention Type
                  </div>
                </Col>
                <Col lg={8} md={8} sm={9} xs={12}>
                  <div className={styles.description}>
                    - {contractData?.retention_type}
                  </div>
                </Col>
              </Row>
              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={3} xs={12}>
                  <div className={styles.discriptionsubHeader}>Contract</div>
                </Col>
                <Col lg={8} md={8} sm={9} xs={12}>
                  -{" "}
                  <Link
                    className={styles.LinkStyles}
                    onClick={(e) => {
                      e.preventDefault();
                      handleViewClick(
                        contractData?.file,
                        contractData?.file_name,
                        contractData?.file_type
                      );
                    }}
                    href={""}
                  >
                    View
                  </Link>
                </Col>
              </Row>
              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={3} xs={12}>
                  <div className={styles.discriptionsubHeader}>
                    Contract start date
                  </div>
                </Col>
                <Col lg={8} md={8} sm={9} xs={12}>
                  <div className={styles.description}>
                    -{" "}
                    {contractData?.contract_start_date
                      ? formatDate(contractData?.contract_start_date)
                      : ""}
                  </div>
                </Col>
              </Row>
              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={3} xs={12}>
                  <div className={styles.discriptionsubHeader}>
                    Latent defect end date
                  </div>
                </Col>
                <Col lg={8} md={8} sm={9} xs={12}>
                  <div className={styles.description}>
                    -{" "}
                    {contractData?.defect_liability_end_date
                      ? formatDate(contractData?.defect_liability_end_date)
                      : ""}
                  </div>
                </Col>
              </Row>
              <Row className={styles.viewStatus}>
                <Col lg={4} md={4} sm={3} xs={12}>
                  <div className={styles.discriptionsubHeader}>
                    Payment Details
                  </div>
                </Col>
                <Col lg={8} md={8} sm={9} xs={12}>
                  -&nbsp;
                  <Link
                    className={styles.LinkStyles}
                    onClick={handlePaymentClick}
                    href={""}
                  >
                    View
                  </Link>
                </Col>
              </Row>
            </div>
          </div>

          <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
            <div className={styles.rightNotice}>
              <div className="row">
                <div className="col-lg-6">
                  <div className={styles.status1}>
                    <div className={styles.textHead}>
                      {/* $ 100,4450.00 */}
                      {/* <div className={styles.subText}>
                        Project Trust Account Notice
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-lg-6">
                  <div className={styles.status3}>
                    <div className={styles.textHead}>
                      {/* $ 100,4450.00 */}
                      {/* <div className={styles.subText}>
                        Retention Trust Account Notice
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <AppModal
          show={openModal}
          onHide={() => setOpenModal(false)}
          secondButtonLabel="Back"
          secondButtonStyle={styles.closeBtn}
          modalHeading="Payment Details"
          modalBodyTitle=""
          modalBodyContent={
            <div className={styles.DropdownStyles}>
              {contractData?.payment_from_account_name && (
                <div className={styles.textview}>
                  <TextField
                    value={contractData?.payment_from_account_name}
                    labelText="Payment from account"
                    type="text"
                    autoFocus
                    disabled={true}
                    className={styles.textFieldStyles}
                  />
                </div>
              )}
              {contractData?.retention_from_account_name && (
                <div className={styles.textview}>
                  <TextField
                    value={contractData?.retention_from_account_name}
                    labelText="Retention from account"
                    type="text"
                    autoFocus
                    disabled={true}
                    className={styles.textFieldStyles}
                  />
                </div>
              )}
              {contractData?.payment_to_account_name && (
                <div>
                  <TextField
                    value={contractData?.payment_to_account_name}
                    labelText="Payment to account"
                    type="text"
                    autoFocus
                    disabled={true}
                    className={styles.textFieldStyles}
                  />
                </div>
              )}
            </div>
          }
          onConfirm={() => ""}
        />
      </div>

      <div className={styles.headerAndButtonCon}>
        <span className={styles.textAndSelectCon}>
          <TabContainer
            tabs={tabs}
            activeTab={activeTab}
            onTabClick={handleTabClick}
          />
        </span>
      </div>
      <Container fluid>
        <Row>{renderTabSwitch()}</Row>
      </Container>
    </div>
  );
};

export default ContractOverview;
