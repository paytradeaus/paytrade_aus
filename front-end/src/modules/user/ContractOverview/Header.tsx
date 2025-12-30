import React, { useEffect, useState } from "react";
import BreadCrumbs from "../../../components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import CustomButton from "../../../components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { getCompanyIdFromStorage } from "@/utils";
import { useContractOverviewContext } from "./ContractOverviewContext";
import { viewContractDetailsById } from "./ContractOverview.function";
import { useLoaderContext } from "@/context/useLoader";
import { useParams } from "next/navigation";

export default function Header() {
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const { setLoader }: any = useLoaderContext();
  const [contractData, setContractData] = useState<any>({});
  const params = useParams();
  const { router, getBankAccountId }: any = useContractOverviewContext();
  useEffect(() => {
    getContracts();
  }, []);

  async function getContracts() {
    setLoader(true);
    if (params.data[0]) {
      const payload: any = {
        id: params.data[0] || "",
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
  return (
    <div className="pt_title">
      <BreadCrumbs
        routePaths={[
          {
            name: "Dashboard",
            path: AppRoutes.USER_DASHBOARD,
          },
          {
            name: "Contracts",
            path: AppRoutes.USER_CONTRACTS_LIST,
          },
        ]}
        activeRoute={"Overview"}
      />
      <div className="grid pt_topfilters">
        <div className="pt_pagetitle">
          <h1>{contractData?.contract_name || "Loading..."}</h1>
          <h4> {contractData?.contract_id}</h4>
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
                  `${AppRoutes.USER_EDIT_CONTRACTS}/${contractData?.id}`
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
