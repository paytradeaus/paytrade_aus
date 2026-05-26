"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import ProjectTrustHOC from "@/components/ComplianceAccordion";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import React, { useEffect, useState } from "react";
import {
  //   details,
  trustAccountRadioOptions,
} from "./complianceOverview.constants";
import { useSearchParams } from "next/navigation";
import { useLoaderContext } from "@/context/useLoader";
import {
  fetchComplianceOverview,
  forceRefreshProjectCompliance,
  GetComplianceResultsOfAProject,
} from "./complianceOverview.functions";

function ComplianceOverview({ isAdmin = false }: any) {
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [complianceTimeLine, setComplianceTimeLine] = useState<any>([]);
  const [complianceOverview, setComplianceOverview] = useState<any>([]);

  const queryParams: any = useSearchParams();
  const projectId = queryParams.get("project");
  const isAdminPage = queryParams.get("page");

  const projectStatus = queryParams.get("st");

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
      setLoaderInfo("Loading compliances...");
      setLoader(true);

      // Execute all API calls in parallel
      await Promise.allSettled([
        getComplianceOverview(),
        getComplianceTimeLine(),
      ]);

      // Hide loader after all API calls are completed
      setLoaderInfo("");

      setLoader(false);
    } catch {
      setLoaderInfo("");
      setLoader(false);
    }
  }

  // Task #297 — manual cache refresh. Calls the backend mutation that
  // rebuilds `compliance_checkpoint` / `compliance_rule` for both PTA
  // and RTA, then re-reads the page so the user sees fresh data
  // without waiting for the 08:00 UTC cron or the debounced worker.
  async function handleRefreshClick() {
    if (!projectId) return;
    setLoaderInfo("Refreshing compliance...");
    setLoader(true);
    try {
      await forceRefreshProjectCompliance(Number(projectId));
      await Promise.allSettled([
        getComplianceOverview(),
        getComplianceTimeLine(),
      ]);
    } finally {
      setLoaderInfo("");
      setLoader(false);
    }
  }

  function handleToggledChange(value: any) {
    // Show loader before fetching
    setLoaderInfo("Loading compliances...");
    setLoader(true);

    // Update the selected toggle value
    setSelectedToggled(value);

    // Fetch the timeline data
    getComplianceTimeLine(value)
      .then(() => {
        // Hide loader after successful fetch
        setLoaderInfo("");
        setLoader(false);
      })
      .catch(() => {
        // Hide loader even if there's an error
        setLoaderInfo("");
        setLoader(false);
      });
  }

  async function getComplianceTimeLine(accountType?: string) {
    try {
      const postData = {
        payload: {
          bank_account_type: accountType ?? selectedToggled,
          project_id: projectId ? Number(projectId) : null,
        },
      };

      const response: any = await GetComplianceResultsOfAProject(postData);

      setComplianceTimeLine(response);
      return true;
    } catch {
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
    } catch {
      return false;
    }
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <BreadCrumbs
          routePaths={[
            {
              name: "Dashboard",
              path: isAdminPage
                ? AppRoutes.ADMIN_DASHBOARD
                : AppRoutes.USER_DASHBOARD,
            },
            {
              name: "Compliance",

              path: isAdminPage
                ? AppRoutes.ADMIN_COMPLIANCES_LIST
                : AppRoutes.USER_COMPLIANCE,
            },
          ]}
          activeRoute={"Check list"}
        />
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Trust account compliance check list</h1>
            <h4>{projectId ? projectId : ""}</h4>
          </div>
          {projectId && (
            <div className="pt_addnewbutton">
              <button
                type="button"
                className="secondary"
                onClick={handleRefreshClick}
                disabled={loader}
                aria-busy={loader}
                title="Recompute compliance for this project now"
              >
                <i className="fa-light fa-arrows-rotate" />
                &nbsp;{loader ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="pt_overviewinfo">
        <div className="grid">
          <div className="pt_infolist">
            <div className="pt_infolistdata">
              <h6>Project Name</h6>
              {complianceOverview?.project_name} - {projectStatus}
            </div>
          </div>
          <div className="pt_infodata">
            <div className="pt_infolistdata">
              <h6>Project Trust Account</h6>
              <span
                className={
                  complianceOverview?.pta_compliance_silenced
                    ? "complianceSilenced"
                    : "invalid"
                }
                style={{
                  color:
                    complianceOverview?.pta_compliance === "Action required"
                      ? undefined
                      : "#4c9b8a", // Green color
                }}
              >
                {complianceOverview?.pta_compliance}
              </span>
            </div>
            <div className="pt_infolistdata">
              <h6>Retention Trust Account</h6>
              <span
                className={
                  complianceOverview?.rta_compliance_silenced
                    ? "complianceSilenced"
                    : "invalid"
                }
                style={{
                  color:
                    complianceOverview?.rta_compliance === "Action required"
                      ? undefined
                      : "#4c9b8a", // Green color
                }}
              >
                {complianceOverview?.rta_compliance}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="grid pt_topfilters">
        <div className="pt_filters">
          <div role="group">
            <TabSwitch
              tabOptions={trustAccountRadioOptions}
              tabValue={selectedToggled}
              onChange={handleToggledChange}
            />
          </div>
        </div>
      </div>
      <ProjectTrustHOC
        details={complianceTimeLine}
        typeOfTrustAccount={selectedToggled}
        isAdmin={isAdmin}
        PayloadProjectId={projectId ? Number(projectId) : null}
        onRefresh={() => initialInvoke()}
      />
    </div>
  );
}

export default ComplianceOverview;
