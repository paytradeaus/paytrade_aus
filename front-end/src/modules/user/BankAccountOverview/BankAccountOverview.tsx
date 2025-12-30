"use client";
import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { getCompanyIdFromStorage } from "@/utils";
import Header from "./Header";
import BankAccountDetailsTab from "./BankAccountOverviewTab";
import { bankOverviewTabs } from "./BankAccountOverview.constants";
import { useBankAccountOverviewContext } from "./BankAccountOverviewContext";
import {
  AdminlistAllFinancialInstitution,
  fetchBankAccountDetails,
} from "./BankAccountsOverview.function";
import Transactions from "./TransactionsList";
import BankStatementList from "./BankStatementList";
import InterestAndChargesList from "./InterestAndChargesList";
import PaymentToDoList from "../PaymnetsToDo";
import Journals from "../TrustAccounting/JournalList";
import { setMatchTransactions } from "@/redux/slices/subscribeRouteBackDetails";
import { useDispatch } from "react-redux";

export default function BankAccountOverview() {
  const {
    getBankAccountId,
    setFinancialOpt,
    setBankDetailsData,
    setWrongIdCheck,
    activeTab,
    setLoader,
    refreshOverview,
    bankDetailsData,
    routeParams,
  }: any = useBankAccountOverviewContext();
  const dispatch = useDispatch();
  const params = useParams(); // Retrieve the params

  useEffect(() => {
    dispatch(setMatchTransactions({}));
  }, []);
  useEffect(() => {
    getBankAccountDetails();
  }, [refreshOverview]);

  async function getBankAccountDetails() {
    try {
      setLoader(true);
      if (getBankAccountId()) {
        let payload = {
          company_id:
            routeParams?.data?.length > 1
              ? +routeParams?.data[1]
              : getCompanyIdFromStorage(),
          bank_account_id: getBankAccountId(),
        };
        let viewResData: any = await fetchBankAccountDetails(payload);

        if (viewResData?.bank_account_id) {
          let financialListData = await AdminlistAllFinancialInstitution({
            page: null,
            perPage: null,
            keyword: null,
            status: null,
          });
          if (financialListData?.institutions?.length > 0) {
            let modifiedFinancialOpt = financialListData?.institutions?.find(
              (each: any) => each?.id === viewResData?.financial_institution
            );
            if (modifiedFinancialOpt) {
              setFinancialOpt(modifiedFinancialOpt);
            }
          }
          setBankDetailsData(viewResData);
        } else {
          setWrongIdCheck(true);
        }
      } else {
        setWrongIdCheck(true);
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  return (
    <div className="container-fluid">
      <Header />

      <BankAccountDetailsTab />

      <RenderDynamicTabs
        activeTab={activeTab}
        bankDetailsData={bankDetailsData}
        params={params}
      />
    </div>
  );
}

function RenderDynamicTabs({ activeTab, bankDetailsData, params }: any) {
  switch (activeTab) {
    case bankOverviewTabs.TRANSACTIONS:
      return <Transactions />;
    case bankOverviewTabs.BANK_STATEMENTS:
      return <BankStatementList />;
    case bankOverviewTabs.INTEREST_AND_CHARGES:
      return <InterestAndChargesList />;
    case bankOverviewTabs.TO_DO:
      return (
        <PaymentToDoList
          overViewDetails={{
            isOverViewMode: true,
            data: bankDetailsData,
            overviewType: "bankAccounts",
          }}
        />
      );
    case bankOverviewTabs.JOURNALS:
      return (
        <Journals
          overViewDetails={{ overBankViewMode: true, data: bankDetailsData }}
        />
      );

    default:
      return null;
  }
}
