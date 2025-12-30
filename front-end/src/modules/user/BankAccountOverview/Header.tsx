import React, { useEffect, useState } from "react";
import BreadCrumbs from "../../../components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import CustomButton from "../../../components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { getCompanyIdFromStorage } from "@/utils";
import { useBankAccountOverviewContext } from "./BankAccountOverviewContext";
import BaseModal from "@/components/BaseModal";
import {
  getIntegrationListsForCompany,
  integrateAdatree,
} from "../UserIntegrations/integration.functions";

export default function Header() {
  const { router, getBankAccountId, bankDetailsData }: any =
    useBankAccountOverviewContext();

  const [displayContactTeam, setDisplayContactTeam] = useState(false);
  const [adaTreeInprogress, setAdaTreeInprogress] = useState(false);

  const integrateAdatreeCheck = async () => {
    await integrateAdatree({
      integrateAdatreeInput: {
        company_id: +(localStorage.getItem("companyId") || 0),
      },
    });
    getIntegrationLists();
  };

  useEffect(() => {
    getIntegrationLists();
  }, []);

  const getIntegrationLists = async () => {
    const response = await getIntegrationListsForCompany({
      getIntegrationListsInput: {
        company_id: +(localStorage.getItem("companyId") || 0),
      },
    });
    setAdaTreeInprogress(
      response?.integration_list?.some(
        (val: any) =>
          val.integration_name == "Adatree" &&
          val.integration_status == "Activation in Progress"
      ) || false
    );
  };

  return (
    <div className="pt_title">
      <BreadCrumbs
        routePaths={[
          {
            name: "Dashboard",
            path: AppRoutes.USER_DASHBOARD,
          },
          {
            name: "Bank/trust accounts",
            path: AppRoutes.USER_BANK_ACCOUNTS_CURRENT,
          },
        ]}
        activeRoute={"Overview"}
      />
      <div className="grid pt_topfilters">
        <div className="pt_pagetitle">
          <h1>{bankDetailsData?.account_name}</h1>
          <h4> {bankDetailsData?.bank_account_id}</h4>
        </div>
        <div className="pt_pageactions">
          <details className="dropdown">
            <summary role="button" className="secondary">
              <i className="fa-light fa fa-link"></i>
              &nbsp;&nbsp;Link Account
            </summary>
            <ul>
              <li
                className={adaTreeInprogress ? "cur_not_allowed" : "cu-pointer"}
                onClick={() => integrateAdatreeCheck()}
              >
                {adaTreeInprogress ? (
                  <a>
                    Manage connections{" "}
                    <small>(Adatree activation in progress)</small>
                  </a>
                ) : (
                  <a>Manage Connections</a>
                )}
              </li>
            </ul>
          </details>
          <details className="dropdown">
            <summary role="button" className="secondary">
              <i className="fa-light fa-hexagon-xmark"></i>
              &nbsp;&nbsp;Transfer/close account
            </summary>
            <ul>
              {/* <li> */}
              <li onClick={() => setDisplayContactTeam(true)}>
                <a>Transfer account</a>
              </li>
              {/* <li> */}
              <li onClick={() => setDisplayContactTeam(true)}>
                <a>Close account</a>
              </li>
            </ul>
          </details>

          <div className="pt_addnewbutton">
            <CustomButton
              buttonName={"Edit"}
              buttonType={buttonType.SECONDARY}
              iconClassName="fa-light fa-pen-to-square"
              actionType={"button"}
              onClick={() =>
                router.push(
                  `${
                    AppRoutes.USER_EDIT_BANK_ACCOUNTS
                  }/${getCompanyIdFromStorage()}/${getBankAccountId()}`
                )
              }
            />
          </div>
        </div>
      </div>
      {displayContactTeam && (
        <BaseModal
          modalId={"bank accounts delete modal"}
          displayModal={displayContactTeam}
          onHeaderIconClose={() => setDisplayContactTeam(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayContactTeam(false)}
          onConfirm={() => {
            router.push(AppRoutes.SUPPORT);
            return true;
          }}
          firstButtonName="Close"
          secondButtonName="Contact"
        >
          <h4 className="text_center">
            To carry out this process, please contact the support team
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
