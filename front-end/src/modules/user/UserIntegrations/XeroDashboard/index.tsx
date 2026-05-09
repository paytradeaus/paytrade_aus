"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import XeroReauthBanner from "../XeroReauthBanner";
import { AppRoutes } from "@/shared/constant/appRoutes";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DynamicTable from "@/components/Table";

import Link from "next/link";
import {
  integrationStatus,
  xeroSyncListHeaders,
  xeroSynListRenderData,
} from "../integration.constant";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType, InputType, VIEW } from "@/shared/constant/general";
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
  const [claimFilterInput, setClaimFilterInput] = useState<string>("");
  const [claimFilterId, setClaimFilterId] = useState<number | null>(null);
  // Task #85 — toolbar filters for the standalone Sync Logs dashboard.
  // start/end use plain YYYY-MM-DD strings from <input type="date">; the
  // server applies them via date_filter='Custom' in the existing handler.
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  // Task #87 — quick date presets (Today / Last 7 days / This month / Last
  // month). Mutually exclusive with the manual start/end inputs: picking a
  // preset clears the manual range, and vice-versa, so the two never
  // silently disagree about which window the server is filtering.
  const DATE_PRESETS = [
    "Today",
    "Last 7 days",
    "This Month",
    "Last Month",
  ] as const;
  type DatePreset = (typeof DATE_PRESETS)[number];
  const [datePreset, setDatePreset] = useState<DatePreset | "">("");
  const [syncTypeFilter, setSyncTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Compute YYYY-MM-DD range (in browser-local time, matching the manual
  // date pickers) for the selected preset. Returned dates are inclusive.
  const computePresetRange = (
    preset: DatePreset,
  ): { start: string; end: string } => {
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const today = new Date();
    if (preset === "Today") {
      return { start: fmt(today), end: fmt(today) };
    }
    if (preset === "Last 7 days") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start: fmt(start), end: fmt(today) };
    }
    if (preset === "This Month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    // Last Month
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: fmt(start), end: fmt(end) };
  };
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
    startDate,
    endDate,
    datePreset,
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
    // Task #85 — only send the Custom date_filter when the user actually
    // picked dates; otherwise leave it null so the existing default
    // (no date constraint) still applies.
    // Task #87 — a quick preset takes precedence: for the two presets the
    // backend already understands ("This Month" / "Last Month") we forward
    // the date_filter directly so the server applies its own timezone-aware
    // boundaries; for "Today" / "Last 7 days" we send a computed Custom
    // range (browser-local, matching the manual date pickers).
    let dateFilter: string | null = null;
    let startDateToSend: string | null = null;
    let endDateToSend: string | null = null;
    if (datePreset) {
      if (datePreset === "This Month" || datePreset === "Last Month") {
        dateFilter = datePreset;
      } else {
        const range = computePresetRange(datePreset);
        dateFilter = "Custom";
        startDateToSend = range.start;
        endDateToSend = range.end;
      }
    } else if (startDate && endDate) {
      dateFilter = "Custom";
      startDateToSend = startDate;
      endDateToSend = endDate;
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
        return {
          ...val,
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
          reference: isXeroToPaytrade
            ? val.reference?.xeroId || ""
            : val.reference?.paytradeId || "",
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
      <XeroReauthBanner />
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
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                <CustomButton
                  buttonName="Refresh"
                  iconClassName="fa-light fa-refresh"
                  buttonType={buttonType.CONTRAST_SMALL}
                  actionType="button"
                  onClick={() => {
                    fetchXeroSyncLogs();
                  }}
                  styles={{ margin: "0 10px 10px 10px" }}
                />
                <CustomButton
                  buttonName="Manual sync"
                  iconClassName="fa-light fa-rotate"
                  buttonType={buttonType.CONTRAST_SMALL}
                  actionType="button"
                  onClick={() => setManualSyncOpen(true)}
                  styles={{ margin: "0 10px 10px 0" }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    margin: "0 10px 10px 0",
                    gap: "6px",
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Filter by claim id…"
                    value={claimFilterInput}
                    onChange={(e) =>
                      setClaimFilterInput(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = parseInt(claimFilterInput, 10);
                        if (!Number.isFinite(n) || n <= 0) {
                          showErrorToast("Enter a numeric claim id");
                          return;
                        }
                        setCurrentPage(1);
                        setClaimFilterId(n);
                      }
                    }}
                    style={{
                      padding: "4px 8px",
                      fontSize: "12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      width: "150px",
                    }}
                    title="Show only sync log entries for this claim and its payments"
                  />
                  <CustomButton
                    buttonName={claimFilterId != null ? "Update" : "Apply"}
                    iconClassName="fa-light fa-filter"
                    buttonType={buttonType.CONTRAST_SMALL}
                    actionType="button"
                    onClick={() => {
                      const n = parseInt(claimFilterInput, 10);
                      if (!Number.isFinite(n) || n <= 0) {
                        showErrorToast("Enter a numeric claim id");
                        return;
                      }
                      setCurrentPage(1);
                      setRecoveredOnly(false);
                      setClaimFilterId(n);
                    }}
                    styles={{ margin: 0 }}
                    disabled={!claimFilterInput.trim()}
                  />
                  {claimFilterId != null && (
                    <CustomButton
                      buttonName="Clear"
                      iconClassName="fa-light fa-close"
                      buttonType={buttonType.CONTRAST_SMALL}
                      actionType="button"
                      onClick={() => {
                        setClaimFilterInput("");
                        setClaimFilterId(null);
                        setCurrentPage(1);
                      }}
                      styles={{ margin: 0 }}
                    />
                  )}
                </div>
                {claimFilterId != null && (
                  <span
                    style={{
                      alignSelf: "center",
                      margin: "0 10px 10px 0",
                      fontSize: "11px",
                      color: "#0b5394",
                      backgroundColor: "#e0f0ff",
                      border: "1px solid #b3d4f5",
                      borderRadius: "10px",
                      padding: "2px 8px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                    title="Showing Invoices/Bills/Payments sync log entries for this claim only (newest 50)."
                  >
                    Filtered: claim #{claimFilterId}
                  </span>
                )}
                {/* Task #85 — date range + sync type + status filters.
                    Disabled while a claim-id filter is active to mirror
                    the existing 'auto-recovered only' toggle behaviour
                    (the claim view is a separate server endpoint that
                    doesn't honour these inputs). */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    margin: "0 10px 10px 0",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Task #87 — quick date presets. Selecting one clears the
                      manual start/end inputs (and clicking it again toggles
                      it off) so the two filters never silently disagree. */}
                  {DATE_PRESETS.map((preset) => {
                    const active = datePreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          if (claimFilterId != null) return;
                          setCurrentPage(1);
                          if (active) {
                            setDatePreset("");
                          } else {
                            setDatePreset(preset);
                            setStartDate("");
                            setEndDate("");
                          }
                        }}
                        disabled={claimFilterId != null}
                        title={`Filter sync logs to ${preset}`}
                        aria-pressed={active}
                        style={{
                          padding: "4px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          lineHeight: "16px",
                          borderRadius: "12px",
                          cursor:
                            claimFilterId != null ? "not-allowed" : "pointer",
                          opacity: claimFilterId != null ? 0.5 : 1,
                          color: active ? "#fff" : "#0b5394",
                          backgroundColor: active ? "#0b5394" : "#e0f0ff",
                          border: "1px solid #b3d4f5",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {preset}
                      </button>
                    );
                  })}
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => {
                      setCurrentPage(1);
                      setStartDate(e.target.value);
                      // Task #87 — manual date entry clears any active preset
                      // so the two never silently disagree.
                      if (datePreset) setDatePreset("");
                    }}
                    disabled={claimFilterId != null}
                    title="Start date"
                    style={{
                      padding: "4px 8px",
                      fontSize: "12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      opacity: claimFilterId != null ? 0.5 : 1,
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "#666" }}>to</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => {
                      setCurrentPage(1);
                      setEndDate(e.target.value);
                      // Task #87 — manual date entry clears any active preset.
                      if (datePreset) setDatePreset("");
                    }}
                    disabled={claimFilterId != null}
                    title="End date"
                    style={{
                      padding: "4px 8px",
                      fontSize: "12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      opacity: claimFilterId != null ? 0.5 : 1,
                    }}
                  />
                  <select
                    value={syncTypeFilter}
                    onChange={(e) => {
                      setCurrentPage(1);
                      setSyncTypeFilter(e.target.value);
                    }}
                    disabled={claimFilterId != null}
                    title="Filter by sync type"
                    style={{
                      padding: "4px 8px",
                      fontSize: "12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      opacity: claimFilterId != null ? 0.5 : 1,
                    }}
                  >
                    <option value="">All sync types</option>
                    {SYNC_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setCurrentPage(1);
                      setStatusFilter(e.target.value);
                    }}
                    disabled={claimFilterId != null}
                    title="Filter by status"
                    style={{
                      padding: "4px 8px",
                      fontSize: "12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      opacity: claimFilterId != null ? 0.5 : 1,
                    }}
                  >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {(startDate ||
                    endDate ||
                    datePreset ||
                    syncTypeFilter ||
                    statusFilter) && (
                    <CustomButton
                      buttonName="Clear filters"
                      iconClassName="fa-light fa-close"
                      buttonType={buttonType.CONTRAST_SMALL}
                      actionType="button"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setDatePreset("");
                        setSyncTypeFilter("");
                        setStatusFilter("");
                        setCurrentPage(1);
                      }}
                      styles={{ margin: 0 }}
                    />
                  )}
                </div>
                <div
                  style={{
                    marginRight: "10px",
                    textTransform: "uppercase",
                    lineHeight: "18px",
                    fontSize: "11px",
                  }}
                >
                  <span>Synced</span>
                  <p
                    className="success"
                    style={{ textAlign: "right", color: "green" }}
                  >
                    {syncLogData?.succeeded}
                  </p>
                </div>
                <div
                  style={{
                    marginRight: "10px",
                    textTransform: "uppercase",
                    lineHeight: "18px",
                    fontSize: "11px",
                  }}
                >
                  <span>Warning</span>
                  <p
                    className="warning"
                    style={{ textAlign: "right", color: "orange" }}
                  >
                    {syncLogData?.warning}
                  </p>
                </div>
                <div
                  style={{
                    marginRight: "10px",
                    textTransform: "uppercase",
                    lineHeight: "18px",
                    fontSize: "11px",
                  }}
                >
                  <span>issues</span>
                  <p
                    className="failed"
                    style={{ textAlign: "right", color: "red" }}
                  >
                    {syncLogData?.failed}
                  </p>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    marginRight: "10px",
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
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      lineHeight: "16px",
                      borderRadius: "12px",
                      cursor: claimFilterId != null ? "not-allowed" : "pointer",
                      opacity: claimFilterId != null ? 0.5 : 1,
                      color: recoveredOnly ? "#fff" : "#0b5394",
                      backgroundColor: recoveredOnly ? "#0b5394" : "#e0f0ff",
                      border: "1px solid #b3d4f5",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {recoveredOnly
                      ? "Showing recovered only ✕"
                      : "Show auto-recovered only"}
                  </button>
                </div>
              </div>
              <DynamicTable
                headers={xeroSyncListHeaders}
                gridData={syncLogData?.tableData}
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
  } | null>(null);

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
  }, [type]);

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

  const handleConfirm = async (): Promise<boolean> => {
    const trimmed = id.trim();
    if (!trimmed) {
      setResult({ success: false, message: "Please enter a Xero ID first." });
      return false;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await manualXeroResync({
        company_id: companyId,
        type,
        id: trimmed,
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
    // Returning false keeps the modal open so the user sees the result
    // panel and can either run another id or close manually.
    return false;
  };

  if (!open) return null;
  return (
    <BaseModal
      modalId="manualXeroSync"
      displayModal={open}
      onClose={handleClose}
      title="Manual Xero sync"
      firstButtonName="Close"
      secondButtonName={busy ? "Running…" : "Run sync"}
      disableSecondButton={busy || !id.trim()}
      onConfirm={handleConfirm}
    >
      <p style={{ fontSize: "13px", marginTop: 0, opacity: 0.8 }}>
        Re-pull a single Xero record and re-run the matching webhook
        handler. Use when a webhook was missed or a record is out of sync
        between Xero and PayTrade.
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
    </BaseModal>
  );
}
