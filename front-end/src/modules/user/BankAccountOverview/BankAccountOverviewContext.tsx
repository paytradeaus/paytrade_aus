import { useLoaderContext } from "@/context/useLoader";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";
import { bankOverviewTabs } from "./BankAccountOverview.constants";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";

const BankAccountOverviewContext: any = createContext(null);

export const BankAccountOverviewContextProvider = ({ children }: any) => {
  const routeParams = useParams();

  const router = useRouter();
  const queryParams = useSearchParams();
  const currentTab = queryParams.get("active_tab");
  const complianceProjectId = queryParams.get("complianceProjectId");
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );

  const [financialOpt, setFinancialOpt] = useState<any>({});
  const [bankDetailsData, setBankDetailsData] = useState<any>({});
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [activeTab, setActiveTab] = useState(
    currentTab || screenDetails?.mainActiveTab || bankOverviewTabs.TRANSACTIONS
  );
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setScreenDetails({}));
  }, []);

  const { setLoader }: any = useLoaderContext();
  const [refreshOverview, setRefreshOverview] = useState(null);

  function getBankAccountId() {
    if (routeParams?.data?.length) {
      return Number(routeParams?.data[0]);
    } else {
      return 0;
    }
  }

  return (
    <BankAccountOverviewContext.Provider
      value={{
        router,
        routeParams,
        financialOpt,
        setFinancialOpt,
        bankDetailsData,
        setBankDetailsData,
        setWrongIdCheck,
        activeTab,
        complianceProjectId,
        setActiveTab,
        setLoader,
        refreshOverview,
        setRefreshOverview,
        getBankAccountId,
      }}
    >
      {children}
    </BankAccountOverviewContext.Provider>
  );
};

// Create a custom hook for using the global context
const useBankAccountOverviewContext = () => {
  const context = useContext(BankAccountOverviewContext);
  if (!context) {
    throw new Error("Error in Add Bank Account Overview Context");
  }
  return context;
};

export { useBankAccountOverviewContext };
