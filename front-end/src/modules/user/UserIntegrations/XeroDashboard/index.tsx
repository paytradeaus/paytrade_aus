"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DynamicTable from "@/components/Table";

import Link from "next/link";
import {
  integrationStatus,
  xeroSyncListHeaders,
  xeroSynListRenderData,
} from "../integration.constant";
import CustomButton from "@/components/CustomButton/CustomButton";
import {
  buttonType,
  filterByDurationDates,
  InputType,
  VIEW,
} from "@/shared/constant/general";
import { isValid } from "date-fns";
import {
  autoMappingBankAccounts,
  autoMappingContact,
  autoMappingContract,
  autoMappingProject,
  createTrackingCategory,
  getTrackingCategories,
  getXeroDashboardCountForCompany,
  getXeroDetailsForCompany,
  manualXeroResync,
  manualXeroResyncLookup,
  manualXeroPaytradeLookup,
  manualXeroPreflight,
  manualXeroTwoSidedSync,
  manualXeroCatchupDiscover,
  CatchupRow,
  SkipContractMapping,
  syncAllBankAccountsByCompanyId,
  syncAllContactsByCompanyId,
  syncAllContractsByCompanyId,
  syncAllProjectsByCompanyId,
  updateTrackingCategory,
  xeroSyncLogs,
  xeroSyncLogsForClaim,
} from "../integration.functions";
import BaseModal, { baseModalConstants } from "@/components/BaseModal";
import FormikControl from "@/components/FormikControl";
import { formatDate, stripHtml } from "@/utils";
import { format, formatDistanceToNow } from "date-fns";
import { showErrorToast } from "@/components/Toaster";

// Task #95 — pill style retained for the auto-recovered toggle and the
// "Filtered: claim #N" badge. All other Sync Log toolbar controls now use
// the system FormikControl SELECT / DATE_PICKER components (matching the
// Account Ledger / Journals filter bars exactly), so the bespoke
// `syncLogFilterControl` style was removed.
// Catch-up classification → display colour (mirrors `sync_status_style`).
const catchupStatusMap: Record<string, { label: string; color: string }> = {
  already_in_sync: { label: "Linked", color: "green" },
  needs_link: { label: "Needs link", color: "orange" },
  amounts_disagree: { label: "Amounts disagree", color: "orange" },
  needs_push: { label: "PT only — needs push", color: "blue" },
  needs_import: { label: "Xero only — needs import", color: "blue" },
  blocked: { label: "Blocked", color: "red" },
};

const syncLogPillStyle = (active: boolean): React.CSSProperties => ({
  height: "28px",
  lineHeight: "26px",
  padding: "0 12px",
  fontSize: "11px",
  fontWeight: 600,
  borderRadius: "14px",
  color: active ? "#fff" : "#0b5394",
  backgroundColor: active ? "#0b5394" : "#e0f0ff",
  border: "1px solid #b3d4f5",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  boxSizing: "border-box",
});

export default function XeroDashboard() {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [xeroData, setXeroData] = useState<any>();
  const [disableStepButton, setDisableStepButton] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [xeroDetailsLoading, setXeroDetailsLoading] = useState(false);
  const [dashboardCount, setDashboardCount] = useState<any>();

  const [manualMappingModal, setManualMappingModal] = useState<boolean>(false);
  const [currentMappingData, setCurrentMappingData] = useState<{
    from: "bank account" | "contact" | "contract" | "project" | "settings";
    total?: number;
    mapped?: number;
    unmapped?: number;
  } | null>(null);

  const [showXeroCategoryModal, setShowXeroCategoryModal] =
    useState<boolean>(false);
  const [trackingCategories, setTrackingCategories] = useState([]);
  const [selectedTrackingCategoryProject, setTrackingCategoryProject] =
    useState("");
  const [selectedTrackingCategoryContract, setTrackingCategoryContract] =
    useState("");
  const [trackingCategoriesLoading, setTrackingCategoriesLoading] =
    useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [recoveredOnly, setRecoveredOnly] = useState<boolean>(false);
  const [claimFilterId, setClaimFilterId] = useState<number | null>(null);
  // Task #107 — single Claims-style Search box that replaces the old narrow
  // numeric input. Numeric input routes to the claim-id filter endpoint;
  // non-numeric input becomes a client-side substring filter on the loaded
  // page rows (matched against sync_type, reference, message, system,
  // project, process — see `_searchText` in the row mappers below).
  const [syncSearchText, setSyncSearchText] = useState<string>("");
  const [clearSyncSearch, setClearSyncSearch] = useState<boolean>(false);
  // Task #95 — Sync Log date filter mirrors the Account Ledger / Journals
  // pattern: a single `filterByDurationDates` SELECT (All dates / Custom /
  // Last month / This month) plus an `isCustomDate` flag that reveals two
  // FormikControl DATE_PICKER inputs on a row underneath when "Custom" is
  // chosen. start/end are stored as `Date | null` to match the trust
  // accounting controls.
  const [selectedDateRange, setSelectedDateRange] =
    useState<string>("All dates");
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);
  const [activityStartDate, setActivityStartDate] = useState<Date | null>(null);
  const [activityEndDate, setActivityEndDate] = useState<Date | null>(null);
  const [syncTypeFilter, setSyncTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Sync types come from xero_log_templates.sync_type (see seed file).
  const SYNC_TYPE_OPTIONS = [
    "Invoices",
    "Bills",
    "Payments",
    "Contacts",
    "Bank accounts",
    "Projects",
    "Contracts",
    "Retention journals",
    "Manual sync",
    "Invoice schedulers",
    "Invoice webhook",
    "Contact schedulers",
    "Contact webhook",
    "Project schedulers",
    "Contract schedulers",
    "Account schedulers",
    "Variable bill code",
    "Claims",
  ];
  const STATUS_OPTIONS = ["Succeeded", "Warning", "Failed"];
  const [syncLogData, setSyncLogData] = useState<any>({
    succeeded: 0,
    warning: 0,
    failed: 0,
    tableData: [],
  });
  const [categoryTrackingError, setCategoryTrackingError] =
    useState<string>("");
  const handleRowClick = (rowData: any) => {
    router.push("/user/integrations/xero/syncLogDetails/" + rowData?.id);
  };
  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (rowData: any) => handleRowClick(rowData),
      displayByDefault: true,
    },
  ];
  const companyId = +(localStorage.getItem("companyId") || 0);
  const [manualSyncOpen, setManualSyncOpen] = useState<boolean>(false);
  const steps = [
    {
      number: "01",
      title: "Connected - pending settings/mapping",
      buttonName: "Map",
      iconClassName: "fa-light fa-map",
      from: "settings",
    },
    {
      number: "02",
      title: "Pending bank account mapping",
      buttonName: "Import",
      iconClassName: "fa-light fa-file-import",
      from: "bank account",
    },
    {
      number: "03",
      title: "Pending contact mapping",
      buttonName: "Import",
      iconClassName: "fa-light fa-file-import",
      from: "contact",
    },
    {
      number: "04",
      title: "Pending project tracking category mapping",
      buttonName: "Import",
      iconClassName: "fa-light fa-file-import",
      from: "project",
    },
    {
      number: "05",
      title: "Pending contract tracking category mapping",
      buttonName: "Import",
      iconClassName: "fa-light fa-file-import",
      secondButtonName: "Skip",
      secondIconClassName: "fa-light fa-forward",
      twoButtons: true,
      from: "contract",
    },
    {
      number: "06",
      title: "Connected - active",
      from: "",
    },
  ];

  useEffect(() => {
    fetchGetXeroDetailsForCompany();
  }, []);

  const fetchGetXeroDetailsForCompany = async () => {
    setDisableStepButton(true);
    const data = await getXeroDetailsForCompany();
    console.log(data);
    setXeroData(data);
    setCurrentStep(
      integrationStatus[
        data?.integration_status as keyof typeof integrationStatus
      ] == undefined
        ? 7
        : integrationStatus[
            data?.integration_status as keyof typeof integrationStatus
          ]
    );
    // setCurrentStep(7);
    handleXeroDashboardCountForCompany();
    setDisableStepButton(false);
    if (
      integrationStatus[
        data?.integration_status as keyof typeof integrationStatus
      ] == 6
    ) {
      fetchXeroSyncLogs();
    }
  };

  const syncAndAuthMap = async (index: number) => {
    if (index === 0) {
      setCurrentMappingData({
        from: "settings",
      });
      setTrackingCategoryProject(xeroData.project_category_id);
      setTrackingCategoryContract(xeroData.contract_category_id);
      fetchGetTrackingCategories();
      setShowXeroCategoryModal(true);
      return;
    }
    setDisableStepButton(true);
    if (index === 1) {
      const data = await syncAllBankAccountsByCompanyId({
        companyId,
      });
      // const data = await autoMappingBankAccounts({
      //   companyId,
      // });
      if (data.unmapped > 0) {
        setCurrentMappingData({
          ...data,
          from: "bank account",
        });
        setTimeout(() => {
          setManualMappingModal(true);
        }, 1000);
      }
    } else if (index === 2) {
      const data = await syncAllContactsByCompanyId({
        companyId,
      });
      // const data = await autoMappingContact({
      //   companyId,
      // });
      if (data.unmapped > 0) {
        setCurrentMappingData({
          ...data,
          from: "contact",
        });
        setTimeout(() => {
          setManualMappingModal(true);
        }, 1000);
      }
    } else if (index === 3) {
      const data = await syncAllProjectsByCompanyId({
        companyId,
      });
      // const data = await autoMappingProject({
      //   companyId,
      // });
      if (data.unmapped > 0) {
        setCurrentMappingData({
          ...data,
          from: "project",
        });
        setTimeout(() => {
          setManualMappingModal(true);
        }, 1000);
      }
    } else if (index === 4) {
      const data = await syncAllContractsByCompanyId({
        companyId,
      });
      // const data = await autoMappingContract({
      //   companyId,
      // });
      if (data.unmapped > 0) {
        setCurrentMappingData({
          ...data,
          from: "contract",
        });
        setTimeout(() => {
          setManualMappingModal(true);
        }, 1000);
      }
    }
    fetchGetXeroDetailsForCompany();
  };

  async function handleSkipContractMapping() {
    await SkipContractMapping({
      companyId,
    });
    fetchGetXeroDetailsForCompany();
  }

  function fetchGetTrackingCategories(showToast = false) {
    setTrackingCategoriesLoading(true);
    getTrackingCategories(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      showToast
    ).then((data) => {
      setTrackingCategories(data.tracking_category_list);
      setTrackingCategoriesLoading(false);
    });
  }

  async function handleCategoryTracking() {
    try {
      let api = [];
      if (trackingCategories.length == 0) {
        await createTrackingCategory({
          categoryName: "Project",
          companyId: +(localStorage.getItem("companyId") || 0),
        });
        await createTrackingCategory({
          categoryName: "Contract",
          companyId: +(localStorage.getItem("companyId") || 0),
        });
        const trackingList = await getTrackingCategories(
          {
            companyId: +(localStorage.getItem("companyId") || 0),
          },
          false
        );
        await updateTrackingCategory({
          categoryId: trackingList.tracking_category_list.find(
            (val: { name: string }) => val.name == "Contract"
          )?.id,
          categoryType: "contract",
          id: localStorage.getItem("xeroIntegrationId"),
        });
        await updateTrackingCategory({
          categoryId: trackingList.tracking_category_list.find(
            (val: { name: string }) => val.name == "Project"
          )?.id,
          categoryType: "project",
          id: localStorage.getItem("xeroIntegrationId"),
        });
      }
      if (
        selectedTrackingCategoryProject &&
        selectedTrackingCategoryContract &&
        selectedTrackingCategoryProject == selectedTrackingCategoryContract
      ) {
        setCategoryTrackingError(
          "The Project and Contract tracking categories must not be identical."
        );
        return false;
      }

      if (selectedTrackingCategoryProject) {
        api.push(
          updateTrackingCategory({
            categoryId: selectedTrackingCategoryProject,
            categoryType: "project",
            id: localStorage.getItem("xeroIntegrationId"),
          })
        );
      }
      if (selectedTrackingCategoryContract) {
        api.push(
          updateTrackingCategory({
            categoryId: selectedTrackingCategoryContract,
            categoryType: "contract",
            id: localStorage.getItem("xeroIntegrationId"),
          })
        );
      }
      await Promise.all(api);
      // setTimeout(async () => {
      // await fetchGetXeroDetailsForCompany();
      router.push("/user/integrations/xero/settings");
      // }, 2000);
      return true;
    } catch (error) {
      console.error("Error updating tracking categories:", error);
    }
  }

  const handleMappingNavigation = (from?: any) => {
    const routerUrl: any = {
      "bank account": "/user/integrations/xero/bankAccounts?navigateTo=2",
      contact: "/user/integrations/xero/contacts?navigateTo=2",
      contract: "/user/integrations/xero/contracts?navigateTo=2",
      project: "/user/integrations/xero/projects?navigateTo=2",
      settings: "/user/integrations/xero/settings?navigateTo=2",
    };
    if (from) {
      router.push(routerUrl[from]);
    }
    if (currentMappingData) {
      router.push(routerUrl[currentMappingData.from]);
    }
  };
  function handleXeroDashboardCountForCompany() {
    getXeroDashboardCountForCompany({
      companyId,
    }).then((data) => {
      setDashboardCount({
        bankSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "bank" && val.status == "synced"
        )?.status_count,
        bankPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "bank" && val.status == "pending"
        )?.status_count,
        contactSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "contact" && val.status == "synced"
        )?.status_count,
        contactPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "contact" && val.status == "pending"
        )?.status_count,
        projectSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "project" && val.status == "synced"
        )?.status_count,
        projectPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "project" && val.status == "pending"
        )?.status_count,
        contractSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "contract" && val.status == "synced"
        )?.status_count,
        contractPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "contract" && val.status == "pending"
        )?.status_count,
        billSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "bill" && val.status == "synced"
        )?.status_count,
        billPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "bill" && val.status == "pending"
        )?.status_count,
        invoiceSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "invoice" && val.status == "synced"
        )?.status_count,
        invoicePending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "invoice" && val.status == "pending"
        )?.status_count,
      });
    });
  }

  useEffect(() => {
    fetchXeroSyncLogs();
  }, [
    currentPage,
    entriesPerPage,
    sortValues,
    recoveredOnly,
    claimFilterId,
    selectedDateRange,
    isCustomDate,
    activityStartDate,
    activityEndDate,
    syncTypeFilter,
    statusFilter,
  ]);

  const RECOVERED_TEMPLATE_IDS = [493, 495];
  const RECOVERED_ERROR_CODES = [
    "RETENTION_TRANSFER_RECOVERED",
    "PAYMENT_ALREADY_SETTLED_IN_XERO",
  ];
  const isRecoveredRow = (val: any): boolean => {
    if (!val) return false;
    if (
      val.log_template_id != null &&
      RECOVERED_TEMPLATE_IDS.includes(Number(val.log_template_id))
    ) {
      return true;
    }
    if (val.error_code && RECOVERED_ERROR_CODES.includes(val.error_code)) {
      return true;
    }
    return false;
  };
  const recoveredBadgeStyle: React.CSSProperties = {
    display: "inline-block",
    marginLeft: "6px",
    padding: "1px 6px",
    fontSize: "10px",
    fontWeight: 600,
    lineHeight: "14px",
    color: "#0b5394",
    backgroundColor: "#e0f0ff",
    border: "1px solid #b3d4f5",
    borderRadius: "10px",
    cursor: "help",
    verticalAlign: "middle",
  };
  const recoveredTooltip =
    "Auto-recovered: PayTrade detected a Xero record that already matched this payment (or settlement) and re-linked it automatically instead of creating a duplicate or failing the sync.";

  const sync_status_style: any = {
    Succeeded: <span style={{ color: "green" }}>Succeeded</span>,
    Failed: <span style={{ color: "red" }}>Failed</span>,
  };

  function mapClaimSyncRows(rows: any[]) {
    return (rows || []).map((val: any) => {
      const distanceAgo = val.created_on
        ? formatDistanceToNow(new Date(val.created_on), { addSuffix: true })
        : "";
      const createdDate = val.created_on
        ? format(new Date(val.created_on), "EEE dd MMM yyyy hh:mm a")
        : "";
      const isXeroToPaytrade =
        (val.process || "").split(">")[0].trim() === "Xero";
      const fullDescription = val.description ? stripHtml(val.description) : "";
      const truncatedDescription =
        fullDescription.length > 80
          ? `${fullDescription.slice(0, 80)}…`
          : fullDescription;
      return {
        ...val,
        // Task #107 — concat-lowercased searchable text so the Search box
        // can substring-match against the visible columns even though the
        // displayed `description` / `process` / `sync_status` get replaced
        // with JSX below.
        _searchText: [
          val.sync_type,
          val.reference,
          fullDescription,
          val.system,
          val.project_name,
          isXeroToPaytrade ? "Xero Pay Trade" : "Pay Trade Xero",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
        created_on: val.created_on ? formatDate(val.created_on) : "",
        description: fullDescription ? (
          <span title={fullDescription}>{truncatedDescription}</span>
        ) : (
          ""
        ),
        process: isXeroToPaytrade ? (
          <span style={{ color: "#12afe4" }}>Xero ➤ Pay Trade</span>
        ) : (
          <span style={{ color: "#f04e43" }}>Pay Trade ➤ Xero</span>
        ),
        sync_status: (
          <span>
            {sync_status_style[val.sync_status] || val.sync_status}
          </span>
        ),
        reference: val.reference || "",
        project_name: "",
        started: (
          <>
            <span>{createdDate}</span>
            <span
              style={{ color: "gray", display: "block", marginTop: "-22px" }}
            >
              {distanceAgo}
            </span>
          </>
        ),
      };
    });
  }

  async function fetchXeroSyncLogs() {
    setTableLoader(true);
    if (claimFilterId != null) {
      const rows = await xeroSyncLogsForClaim(claimFilterId);
      const safeRows = Array.isArray(rows) ? rows : [];
      const countBy = (status: string) =>
        safeRows.filter((r: any) => r.sync_status === status).length;
      const start = (currentPage - 1) * entriesPerPage;
      const pageRows = safeRows.slice(start, start + entriesPerPage);
      setSyncLogData({
        succeeded: countBy("Succeeded"),
        warning: countBy("Warning"),
        failed: countBy("Failed"),
        tableData: mapClaimSyncRows(pageRows),
      });
      setTotalRows(safeRows.length);
      setTableLoader(false);
      return;
    }
    // Task #95 — date filter mirrors the Account Ledger pattern. The
    // server already understands "This Month" / "Last Month" / "Custom",
    // so we forward `selectedDateRange` directly. For Custom we also
    // send the picked start/end dates as YYYY-MM-DD.
    let dateFilter: string | null = null;
    let startDateToSend: string | null = null;
    let endDateToSend: string | null = null;
    if (isCustomDate && activityStartDate && activityEndDate) {
      dateFilter = "Custom";
      startDateToSend = format(new Date(activityStartDate), "yyyy-MM-dd");
      endDateToSend = format(new Date(activityEndDate), "yyyy-MM-dd");
    } else if (
      selectedDateRange &&
      selectedDateRange !== "All dates" &&
      selectedDateRange !== "Custom"
    ) {
      dateFilter = selectedDateRange;
    }
    const logs = await xeroSyncLogs({
      getXeroSyncLogsInput: {
        id: localStorage.getItem("xeroIntegrationId"),
        date_filter: dateFilter,
        start_date: startDateToSend,
        end_date: endDateToSend,
        page_number: currentPage,
        page_size: entriesPerPage,
        sorting_order: sortValues?.direction || "",
        sorting_field: sortValues?.sortKey || "",
        recovered_only: recoveredOnly,
        sync_type: syncTypeFilter || null,
        sync_status: statusFilter || null,
      },
    });
    setSyncLogData({
      succeeded: logs.count.find(
        (val: { sync_status: string }) => val.sync_status == "Succeeded"
      ).status_count,
      warning: logs.count.find(
        (val: { sync_status: string }) => val.sync_status == "Warning"
      ).status_count,
      failed: logs.count.find(
        (val: { sync_status: string }) => val.sync_status == "Failed"
      ).status_count,
      tableData: logs.xero_logs.map((val: any) => {
        const distanceAgo = formatDistanceToNow(new Date(val.created_on), {
          addSuffix: true,
        });
        const createdDate = format(
          new Date(val.created_on),
          "EEE dd MMM yyyy hh:mm a"
        );
        // Decide process direction
        const isXeroToPaytrade = val.process?.split(">")[0].trim() === "Xero";
        const fullDescription = val.description ? stripHtml(val.description) : "";
        const truncatedDescription =
          fullDescription.length > 80
            ? `${fullDescription.slice(0, 80)}…`
            : fullDescription;
        const refStr = isXeroToPaytrade
          ? val.reference?.xeroId || ""
          : val.reference?.paytradeId || "";
        return {
          ...val,
          // Task #107 — see mapClaimSyncRows comment.
          _searchText: [
            val.sync_type,
            refStr,
            fullDescription,
            val.system,
            val.project_name,
            isXeroToPaytrade ? "Xero Pay Trade" : "Pay Trade Xero",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
          created_on: val.created_on ? formatDate(val.created_on) : "",
          description: fullDescription ? (
            <span title={fullDescription}>{truncatedDescription}</span>
          ) : (
            ""
          ),
          process:
            val.process?.split(">")[0].trim() == "Xero" ? (
              <span style={{ color: "#12afe4" }}>Xero ➤ Pay Trade</span>
            ) : (
              <span style={{ color: "#f04e43" }}>Pay Trade ➤ Xero</span>
            ),
          sync_status: (
            <span>
              {sync_status_style[val.sync_status] || val.sync_status}
              {isRecoveredRow(val) && (
                <span
                  style={recoveredBadgeStyle}
                  title={recoveredTooltip}
                  aria-label="Auto-recovered sync"
                >
                  Recovered
                </span>
              )}
            </span>
          ),
          reference: refStr,
          started: (
            <>
              <span>{createdDate}</span>
              <span
                style={{ color: "gray", display: "block", marginTop: "-22px" }}
              >
                {distanceAgo}
              </span>
            </>
          ),
        };
      }),
    });
    setTotalRows(logs.total_count);
    setTableLoader(false);
  }

  // Task #107 — Single Search box semantics. Numeric input → claim-id
  // filter endpoint (matches the prior "Apply" button behaviour).
  // Non-numeric → client-side substring filter on the loaded page rows.
  // Empty input clears both. Always resets to page 1.
  function handleSyncLogSearch(rawValue: string) {
    const v = (rawValue || "").trim();
    setCurrentPage(1);
    if (!v) {
      if (claimFilterId != null) setClaimFilterId(null);
      if (syncSearchText) setSyncSearchText("");
      return;
    }
    if (/^\d+$/.test(v)) {
      // Numeric → claim-id filter; clear text-search and disable
      // recovered-only (mirrors the previous Apply button behaviour).
      const n = parseInt(v, 10);
      if (!Number.isFinite(n) || n <= 0) {
        // Invalid numeric (e.g. "0") — treat as a clear so the user
        // never gets "stuck" with a stale claim filter while typing.
        if (claimFilterId != null) setClaimFilterId(null);
        if (syncSearchText) setSyncSearchText("");
        return;
      }
      setRecoveredOnly(false);
      if (syncSearchText) setSyncSearchText("");
      setClaimFilterId(n);
    } else {
      if (claimFilterId != null) setClaimFilterId(null);
      setSyncSearchText(v);
    }
  }

  // Task #107 — apply non-numeric Search box text as a client-side
  // substring filter against the loaded sync-log rows. Numeric search
  // and `recoveredOnly` flow through the existing server-side paths.
  const displayedSyncTableData = useMemo(() => {
    const rows: any[] = syncLogData?.tableData || [];
    if (!syncSearchText) return rows;
    const q = syncSearchText.toLowerCase();
    return rows.filter((r: any) =>
      typeof r?._searchText === "string" && r._searchText.includes(q),
    );
  }, [syncLogData?.tableData, syncSearchText]);

  function closeModal() {
    setTimeout(() => {
      const { documentElement: html } = document;
      html.classList.add(baseModalConstants.closingClass);
      html.classList.remove(
        baseModalConstants.closingClass,
        baseModalConstants.isOpenClass
      );
      html.style.removeProperty(baseModalConstants.scrollbarWidthCssVar);
    }, baseModalConstants.animationDuration);
  }

  return (
    <div className="container-fluid">
      {/* Task #109 — Cross-app banner now lives in the user (protected)
          layout, so the inline mount here is redundant. */}
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
              {
                name: "Integrations",
                path: AppRoutes.USER_INTEGRATION,
              },
            ]}
            activeRoute={"Xero"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Xero</h1>
            <p
              style={{
                color:
                  xeroData?.integration_status == "Connected - active"
                    ? "green"
                    : "red",
              }}
            >
              {xeroData?.integration_status}
            </p>
          </div>
        </div>
      </div>
      {disableStepButton && (
        <div
          className="skeleton"
          style={{ width: "100%", height: "100vh" }}
        ></div>
      )}

      {currentStep < 6 && !disableStepButton && (
        <div className="stepper-container">
          <div className="stepper-track-vertical">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`stepper-item-vertical ${
                  index % 2 === 0 ? "left-side" : "right-side"
                }`}
              >
                <div className="stepper-central-line"></div>
                <div
                  className={`stepper-circle ${
                    index + 1 <= currentStep ? "active" : ""
                  }`}
                >
                  {index + 1 === currentStep ? (
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path
                        fill="white"
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                      />
                    </svg>
                  ) : (
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  )}
                </div>
                <div className="step-card">
                  <div className="step-label">
                    <h6>STEP {index + 1}</h6>
                  </div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-buttons">
                    {index + 1 < currentStep ||
                      (index == currentStep && step.buttonName && (
                        <CustomButton
                          buttonName={step.buttonName}
                          iconClassName={step.iconClassName}
                          buttonType={buttonType.CONTRAST_SMALL}
                          actionType="button"
                          styles={{ margin: "10px 10px 10px 10px" }}
                          onClick={() => {
                            syncAndAuthMap(index);
                          }}
                          disabled={disableStepButton}
                        />
                      ))}
                    {index + 1 < currentStep ||
                      (index == currentStep && step.twoButtons && (
                        <CustomButton
                          buttonName={step.secondButtonName}
                          iconClassName={step.secondIconClassName}
                          buttonType={buttonType.CONTRAST_SMALL}
                          actionType="button"
                          styles={{ margin: "10px 10px 10px 10px" }}
                          disabled={disableStepButton}
                          onClick={() => {
                            handleSkipContractMapping();
                          }}
                        />
                      ))}
                    {index + 1 <= currentStep && (
                      <CustomButton
                        buttonName="View"
                        iconClassName="fa-light fa-eye"
                        buttonType={buttonType.CONTRAST_SMALL}
                        actionType="button"
                        styles={{ margin: "10px 10px 10px 10px" }}
                        onClick={() => handleMappingNavigation(step.from)}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {currentStep >= 6 && !disableStepButton && (
        <>
          <div className="grid">
            <div className="pt_box">
              <h4>SETTINGS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/settings"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>issues</span>
                    <p className="failed">0</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>BANK ACCOUNTS</h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/bankAccounts"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div className="stats">
                    <div>
                      <span>Synced</span>
                      <p className="success">{dashboardCount?.bankSynced}</p>
                    </div>

                    <div>
                      <span>Pending</span>
                      <p className="warning">{dashboardCount?.bankPending}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>{" "}
            <div className="pt_box">
              <h4>CONTACTS</h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/contacts"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div className="stats">
                    <div>
                      <span>Synced</span>
                      <p className="success">{dashboardCount?.contactSynced}</p>
                    </div>

                    <div>
                      <span>Pending</span>
                      <p className="warning">
                        {dashboardCount?.contactPending}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>CONTRACTS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/contracts"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div className="stats">
                    <div>
                      <span>Synced</span>
                      <p className="success">
                        {dashboardCount?.contractSynced}
                      </p>
                    </div>

                    <div>
                      <span>Pending</span>
                      <p className="warning">
                        {dashboardCount?.contractPending}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid">
            <div className="pt_box">
              <h4>PROJECTS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/projects"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>Synced</span>
                    <p className="success">{dashboardCount?.projectSynced}</p>
                  </div>

                  <div>
                    <span>Pending</span>
                    <p className="warning">{dashboardCount?.projectPending}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>INVOICES </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/invoices"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>Synced</span>
                    <p className="success">{dashboardCount?.invoiceSynced}</p>
                  </div>
                  <div>
                    <span>Pending</span>
                    <p className="warning">{dashboardCount?.invoicePending}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>BILLS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/bills"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>Synced</span>
                    <p className="success">{dashboardCount?.billSynced}</p>
                  </div>
                  <div>
                    <span>Pending</span>
                    <p className="warning">{dashboardCount?.billPending}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>PAYMENTS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/payments"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>Synced</span>
                    <p className="success">0</p>
                  </div>
                  <div>
                    <span>Warning</span>
                    <p className="warning">0</p>
                  </div>
                  <div>
                    <span>issues</span>
                    <p className="failed">0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid">
            <div className="pt_box">
              <h4>Sync Log</h4>
              {/* Task #107 — Single inline header row: status counters,
                  Refresh, Manual sync, the Filtered/Clear claim-id badge
                  (when active) and the Show auto-recovered pill (right-
                  aligned). Wraps cleanly on narrow viewports. The Search
                  box and dropdowns live in the Claims-style filter row
                  below this header. */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "16px",
                  margin: "10px 0 8px 0",
                }}
              >
                <div
                  style={{
                    textTransform: "uppercase",
                    lineHeight: "18px",
                    fontSize: "11px",
                  }}
                >
                  <span>Synced</span>
                  <p
                    className="success"
                    style={{ textAlign: "right", color: "green", margin: 0 }}
                  >
                    {syncLogData?.succeeded}
                  </p>
                </div>
                <div
                  style={{
                    textTransform: "uppercase",
                    lineHeight: "18px",
                    fontSize: "11px",
                  }}
                >
                  <span>Warning</span>
                  <p
                    className="warning"
                    style={{ textAlign: "right", color: "orange", margin: 0 }}
                  >
                    {syncLogData?.warning}
                  </p>
                </div>
                <div
                  style={{
                    textTransform: "uppercase",
                    lineHeight: "18px",
                    fontSize: "11px",
                  }}
                >
                  <span>issues</span>
                  <p
                    className="failed"
                    style={{ textAlign: "right", color: "red", margin: 0 }}
                  >
                    {syncLogData?.failed}
                  </p>
                </div>
                <CustomButton
                  buttonName="Refresh"
                  iconClassName="fa-light fa-refresh"
                  buttonType={buttonType.CONTRAST_SMALL}
                  actionType="button"
                  onClick={() => {
                    fetchXeroSyncLogs();
                  }}
                  styles={{ margin: 0 }}
                />
                <CustomButton
                  buttonName="Manual sync"
                  iconClassName="fa-light fa-rotate"
                  buttonType={buttonType.CONTRAST_SMALL}
                  actionType="button"
                  onClick={() => setManualSyncOpen(true)}
                  styles={{ margin: 0 }}
                />
                {claimFilterId != null && (
                  <>
                    <span
                      style={{ ...syncLogPillStyle(true), cursor: "default" }}
                      title="Showing Invoices/Bills/Payments sync log entries for this claim only (newest 50)."
                    >
                      Filtered: claim #{claimFilterId}
                    </span>
                    <CustomButton
                      buttonName="Clear"
                      iconClassName="fa-light fa-close"
                      buttonType={buttonType.CONTRAST_SMALL}
                      actionType="button"
                      onClick={() => {
                        setClaimFilterId(null);
                        setCurrentPage(1);
                        // Reset the Search box's internal value too —
                        // toggle clearSyncSearch true→false on next tick.
                        setClearSyncSearch(true);
                        setTimeout(() => setClearSyncSearch(false), 0);
                      }}
                      styles={{ margin: 0 }}
                    />
                  </>
                )}
                {(selectedDateRange !== "All dates" ||
                  isCustomDate ||
                  syncTypeFilter ||
                  statusFilter) && (
                  <CustomButton
                    buttonName="Clear filters"
                    iconClassName="fa-light fa-close"
                    buttonType={buttonType.CONTRAST_SMALL}
                    actionType="button"
                    onClick={() => {
                      setSelectedDateRange("All dates");
                      setIsCustomDate(false);
                      setActivityStartDate(null);
                      setActivityEndDate(null);
                      setSyncTypeFilter("");
                      setStatusFilter("");
                      setCurrentPage(1);
                    }}
                    styles={{ margin: 0 }}
                  />
                )}
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (claimFilterId != null) return;
                      setCurrentPage(1);
                      setRecoveredOnly((prev) => {
                        const next = !prev;
                        if (next) setClaimFilterId(null);
                        return next;
                      });
                    }}
                    title={
                      claimFilterId != null
                        ? "Clear the claim filter to use this toggle"
                        : recoveredTooltip
                    }
                    aria-pressed={recoveredOnly}
                    disabled={claimFilterId != null}
                    style={{
                      ...syncLogPillStyle(recoveredOnly),
                      cursor: claimFilterId != null ? "not-allowed" : "pointer",
                      opacity: claimFilterId != null ? 0.5 : 1,
                    }}
                  >
                    {recoveredOnly
                      ? "Showing recovered only ✕"
                      : "Show auto-recovered only"}
                  </button>
                </div>
              </div>
              {/* Task #107 — Claims-style filter row: SEARCH input +
                  three SELECT dropdowns at equal widths inside
                  pt_filtergroup / pt_filteroptions, mirroring the
                  PayApps Claims page. The dropdowns dim while a
                  numeric claim-id filter is active (existing behaviour),
                  but the Search box stays interactive so the user can
                  refine or clear the filter from the same control. */}
              <div className="pt_filtergroup">
                <div className="pt_filteroptions">
                  {/* Each control gets its own real wrapper so (a) the row
                      reads as 4 equal-width columns via flex:1 instead of
                      shrink-to-content widths, and (b) we can dim/disable
                      the three dropdowns independently of the Search box
                      while a numeric claim-id filter is active. */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <FormikControl
                      control={InputType.SEARCH}
                      onChange={(value: any) => handleSyncLogSearch(value)}
                      placeholder="Search by claim id, reference, project…"
                      clearSearch={clearSyncSearch}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      opacity: claimFilterId != null ? 0.5 : 1,
                    }}
                  >
                    <FormikControl
                      placeholder="All dates"
                      name="syncLogDateRange"
                      options={filterByDurationDates}
                      disabled={claimFilterId != null}
                      onChange={(value: any) => {
                        setCurrentPage(1);
                        if (value === "Custom") {
                          setIsCustomDate(true);
                        } else {
                          setIsCustomDate(false);
                          setActivityStartDate(null);
                          setActivityEndDate(null);
                        }
                        setSelectedDateRange(value);
                      }}
                      control={InputType.SELECT}
                      value={selectedDateRange}
                      renderKey="label"
                      valueKey="value"
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      opacity: claimFilterId != null ? 0.5 : 1,
                    }}
                  >
                    <FormikControl
                      placeholder="All sync types"
                      name="syncLogType"
                      options={[
                        { label: "All sync types", value: "" },
                        ...SYNC_TYPE_OPTIONS.map((t) => ({
                          label: t,
                          value: t,
                        })),
                      ]}
                      disabled={claimFilterId != null}
                      onChange={(value: any) => {
                        setCurrentPage(1);
                        setSyncTypeFilter(value || "");
                      }}
                      control={InputType.SELECT}
                      value={syncTypeFilter}
                      renderKey="label"
                      valueKey="value"
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      opacity: claimFilterId != null ? 0.5 : 1,
                    }}
                  >
                    <FormikControl
                      placeholder="All statuses"
                      name="syncLogStatus"
                      options={[
                        { label: "All statuses", value: "" },
                        ...STATUS_OPTIONS.map((s) => ({
                          label: s,
                          value: s,
                        })),
                      ]}
                      disabled={claimFilterId != null}
                      onChange={(value: any) => {
                        setCurrentPage(1);
                        setStatusFilter(value || "");
                      }}
                      control={InputType.SELECT}
                      value={statusFilter}
                      renderKey="label"
                      valueKey="value"
                    />
                  </div>
                </div>
              </div>
              {isCustomDate && (
                <div className="grid">
                  <div>
                    <FormikControl
                      label="From date"
                      name="syncLogFromDate"
                      control={InputType.DATE_PICKER}
                      type="date"
                      value={
                        activityStartDate &&
                        isValid(new Date(activityStartDate))
                          ? format(new Date(activityStartDate), "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(selectedDate: string) => {
                        setCurrentPage(1);
                        if (!selectedDate) {
                          setActivityStartDate(null);
                          return;
                        }
                        const fromDate = new Date(
                          new Date(selectedDate).setHours(0, 0, 0, 0),
                        );
                        if (
                          activityEndDate &&
                          fromDate > new Date(activityEndDate)
                        ) {
                          setActivityStartDate(fromDate);
                          setActivityEndDate(fromDate);
                        } else {
                          setActivityStartDate(fromDate);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <FormikControl
                      label="To date"
                      name="syncLogToDate"
                      type="date"
                      control={InputType.DATE_PICKER}
                      value={
                        activityEndDate && isValid(new Date(activityEndDate))
                          ? format(new Date(activityEndDate), "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(selectedDate: string) => {
                        setCurrentPage(1);
                        if (!selectedDate) {
                          setActivityEndDate(null);
                          return;
                        }
                        const toDate = new Date(selectedDate);
                        if (
                          activityStartDate &&
                          toDate < new Date(activityStartDate)
                        ) {
                          return;
                        }
                        setActivityEndDate(toDate);
                      }}
                      minDate={
                        activityStartDate
                          ? format(new Date(activityStartDate), "yyyy-MM-dd")
                          : ""
                      }
                    />
                  </div>
                </div>
              )}
              <DynamicTable
                headers={xeroSyncListHeaders}
                gridData={displayedSyncTableData}
                gridActions={actions}
                onRowClick={handleRowClick}
                hoverOnRowClick
                showLoader={tableLoader}
                loaderColSpan={xeroSyncListHeaders.length}
                renderRowList={xeroSynListRenderData}
                currentPage={currentPage}
                entriesPerPage={entriesPerPage}
                onEntriesPerPageChange={setEntriesPerPage}
                onPageChange={setCurrentPage}
                totalEntries={totalRows}
                onSortChange={(sortConfig) => {
                  if (claimFilterId != null) return;
                  if (syncLogData?.tableData?.length > 0) {
                    setSortValues(sortConfig);
                  }
                }}
              />
            </div>
          </div>
        </>
      )}
      {showXeroCategoryModal && (
        <BaseModal
          modalId="confirmation"
          displayModal={showXeroCategoryModal}
          onClose={() => {
            if (trackingCategories.length == 0 && !trackingCategoriesLoading) {
              showErrorToast("Unable to map as no tracking category was found");
            }
            setShowXeroCategoryModal(false);
          }}
          title={"Map Xero tracking category "}
          secondButtonName={
            trackingCategories.length == 0 && !trackingCategoriesLoading
              ? "Yes, Create"
              : "Submit"
          }
          firstButtonName="Cancel"
          onConfirm={async () => {
            const response = await handleCategoryTracking();
            if (response) {
              return true;
            }
          }}
          disableSecondButton={
            trackingCategories.length == 0
              ? false
              : !selectedTrackingCategoryProject
          }
        >
          {trackingCategoriesLoading && (
            <div
              className="skeleton"
              style={{ width: "100%", height: "50vh" }}
            ></div>
          )}
          {trackingCategories.length == 0 && !trackingCategoriesLoading && (
            <>
              <p>
                We couldn't find any tracking category for a project or a
                contract in your Xero account. Do you want us to create one now?
              </p>
            </>
          )}
          {trackingCategories.length > 0 && !trackingCategoriesLoading && (
            <>
              <h5>
                Project<span className="required">*</span>
              </h5>
              <FormikControl
                placeholder="Select tracking category from xero"
                name="projectTracking"
                options={trackingCategories}
                control={InputType.SELECT}
                value={selectedTrackingCategoryProject}
                renderKey="name"
                valueKey="id"
                onChange={(data: any) => {
                  setTrackingCategoryProject(data);
                  setCategoryTrackingError("");
                }}
              />
              <div>
                <h5>Contract</h5>
                <div style={{ display: "flex" }}>
                  <FormikControl
                    placeholder="Select tracking category from xero"
                    name="projectTracking"
                    options={trackingCategories}
                    control={InputType.SELECT}
                    value={selectedTrackingCategoryContract}
                    renderKey="name"
                    valueKey="id"
                    onChange={(data: any) => {
                      setTrackingCategoryContract(data);
                      setCategoryTrackingError("");
                    }}
                  />
                  {selectedTrackingCategoryContract && (
                    <CustomButton
                      styles={{ height: "45px", marginLeft: "15px" }}
                      buttonName="Clear"
                      iconClassName="fa-light fa-close"
                      buttonType={buttonType.CONTRAST_SMALL}
                      actionType="button"
                      onClick={() => {
                        setTrackingCategoryContract("");
                      }}
                    />
                  )}
                </div>
              </div>
              <p>
                If the categories available is not the ones you want to use then
                create new from &nbsp;
                <Link
                  onClick={() => closeModal()}
                  href="/user/integrations/xero/settings"
                >
                  Xero Settings
                </Link>
              </p>
              {categoryTrackingError && (
                <div style={{ color: "red" }}>{categoryTrackingError}</div>
              )}
            </>
          )}
        </BaseModal>
      )}

      {manualMappingModal && (
        <BaseModal
          modalId="Manual_Mapping"
          displayModal={manualMappingModal}
          onClose={() => {
            fetchGetXeroDetailsForCompany();
            setDisableStepButton(false);
            setManualMappingModal(false);
          }}
          title={"Manual Mapping"}
          secondButtonName="Yes, allow mapping"
          firstButtonName="Cancel"
          onConfirm={() => {
            handleMappingNavigation();
            return true;
          }}
        >
          <p>
            Sync complete. Some {currentMappingData?.from} were mapped
            automatically, but others could not be matched. Would you like to
            map the remaining {currentMappingData?.from} manually?
          </p>
          <div className="mapping_result">
            <div className="stats">
              <div>
                <span>Total</span>
                <p className="success">{currentMappingData?.total}</p>
              </div>
              <div>
                <span>Mapped</span>
                <p className="success">{currentMappingData?.mapped}</p>
              </div>
              <div>
                <span>Unmapped</span>
                <p className="failed">{currentMappingData?.unmapped}</p>
              </div>
            </div>
          </div>
        </BaseModal>
      )}
      <ManualXeroSyncDialog
        companyId={companyId}
        open={manualSyncOpen}
        onClose={() => setManualSyncOpen(false)}
        onSuccess={fetchXeroSyncLogs}
      />
    </div>
  );
}

/**
 * Task #65 — Manual Xero re-sync by ID (dialog).
 *
 * Available to any user with access to the company (backend role guard
 * allows STANDARD_USER, ADMIN, PRIMARY_ADMIN; the in-resolver IDOR check
 * still rejects company_id tampering). Pick a record type, paste the
 * Xero GUID (or invoice/bill number for invoice_bill), click Run sync.
 * Result panel renders inline below the form so the user can run several
 * IDs without closing the dialog.
 */
function ManualXeroSyncDialog({
  companyId,
  open,
  onClose,
  onSuccess,
}: {
  companyId: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [type, setType] = useState<
    "invoice_bill" | "payment" | "bank_transfer" | "contact" | "manual_journal"
  >("invoice_bill");
  const [id, setId] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    syncLogId?: number | null;
    resolvedXeroId?: string | null;
    direction?: string;
  } | null>(null);

  // Task #136 — PayTrade-side picker state. Mirrors the Xero-side hint /
  // candidates / picked label triplet but searches PT entities only.
  const [ptHint, setPtHint] = useState<string>("");
  const [ptId, setPtId] = useState<string>("");
  const [ptPickedLabel, setPtPickedLabel] = useState<string | null>(null);
  const [ptCandidates, setPtCandidates] = useState<
    Array<{ id: string; label: string; sublabel?: string }>
  >([]);
  const [ptLookupBusy, setPtLookupBusy] = useState<boolean>(false);
  const [ptLookupError, setPtLookupError] = useState<string | null>(null);

  // Task #136 — preflight + reviewed-gate state.
  const [preflight, setPreflight] = useState<any>(null);
  const [preflightBusy, setPreflightBusy] = useState<boolean>(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<boolean>(false);

  // Task #147 — catch-up discovery mode. The single-record flow above
  // remains the default; "catchup" surfaces a date-range picker and
  // multi-select results table that batches the existing per-row
  // preflight + run-sync calls.
  const [mode, setMode] = useState<"single" | "catchup">("single");
  type CatchupType = "invoice_bill" | "payment" | "contact";
  const isCatchupType = (v: string): v is CatchupType =>
    v === "invoice_bill" || v === "payment" || v === "contact";
  // Default to a last-30-days window so the user can hit Discover
  // immediately on first open without typing dates. Format YYYY-MM-DD
  // for the native <input type="date"> control.
  const defaultCatchupTo = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const defaultCatchupFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [catchupType, setCatchupType] = useState<CatchupType>("invoice_bill");
  const [catchupFrom, setCatchupFrom] = useState<string>(defaultCatchupFrom);
  const [catchupTo, setCatchupTo] = useState<string>(defaultCatchupTo);
  const [catchupBusy, setCatchupBusy] = useState<boolean>(false);
  const [catchupError, setCatchupError] = useState<string | null>(null);
  const [catchupResult, setCatchupResult] = useState<any>(null);
  const [catchupSelected, setCatchupSelected] = useState<Set<string>>(
    new Set(),
  );
  const [catchupRunning, setCatchupRunning] = useState<boolean>(false);
  const [catchupProgress, setCatchupProgress] = useState<{
    done: number;
    total: number;
    pass: number;
    fail: number;
  }>({ done: 0, total: 0, pass: 0, fail: 0 });
  const [catchupRowStatus, setCatchupRowStatus] = useState<
    Record<
      string,
      {
        status: "pending" | "running" | "passed" | "failed";
        message?: string;
        syncLogId?: number | null;
      }
    >
  >({});

  // Task #151 — secondary "Catch-up row details" dialog state.
  const [catchupRowDetail, setCatchupRowDetail] = useState<CatchupRow | null>(
    null,
  );

  // PT-side picker is meaningful only for these types; bank_transfer and
  // manual_journal don't have a direct user-creatable PT counterpart in
  // this dialog.
  const ptSideSupported =
    type === "invoice_bill" || type === "payment" || type === "contact";

  // Task #72 — inline lookup widget state. The hint is debounced so we
  // don't hammer Xero on every keystroke.
  const [hint, setHint] = useState<string>("");
  // Task #74 — extra bank-transfer filters so admins can find transfers
  // that were created directly in Xero (no PT-RET-… reference).
  const [accountHint, setAccountHint] = useState<string>("");
  const [dateHint, setDateHint] = useState<string>("");
  const [lookupBusy, setLookupBusy] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<
    Array<{ id: string; label: string; sublabel?: string }>
  >([]);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);

  // Task #73 — optional date-range / pagination so admins can recover
  // older records (e.g. a stale claim from a previous financial year).
  // The "Search archive" expander is collapsed by default so the common
  // case (recent-window lookup) stays one-field simple.
  const [showArchive, setShowArchive] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Reset form/result whenever the dialog re-opens so previous output
  // doesn't leak across sessions.
  useEffect(() => {
    if (open) {
      setId("");
      setResult(null);
      setBusy(false);
      setType("invoice_bill");
      setHint("");
      setAccountHint("");
      setDateHint("");
      setCandidates([]);
      setLookupError(null);
      setPickedLabel(null);
      setShowArchive(false);
      setFromDate("");
      setToDate("");
      setPage(1);
      setHasMore(false);
      setPtHint("");
      setPtId("");
      setPtPickedLabel(null);
      setPtCandidates([]);
      setPtLookupError(null);
      setPreflight(null);
      setPreflightError(null);
      setReviewed(false);
      setMode("single");
      setCatchupType("invoice_bill");
      setCatchupFrom(defaultCatchupFrom);
      setCatchupTo(defaultCatchupTo);
      setCatchupBusy(false);
      setCatchupError(null);
      setCatchupResult(null);
      setCatchupSelected(new Set());
      setCatchupRunning(false);
      setCatchupProgress({ done: 0, total: 0, pass: 0, fail: 0 });
      setCatchupRowStatus({});
    }
  }, [open]);

  // Reset lookup state when the type changes — candidates from one type
  // are meaningless for another.
  useEffect(() => {
    setHint("");
    setAccountHint("");
    setDateHint("");
    setCandidates([]);
    setLookupError(null);
    setPickedLabel(null);
    setPage(1);
    setHasMore(false);
    setPtHint("");
    setPtId("");
    setPtPickedLabel(null);
    setPtCandidates([]);
    setPtLookupError(null);
    setPreflight(null);
    setPreflightError(null);
    setReviewed(false);
  }, [type]);

  // Any change to the chosen ids invalidates a previous preflight — the
  // signed action token is bound to that exact (xero_id, pt_id) tuple.
  useEffect(() => {
    setPreflight(null);
    setPreflightError(null);
    setReviewed(false);
  }, [id, ptId]);

  // Debounced PT-side lookup.
  useEffect(() => {
    if (!ptSideSupported) {
      setPtCandidates([]);
      setPtLookupError(null);
      return;
    }
    const trimmed = ptHint.trim();
    if (trimmed.length < 2) {
      setPtCandidates([]);
      setPtLookupError(null);
      setPtLookupBusy(false);
      return;
    }
    let cancelled = false;
    setPtLookupBusy(true);
    setPtLookupError(null);
    const handle = setTimeout(async () => {
      const res = await manualXeroPaytradeLookup({
        company_id: companyId,
        type,
        hint: trimmed,
      });
      if (cancelled) return;
      setPtLookupBusy(false);
      setPtCandidates(res.candidates || []);
      setPtLookupError(
        res.success
          ? res.candidates?.length
            ? null
            : "No matching PayTrade records."
          : res.message || "Lookup failed."
      );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [ptHint, type, companyId, ptSideSupported]);

  // Reset to page 1 whenever the hint or date-range changes — the
  // current page number is meaningful only against the previous query.
  useEffect(() => {
    setPage(1);
  }, [hint, fromDate, toDate]);

  // Debounced lookup — 350 ms after the user stops typing or any
  // archive filter changes.
  useEffect(() => {
    const trimmed = hint.trim();
    const acct = accountHint.trim();
    const dt = dateHint.trim();
    // Task #74 — for bank_transfer, account/date filters can stand on
    // their own (no text hint required). All other types still need ≥2
    // characters of text hint.
    const bankTransferFiltersValid =
      type === "bank_transfer" && (acct.length >= 2 || dt.length > 0);
    if (trimmed.length < 2 && !bankTransferFiltersValid) {
      setCandidates([]);
      setLookupError(null);
      setLookupBusy(false);
      setHasMore(false);
      return;
    }
    let cancelled = false;
    setLookupBusy(true);
    setLookupError(null);
    const handle = setTimeout(async () => {
      const res = await manualXeroResyncLookup({
        company_id: companyId,
        type,
        hint: trimmed,
        from_date: fromDate || null,
        to_date: toDate || null,
        page,
        account_hint: type === "bank_transfer" && acct ? acct : undefined,
        date: type === "bank_transfer" && dt ? dt : undefined,
      });
      if (cancelled) return;
      setLookupBusy(false);
      setCandidates(res.candidates || []);
      setHasMore(!!res.has_more);
      setLookupError(
        res.success
          ? res.candidates?.length
            ? null
            : page > 1
            ? "No more matches on this page. Go back to page 1 or widen the date range."
            : showArchive
            ? "No matches in the selected window. Try a wider date range or paste the GUID directly."
            : "No matches in the recent window. Try \"Search archive\" to widen the date range, or paste the GUID directly."
          : res.message || "Lookup failed."
      );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [hint, accountHint, dateHint, type, companyId, fromDate, toDate, page, showArchive]);

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleCheck = async () => {
    const xeroTrim = id.trim();
    const ptTrim = ptId.trim();
    if (!xeroTrim && !ptTrim) {
      setPreflightError(
        "Pick at least one side — a Xero record, a PayTrade record, or both."
      );
      setPreflight(null);
      return;
    }
    setPreflightBusy(true);
    setPreflightError(null);
    setReviewed(false);
    try {
      const res = await manualXeroPreflight({
        company_id: companyId,
        type,
        xero_id: xeroTrim || null,
        pt_id: ptTrim || null,
      });
      if (!res?.success) {
        setPreflight(null);
        setPreflightError(res?.message || "Pre-flight failed.");
      } else {
        setPreflight(res);
      }
    } finally {
      setPreflightBusy(false);
    }
  };

  const handleConfirm = async (): Promise<boolean> => {
    if (!preflight || !preflight.actionToken) {
      setResult({
        success: false,
        message:
          "Click Check first — Run sync needs a fresh pre-flight token (10-minute TTL).",
      });
      return false;
    }
    if (preflight.blocked) {
      setResult({
        success: false,
        message:
          preflight.blockReason ||
          "Pre-flight blocked this combination. Resolve manually first.",
      });
      return false;
    }
    if (!reviewed) {
      setResult({
        success: false,
        message: "Tick \u201cI've reviewed this\u201d before running the sync.",
      });
      return false;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await manualXeroTwoSidedSync({
        company_id: companyId,
        type,
        xero_id: id.trim() || null,
        pt_id: ptId.trim() || null,
        action_token: preflight.actionToken,
        reviewed,
        preflight_snapshot_json: JSON.stringify(preflight),
      });
      setResult(res);
      if (res?.success && onSuccess) {
        try {
          onSuccess();
        } catch {
          // best-effort refresh — never block dialog flow
        }
      }
    } finally {
      setBusy(false);
    }
    return false;
  };

  // Task #147 — catch-up handlers.
  const handleDiscover = async () => {
    if (!catchupFrom || !catchupTo) {
      setCatchupError("Pick both a from and to date.");
      return;
    }
    setCatchupBusy(true);
    setCatchupError(null);
    setCatchupResult(null);
    setCatchupSelected(new Set());
    setCatchupRowStatus({});
    setCatchupProgress({ done: 0, total: 0, pass: 0, fail: 0 });
    try {
      const res = await manualXeroCatchupDiscover({
        company_id: companyId,
        type: catchupType,
        from_date: catchupFrom,
        to_date: catchupTo,
      });
      if (!res?.success) {
        setCatchupError(res?.message || "Discovery failed.");
      } else {
        setCatchupResult(res);
        // Default-select every row that the per-row preflight would
        // most plausibly accept — exclude already-in-sync (no-op) and
        // blocked (will fail). User can still toggle manually.
        const initial = new Set<string>();
        for (const row of res.rows || []) {
          if (
            row.classification === "needs_link" ||
            row.classification === "needs_push" ||
            row.classification === "needs_import" ||
            row.classification === "amounts_disagree"
          ) {
            initial.add(row.key);
          }
        }
        setCatchupSelected(initial);
      }
    } finally {
      setCatchupBusy(false);
    }
  };

  const toggleCatchupRow = (key: string) => {
    setCatchupSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRunBatch = async () => {
    if (!catchupResult || !Array.isArray(catchupResult.rows)) return;
    const selectedRows = catchupResult.rows.filter((r: any) =>
      catchupSelected.has(r.key),
    );
    if (!selectedRows.length) {
      setCatchupError("Select at least one record to sync.");
      return;
    }
    setCatchupError(null);
    setCatchupRunning(true);
    setCatchupProgress({
      done: 0,
      total: selectedRows.length,
      pass: 0,
      fail: 0,
    });
    const status: Record<
      string,
      {
        status: "pending" | "running" | "passed" | "failed";
        message?: string;
        syncLogId?: number | null;
      }
    > = {};
    for (const r of selectedRows) status[r.key] = { status: "pending" };
    setCatchupRowStatus({ ...status });

    let pass = 0;
    let fail = 0;
    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      status[row.key] = { status: "running" };
      setCatchupRowStatus({ ...status });
      try {
        const pre = await manualXeroPreflight({
          company_id: companyId,
          type: catchupType,
          xero_id: row.xero_id || null,
          pt_id: row.pt_id || null,
        });
        if (!pre?.success) {
          fail++;
          status[row.key] = {
            status: "failed",
            message: pre?.message || "Pre-flight failed.",
          };
        } else if (pre.blocked) {
          fail++;
          status[row.key] = {
            status: "failed",
            message: pre.blockReason || "Pre-flight blocked.",
          };
        } else {
          const run = await manualXeroTwoSidedSync({
            company_id: companyId,
            type: catchupType,
            xero_id: row.xero_id || null,
            pt_id: row.pt_id || null,
            action_token: pre.actionToken,
            reviewed: true,
            preflight_snapshot_json: JSON.stringify(pre),
          });
          if (run?.success) {
            pass++;
            status[row.key] = {
              status: "passed",
              message: run?.message || run?.direction || "Synced.",
              syncLogId: run?.syncLogId ?? null,
            };
          } else {
            fail++;
            status[row.key] = {
              status: "failed",
              message: run?.message || "Run sync failed.",
              syncLogId: run?.syncLogId ?? null,
            };
          }
        }
      } catch (e: any) {
        fail++;
        status[row.key] = {
          status: "failed",
          message: e?.message || "Unexpected error.",
        };
      }
      setCatchupRowStatus({ ...status });
      setCatchupProgress({
        done: i + 1,
        total: selectedRows.length,
        pass,
        fail,
      });
      // Brief pause so we don't hammer the backend back-to-back.
      await new Promise((r) => setTimeout(r, 250));
    }
    setCatchupRunning(false);
    if (onSuccess) {
      try {
        onSuccess();
      } catch {
        // best-effort refresh
      }
    }
  };

  const runDisabled =
    mode === "catchup"
      ? catchupRunning ||
        catchupBusy ||
        !catchupResult ||
        catchupSelected.size === 0
      : busy ||
        !preflight ||
        !preflight.actionToken ||
        !!preflight.blocked ||
        !reviewed;

  const secondButtonLabel =
    mode === "catchup"
      ? catchupRunning
        ? `Running ${catchupProgress.done}/${catchupProgress.total}…`
        : catchupSelected.size > 0
        ? `Run sync on ${catchupSelected.size} selected`
        : "Run sync"
      : busy
      ? "Running…"
      : "Run sync";

  if (!open) return null;
  return (
    <BaseModal
      modalId="manualXeroSync"
      displayModal={open}
      onClose={handleClose}
      title="Manual Xero sync"
      firstButtonName="Close"
      secondButtonName={secondButtonLabel}
      disableSecondButton={runDisabled}
      onConfirm={mode === "catchup" ? handleRunBatch : handleConfirm}
    >
      {/* Task #147 — mode tabs. Single = pick one record; Catch-up =
          discover and batch-sync everything in a date window. */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "12px",
          borderBottom: "1px solid #ddd",
        }}
      >
        {(
          [
            { k: "single", label: "Single record" },
            { k: "catchup", label: "Catch-up by date range" },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => {
              if (busy || catchupRunning) return;
              setMode(t.k);
            }}
            disabled={busy || catchupRunning}
            style={{
              padding: "8px 14px",
              border: "none",
              borderBottom:
                mode === t.k
                  ? "2px solid #1a73e8"
                  : "2px solid transparent",
              background: "transparent",
              color: mode === t.k ? "#1a73e8" : "#444",
              fontWeight: mode === t.k ? 600 : 400,
              cursor: busy || catchupRunning ? "not-allowed" : "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {mode === "single" && (<>
      <p style={{ fontSize: "13px", marginTop: 0, opacity: 0.8 }}>
        Pick a Xero record, a PayTrade record, or both. Click <b>Check</b> to
        inspect type, mapping, payment status and reconciliation, then tick
        <b> I&apos;ve reviewed this</b> before <b>Run sync</b>. The dialog
        will route the sync to the correct direction (import / push / link)
        based on what you provide.
      </p>
      <div style={{ marginBottom: "12px" }}>
        <h5 style={{ margin: "0 0 4px 0" }}>Record type</h5>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          disabled={busy}
          style={{ width: "100%", padding: "8px 10px" }}
        >
          <option value="invoice_bill">Invoice / Bill</option>
          <option value="payment">Payment</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="contact">Contact</option>
          <option value="manual_journal">Manual journal</option>
        </select>
      </div>
      {/* Task #72 — inline lookup widget. Optional shortcut so the admin
          doesn't have to open Xero in another tab to copy a GUID. */}
      <div style={{ marginBottom: "12px" }}>
        <h5 style={{ margin: "0 0 4px 0" }}>
          Find by{" "}
          {type === "invoice_bill"
            ? "invoice number, contact name or reference"
            : type === "payment"
            ? "invoice number, contact name, reference or amount"
            : type === "bank_transfer"
            ? "reference, PT payment id, amount, bank account or date"
            : type === "contact"
            ? "contact name"
            : "narration or reference"}
          <span style={{ opacity: 0.6, fontWeight: 400 }}> (optional)</span>
        </h5>
        <input
          type="text"
          placeholder={
            type === "bank_transfer"
              ? "Type at least 2 characters, or use the filters below…"
              : "Type at least 2 characters…"
          }
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          disabled={busy}
          style={{ width: "100%", padding: "8px 10px" }}
        />
        {/* Task #74 — bank-account / date filters for bank_transfer.
            Lets admins find transfers that were created directly in
            Xero (no PT-RET-… reference) by their from/to bank account
            or by amount + date. */}
        {type === "bank_transfer" && (
          <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="From / to bank account name or code"
              value={accountHint}
              onChange={(e) => setAccountHint(e.target.value)}
              disabled={busy}
              style={{ flex: 2, padding: "8px 10px" }}
            />
            <input
              type="date"
              placeholder="Date"
              value={dateHint}
              onChange={(e) => setDateHint(e.target.value)}
              disabled={busy}
              style={{ flex: 1, padding: "8px 10px" }}
            />
          </div>
        )}
        {type === "bank_transfer" && (
          <small style={{ opacity: 0.7, display: "block", marginTop: "4px" }}>
            Tip: combine an amount in the field above with a date to find a
            specific transfer. Date matches within ±7 days. Results are
            tagged <code>[PayTrade]</code> or <code>[Xero]</code> by origin.
          </small>
        )}
        {lookupBusy && (
          <small style={{ opacity: 0.7 }}>Searching Xero…</small>
        )}
        {!lookupBusy && lookupError && (
          <small style={{ color: "#a50e0e" }}>{lookupError}</small>
        )}
        {!lookupBusy && candidates.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              margin: "6px 0 0 0",
              padding: 0,
              maxHeight: "220px",
              overflowY: "auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            {candidates.map((c) => (
              <li
                key={c.id}
                onClick={() => {
                  if (busy) return;
                  setId(c.id);
                  setPickedLabel(c.label);
                }}
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #eee",
                  cursor: busy ? "not-allowed" : "pointer",
                  background: id === c.id ? "#eaf3ff" : "transparent",
                  fontSize: "13px",
                }}
              >
                <div style={{ fontWeight: 500 }}>{c.label}</div>
                {c.sublabel && (
                  <div style={{ opacity: 0.7 }}>{c.sublabel}</div>
                )}
                <code style={{ opacity: 0.6, fontSize: "11px" }}>{c.id}</code>
              </li>
            ))}
          </ul>
        )}
        {/* Task #73 — pagination + "more results available" hint. Only
            shown when the lookup actually returned candidates so the
            controls don't crowd the empty state. */}
        {!lookupBusy && (candidates.length > 0 || page > 1) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "6px",
              fontSize: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={busy || page <= 1}
              style={{ padding: "4px 8px" }}
            >
              ‹ Prev
            </button>
            <span style={{ opacity: 0.7 }}>Page {page}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={busy || !hasMore}
              style={{ padding: "4px 8px" }}
            >
              Next ›
            </button>
            {hasMore && (
              <span style={{ opacity: 0.7 }}>
                More results available — narrow the hint or date range to
                refine.
              </span>
            )}
          </div>
        )}
        {/* Task #73 — collapsible archive search. Defaults closed so the
            common (recent-window) flow stays one-field simple. */}
        <div style={{ marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => {
              setShowArchive((v) => {
                // Collapsing the expander clears any active date range so
                // hidden filters can't silently constrain a fresh search.
                if (v) {
                  setFromDate("");
                  setToDate("");
                }
                return !v;
              });
            }}
            disabled={busy}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#1a73e8",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: "12px",
            }}
          >
            {showArchive ? "− Hide archive search" : "+ Search archive (older records)"}
            {!showArchive && (fromDate || toDate) && (
              <span style={{ marginLeft: "6px", opacity: 0.7 }}>
                (date filter active)
              </span>
            )}
          </button>
          {showArchive && (
            <div
              style={{
                marginTop: "6px",
                padding: "8px 10px",
                border: "1px solid #eee",
                borderRadius: "4px",
                background: "#fafafa",
              }}
            >
              <small style={{ display: "block", opacity: 0.75, marginBottom: "6px" }}>
                Widens the slice we pull from Xero by{" "}
                <em>last modified date</em>. Leave blank to use the
                default rolling window
                {type === "payment" || type === "bank_transfer"
                  ? " (180 days)."
                  : type === "contact"
                  ? " (all contacts)."
                  : " (365 days)."}
              </small>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <label style={{ flex: "1 1 120px", fontSize: "12px" }}>
                  Modified from
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    disabled={busy}
                    style={{ width: "100%", padding: "6px 8px" }}
                  />
                </label>
                <label style={{ flex: "1 1 120px", fontSize: "12px" }}>
                  Modified to
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={busy}
                    style={{ width: "100%", padding: "6px 8px" }}
                  />
                </label>
              </div>
              {type === "bank_transfer" && (
                <small style={{ display: "block", opacity: 0.7, marginTop: "4px" }}>
                  Note: Xero's BankTransfers endpoint doesn't paginate —
                  use a tighter date range for very busy windows.
                </small>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginBottom: "12px" }}>
        <h5 style={{ margin: "0 0 4px 0" }}>
          Xero ID
          {type === "invoice_bill" ? " or invoice / bill number" : ""}
        </h5>
        <input
          type="text"
          placeholder={
            type === "invoice_bill"
              ? "GUID (e.g. 2a1b…) or invoice number (e.g. INV-0123)"
              : "Xero record GUID"
          }
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setPickedLabel(null);
          }}
          disabled={busy}
          style={{ width: "100%", padding: "8px 10px" }}
        />
        {pickedLabel && (
          <small style={{ color: "#137333" }}>
            Selected: {pickedLabel} — <code>{id}</code>
          </small>
        )}
        {!pickedLabel && (
          <small style={{ opacity: 0.7 }}>
            {type === "bank_transfer"
              ? "Tip: PayTrade-originated retention transfers (reference PT-RET-…) link straight back to a claim. Xero-only transfers can still be re-pulled but won't auto-link."
              : type === "manual_journal"
              ? "Tip: PayTrade-posted journals are skipped by anti-echo so we don't double-process them."
              : "Tip: paste the value straight from the Xero URL or the sync log entry."}
          </small>
        )}
      </div>
      {/* Task #136 — PayTrade-side picker. Hidden for record types that
          have no user-creatable PT counterpart in this dialog. */}
      {ptSideSupported && (
        <div
          style={{
            marginBottom: "12px",
            padding: "10px 12px",
            border: "1px solid #d6e4ff",
            background: "#f6faff",
            borderRadius: "4px",
          }}
        >
          <h5 style={{ margin: "0 0 4px 0" }}>
            PayTrade side{" "}
            <span style={{ opacity: 0.6, fontWeight: 400 }}>(optional)</span>
          </h5>
          <input
            type="text"
            placeholder={
              type === "invoice_bill"
                ? "Search PT claims by id, reference, contact name or amount…"
                : type === "payment"
                ? "Search PT payments by id, contact name, memo or amount…"
                : "Search PT contacts by name…"
            }
            value={ptHint}
            onChange={(e) => setPtHint(e.target.value)}
            disabled={busy}
            style={{ width: "100%", padding: "8px 10px" }}
          />
          {ptLookupBusy && (
            <small style={{ opacity: 0.7 }}>Searching PayTrade…</small>
          )}
          {!ptLookupBusy && ptLookupError && (
            <small style={{ color: "#a50e0e" }}>{ptLookupError}</small>
          )}
          {!ptLookupBusy && ptCandidates.length > 0 && (
            <ul
              style={{
                listStyle: "none",
                margin: "6px 0 0 0",
                padding: 0,
                maxHeight: "180px",
                overflowY: "auto",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "#fff",
              }}
            >
              {ptCandidates.map((c) => (
                <li
                  key={c.id}
                  onClick={() => {
                    if (busy) return;
                    setPtId(c.id);
                    setPtPickedLabel(c.label);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid #eee",
                    cursor: busy ? "not-allowed" : "pointer",
                    background: ptId === c.id ? "#eaf3ff" : "transparent",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{c.label}</div>
                  {c.sublabel && (
                    <div style={{ opacity: 0.7 }}>{c.sublabel}</div>
                  )}
                  <code style={{ opacity: 0.6, fontSize: "11px" }}>{c.id}</code>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: "8px" }}>
            <input
              type="text"
              placeholder="…or paste a PayTrade id directly"
              value={ptId}
              onChange={(e) => {
                setPtId(e.target.value);
                setPtPickedLabel(null);
              }}
              disabled={busy}
              style={{ width: "100%", padding: "8px 10px" }}
            />
            {ptPickedLabel && (
              <small style={{ color: "#137333" }}>
                Selected: {ptPickedLabel} — <code>{ptId}</code>
              </small>
            )}
          </div>
        </div>
      )}

      {/* Task #136 — Check + preflight panel. The Run sync button stays
          disabled until the user clicks Check and ticks the review gate. */}
      <div style={{ marginBottom: "12px" }}>
        <button
          type="button"
          onClick={handleCheck}
          disabled={busy || preflightBusy || (!id.trim() && !ptId.trim())}
          style={{
            padding: "8px 14px",
            background: "#1a73e8",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor:
              busy || preflightBusy || (!id.trim() && !ptId.trim())
                ? "not-allowed"
                : "pointer",
          }}
        >
          {preflightBusy ? "Checking…" : "Check"}
        </button>
        {preflightError && (
          <div
            style={{
              marginTop: "8px",
              padding: "8px 10px",
              borderRadius: "4px",
              background: "#fdecea",
              color: "#a50e0e",
              fontSize: "13px",
            }}
          >
            {preflightError}
          </div>
        )}
      </div>

      {preflight && (
        <div
          style={{
            marginBottom: "12px",
            padding: "10px 12px",
            borderRadius: "4px",
            border: preflight.blocked
              ? "1px solid #f5b5b5"
              : "1px solid #cde4cd",
            background: preflight.blocked ? "#fff5f5" : "#f3fbf3",
            fontSize: "13px",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "6px" }}>
            Pre-flight summary —{" "}
            <span
              style={{
                color: preflight.blocked
                  ? "#a50e0e"
                  : preflight.recommendedAction === "push"
                  ? "#1a73e8"
                  : "#137333",
                textTransform: "uppercase",
              }}
            >
              {preflight.recommendedAction}
            </span>
          </div>
          <div style={{ marginBottom: "6px" }}>{preflight.actionSummary}</div>
          {preflight.blocked && preflight.blockReason && (
            <div style={{ color: "#a50e0e", marginBottom: "6px" }}>
              <b>Blocked:</b> {preflight.blockReason}
            </div>
          )}
          {preflight.xeroSide?.exists && (
            <div style={{ marginTop: "4px" }}>
              <b>Xero:</b> {preflight.xeroSide.summary}
            </div>
          )}
          {preflight.ptSide?.exists && (
            <div style={{ marginTop: "4px" }}>
              <b>PayTrade:</b> {preflight.ptSide.summary}
            </div>
          )}
          {preflight.link?.mapped !== undefined && (
            <div style={{ marginTop: "4px", opacity: 0.85 }}>
              <b>Mapping:</b>{" "}
              {preflight.link.mapped
                ? `linked (PT ${
                    preflight.link.pt_claim_id ??
                    preflight.link.pt_payment_id ??
                    preflight.link.pt_client_supplier_id ??
                    "?"
                  })`
                : "not linked yet"}
            </div>
          )}
          {/* Task #136 — Side-by-side payment-leg reconciliation matrix */}
          {(preflight.xeroSide?.legs?.length > 0 ||
            preflight.ptSide?.legs?.length > 0 ||
            preflight.xeroSide?.reconciliation) && (
            <div
              style={{
                marginTop: "10px",
                paddingTop: "8px",
                borderTop: "1px solid #e5e5e5",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                Payment-leg reconciliation
              </div>
              <table
                style={{
                  width: "100%",
                  fontSize: "12px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f6f6f6", textAlign: "left" }}>
                    <th style={{ padding: "4px 6px" }}>Side</th>
                    <th style={{ padding: "4px 6px" }}>Date</th>
                    <th style={{ padding: "4px 6px" }}>Amount</th>
                    <th style={{ padding: "4px 6px" }}>Reference / memo</th>
                    <th style={{ padding: "4px 6px" }}>Status</th>
                    <th style={{ padding: "4px 6px" }}>Match</th>
                  </tr>
                </thead>
                <tbody>
                  {(preflight.xeroSide?.reconciliation?.matched || []).map(
                    (m: any, i: number) => (
                      <React.Fragment key={`m-${i}`}>
                        <tr style={{ background: "#f3fbf3" }}>
                          <td style={{ padding: "3px 6px" }}>Xero</td>
                          <td style={{ padding: "3px 6px" }}>
                            {m.xero?.date || ""}
                          </td>
                          <td style={{ padding: "3px 6px" }}>
                            ${Number(m.xero?.amount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: "3px 6px" }}>
                            {m.xero?.reference || "—"}
                          </td>
                          <td style={{ padding: "3px 6px" }}>—</td>
                          <td style={{ padding: "3px 6px" }} rowSpan={2}>
                            ✓ matched
                          </td>
                        </tr>
                        <tr
                          style={{
                            background: "#f3fbf3",
                            borderBottom: "1px solid #d6e8d6",
                          }}
                        >
                          <td style={{ padding: "3px 6px" }}>PT</td>
                          <td style={{ padding: "3px 6px" }}>
                            {m.pt?.date
                              ? String(m.pt.date).slice(0, 10)
                              : ""}
                          </td>
                          <td style={{ padding: "3px 6px" }}>
                            ${Number(m.pt?.amount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: "3px 6px" }}>
                            {m.pt?.reference || "—"}
                          </td>
                          <td style={{ padding: "3px 6px" }}>
                            {m.pt?.status}
                            {m.pt?.confirmed ? " (confirmed)" : ""}
                          </td>
                        </tr>
                      </React.Fragment>
                    ),
                  )}
                  {(preflight.xeroSide?.reconciliation?.ptUnmatched || []).map(
                    (l: any, i: number) => (
                      <tr
                        key={`pu-${i}`}
                        style={{
                          background: l.confirmed ? "#fff8e1" : "#fafafa",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        <td style={{ padding: "3px 6px" }}>PT only</td>
                        <td style={{ padding: "3px 6px" }}>
                          {l.date ? String(l.date).slice(0, 10) : ""}
                        </td>
                        <td style={{ padding: "3px 6px" }}>
                          ${Number(l.amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: "3px 6px" }}>
                          {l.reference || "—"}
                        </td>
                        <td style={{ padding: "3px 6px" }}>
                          {l.status}
                          {l.confirmed ? " (confirmed)" : ""}
                        </td>
                        <td style={{ padding: "3px 6px" }}>
                          {l.confirmed ? "→ push" : "unconfirmed"}
                        </td>
                      </tr>
                    ),
                  )}
                  {(
                    preflight.xeroSide?.reconciliation?.xeroUnmatched || []
                  ).map((l: any, i: number) => (
                    <tr
                      key={`xu-${i}`}
                      style={{
                        background: "#fff8e1",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <td style={{ padding: "3px 6px" }}>Xero only</td>
                      <td style={{ padding: "3px 6px" }}>{l.date || ""}</td>
                      <td style={{ padding: "3px 6px" }}>
                        ${Number(l.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "3px 6px" }}>
                        {l.reference || "—"}
                      </td>
                      <td style={{ padding: "3px 6px" }}>—</td>
                      <td style={{ padding: "3px 6px" }}>→ import</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {Array.isArray(preflight.xeroSide?.creditNotes) &&
            preflight.xeroSide.creditNotes.length > 0 && (
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "8px",
                  borderTop: "1px solid #e5e5e5",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                  Xero credit notes (this contact)
                </div>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px" }}>
                  {preflight.xeroSide.creditNotes.map((cn: any, i: number) => (
                    <li key={`cn-${i}`} style={{ padding: "2px 0" }}>
                      <code>{cn.number || cn.id}</code> — $
                      {Number(cn.total || 0).toFixed(2)} (remaining $
                      {Number(cn.remaining || 0).toFixed(2)}) — {cn.status} —{" "}
                      {cn.date}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {Array.isArray(preflight.checks) && preflight.checks.length > 0 && (
            <ul
              style={{
                listStyle: "none",
                margin: "8px 0 0 0",
                padding: 0,
                borderTop: "1px solid #e5e5e5",
              }}
            >
              {preflight.checks.map((c: any, i: number) => (
                <li
                  key={i}
                  style={{
                    padding: "4px 0",
                    borderBottom: "1px dotted #eee",
                    color:
                      c.status === "fail"
                        ? "#a50e0e"
                        : c.status === "warn"
                        ? "#a86b00"
                        : "#137333",
                  }}
                >
                  <b>
                    [{c.status.toUpperCase()}] {c.label}:
                  </b>{" "}
                  <span style={{ color: "#333" }}>{c.detail}</span>
                </li>
              ))}
            </ul>
          )}
          {!preflight.blocked && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "10px",
                paddingTop: "8px",
                borderTop: "1px solid #cde4cd",
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
                disabled={busy}
              />
              I&apos;ve reviewed this and want to run the sync.
            </label>
          )}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            borderRadius: "4px",
            background: result.success ? "#e6f7ec" : "#fdecea",
            color: result.success ? "#137333" : "#a50e0e",
            fontSize: "13px",
          }}
        >
          <div style={{ fontWeight: 500 }}>
            {result.success ? "Sync triggered" : "Sync failed"}
            {result.direction ? ` — ${result.direction}` : ""}
          </div>
          <div style={{ marginTop: "4px" }}>{result.message}</div>
          {result.resolvedXeroId && (
            <div style={{ marginTop: "4px" }}>
              Resolved Xero ID: <code>{result.resolvedXeroId}</code>
            </div>
          )}
          {result.syncLogId ? (
            <div style={{ marginTop: "6px" }}>
              <Link
                href={`/user/integrations/xero/syncLogDetails/${result.syncLogId}`}
              >
                View sync log #{result.syncLogId}
              </Link>
            </div>
          ) : null}
        </div>
      )}
      </>)}
      {/* Task #147 — Catch-up by date range. */}
      {mode === "catchup" && (
        <div>
          <p style={{ fontSize: "13px", marginTop: 0, opacity: 0.8 }}>
            Pick a record type and a date window. We&apos;ll list every
            PayTrade-side and Xero-side record in that window with a
            recommended action (push / import / link), then sync the ones
            you select one-by-one using the same per-row checks as the
            single-record flow.
          </p>
          <div style={{ marginBottom: "12px" }}>
            <h5 style={{ margin: "0 0 4px 0" }}>Record type</h5>
            <select
              value={catchupType}
              onChange={(e) => {
                const v = e.target.value;
                if (isCatchupType(v)) setCatchupType(v);
                setCatchupResult(null);
                setCatchupSelected(new Set());
                setCatchupRowStatus({});
              }}
              disabled={catchupBusy || catchupRunning}
              style={{ width: "100%", padding: "8px 10px" }}
            >
              <option value="invoice_bill">Invoices / Bills</option>
              <option value="payment">Payments</option>
              <option value="contact">Contacts</option>
            </select>
            <small style={{ opacity: 0.7 }}>
              Bank transfers and manual journals are produced as
              side-effects of other syncs and aren&apos;t catch-up-eligible.
            </small>
          </div>
          {/* Task #152 — date row uses the system FormikControl DATE_PICKER
              + CustomButton so it visually matches the Account Ledger /
              Journals filter bars and the Sync Log filter row above. */}
          <div className="grid" style={{ marginBottom: "12px" }}>
            <div>
              <FormikControl
                label="From"
                name="catchupFromDate"
                control={InputType.DATE_PICKER}
                type="date"
                value={catchupFrom}
                onChange={(selectedDate: string) => {
                  // Task #152 — keep the picker's canonical YYYY-MM-DD
                  // string as-is; round-tripping through `new Date(...)`
                  // would parse it as UTC and drift by a day in negative
                  // offsets. The native input we replaced did the same.
                  if (!selectedDate) {
                    setCatchupFrom("");
                    return;
                  }
                  setCatchupFrom(selectedDate);
                  if (catchupTo && selectedDate > catchupTo) {
                    setCatchupTo(selectedDate);
                  }
                }}
                disabled={catchupBusy || catchupRunning}
              />
            </div>
            <div>
              <FormikControl
                label="To"
                name="catchupToDate"
                control={InputType.DATE_PICKER}
                type="date"
                value={catchupTo}
                onChange={(selectedDate: string) => {
                  // Task #152 — see "From" handler above; use the
                  // YYYY-MM-DD string directly to avoid UTC drift.
                  if (!selectedDate) {
                    setCatchupTo("");
                    return;
                  }
                  if (catchupFrom && selectedDate < catchupFrom) return;
                  setCatchupTo(selectedDate);
                }}
                minDate={catchupFrom || ""}
                disabled={catchupBusy || catchupRunning}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <CustomButton
                buttonName={catchupBusy ? "Discovering…" : "Discover"}
                iconClassName="fa-light fa-magnifying-glass"
                buttonType={buttonType.CONTRAST_SMALL}
                actionType="button"
                onClick={handleDiscover}
                disabled={
                  catchupBusy ||
                  catchupRunning ||
                  !catchupFrom ||
                  !catchupTo
                }
              />
            </div>
          </div>
          {catchupError && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "4px",
                background: "#fdecea",
                color: "#a50e0e",
                fontSize: "13px",
                marginBottom: "10px",
              }}
            >
              {catchupError}
            </div>
          )}
          {catchupResult && Array.isArray(catchupResult.rows) && (
            <>
              <div
                style={{
                  fontSize: "12px",
                  marginBottom: "8px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <span>
                  <b>{catchupResult.counts?.total ?? 0}</b> rows
                </span>
                <span style={{ color: "#137333" }}>
                  ✓ {catchupResult.counts?.already_in_sync ?? 0} in sync
                </span>
                <span style={{ color: "#1a73e8" }}>
                  ↗ {catchupResult.counts?.needs_push ?? 0} push
                </span>
                <span style={{ color: "#1a73e8" }}>
                  ↘ {catchupResult.counts?.needs_import ?? 0} import
                </span>
                <span style={{ color: "#a86b00" }}>
                  ⇄ {catchupResult.counts?.needs_link ?? 0} link
                </span>
                <span style={{ color: "#a50e0e" }}>
                  ⨯ {catchupResult.counts?.blocked ?? 0} blocked
                </span>
                {catchupResult.truncated && (
                  <span style={{ color: "#a86b00" }}>
                    (results truncated at {catchupResult.per_side_cap ?? 1000}{" "}
                    per side or by the server time budget — narrow the window
                    to see the rest)
                  </span>
                )}
              </div>
              {catchupType === "invoice_bill" &&
                Number(
                  (catchupResult as any)?.notes?.xero_skipped_no_tracking ?? 0,
                ) > 0 && (
                  <div
                    style={{
                      padding: "10px 12px",
                      marginBottom: "8px",
                      background: "#fff8e1",
                      border: "1px solid #f5b5b5",
                      borderRadius: "4px",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ marginBottom: "6px" }}>
                      <b>Heads up:</b> Xero returned{" "}
                      {Number(
                        (catchupResult as any)?.notes?.xero_total_in_window ??
                          0,
                      )}{" "}
                      invoice/bill record
                      {Number(
                        (catchupResult as any)?.notes?.xero_total_in_window ??
                          0,
                      ) === 1
                        ? ""
                        : "s"}{" "}
                      in this window, but{" "}
                      {Number(
                        (catchupResult as any)?.notes
                          ?.xero_skipped_no_tracking ?? 0,
                      )}{" "}
                      of them were skipped because their line items don&apos;t
                      carry a tracking-category option that PayTrade has linked
                      to a project/contract. PayTrade has{" "}
                      {Number(
                        (catchupResult as any)?.notes?.tracking_map_projects ??
                          0,
                      )}{" "}
                      project tracking link
                      {Number(
                        (catchupResult as any)?.notes?.tracking_map_projects ??
                          0,
                      ) === 1
                        ? ""
                        : "s"}{" "}
                      and{" "}
                      {Number(
                        (catchupResult as any)?.notes?.tracking_map_contracts ??
                          0,
                      )}{" "}
                      contract link
                      {Number(
                        (catchupResult as any)?.notes?.tracking_map_contracts ??
                          0,
                      ) === 1
                        ? ""
                        : "s"}{" "}
                      configured for this integration.
                    </div>
                  </div>
                )}
              <div
                style={{
                  marginBottom: "8px",
                  display: "flex",
                  gap: "8px",
                  fontSize: "12px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  disabled={catchupRunning}
                  onClick={() => {
                    const all = new Set<string>();
                    for (const r of catchupResult.rows) {
                      if (
                        r.classification !== "already_in_sync" &&
                        r.classification !== "blocked"
                      )
                        all.add(r.key);
                    }
                    setCatchupSelected(all);
                  }}
                  style={{
                    padding: "4px 10px",
                    background: "#fff",
                    color: "#1a73e8",
                    border: "1px solid #1a73e8",
                    borderRadius: "4px",
                    cursor: catchupRunning ? "not-allowed" : "pointer",
                  }}
                >
                  Select all actionable
                </button>
                <button
                  type="button"
                  disabled={catchupRunning}
                  onClick={() => setCatchupSelected(new Set())}
                  style={{
                    padding: "4px 10px",
                    background: "#fff",
                    color: "#555",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: catchupRunning ? "not-allowed" : "pointer",
                  }}
                >
                  Clear selection
                </button>
                <span style={{ marginLeft: "auto", opacity: 0.7 }}>
                  {catchupSelected.size} selected
                </span>
              </div>
              {/* Task #151 — uses the canonical PayTrade table look
                  (same wrapper + table classes as the sync-log table
                  on this page). Row state (running/passed/failed/
                  selected) is conveyed via a `data-row-state` attr
                  styled in CSS rather than inline backgrounds. */}
              <div
                className="table-responsive tablesorter-default pt_table"
                style={{
                  margin: "0 0 10px 0",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                <table className="dataTable compact stripe hover order-column">
                  <thead>
                    <tr>
                      <th></th>
                      <th>PayTrade</th>
                      <th>Status</th>
                      <th>Xero</th>
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catchupResult.rows.map((r: any) => {
                      const rs = catchupRowStatus[r.key];
                      const cls = r.classification;
                      const status = catchupStatusMap[cls] || {
                        label: cls,
                        color: "inherit",
                      };
                      const isSelected = catchupSelected.has(r.key);
                      const disabledRow =
                        catchupRunning ||
                        cls === "already_in_sync" ||
                        cls === "blocked";
                      const rowState =
                        rs?.status === "running"
                          ? "running"
                          : rs?.status === "passed"
                          ? "passed"
                          : rs?.status === "failed"
                          ? "failed"
                          : isSelected
                          ? "selected"
                          : undefined;
                      return (
                        <tr key={r.key} data-row-state={rowState}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={disabledRow}
                              onChange={() => toggleCatchupRow(r.key)}
                            />
                          </td>
                          <td>
                            {r.pt_id ? (
                              <>
                                <div>{r.pt_summary || r.label}</div>
                                {(r.project_name || r.contract_name) && (
                                  <small>
                                    {r.project_name}
                                    {r.project_name && r.contract_name
                                      ? " · "
                                      : ""}
                                    {r.contract_name}
                                  </small>
                                )}
                                <br />
                                <small>PT {r.pt_id}</small>
                              </>
                            ) : (
                              <em>— no PayTrade row in window —</em>
                            )}
                          </td>
                          <td>
                            <span style={{ color: status.color }}>
                              {status.label}
                            </span>
                            {r.hint && (
                              <div>
                                <small>
                                  <em>{r.hint}</em>
                                </small>
                              </div>
                            )}
                            {rs?.message && (
                              <div>
                                <small
                                  style={{
                                    color:
                                      rs.status === "failed" ? "red" : "green",
                                  }}
                                >
                                  {rs.status === "running"
                                    ? "Running…"
                                    : rs.status === "passed"
                                    ? `✓ ${rs.message}`
                                    : `⨯ ${rs.message}`}
                                  {rs.syncLogId ? (
                                    <>
                                      {" — "}
                                      <a
                                        href={`/user/integrations/xero/syncLogDetails/${rs.syncLogId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        sync log #{rs.syncLogId}
                                      </a>
                                    </>
                                  ) : null}
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            {r.xero_id ? (
                              <>
                                <div>{r.xero_summary || r.label}</div>
                                {(r.project_name || r.contract_name) && (
                                  <small>
                                    {r.project_name}
                                    {r.project_name && r.contract_name
                                      ? " · "
                                      : ""}
                                    {r.contract_name}
                                  </small>
                                )}
                                {r.xero_tracking_option_name ? (
                                  <div>
                                    <small>
                                      Tracking: {r.xero_tracking_option_name}
                                      {r.xero_tracking_option_id ? (
                                        <>
                                          {" "}
                                          <code>
                                            ({r.xero_tracking_option_id})
                                          </code>
                                        </>
                                      ) : null}
                                    </small>
                                  </div>
                                ) : (
                                  <div>
                                    <small style={{ color: "orange" }}>
                                      No tracking option set on Xero record
                                    </small>
                                  </div>
                                )}
                                {r.xero_tracking_option_name &&
                                  !r.project_name &&
                                  !r.contract_name && (
                                    <div>
                                      <small style={{ color: "orange" }}>
                                        No matching PayTrade project/contract
                                      </small>
                                    </div>
                                  )}
                                {r.blocking_issues &&
                                  r.blocking_issues.length > 0 && (
                                    <div style={{ marginTop: 4 }}>
                                      {r.blocking_issues.map((iss: string, idx: number) => (
                                        <div key={idx}>
                                          <small style={{ color: "orange" }}>
                                            ⚠ {iss}
                                          </small>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                <br />
                                <small>Xero {r.xero_id}</small>
                              </>
                            ) : (
                              <em>— no Xero row in window —</em>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="primary mr_zero_point_five"
                              title="View row details"
                              aria-label="View row details"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCatchupRowDetail(r);
                              }}
                            >
                              <i className="fa-light fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {(catchupRunning || catchupProgress.done > 0) && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    opacity: 0.85,
                  }}
                >
                  {(() => {
                    const actionable = (catchupResult?.rows || []).filter(
                      (r: any) =>
                        r.classification === "needs_link" ||
                        r.classification === "needs_push" ||
                        r.classification === "needs_import" ||
                        r.classification === "amounts_disagree",
                    ).length;
                    const skipped = Math.max(
                      0,
                      actionable - catchupProgress.total,
                    );
                    const isFinal =
                      !catchupRunning &&
                      catchupProgress.done === catchupProgress.total &&
                      catchupProgress.total > 0;
                    return (
                      <>
                        {isFinal ? "Run complete — " : "Progress: "}
                        {catchupProgress.done}/{catchupProgress.total} —{" "}
                        <span style={{ color: "#137333" }}>
                          ✓ Synced {catchupProgress.pass}
                        </span>
                        {" · "}
                        <span style={{ color: "#a50e0e" }}>
                          ⨯ Failed {catchupProgress.fail}
                        </span>
                        {" · "}
                        <span style={{ color: "#666" }}>
                          ◌ Skipped {skipped}
                        </span>
                        {skipped > 0 && (
                          <span style={{ marginLeft: "6px", opacity: 0.7 }}>
                            (actionable rows the operator left unselected)
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* Task #151 — secondary "Catch-up row details" dialog. Stacks
          on top of the Manual Xero Sync dialog (separate <dialog> id)
          so the parent stays mounted underneath. Footer offers Close
          + cross-system deep links; both deep-link buttons keep this
          dialog open (no `return true` from onConfirm) so the
          operator can flip back and forth. */}
      {catchupRowDetail && (
        <BaseModal
          modalId="manualXeroSyncRowDetail"
          displayModal={!!catchupRowDetail}
          title={`Catch-up row details${
            catchupRowDetail.label ? ` — ${catchupRowDetail.label}` : ""
          }`}
          firstButtonName="Close"
          middleButtonName="View in PayTrade"
          secondButtonName="View in Xero"
          disableMiddleButton={!catchupRowDetail.paytrade_deep_link}
          disableSecondButton={!catchupRowDetail.xero_deep_link}
          onClose={() => setCatchupRowDetail(null)}
          onMiddleButtonClick={() => {
            if (catchupRowDetail.paytrade_deep_link) {
              window.open(
                catchupRowDetail.paytrade_deep_link,
                "_blank",
                "noopener,noreferrer",
              );
            }
          }}
          onConfirm={() => {
            if (catchupRowDetail.xero_deep_link) {
              window.open(
                catchupRowDetail.xero_deep_link,
                "_blank",
                "noopener,noreferrer",
              );
            }
            // No return value — BaseModal only auto-closes on
            // `response == true`, so the dialog stays open and the
            // operator can flip back and forth between PT and Xero.
          }}
        >
          {(() => {
            const cls = catchupRowDetail.classification;
            const status = catchupStatusMap[cls] || {
              label: cls,
              color: "inherit",
            };
            const whyMap: Record<string, string> = {
              needs_import:
                "This Xero record exists but PayTrade has no matching row in the selected window. Running sync will import the Xero record into PayTrade.",
              needs_push:
                "This PayTrade record exists but Xero has no matching row. Running sync will push the PayTrade record to Xero.",
              needs_link:
                "Both sides exist but aren't linked yet. Running sync will create the link without creating duplicate records.",
              amounts_disagree:
                "Both sides exist and are linked but their totals disagree. Preflight will recommend the canonical direction; review carefully before running sync.",
              already_in_sync:
                "PayTrade and Xero are already in sync — no action needed.",
              blocked:
                "Sync is blocked for this row. See the hint below for how to resolve before retrying.",
            };
            const why = whyMap[cls] || "";
            return (
              <div className="pt_overviewinfo mb_one">
                <div className="grid">
                <div className="pt_infolist listData">
                  <div className="table-container">
                    <table className="responsive-table">
                      <tbody>
                        <tr>
                          <td className="setPro">
                            <div className="pt_infolistdata">
                              <h6>Status</h6>
                              <span style={{ color: status.color }}>
                                {status.label}
                              </span>
                            </div>
                          </td>
                          <td className="setPro">
                            <div className="pt_infolistdata">
                              <h6>Why this needs sync</h6>
                              <span>{why || "—"}</span>
                            </div>
                          </td>
                        </tr>
                        {catchupRowDetail.hint ? (
                          <tr>
                            <td className="setPro" colSpan={2}>
                              <div className="pt_infolistdata">
                                <h6>Hint</h6>
                                <span>{catchupRowDetail.hint}</span>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                        {catchupRowDetail.blocking_issues &&
                        catchupRowDetail.blocking_issues.length > 0 ? (
                          <tr>
                            <td className="setPro" colSpan={2}>
                              <div className="pt_infolistdata">
                                <h6>Blocking issues</h6>
                                <span>
                                  {catchupRowDetail.blocking_issues.map(
                                    (iss: string, i: number) => (
                                      <div key={i}>⚠ {iss}</div>
                                    ),
                                  )}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                </div>
              </div>
            );
          })()}
          <div className="pt_overviewinfo">
            <div className="grid">
              <div className="pt_infolist listData">
                <h6>PayTrade side</h6>
                {catchupRowDetail.pt_id ? (
                  <div className="table-container">
                    <table className="responsive-table">
                      <tbody>
                        {(
                          catchupRowDetail.pt_details || [
                            {
                              label: "ID",
                              value: String(catchupRowDetail.pt_id),
                            },
                          ]
                        ).map(
                          (
                            d: { label: string; value: string },
                            i: number,
                          ) => (
                            <tr key={i}>
                              <td className="setPro">
                                <div className="pt_infolistdata">
                                  <h6>{d.label}</h6>
                                  <span>{d.value || "—"}</span>
                                </div>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>
                    <em>— no PayTrade row in window —</em>
                  </p>
                )}
              </div>
              <div className="pt_infolist listData">
                <h6>Xero side</h6>
                {catchupRowDetail.xero_id ? (
                  <div className="table-container">
                    <table className="responsive-table">
                      <tbody>
                        {(
                          catchupRowDetail.xero_details || [
                            {
                              label: "ID",
                              value: String(catchupRowDetail.xero_id),
                            },
                          ]
                        ).map(
                          (
                            d: { label: string; value: string },
                            i: number,
                          ) => (
                            <tr key={i}>
                              <td className="setPro">
                                <div className="pt_infolistdata">
                                  <h6>{d.label}</h6>
                                  <span>{d.value || "—"}</span>
                                </div>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>
                    <em>— no Xero row in window —</em>
                  </p>
                )}
              </div>
            </div>
          </div>
        </BaseModal>
      )}
    </BaseModal>
  );
}
