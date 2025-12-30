"use client";
import { useLoaderContext } from "@/context/useLoader";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { viewProjectDetails } from "./ProjectOverview.function";
import { projectOverviewTabs } from "./ProjectOverview.constant";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";

const ProjectOverviewContext: any = createContext(null);

export const ProjectOverviewContextProvider = ({ children }: any) => {
  const routeParams = useParams();
  const router = useRouter();
  const queryParams = useSearchParams();
  const currentTab = queryParams.get("active_tab");
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
  const params = useParams();
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [projectData, setProjectData] = useState<any>({});
  const [financialOpt, setFinancialOpt] = useState<any>({});
  const [contractData, setContractData] = useState<any>({});
  const [activeTab, setActiveTab] = useState(
    screenDetails?.mainActiveTab || currentTab || projectOverviewTabs.CONTRACTS
  );
  const dispatch = useDispatch();

  const { setLoader }: any = useLoaderContext();
  const [refreshOverview, setRefreshOverview] = useState(null);

  useEffect(() => {
    getProjectOverview();
    if (screenDetails?.mainActiveTab) {
      dispatch(setScreenDetails({}));
    }
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

  return (
    <ProjectOverviewContext.Provider
      value={{
        router,
        routeParams,
        financialOpt,
        setFinancialOpt,
        contractData,
        setContractData,
        setWorngIdCheck,
        activeTab,
        setActiveTab,
        setLoader,
        refreshOverview,
        setRefreshOverview,
        projectData,
      }}
    >
      {children}
    </ProjectOverviewContext.Provider>
  );
};

// Create a custom hook for using the global context
const useProjectOverviewContext = () => {
  const context = useContext(ProjectOverviewContext);
  if (!context) {
    throw new Error("Error in Contract Overview Context");
  }
  return context;
};

export { useProjectOverviewContext };
