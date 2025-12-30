import React, { Fragment } from "react";
import { useBankAccountOverviewContext } from "./BankAccountOverviewContext";
import { formatDate, getCompanyIdFromStorage } from "@/utils";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import TabSwitch from "@/components/TabSwitch";
import { bankOverviewTabOptions } from "./BankAccountOverview.constants";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch } from "react-redux";
import { AppRoutes } from "@/shared/constant/appRoutes";

export default function BankAccountDetailsTab() {
  const dispatch = useDispatch();
  const {
    bankDetailsData,
    financialOpt,
    setActiveTab,
    activeTab,
    router,
    getBankAccountId,
  }: any = useBankAccountOverviewContext();

  return (
    <Fragment>
      <div className="pt_overviewinfo">
        <div>
          <div className="pt_infolist">
            <div className="pt_infolistdata">
              <h6>Opening Date</h6>
              {bankDetailsData?.opening_date
                ? formatDate(bankDetailsData?.opening_date)
                : ""}
            </div>
            <div className="pt_infolistdata">
              <h6>Date Added</h6>
              {bankDetailsData?.created_on
                ? formatDate(bankDetailsData?.created_on)
                : ""}
            </div>
            <div className="pt_infolistdata">
              <h6>Account Number</h6>
              {bankDetailsData?.account_number}
            </div>
            <div className="pt_infolistdata">
              <h6>BSB Number</h6>
              {bankDetailsData?.bsb_number}
            </div>
            <div className="pt_infolistdata">
              <h6>Account Type</h6>
              {bankDetailsData?.account_type}
            </div>
            <div className="pt_infolistdata">
              <h6>Financial Institution</h6>
              {financialOpt?.institution_name ||
                bankDetailsData?.financial_institution}
            </div>
            <div className="pt_infolistdata">
              <h6>Status</h6>
              {bankDetailsData?.status}
            </div>
          </div>
          <div className="pt_infodata">
            <div className="pt_infolistdata">
              <h6>Current Balance</h6>
              {`$${
                bankDetailsData?.current_balance
                  ?.toFixed(2)
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",") || `0.00`
              }`}
              <h6>
                Updated:{" "}
                <b>
                  {" "}
                  {bankDetailsData?.created_on
                    ? formatDate(bankDetailsData?.updated_on)
                    : ""}
                </b>
              </h6>
            </div>
            <div className="pt_infolistdata">
              <h6>Interest/Charges</h6>
              {"$" +
                bankDetailsData?.interest_charges_sum
                  ?.toFixed(2)
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              <h6>
                Updated:{" "}
                <b>
                  {" "}
                  {bankDetailsData?.created_on
                    ? formatDate(bankDetailsData?.updated_on)
                    : ""}
                </b>
              </h6>
            </div>
            <div className="pt_infolistdata">
              <h6>Update Type</h6>
              {bankDetailsData?.last_updated_type}
            </div>
          </div>
        </div>
      </div>
      <div className="grid pt_topfilters">
        <div className="pt_filters">
          <TabSwitch
            tabOptions={bankOverviewTabOptions}
            onChange={(value: any) => {
              dispatch(setScreenDetails({}));
              router.replace(
                `${
                  AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW
                }/${getBankAccountId()}/${getCompanyIdFromStorage()}`
              );
              setActiveTab(value);
            }}
            tabValue={activeTab}
          />
        </div>
      </div>
    </Fragment>
  );
}
