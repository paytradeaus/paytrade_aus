"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";

import React, { useEffect, useState } from "react";
import { trustAccountingTabs } from "./trustAccounting.constant";
import AuditList from "./AuditList";
import ReconciliationList from "./ReconciliationList";
import { useRouter, useSearchParams } from "next/navigation";
import { getCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
import Journals from "./JournalList";
import UserLedger from "./LedgerList";
import UserTrialList from "./TrialList";
import UserDeposits from "./DepositList";

export default function TrustAccountingHome(props: any) {
  const { isFromAdmin = false } = props;
  const [activeTab, setActiveTab] = useState("Journals");
  const queryParams: any = useSearchParams();
  const [role, setRole] = useState<string | null>(null);
  function handleTabChange(value: string) {
    setActiveTab(value);
  }
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decodedToken: any = jwtDecode(token);
      setRole(decodedToken?.role);
    }
  }, []);

  useEffect(() => {
    const tab = queryParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [queryParams]);
  const renderTabSwitch = () => {
    switch (activeTab) {
      case "Journals":
        return <Journals isFromAdmin={isFromAdmin} />;
      case "Account Ledger":
        return <UserLedger isFromAdmin={isFromAdmin} />;
      case "Trial Balance Statement":
        return <UserTrialList isFromAdmin={isFromAdmin} />;
      case "Deposits and Withdrawals Report":
        return <UserDeposits isFromAdmin={isFromAdmin} />;
      case "Reconciliation Record":
        return <ReconciliationList isFromAdmin={isFromAdmin} />;
      case "Audit":
        return <AuditList isFromAdmin={isFromAdmin} />;

      default:
        return null;
    }
  };
  const handleTabClick = (tabId: string) => {
    if (activeTab !== tabId) {
      setActiveTab(tabId);
      const tabParam = new URLSearchParams({ tab: tabId }).toString();
      if (role === "PORTAL ADMIN") {
        router.push(
          ` /admin/journals/trust-accounting?${tabParam}&bank=${getCookie(
            "bankId"
          )}&comp=${getCookie("compId")}`
        );
      } else {
        router.push(`/user/trust-accounting?${tabParam}`);
      }
    }
  };
  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
            ]}
            activeRoute={"Trust Accounting"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Trust Accounting</h1>
          </div>
        </div>
      </div>
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            <div role="group">
              <TabSwitch
                tabOptions={trustAccountingTabs}
                onChange={(value: any) => handleTabChange(value)}
              />
            </div>
          </div>
        </div>
      </div>
      {renderTabSwitch()}
    </div>
  );
}
