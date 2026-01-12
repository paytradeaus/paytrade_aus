"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { projectOverviewTabs } from "./ProjectOverview.constant";
import ContractsList from "../../Contracts/ContractsList";
import PaymentLists from "../../PaymentsList";
import ClientsAndSuppliers from "../../ClientsAndSuppliers/ClientsAndSuppliersList/clientsAndSuppliers";
import VariationsList from "../../Variations/VariationsList";
import BankAccounts from "../../BankAccounts";
import RetentionLists from "../../RetentionList";
import Journals from "../../TrustAccounting/JournalList";
import CompliancesList from "../../Compliances/CompliancesList";
import Header from "./Header";
import ProjectDetailsTab from "./ProjectOverviewTab";
import { viewProjectDetails } from "./ProjectOverview.function";
import OverviewClaims from "./OverviewClaims";
import { overviewModeType } from "../../PaymentsList/PaymentList.constants";
import NoticesList from "../../Notices";
import { useProjectOverviewContext } from "./ProjectOverviewContext";
import PayApps from "../../PayApps";

export default function ProjectOverview() {
  const { activeTab }: any = useProjectOverviewContext();
  const params = useParams();
  const [projectData, setProjectData] = useState<any>({});
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  useEffect(() => {
    getProjectOverview();
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
        setWrongIdCheck(true);
      }
    }
  }

  return (
    <div className="container-fluid">
      <Header />
      <ProjectDetailsTab setData={(v: any) => setProjectData(v)} />
      <RenderDynamicTabs activeTab={activeTab} projectData={projectData} />
    </div>
  );
}

function RenderDynamicTabs({
  activeTab,
  projectData,
}: Readonly<{
  activeTab: string;
  projectData: any;
}>) {
  switch (activeTab) {
    case projectOverviewTabs.CONTRACTS:
      return (
        <ContractsList
          overViewDetails={{
            overViewMode: true,
            data: projectData,
            screenName: "projects",
            projectName: projectData?.project_name,
          }}
        />
      );
    case projectOverviewTabs.CLAIMS:
      return (
        <OverviewClaims
          overViewDetails={{
            overViewMode: true,
            data: projectData,
            screenName: "projects",
            projectName: projectData?.project_name,
          }}
        />
      );
    case projectOverviewTabs.PAYMENTS:
      return (
        <PaymentLists
          overViewDetails={{
            overViewMode: true,
            data: projectData,
            overViewType: overviewModeType.PROJECTS,
          }}
        />
      );
    case projectOverviewTabs.CLIENTSANDSUPPLIERS:
      return (
        <ClientsAndSuppliers
          overViewDetails={{
            overViewMode: true,
            data: projectData,
            overViewType: overviewModeType.PROJECTS,
          }}
        />
      );
    case projectOverviewTabs.VARIATIONS:
      return (
        <VariationsList
          overViewDetails={{
            overViewMode: true,
            data: projectData,
            screenName: "projects",
            projectName: projectData?.project_name,
          }}
        />
      );
    case projectOverviewTabs.BANK_ACCOUNTS:
      return (
        <BankAccounts
          overViewDetails={{
            overViewMode: true,
            data: projectData,
            overViewType: overviewModeType.PROJECTS,
          }}
        />
      );
    case projectOverviewTabs.RETENTIONS:
      return (
        <RetentionLists
          UniqueProject={projectData?.project_id}
          overViewMode={true}
          screenName={overviewModeType.PROJECTS}
        />
      );
    case projectOverviewTabs.NOTICES:
      return (
        <NoticesList
          overViewDetails={{
            overViewMode: true,
            data: projectData,
            screenName: "projects",
            projectName: projectData?.project_name,
          }}
        />
      );
    case projectOverviewTabs.JOURNALS:
      return (
        <Journals
          overViewDetails={{
            overViewMode: true,
            contract_id: null,
            project_id: projectData?.project_id,
            screenName: "projects",
          }}
        />
      );
    case projectOverviewTabs.COMPLIANCES:
      return (
        <CompliancesList
          overViewDetails={{
            overViewMode: true,
            data: projectData,
            screenName: "projects",
            projectName: projectData?.project_name,
          }}
        />
      );

    default:
      return null;
  }
}
