import React, { useEffect, useState } from "react";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType } from "@/shared/constant/general";
import { getCompanyIdFromStorage } from "@/utils";

import { useLoaderContext } from "@/context/useLoader";
import { useParams } from "next/navigation";
import { viewContractDetailsById } from "../../Contracts/contracts.functions";
import CustomButton from "@/components/CustomButton/CustomButton";
import BreadCrumbs from "@/components/BreadCrumbs";
import { useProjectOverviewContext } from "./ProjectOverviewContext";
import {
  viewProjectDetails,
  setProjectCompliancePaused,
} from "./ProjectOverview.function";

export default function Header() {
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const { setLoader }: any = useLoaderContext();
  const [projectData, setProjectData] = useState<any>({});
  const [contractData, setContractData] = useState<any>({});
  const [pauseUpdating, setPauseUpdating] = useState(false);
  const params = useParams();
  const { router, getBankAccountId }: any = useProjectOverviewContext();
  useEffect(() => {
    getProjectOverview();
  }, []);

  async function handleToggleCompliancePause() {
    const isPaused = !!projectData?.compliance_paused;
    const projectId = Number(projectData?.project_id);
    if (!projectId) return;

    if (isPaused) {
      const ok = window.confirm(
        "Resume compliance monitoring for this project? This will re-run compliance checks and re-enable alerts and emails."
      );
      if (!ok) return;
      setPauseUpdating(true);
      const success = await setProjectCompliancePaused({
        projectId,
        paused: false,
      });
      setPauseUpdating(false);
      if (success) await getProjectOverview();
      return;
    }

    const ok = window.confirm(
      "Pause compliance monitoring for this project? Alerts, system issues and compliance emails will be suppressed until you resume."
    );
    if (!ok) return;
    const reason = window.prompt("Optional reason for pausing:") || undefined;
    setPauseUpdating(true);
    const success = await setProjectCompliancePaused({
      projectId,
      paused: true,
      reason,
    });
    setPauseUpdating(false);
    if (success) await getProjectOverview();
  }

  async function getProjectOverview() {
    setLoader(true);
    if (params.data?.[0]) {
      const payload = {
        viewProjectDetailsId: params.data[0], // Use the correct key expected by viewProjectDetails
      };

      try {
        const userData = await viewProjectDetails(payload);
        if (userData) {
          setProjectData(userData);
        } else {
          setWrongIdCheck(true);
        }
      } catch (error) {
        console.error("Error fetching project details:", error);
        setWrongIdCheck(true);
      }
    }
    setLoader(false);
  }

  return (
    <div className="pt_title">
      <BreadCrumbs
        routePaths={[
          {
            name: "Dashboard",
            path: AppRoutes.USER_DASHBOARD,
          },
          {
            name: "Projects",
            path: AppRoutes.USER_PROJECTS,
          },
        ]}
        activeRoute={"Overview"}
      />
      <div className="grid pt_topfilters">
        <div className="pt_pagetitle">
          <h1>{projectData?.project_name || "Loading..."}</h1>
          <h4>
            {projectData?.project_status}
            {projectData?.compliance_paused ? (
              <span
                style={{
                  marginLeft: "10px",
                  padding: "2px 10px",
                  borderRadius: "12px",
                  background: "#fdeccd",
                  color: "#9a6700",
                  fontSize: "12px",
                  fontWeight: 600,
                  verticalAlign: "middle",
                }}
                title={
                  projectData?.compliance_paused_reason
                    ? `Reason: ${projectData.compliance_paused_reason}`
                    : "Compliance monitoring is paused"
                }
              >
                Compliance Paused
              </span>
            ) : null}
          </h4>
        </div>
        <div className="pt_pageactions">
          <div className="pt_addnewbutton">
            <CustomButton
              buttonName={
                pauseUpdating
                  ? "Updating..."
                  : projectData?.compliance_paused
                    ? "Resume compliance"
                    : "Pause compliance"
              }
              buttonType={buttonType.CONTRAST}
              iconClassName={
                projectData?.compliance_paused
                  ? "fa-light fa-play"
                  : "fa-light fa-pause"
              }
              actionType={"button"}
              disabled={pauseUpdating || !projectData?.project_id}
              onClick={handleToggleCompliancePause}
            />
          </div>
          <div className="pt_addnewbutton">
            <CustomButton
              buttonName={"Edit"}
              buttonType={buttonType.SECONDARY}
              iconClassName="fa-light fa-pen-to-square"
              actionType={"button"}
              onClick={() =>
                router.push(
                  `${AppRoutes.USER_EDIT_PROJECTS}/${projectData?.id}`
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
