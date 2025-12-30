"use client";
import { useLoaderContext } from "@/context/useLoader";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { createContext, useContext, useState, useEffect } from "react";
import { contractOverviewTabs } from "./ContractOverview.constants";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { viewContractDetailsById } from "./ContractOverview.function";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";

const ContractOverviewContext: any = createContext(null);

export const ContractOverviewContextProvider = ({ children }: any) => {
  const routeParams = useParams();
  const router = useRouter();
  const queryParams = useSearchParams();
  const currentTab = queryParams.get("active_tab");
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );

  const [financialOpt, setFinancialOpt] = useState<any>({});
  const [contractData, setContractData] = useState<any>({});
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [activeTab, setActiveTab] = useState(
    currentTab || screenDetails?.mainActiveTab || contractOverviewTabs.CLAIMS
  );

  const { setLoader }: any = useLoaderContext();
  const [refreshOverview, setRefreshOverview] = useState(null);
  const dispatch = useDispatch();
  function id() {
    if (routeParams?.data?.length) {
      return Number(routeParams?.data[0]);
    } else {
      return 0;
    }
  }
  const fetchContractDetails = async () => {
    setLoader(true);

    const params = routeParams;

    if (params?.id) {
      const payload: { id: string } = {
        id: Array.isArray(params?.id) ? params.id[0] : params?.id || "",
      };
      const userData = await viewContractDetailsById(payload);

      if (userData) {
        setContractData(userData);
      } else {
        setWrongIdCheck(true);
      }
    }

    setLoader(false);
  };

  useEffect(() => {
    fetchContractDetails(); // Automatically fetch contract details on component load
    if (screenDetails?.mainActiveTab) {
      dispatch(setScreenDetails({}));
    }
  }, []);

  return (
    <ContractOverviewContext.Provider
      value={{
        router,
        routeParams,
        financialOpt,
        setFinancialOpt,
        contractData,
        setContractData,
        fetchContractDetails, // Provide the fetchContractDetails function here
        setWrongIdCheck,
        activeTab,
        setActiveTab,
        setLoader,
        refreshOverview,
        setRefreshOverview,
        id,
      }}
    >
      {children}
    </ContractOverviewContext.Provider>
  );
};

// Create a custom hook for using the global context
const useContractOverviewContext = () => {
  const context = useContext(ContractOverviewContext);
  if (!context) {
    throw new Error("Error in Contract Overview Context");
  }
  return context;
};

export { useContractOverviewContext };
