"use client";

import React, { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./trustAccounting.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { Row } from "react-bootstrap";
import { tabs } from "./trustAccounting.constant";
import TabContainer from "@/container/addGroups/tabsContainer";
import dynamic from "next/dynamic";
import { getCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";

// Dynamically import components with Suspense enabled
const LedgerJournals = dynamic(
  () => import("./ledgerJournals/ledgerJournals"),
  { suspense: true }
);
const Ledger = dynamic(() => import("./ledger/ledger"), { suspense: true });
const TrialBalanceStatement = dynamic(() => import("./trial/trial"), {
  suspense: true,
});
const Deposit = dynamic(() => import("./deposits/deposits"), {
  suspense: true,
});
const Reconciliation = dynamic(
  () => import("./reconcialiation/reconciliation"),
  { suspense: false }
);
const Audit = dynamic(() => import("./audit/audit"), { suspense: false });

const TrustAccounting = (props: any) => {
  const { isFromAdmin = false } = props;
  const routePath = usePathname();
  const router = useRouter();
  const queryParams: any = useSearchParams();
  const [activeTab, setActiveTab] = useState("Journals");
  const [role, setRole] = useState<string | null>(null);

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
        return <LedgerJournals isFromAdmin={isFromAdmin} />;
      case "Account Ledger":
        return <Ledger />;
      case "Trial Balance Statement":
        return <TrialBalanceStatement />;
      case "Deposits and Withdrawals Report":
        return <Deposit />;
      case "Reconciliation Record":
        return <Reconciliation />;
      case "Audit":
        return <Audit />;
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

  const breadcrumbItems =
    role === "PORTAL ADMIN"
      ? [
          {
            href: "/admin/dashboard",
            label: "Home",
            active: routePath === "/admin/dashboard",
          },
          {
            href: "/admin/journals",
            label: "Journals",
            active: routePath === "/admin/journals",
          },
          {
            href: "/admin/journals/trust-accounting",
            label: "Trust Accounting",
            active: routePath === "/admin/journals/trust-accounting",
          },
        ]
      : [
          {
            href: "/user/dashboard",
            label: "Home",
            active: routePath === "/user/dashboard",
          },
          {
            href: "/user/trust-accounting",
            label: "Trust Accounting",
            active: routePath === "/user/trust-accounting",
          },
        ];

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={breadcrumbItems}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Trust Accounting</span>
      </div>
      <div className={styles.headerAndButtonCon}>
        <span className={styles.textAndSelectCon}>
          <TabContainer
            tabs={tabs}
            activeTab={activeTab}
            onTabClick={handleTabClick}
          />
        </span>
      </div>
      <div>
        <Row>
          <Suspense fallback={<>Loading...</>}>
            <Row>{renderTabSwitch()}</Row>
          </Suspense>
        </Row>
      </div>
    </div>
  );
};

export default TrustAccounting;
