"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./complianceOverview.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { useLoaderContext } from "@/context/useLoader";
import { ApplicationURLS } from "@/common/applicationURLS";
import { Col, Row } from "react-bootstrap";
import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import TimelineComponent from "@/components/Timeline/timeline"; // Updated import
import {
  fetchComplianceOverview,
  fetchComplianceTimeLine,
} from "./compliance.function";
import { trustAccountRadioOptions } from "./complianceConstantData";

function ComplianceOverview({ isAdmin = false }: any) {
  const routePath = usePathname();

  const { setLoader }: any = useLoaderContext();
  const [complianceTimeLine, setComplianceTimeLine] = useState<any>([]);
  const [complianceOverview, setComplianceOverview] = useState<any>([]);

  const queryParams: any = useSearchParams();
  const projectId = queryParams.get("project");
  const tabType = queryParams.get("tab");

  const [selectedToggled, setSelectedToggled] = useState<string>(
    tabType || "Project Trust Account"
  );

  useEffect(() => {
    initialInvoke();
  }, []);

  async function initialInvoke() {
    try {
      // Show loader before starting
      setLoader(true);

      // Execute all API calls in parallel
      await Promise.allSettled([
        getComplianceOverview(),
        getComplianceTimeLine(),
      ]);

      // Hide loader after all API calls are completed
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  function handleToggledChange(value: any) {
    setSelectedToggled(value);
    getComplianceTimeLine(value);
  }

  const breadcrumbItems = [
    {
      href: isAdmin
        ? ApplicationURLS.ADMIN_DASHBOARD
        : ApplicationURLS.USER_DASHBOARD,
      label: "Home",
      active:
        routePath ===
        (isAdmin
          ? ApplicationURLS.ADMIN_DASHBOARD
          : ApplicationURLS.USER_DASHBOARD),
    },
    {
      href: isAdmin
        ? ApplicationURLS.ADMIN_COMPLIANCE
        : ApplicationURLS.USER_COMPLIANCE,
      label: "Compliance",
      active:
        routePath ===
        (isAdmin
          ? ApplicationURLS.ADMIN_COMPLIANCE
          : ApplicationURLS.USER_CONTRACT_LIST_CURRENT),
    },
    {
      href: isAdmin
        ? ApplicationURLS.ADMIN_COMPLIANCE_OVERVIEW
        : ApplicationURLS.USER_COMPLIANCE_OVERVIEW,
      label: "Overview",
      active: true,
    },
  ];

  async function getComplianceTimeLine(accountType?: string) {
    try {
      const postData = {
        payload: {
          bank_account_type: accountType ?? selectedToggled,
          project_id: projectId ? Number(projectId) : null,
        },
      };

      const response: any = await fetchComplianceTimeLine(postData);

      setComplianceTimeLine(response);

      return true;
    } catch (err: any) {
      return false;
    }
  }

  async function getComplianceOverview() {
    try {
      const postData = {
        payload: {
          project_id: projectId ? Number(projectId) : null,
        },
      };

      const response: any = await fetchComplianceOverview(postData);

      setComplianceOverview(response);

      return true;
    } catch (err: any) {
      return false;
    }
  }

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={breadcrumbItems}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />

      <div className={`${styles.containerBox} ${"row"}`}>
        <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
          <div className={styles.headerAndButtonCon}>
            <span className={styles.headerText}>
              Trust Account Compliance Check List
            </span>
          </div>
          <div className={`${styles.customSubHeaderCon} ${styles.secondBlock}`}>
            <Row className={styles.viewStatus}>
              <Col lg={4} md={4} sm={3} xs={12}>
                <div className={styles.discriptionsubHeader}>
                  Project Name -
                </div>
              </Col>
              <Col lg={8} md={8} sm={9} xs={12}>
                <div className={styles.description}>
                  {complianceOverview?.project_name}
                </div>
              </Col>
            </Row>
          </div>
        </div>
        <div className={"col-xl-4 col-lg-4 col-md-12 col-sm-12"}>
          <div className={styles.rightNotice}>
            <div className="row">
              <div className="col-lg-6">
                <div className={styles.status1}>
                  <div className={styles.textHead}>
                    <div
                      className={`${
                        complianceOverview?.pta_compliance === "Action required"
                          ? styles.action
                          : styles.comp
                      }`}
                    >
                      {complianceOverview?.pta_compliance}
                    </div>
                    <div className={styles.subText}>Project Trust Account</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-lg-6">
                <div className={styles.status3}>
                  <div className={styles.textHead}>
                    <div
                      className={`${
                        complianceOverview?.rta_compliance === "Action required"
                          ? styles.action
                          : styles.comp
                      }`}
                    >
                      {complianceOverview?.rta_compliance}
                    </div>
                    <div className={styles.subText}>
                      Retention Trust Account
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.radioToggle}>
        <RadioSwitchToggle
          radioOptions={trustAccountRadioOptions}
          selected={selectedToggled}
          handleToggleChange={handleToggledChange}
          // disabled={true}
        />
      </div>
      <div className="mt-3">
        {complianceTimeLine?.length > 0 && (
          <TimelineComponent
            overallData={complianceTimeLine}
            typeOfTrustAccount={selectedToggled}
            projectId={projectId}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
}

export default ComplianceOverview;
