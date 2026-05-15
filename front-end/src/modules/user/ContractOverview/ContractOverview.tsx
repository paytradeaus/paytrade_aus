"use client";
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Header from "./Header";
import BankAccountDetailsTab from "./ContractOverviewTab";
import { contractOverviewTabs } from "./ContractOverview.constants";
import { useContractOverviewContext } from "./ContractOverviewContext";
import { viewContractDetailsById } from "./ContractOverview.function";
import VariationsList from "../Variations/VariationsList";
import PayApps from "../PayApps";
import PaymentLists from "../PaymentsList";
import NoticesList from "../Notices";
import RetentionLists from "../RetentionList";
import { useReportAiContext } from "@/hooks/useReportAiContext";

export default function ContractOverview() {
  const { fetchContractDetails, activeTab, setLoader, bankDetailsData }: any =
    useContractOverviewContext();
  const [wrongIdCheck, setWrongIdCheck] = useState(false);

  const params = useParams();
  const [contractData, setContractData] = useState<any>({});

  useEffect(() => {
    fetchContractDetails();
  }, []);

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
        setWrongIdCheck(true);
      }
    }
    setLoader(false);
  }

  useReportAiContext({
    summary: contractData?.contract_name
      ? `Contract: ${contractData.contract_name}` +
        (contractData?.contract_status
          ? `, status: ${contractData.contract_status}`
          : "")
      : undefined,
    facts: contractData?.contract_name
      ? {
          contract: contractData.contract_name,
          status: contractData?.contract_status,
          project: contractData?.project_name,
          client_supplier: contractData?.client_supplier_name,
          contract_value: contractData?.initial_contract_sum,
        }
      : undefined,
  });

  return (
    <div className="container-fluid">
      <Header />
      <BankAccountDetailsTab />
      <RenderDynamicTabs
        activeTab={activeTab}
        bankDetailsData={bankDetailsData}
        contractData={contractData}
      />
    </div>
  );
}

function RenderDynamicTabs({
  activeTab,
  bankDetailsData,
  contractData,
}: {
  activeTab: string;
  bankDetailsData: any;
  contractData: any;
}) {
  switch (activeTab) {
    case contractOverviewTabs.CLAIMS:
      return (
        <PayApps
          overViewDetails={{
            overViewMode: true,
            data: contractData,
            screenName: "contracts",
            contractName: contractData?.contract_name,
          }}
        />
      );
    case contractOverviewTabs.PAYMENTS:
      return (
        <PaymentLists
          overViewDetails={{
            overViewMode: true,
            data: contractData,
            screenName: "contracts",
            contractName: contractData?.contract_name,
          }}
        />
      );
    case contractOverviewTabs.NOTICES:
      return (
        <NoticesList
          overViewDetails={{
            overViewMode: true,
            data: contractData,
            screenName: "contracts",
            contractName: contractData?.contract_name,
          }}
        />
      );
    case contractOverviewTabs.RETENTIONS:
      return (
        <RetentionLists
          UniqueContract={contractData?.contract_id}
          screenName={"contracts"}
          overViewMode={true}
        />
      );
    case contractOverviewTabs.VARIATIONS:
      return (
        <VariationsList
          overViewDetails={{
            overViewMode: true,
            data: contractData,
            screenName: "contracts",
            projectName: contractData?.contract_name,
          }}
        />
      );
    default:
      return null;
  }
}
