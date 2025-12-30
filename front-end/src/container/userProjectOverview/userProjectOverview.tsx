"use client";

import React, { useEffect, useState } from "react";
import FormButton from "@/components/Button/button";

import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import TabContainer from "../addGroups/tabsContainer";
import styles from "./userProjectOverview.module.scss";

import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { Row } from "react-bootstrap";
import { viewProjectDetails } from "../userProject/userProject.functions";
import OverviewContracts from "./overviewContract/overviewContracts";
import { tabs, tabId } from "./userProjectOverview.constant";
import { ApplicationURLS } from "@/common/applicationURLS";
import OverviewClaims from "./overviewClaims/overviewClaims";
import PaymentLists from "../userModules/paymentsList/paymentList";
import { overviewModeType } from "../userModules/paymentsList/paymentsList.constant";
import BankTrustAccountList from "../userModules/bankTrustAccount/bankTrustAccountList/bankTrustAccountList";
import RetentionListsOverview from "../userModules/retentionsList/retentionOverview";
import ClientsAndSuppliers from "../userModules/clientsAndSuppliers";
import Variations from "../userModules/variations/variations";
import NoticesList from "../userModules/notices/noticesList";
import LedgerJournals from "../userModules/trustAccounting/ledgerJournals/ledgerJournals";
import Compliance from "../userModules/compliance/compliance";
import { RootState, useAppSelector } from "@/redux/store";

const ProjectOverview = () => {
  const routePath = usePathname();
  const router = useRouter();

  const routeDetails: any = useAppSelector(
    (state: RootState) => state.dashBoard.projectoverview
  );

  const params = useParams();
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [projectData, setProjectData] = useState<any>({});
  const queryParams: any = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    routeDetails?.mainActiveTab || (queryParams?.get("from") ?? "contracts")
  );

  useEffect(() => {
    getProjectOverview();
  }, []);

  async function getProjectOverview() {
    if (params?.id) {
      const payload: any = {
        viewProjectDetailsId: params?.id || "",
      };
      const userData = await viewProjectDetails(payload);

      if (userData) {
        setProjectData(userData);
      } else {
        setWorngIdCheck(true);
      }
    }
  }

  const renderTabSwitch = () => {
    switch (activeTab) {
      case "Claims":
        return (
          <OverviewClaims
            selectedProject={projectData?.project_id}
            screenName={"Project"}
          />
        );
      case tabId.PAYMENTS:
        return (
          <PaymentLists
            overViewDetails={{
              overViewMode: true,
              data: projectData,
              overViewType: overviewModeType.PROJECTS,
              screenName: "projects",
            }}
          />
        );
      case tabId.ACCOUNTS:
        return (
          <BankTrustAccountList
            overViewDetails={{ overViewMode: true, data: projectData }}
          />
        );
      case "Retentions":
        return (
          <RetentionListsOverview UniqueProject={projectData?.project_id} />
        );
      case "Notices":
        return (
          <NoticesList
            overViewDetails={{
              overViewMode: true,
              contract_id: null,
              project_id: projectData?.project_id,
              screenName: "projects",
            }}
          />
        );
      case "Journals":
        return (
          <div>
            <LedgerJournals></LedgerJournals>
          </div>
        );
      case "Compliance":
        return <Compliance isOverView={true} projectData={projectData} />;
      case "contracts":
        return <OverviewContracts selectedContract={projectData} />;
      case tabId.VARIATIONS:
        return (
          <Variations
            overViewDetails={{
              overViewMode: true,
              data: projectData,
              screenName: "projects",
            }}
          />
        );

      case tabId.CLIENTS_AND_SUPPLIERS:
        return (
          <ClientsAndSuppliers
            overViewDetails={{ overViewMode: true, data: projectData }}
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
      active: routePath === "/user/dashboard",
    },
    {
      href: "/user/projects/current",
      label: "Projects",
      active: routePath === "/user/projects/current",
    },
    ...(projectData?.project_status === "In Progress"
      ? [
          {
            href: "/user/projects/current",
            label: "Current",
            active: routePath === "/user/projects/current",
          },
        ]
      : []),
    ...(projectData?.project_status != "In Progress"
      ? [
          {
            href: "/user/projects/archived",
            label: "Archived",
            active: routePath === "/user/projects/archived",
          },
        ]
      : []),
    {
      href: "/user/projects/overview/",
      label: "Overview",
      active: routePath.startsWith("/user/projects/overview/"),
    },
  ];

  function handleCompliance() {
    router.push(
      `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${projectData?.project_id}`
    );
  }

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={breadcrumbItems}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />

      <div className={styles.containerBox}>
        <div className={styles.headerAndButtonCon}>
          <span className={styles.headerText}>
            {projectData?.project_name} - {projectData?.project_status}
          </span>
          <FormButton
            className={styles.buttonStyles}
            onClick={() =>
              router.push(
                `${ApplicationURLS.USER_EDIT_PROJECT}/${projectData?.id}`
              )
            }
            style={{
              display:
                projectData?.project_status === "In Progress"
                  ? "block"
                  : "none",
            }}
          >
            Edit
          </FormButton>
        </div>

        <div className="row">
          <div className="col-lg-8 col-md-6 col-sm-12 col-xs-12">
            <div
              className={`${styles.customSubHeaderCon} ${styles.secondBlock}`}
            >
              <div className={styles.mainHeaderBlock}>
                <div className={styles.subHeader}>Site Address&nbsp;-</div>
                <div className={styles.address}>
                  {projectData?.site_address}
                </div>
              </div>
              <div className={styles.test}>
                <div className={styles.discriptionsubHeader}>
                  Description&nbsp;-
                </div>
                <div className={styles.description}>
                  {projectData?.project_description}
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6 col-sm-12 col-xs-12">
            <div className="row">
              <div className="col-xl-7 col-lg-7 col-md-6 col-sm-12">
                <div className={styles.status1}>
                  <div>Head Contract (excluding GST)</div>

                  <div className={styles.textHead}>
                    {projectData &&
                    typeof projectData.head_contract_sum === "number" ? (
                      <>
                        $
                        {projectData.head_contract_sum.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="col-xl-5 col-lg-5 col-md-6 col-sm-12">
                <div className={styles.status2}>
                  <div>Your Role</div>

                  <div className={styles.textHead}>
                    {projectData?.project_role}
                  </div>
                </div>
              </div>
            </div>
            <div className="row mt-3">
              <div className="col-lg-7 col-sm-6">
                <div className={styles.status3}>
                  <div>Project Trust Account</div>
                  <div className={styles.textHead}>
                    {projectData?.pta_eligibility === "Yes"
                      ? "Eligible"
                      : "Not Eligible"}
                  </div>
                </div>
              </div>
              <div className="col-lg-5 col-sm-6">
                <div className={styles.status4}>
                  <div>Project Status</div>
                  <div className={styles.textHead}>
                    {projectData?.project_status === "In Progress"
                      ? "In Progress"
                      : projectData?.project_status}
                  </div>
                </div>
              </div>
            </div>
            <div className="row mt-3">
              <div className="col-lg-7 col-sm-6">
                <div className={styles.status5}>
                  <div>Retention Trust Account</div>
                  <div className={styles.textHead}>
                    {projectData?.rta_eligibility === "Yes"
                      ? "Eligible"
                      : "Not Eligible"}
                  </div>
                </div>
              </div>
              <div className="col-lg-5 col-sm-6">
                <div className={styles.status6}>
                  <div>Compliance</div>
                  <div
                    className={`${
                      projectData?.compliance === "Action required"
                        ? styles.actionRequired
                        : styles.actionNotRequired
                    }`}
                    onClick={() =>
                      projectData?.compliance === "Action required"
                        ? handleCompliance()
                        : {}
                    }
                  >
                    {projectData?.compliance}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
      <div>
        <Row>
          <Row>{renderTabSwitch()}</Row>
        </Row>
      </div>
    </div>
  );
};

export default ProjectOverview;
