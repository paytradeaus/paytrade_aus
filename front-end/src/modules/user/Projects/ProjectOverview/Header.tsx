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
import { viewProjectDetails } from "./ProjectOverview.function";

export default function Header() {
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const { setLoader }: any = useLoaderContext();
  const [projectData, setProjectData] = useState<any>({});
  const [contractData, setContractData] = useState<any>({});
  const params = useParams();
  const { router, getBankAccountId }: any = useProjectOverviewContext();
  useEffect(() => {
    getProjectOverview();
  }, []);

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
          <h4> {projectData?.project_status}</h4>
        </div>
        <div className="pt_pageactions">
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
